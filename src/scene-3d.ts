/**
 * Full-Viewport Background 3D Scrollytelling Engine for Jholichi S. Tempra's Portfolio.
 * Built with Three.js r186 adhering to Three.js design directives:
 * - 6 distinct procedural 3D scenes synchronized to page scroll:
 *   1. Hero: Cybernetic Algorithmic Core & Topology Network
 *   2. About: Neural Architecture & Heuristic Problem Lattice
 *   3. Skills: Multi-tiered Tech Gyroscope & Floating Orbitals
 *   4. Projects: Holographic Isometric Architecture & Cyber Matrix
 *   5. Experience: Kinetic Chrono Helix & Milestone Progression Conduit
 *   6. Contact: Global Telemetry Satellite Beacon & Radio Waves
 * - Smooth camera choreography with frame-rate independent exponential damping
 * - Interactive mouse parallax, theme synchronization (Dark / Light), and floating HUD controls
 * - Zero external assets (100% procedural WebGL)
 */

import * as THREE from 'three';
import {
  calculateScrollProgress,
  getActiveSceneState,
  SCENE_DEFINITIONS,
  generateOrbitalNodes,
  generateNeuralNetworkNodes,
  generateIsometricCubes,
  generateHelixCoordinates,
  updateNodePosition,
  advancePacketProgress,
  getScenePalette,
  type ScenePalette,
  type NetworkNodeConfig,
} from './scene-logic.ts';

// Pre-allocated math objects to avoid garbage collection churn in the render loop
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

export interface ScrollytellingControls {
  scrollToScene: (index: number) => void;
  toggleWireframe: () => boolean;
  toggleAutoRotate: () => boolean;
  resetView: () => void;
  updateTheme: (isDark: boolean) => void;
  dispose: () => void;
}

export function initPortfolio3DBackground(container: HTMLElement): ScrollytellingControls | null {
  if (!container) return null;

  // 1. Detect environment
  const isHeadless = typeof navigator !== 'undefined' &&
    (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

  // 2. Renderer setup
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    precision: isHeadless ? 'mediump' : 'highp',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.outline = 'none';
  container.innerHTML = '';
  container.appendChild(canvas);

  // 3. Scene & Camera
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    42,
    window.innerWidth / (window.innerHeight || 1),
    0.1,
    250
  );

  const initialSceneState = getActiveSceneState(0);
  camera.position.set(
    initialSceneState.cameraPosition.x,
    initialSceneState.cameraPosition.y,
    initialSceneState.cameraPosition.z
  );
  camera.lookAt(
    initialSceneState.cameraLookAt.x,
    initialSceneState.cameraLookAt.y,
    initialSceneState.cameraLookAt.z
  );

  // Theme setup
  let isDarkMode = document.documentElement.getAttribute('data-theme') !== 'light';
  let palette: ScenePalette = getScenePalette(isDarkMode);

  // 4. Lighting Rig (Warm/Cool Contrast spanning vertical path)
  const hemiLight = new THREE.HemisphereLight(palette.lightKeyColor, palette.lightFillColor, 1.4);
  scene.add(hemiLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight1.position.set(5, 10, 8);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(palette.particleColor, 1.6);
  dirLight2.position.set(-6, -40, -5);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(palette.secondaryAccent, 1.4);
  dirLight3.position.set(6, -70, 5);
  scene.add(dirLight3);

  // ==========================================================================
  // SHARED MATERIALS REGISTRY (Updated on theme change)
  // ==========================================================================
  const matCore = new THREE.MeshPhysicalMaterial({
    color: palette.coreColor,
    metalness: 0.15,
    roughness: 0.1,
    transmission: 0.6,
    thickness: 0.8,
    transparent: true,
    opacity: 0.85,
    wireframe: false,
  });

  const matCoreWire = new THREE.MeshBasicMaterial({
    color: palette.wireframeColor,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
  });

  const matNucleus = new THREE.MeshStandardMaterial({
    color: palette.coreColor,
    emissive: palette.coreEmissive,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.5,
  });

  const matRing = new THREE.MeshStandardMaterial({
    color: palette.ringColor,
    metalness: 0.85,
    roughness: 0.25,
  });

  const matNode = new THREE.MeshStandardMaterial({
    color: palette.nodeColor,
    metalness: 0.7,
    roughness: 0.2,
    emissive: palette.nodeColor,
    emissiveIntensity: 0.4,
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: palette.secondaryAccent,
    metalness: 0.6,
    roughness: 0.3,
    emissive: palette.secondaryAccent,
    emissiveIntensity: 0.35,
  });

  const matTertiary = new THREE.MeshStandardMaterial({
    color: palette.tertiaryAccent,
    metalness: 0.7,
    roughness: 0.25,
    emissive: palette.tertiaryAccent,
    emissiveIntensity: 0.4,
  });

  const matLine = new THREE.LineBasicMaterial({
    color: palette.linkColor,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });

  const matParticle = new THREE.PointsMaterial({
    color: palette.particleColor,
    size: 0.08,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  const matDatum = new THREE.MeshBasicMaterial({
    color: palette.linkColor,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
  });

  // Track all wireframe-toggleable meshes
  const toggleableMeshes: THREE.Mesh[] = [];

  // ==========================================================================
  // SCENE 1: HERO - Cybernetic Algorithmic Core (baseY: 0)
  // ==========================================================================
  const groupHero = new THREE.Group();
  groupHero.position.y = SCENE_DEFINITIONS[0].baseY;
  scene.add(groupHero);

  // Outer Gimbal Ring
  const ring1Geo = new THREE.TorusGeometry(2.2, 0.035, 16, 80);
  const ring1 = new THREE.Mesh(ring1Geo, matRing);
  groupHero.add(ring1);

  // Middle Tilted Gimbal Ring
  const ring2Geo = new THREE.TorusGeometry(1.75, 0.03, 16, 72);
  const ring2 = new THREE.Mesh(ring2Geo, matRing);
  ring2.rotation.x = Math.PI / 4;
  ring2.rotation.y = Math.PI / 6;
  groupHero.add(ring2);

  // Algorithmic Crystalline Polyhedron Core
  const polyGeo = new THREE.IcosahedronGeometry(0.9, 0);
  const polyCore = new THREE.Mesh(polyGeo, matCore);
  toggleableMeshes.push(polyCore);
  groupHero.add(polyCore);

  const polyWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.91, 0), matCoreWire);
  polyCore.add(polyWire);

  // Emissive Quantum Nucleus
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), matNucleus);
  polyCore.add(nucleus);

  // Orbital Nodes & Packets
  const orbitalConfigs = generateOrbitalNodes(8, 2.3);
  const heroNodeMeshes: THREE.Mesh[] = [];
  const heroNodeGroup = new THREE.Group();
  groupHero.add(heroNodeGroup);

  const octaGeo = new THREE.OctahedronGeometry(0.18, 0);
  const boxGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);

  orbitalConfigs.forEach((cfg, idx) => {
    const mesh = new THREE.Mesh(idx % 2 === 0 ? octaGeo : boxGeo, matNode);
    mesh.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    heroNodeGroup.add(mesh);
    heroNodeMeshes.push(mesh);
    toggleableMeshes.push(mesh);
  });

  // Dynamic Topology Lines
  const heroLinesGeo = new THREE.BufferGeometry();
  const heroLinePositions = new Float32Array(24 * 2 * 3);
  heroLinesGeo.setAttribute('position', new THREE.BufferAttribute(heroLinePositions, 3));
  const heroNetworkLines = new THREE.LineSegments(heroLinesGeo, matLine);
  groupHero.add(heroNetworkLines);

  // Data Packet Stream
  const heroPacketCount = 30;
  const heroPacketPos = new Float32Array(heroPacketCount * 3);
  const heroPacketProgress: number[] = [];
  for (let i = 0; i < heroPacketCount; i++) {
    heroPacketProgress.push(Math.random());
  }
  const heroPacketGeo = new THREE.BufferGeometry();
  heroPacketGeo.setAttribute('position', new THREE.BufferAttribute(heroPacketPos, 3));
  const heroPackets = new THREE.Points(heroPacketGeo, matParticle);
  groupHero.add(heroPackets);

  // Datum Grounding Ring
  const datumRing = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.6, 48), matDatum);
  datumRing.rotation.x = -Math.PI / 2;
  datumRing.position.y = -1.6;
  groupHero.add(datumRing);

  // ==========================================================================
  // SCENE 2: ABOUT - Neural Architecture & Heuristic Lattice (baseY: -15)
  // ==========================================================================
  const groupAbout = new THREE.Group();
  groupAbout.position.set(1.5, SCENE_DEFINITIONS[1].baseY, -0.8);
  scene.add(groupAbout);

  const neuralNodes = generateNeuralNetworkNodes(20, 2.0);
  const neuralMeshes: THREE.Mesh[] = [];
  const neuralNodeGroup = new THREE.Group();
  groupAbout.add(neuralNodeGroup);

  const neuralSphGeo = new THREE.SphereGeometry(0.08, 16, 16);
  neuralNodes.forEach((pos) => {
    const m = new THREE.Mesh(neuralSphGeo, matSecondary);
    m.position.set(pos.x, pos.y, pos.z);
    neuralNodeGroup.add(m);
    neuralMeshes.push(m);
  });

  // Synaptic Network Lines connecting proximal neural nodes
  const neuralLineCoords: number[] = [];
  for (let i = 0; i < neuralNodes.length; i++) {
    for (let j = i + 1; j < neuralNodes.length; j++) {
      const d2 =
        (neuralNodes[i].x - neuralNodes[j].x) ** 2 +
        (neuralNodes[i].y - neuralNodes[j].y) ** 2 +
        (neuralNodes[i].z - neuralNodes[j].z) ** 2;
      if (d2 < 2.2) {
        neuralLineCoords.push(
          neuralNodes[i].x, neuralNodes[i].y, neuralNodes[i].z,
          neuralNodes[j].x, neuralNodes[j].y, neuralNodes[j].z
        );
      }
    }
  }
  const neuralLineGeo = new THREE.BufferGeometry();
  neuralLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(neuralLineCoords, 3));
  const neuralLines = new THREE.LineSegments(neuralLineGeo, matLine);
  groupAbout.add(neuralLines);

  // Center Heuristic Dodecahedron
  const dodecaGeo = new THREE.DodecahedronGeometry(0.65, 0);
  const dodecaMesh = new THREE.Mesh(dodecaGeo, matCore);
  toggleableMeshes.push(dodecaMesh);
  groupAbout.add(dodecaMesh);

  // Outer Tilted Geodesic Ring
  const neuralOuterRing = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.02, 16, 64), matRing);
  neuralOuterRing.rotation.x = Math.PI / 3;
  groupAbout.add(neuralOuterRing);

  // ==========================================================================
  // SCENE 3: SKILLS - Tech Ecosystem Gyroscope & Floating Orbitals (baseY: -30)
  // ==========================================================================
  const groupSkills = new THREE.Group();
  groupSkills.position.set(-1.6, SCENE_DEFINITIONS[2].baseY, -0.8);
  scene.add(groupSkills);

  // Tri-axial Gyroscope Rings
  const gyro1 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.035, 16, 72), matRing);
  const gyro2 = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.03, 16, 64), matRing);
  const gyro3 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 16, 56), matRing);
  groupSkills.add(gyro1, gyro2, gyro3);

  // 4 Elemental Floating Polyhedra representing Core Tech Domains
  // 1. Languages (Octahedron - Indigo)
  const polyLang = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), matCore);
  // 2. Cloud & DB (Dodecahedron - Cyan)
  const polyCloud = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), matNode);
  // 3. CCNA Networking (Torus knot - Emerald)
  const polyNet = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.08, 12, 32), matSecondary);
  // 4. Automation / AI (Tetrahedron - Amber)
  const polyAuto = new THREE.Mesh(new THREE.TetrahedronGeometry(0.35, 0), matTertiary);

  const skillsClusterGroup = new THREE.Group();
  skillsClusterGroup.add(polyLang, polyCloud, polyNet, polyAuto);
  groupSkills.add(skillsClusterGroup);

  toggleableMeshes.push(polyLang, polyCloud, polyNet, polyAuto);

  // Particle Swarm Ring around Gyroscope (140 particles)
  const gyroParticleCount = 140;
  const gyroParticlePos = new Float32Array(gyroParticleCount * 3);
  for (let i = 0; i < gyroParticleCount; i++) {
    const angle = (i / gyroParticleCount) * Math.PI * 2;
    const r = 2.8 + (Math.random() - 0.5) * 0.4;
    gyroParticlePos[i * 3] = Math.cos(angle) * r;
    gyroParticlePos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
    gyroParticlePos[i * 3 + 2] = Math.sin(angle) * r;
  }
  const gyroParticleGeo = new THREE.BufferGeometry();
  gyroParticleGeo.setAttribute('position', new THREE.BufferAttribute(gyroParticlePos, 3));
  const gyroParticles = new THREE.Points(gyroParticleGeo, matParticle);
  groupSkills.add(gyroParticles);

  // ==========================================================================
  // SCENE 4: PROJECTS - Holographic Isometric Matrix & Cyber City (baseY: -45)
  // ==========================================================================
  const groupProjects = new THREE.Group();
  groupProjects.position.set(1.5, SCENE_DEFINITIONS[3].baseY, -1.0);
  groupProjects.rotation.x = Math.PI / 6; // Isometric perspective tilt
  groupProjects.rotation.y = -Math.PI / 4;
  scene.add(groupProjects);

  const isoCubeConfigs = generateIsometricCubes(5, 0.85);
  const isoMeshes: { mesh: THREE.Mesh; baseHeight: number; speed: number }[] = [];

  isoCubeConfigs.forEach((cfg) => {
    const cubeMeshGeo = new THREE.BoxGeometry(0.65, cfg.height, 0.65);
    const cubeMesh = new THREE.Mesh(cubeMeshGeo, matNode);
    cubeMesh.position.set(cfg.x, cfg.height / 2 - 1.2, cfg.z);
    groupProjects.add(cubeMesh);
    isoMeshes.push({ mesh: cubeMesh, baseHeight: cfg.height, speed: cfg.speed });
    toggleableMeshes.push(cubeMesh);
  });

  // Scanning laser plane
  const laserPlaneGeo = new THREE.PlaneGeometry(5, 5);
  const laserPlaneMat = new THREE.MeshBasicMaterial({
    color: palette.linkColor,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const laserPlane = new THREE.Mesh(laserPlaneGeo, laserPlaneMat);
  laserPlane.rotation.x = -Math.PI / 2;
  groupProjects.add(laserPlane);

  // Ground Grid Wireframe
  const gridHelper = new THREE.GridHelper(5.2, 10, palette.wireframeColor, palette.ringColor);
  gridHelper.position.y = -1.25;
  groupProjects.add(gridHelper);

  // ==========================================================================
  // SCENE 5: EXPERIENCE - Kinetic Chrono Helix & Progress Conduit (baseY: -60)
  // ==========================================================================
  const groupExperience = new THREE.Group();
  groupExperience.position.set(-1.5, SCENE_DEFINITIONS[4].baseY, -0.8);
  scene.add(groupExperience);

  const helixSteps = generateHelixCoordinates(24, 1.8, 5.5, 2.5);
  const helixPointsA: number[] = [];
  const helixPointsB: number[] = [];
  const rungLineCoords: number[] = [];

  helixSteps.forEach((step, idx) => {
    helixPointsA.push(step.strandA.x, step.strandA.y, step.strandA.z);
    helixPointsB.push(step.strandB.x, step.strandB.y, step.strandB.z);

    // Every other step has an energy rung connecting strands
    if (idx % 2 === 0) {
      rungLineCoords.push(
        step.strandA.x, step.strandA.y, step.strandA.z,
        step.strandB.x, step.strandB.y, step.strandB.z
      );
    }
  });

  const helixGeoA = new THREE.BufferGeometry();
  helixGeoA.setAttribute('position', new THREE.Float32BufferAttribute(helixPointsA, 3));
  const helixLineA = new THREE.Line(helixGeoA, matLine);

  const helixGeoB = new THREE.BufferGeometry();
  helixGeoB.setAttribute('position', new THREE.Float32BufferAttribute(helixPointsB, 3));
  const helixLineB = new THREE.Line(helixGeoB, matLine);

  const rungsGeo = new THREE.BufferGeometry();
  rungsGeo.setAttribute('position', new THREE.Float32BufferAttribute(rungLineCoords, 3));
  const rungsLines = new THREE.LineSegments(rungsGeo, matLine);

  groupExperience.add(helixLineA, helixLineB, rungsLines);

  // 3 Key Milestone Station Spheres along Helix (OCTA IT, UDD CS, CCNA)
  const milestoneIndices = [4, 12, 20];
  const milestoneMeshes: THREE.Mesh[] = [];
  milestoneIndices.forEach((idx, mIdx) => {
    const s = helixSteps[idx];
    const mat = mIdx === 0 ? matSecondary : mIdx === 1 ? matCore : matTertiary;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), mat);
    m.position.set(s.strandA.x, s.strandA.y, s.strandA.z);
    groupExperience.add(m);
    milestoneMeshes.push(m);
    toggleableMeshes.push(m);

    // Halo ring around milestone
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 24), matDatum);
    halo.position.set(s.strandA.x, s.strandA.y, s.strandA.z);
    halo.rotation.x = Math.PI / 4;
    groupExperience.add(halo);
  });

  // ==========================================================================
  // SCENE 6: CONTACT - Global Telemetry Satellite Beacon (baseY: -75)
  // ==========================================================================
  const groupContact = new THREE.Group();
  groupContact.position.y = SCENE_DEFINITIONS[5].baseY;
  scene.add(groupContact);

  // Planetary Geodesic Communication Sphere
  const globeGeo = new THREE.IcosahedronGeometry(1.6, 2);
  const globeWireGeo = new THREE.WireframeGeometry(globeGeo);
  const globeLine = new THREE.LineSegments(globeWireGeo, matLine);
  groupContact.add(globeLine);

  const innerBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), matNucleus);
  groupContact.add(innerBeacon);

  // Concentric Radiating Signal Wave Rings
  const waveRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const wGeo = new THREE.RingGeometry(1.8, 1.88, 48);
    const wMesh = new THREE.Mesh(wGeo, matDatum);
    wMesh.rotation.x = -Math.PI / 2;
    groupContact.add(wMesh);
    waveRings.push(wMesh);
  }

  // 3 Orbiting Satellites
  const satellites: { mesh: THREE.Mesh; orbitRadius: number; speed: number; angle: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const satGroup = new THREE.Group();
    const satBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), matNode);
    const satWingL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.1), matRing);
    satWingL.position.x = -0.22;
    const satWingR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.1), matRing);
    satWingR.position.x = 0.22;
    satGroup.add(satBody, satWingL, satWingR);

    groupContact.add(satGroup);
    satellites.push({
      mesh: satGroup as unknown as THREE.Mesh,
      orbitRadius: 2.5 + i * 0.4,
      speed: 0.6 + i * 0.2,
      angle: (i * Math.PI * 2) / 3,
    });
  }

  // ==========================================================================
  // SCROLL & INTERACTION TRACKING
  // ==========================================================================
  let scrollProgress = 0;
  let targetCameraY = initialSceneState.cameraPosition.y;
  let targetCameraX = initialSceneState.cameraPosition.x;
  let targetCameraZ = initialSceneState.cameraPosition.z;
  let targetLookAtY = initialSceneState.cameraLookAt.y;

  let currentCameraY = targetCameraY;
  let currentCameraX = targetCameraX;
  let currentCameraZ = targetCameraZ;
  let currentLookAtY = targetLookAtY;

  let mouseParallaxX = 0;
  let mouseParallaxY = 0;
  let autoRotate = true;
  let wireframeOnly = false;
  let activeSceneIndex = 0;

  const updateScrollState = () => {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = calculateScrollProgress(window.scrollY, maxScroll);
    const state = getActiveSceneState(scrollProgress);

    targetCameraX = state.cameraPosition.x;
    targetCameraY = state.cameraPosition.y;
    targetCameraZ = state.cameraPosition.z;
    targetLookAtY = state.cameraLookAt.y;

    if (activeSceneIndex !== state.activeIndex) {
      activeSceneIndex = state.activeIndex;
      dispatchActiveSceneChange(state.activeScene, activeSceneIndex);
    }
  };

  const onScroll = () => {
    updateScrollState();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateScrollState();

  // Mouse Parallax across the entire window
  const onPointerMove = (e: MouseEvent) => {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseParallaxX = normX * 0.45;
    mouseParallaxY = normY * 0.35;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // Resize handler
  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / (h || 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    updateScrollState();
  };
  window.addEventListener('resize', onResize);

  // Helper to notify UI HUD and Hero card of scene change
  function dispatchActiveSceneChange(sceneDef: typeof SCENE_DEFINITIONS[0], index: number) {
    const badge = document.getElementById('active-scene-badge');
    const title = document.getElementById('active-scene-title');
    const desc = document.getElementById('active-scene-desc');
    const dots = document.querySelectorAll('.scene-nav-dot');
    const heroChips = document.querySelectorAll('.scene-jump-chip');
    const heroHeading = document.getElementById('hero-current-scene-name');

    if (badge) badge.textContent = `Scene ${index + 1} / 6`;
    if (title) title.textContent = sceneDef.name;
    if (desc) desc.textContent = sceneDef.tagline;
    if (heroHeading) heroHeading.textContent = sceneDef.name;

    dots.forEach((dot, dIdx) => {
      dot.classList.toggle('active', dIdx === index);
    });

    heroChips.forEach((chip, cIdx) => {
      chip.classList.toggle('active', cIdx === index);
    });
  }

  // ==========================================================================
  // RENDER LOOP
  // ==========================================================================
  const clock = new THREE.Clock();
  let animationFrameId: number;

  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const time = clock.getElapsedTime();

    // 1. Smooth Camera Kinematics (Exponential Damping)
    currentCameraY = THREE.MathUtils.damp(currentCameraY, targetCameraY, 3.8, delta);
    currentCameraX = THREE.MathUtils.damp(currentCameraX, targetCameraX + mouseParallaxX, 3.5, delta);
    currentCameraZ = THREE.MathUtils.damp(currentCameraZ, targetCameraZ, 3.5, delta);
    currentLookAtY = THREE.MathUtils.damp(currentLookAtY, targetLookAtY, 3.8, delta);

    camera.position.set(currentCameraX, currentCameraY, currentCameraZ);
    camera.lookAt(0, currentLookAtY, 0);

    const spinMult = autoRotate ? 1 : 0.2;

    // 2. Animate Scene 1: Hero Core
    polyCore.rotation.y += 0.45 * delta * spinMult;
    polyCore.rotation.x = Math.sin(time * 0.5) * 0.15;
    ring1.rotation.z += 0.3 * delta * spinMult;
    ring2.rotation.y -= 0.35 * delta * spinMult;

    // Update Hero orbital nodes and dynamic lines
    orbitalConfigs.forEach((cfg, idx) => {
      const mesh = heroNodeMeshes[idx];
      const pos = updateNodePosition(cfg.angle, cfg.orbitRadius, cfg.orbitSpeed * spinMult, 1.0, time);
      mesh.position.set(pos.x, pos.y, pos.z);
    });

    // Update Hero line segments
    let lineIdx = 0;
    const heroLineArr = (heroLinesGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < heroNodeMeshes.length; i++) {
      const nextIdx = (i + 1) % heroNodeMeshes.length;
      const m1 = heroNodeMeshes[i].position;
      const m2 = heroNodeMeshes[nextIdx].position;
      heroLineArr[lineIdx++] = m1.x;
      heroLineArr[lineIdx++] = m1.y;
      heroLineArr[lineIdx++] = m1.z;
      heroLineArr[lineIdx++] = m2.x;
      heroLineArr[lineIdx++] = m2.y;
      heroLineArr[lineIdx++] = m2.z;
    }
    heroLinesGeo.attributes.position.needsUpdate = true;

    // Advance Hero packets
    const heroPacketArr = (heroPacketGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < heroPacketCount; i++) {
      heroPacketProgress[i] = advancePacketProgress(heroPacketProgress[i], 0.35 * spinMult, delta);
      const nodeA = heroNodeMeshes[i % heroNodeMeshes.length].position;
      const nodeB = heroNodeMeshes[(i + 2) % heroNodeMeshes.length].position;
      const p = heroPacketProgress[i];
      heroPacketArr[i * 3] = nodeA.x + (nodeB.x - nodeA.x) * p;
      heroPacketArr[i * 3 + 1] = nodeA.y + (nodeB.y - nodeA.y) * p;
      heroPacketArr[i * 3 + 2] = nodeA.z + (nodeB.z - nodeA.z) * p;
    }
    heroPacketGeo.attributes.position.needsUpdate = true;

    // 3. Animate Scene 2: About Neural Lattice
    groupAbout.rotation.y += 0.25 * delta * spinMult;
    dodecaMesh.rotation.x += 0.3 * delta * spinMult;
    dodecaMesh.rotation.z += 0.2 * delta * spinMult;
    neuralOuterRing.rotation.z += 0.15 * delta * spinMult;

    // 4. Animate Scene 3: Skills Gyroscope
    gyro1.rotation.x += 0.4 * delta * spinMult;
    gyro2.rotation.y += 0.5 * delta * spinMult;
    gyro3.rotation.z += 0.6 * delta * spinMult;
    gyroParticles.rotation.y -= 0.15 * delta * spinMult;

    // Orbit the 4 skill polyhedra
    const skillOrbitR = 1.6;
    polyLang.position.set(Math.cos(time * 0.8) * skillOrbitR, Math.sin(time * 0.8) * 0.4, Math.sin(time * 0.8) * skillOrbitR);
    polyCloud.position.set(Math.cos(time * 0.8 + Math.PI / 2) * skillOrbitR, Math.sin(time * 0.8 + 1) * 0.4, Math.sin(time * 0.8 + Math.PI / 2) * skillOrbitR);
    polyNet.position.set(Math.cos(time * 0.8 + Math.PI) * skillOrbitR, Math.sin(time * 0.8 + 2) * 0.4, Math.sin(time * 0.8 + Math.PI) * skillOrbitR);
    polyAuto.position.set(Math.cos(time * 0.8 + Math.PI * 1.5) * skillOrbitR, Math.sin(time * 0.8 + 3) * 0.4, Math.sin(time * 0.8 + Math.PI * 1.5) * skillOrbitR);

    polyLang.rotation.y += 0.6 * delta;
    polyCloud.rotation.x += 0.5 * delta;
    polyNet.rotation.z += 0.4 * delta;
    polyAuto.rotation.y += 0.7 * delta;

    // 5. Animate Scene 4: Projects Matrix
    isoMeshes.forEach((item, idx) => {
      const osc = Math.sin(time * item.speed + idx * 0.4) * 0.25;
      item.mesh.position.y = (item.baseHeight / 2 - 1.2) + osc;
    });
    laserPlane.position.y = -1.2 + Math.sin(time * 0.8) * 1.0;

    // 6. Animate Scene 5: Experience Chrono Helix
    groupExperience.rotation.y += 0.3 * delta * spinMult;
    milestoneMeshes.forEach((m, idx) => {
      const s = 1.0 + Math.sin(time * 2 + idx) * 0.12;
      m.scale.set(s, s, s);
    });

    // 7. Animate Scene 6: Contact Beacon
    globeLine.rotation.y += 0.2 * delta * spinMult;
    globeLine.rotation.x = Math.sin(time * 0.3) * 0.1;

    // Expanding concentric radio waves
    waveRings.forEach((w, idx) => {
      const cycle = ((time * 0.6 + idx * 0.33) % 1.0);
      const scale = 1.0 + cycle * 2.2;
      w.scale.set(scale, scale, 1);
      (w.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 * (1.0 - cycle));
    });

    // Satellites orbiting globe
    satellites.forEach((sat) => {
      sat.angle += sat.speed * delta * spinMult;
      sat.mesh.position.set(
        Math.cos(sat.angle) * sat.orbitRadius,
        Math.sin(sat.angle * 2) * 0.5,
        Math.sin(sat.angle) * sat.orbitRadius
      );
      sat.mesh.rotation.y = -sat.angle;
    });

    renderer.render(scene, camera);
  };

  animationFrameId = requestAnimationFrame(animate);

  // ==========================================================================
  // CONTROLS INTERFACE
  // ==========================================================================
  return {
    scrollToScene: (index: number) => {
      if (index < 0 || index >= SCENE_DEFINITIONS.length) return;
      const targetSec = document.getElementById(SCENE_DEFINITIONS[index].sectionId);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth' });
      }
    },
    toggleWireframe: () => {
      wireframeOnly = !wireframeOnly;
      toggleableMeshes.forEach((mesh) => {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => { (m as THREE.MeshStandardMaterial).wireframe = wireframeOnly; });
          } else {
            (mesh.material as THREE.MeshStandardMaterial).wireframe = wireframeOnly;
          }
        }
      });
      return wireframeOnly;
    },
    toggleAutoRotate: () => {
      autoRotate = !autoRotate;
      return autoRotate;
    },
    resetView: () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    updateTheme: (isDark: boolean) => {
      isDarkMode = isDark;
      palette = getScenePalette(isDark);

      matCore.color.setHex(palette.coreColor);
      matCoreWire.color.setHex(palette.wireframeColor);
      matNucleus.color.setHex(palette.coreColor);
      matNucleus.emissive.setHex(palette.coreEmissive);
      matRing.color.setHex(palette.ringColor);
      matNode.color.setHex(palette.nodeColor);
      matNode.emissive.setHex(palette.nodeColor);
      matSecondary.color.setHex(palette.secondaryAccent);
      matSecondary.emissive.setHex(palette.secondaryAccent);
      matTertiary.color.setHex(palette.tertiaryAccent);
      matTertiary.emissive.setHex(palette.tertiaryAccent);
      matLine.color.setHex(palette.linkColor);
      matParticle.color.setHex(palette.particleColor);
      matDatum.color.setHex(palette.linkColor);

      hemiLight.color.setHex(palette.lightKeyColor);
      hemiLight.groundColor.setHex(palette.lightFillColor);
      dirLight2.color.setHex(palette.particleColor);
      dirLight3.color.setHex(palette.secondaryAccent);
    },
    dispose: () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}

// Auto-initialize when loaded as module in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    let bgContainer = document.getElementById('portfolio-3d-bg');
    if (!bgContainer) {
      bgContainer = document.createElement('div');
      bgContainer.id = 'portfolio-3d-bg';
      bgContainer.className = 'portfolio-3d-bg';
      bgContainer.setAttribute('aria-hidden', 'true');
      document.body.prepend(bgContainer);
    }

    const controls = initPortfolio3DBackground(bgContainer);
    if (!controls) return;

    // Wire up floating 3D HUD controls
    const hudDots = document.querySelectorAll<HTMLButtonElement>('.scene-nav-dot');
    hudDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const sceneIdx = parseInt(dot.getAttribute('data-scene-idx') || '0', 10);
        controls.scrollToScene(sceneIdx);
      });
    });

    const hudWireframeBtn = document.getElementById('hud-btn-wireframe');
    hudWireframeBtn?.addEventListener('click', () => {
      const active = controls.toggleWireframe();
      hudWireframeBtn.classList.toggle('active', active);
    });

    const hudRotateBtn = document.getElementById('hud-btn-rotate');
    hudRotateBtn?.addEventListener('click', () => {
      const active = controls.toggleAutoRotate();
      hudRotateBtn.classList.toggle('active', active);
    });

    const hudResetBtn = document.getElementById('hud-btn-reset');
    hudResetBtn?.addEventListener('click', () => {
      controls.resetView();
    });

    // Wire up hero telemetry scene jump chips
    const heroChips = document.querySelectorAll<HTMLElement>('.scene-jump-chip');
    heroChips.forEach((chip, cIdx) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        controls.scrollToScene(cIdx);
      });
    });

    // Theme Switcher synchronization
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      controls.updateTheme(isDark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  });
}
