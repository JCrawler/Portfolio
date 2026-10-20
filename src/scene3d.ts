import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PRESETS, ScenePreset, calculateHelicalPosition, dampValue } from './scene3d-logic.ts';

// Pre-allocated scratch objects to prevent garbage collection inside the 60fps render loop
const _vec3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3(1, 1, 1);

export class Scene3DController {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls | null = null;
  private pmremGenerator: THREE.PMREMGenerator;

  // Composite procedural group components
  private mainGroup: THREE.Group;
  private chassisMesh: THREE.Mesh;
  private outerRing: THREE.Mesh;
  private innerRing: THREE.Mesh;
  private crystalCore: THREE.Mesh;
  private innerGlow: THREE.Mesh;
  private satellitesGroup: THREE.Group;
  private contactShadow: THREE.Mesh;
  private dataPacketsMesh: THREE.InstancedMesh;

  // Lights
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.PointLight;

  // State
  private activePreset: ScenePreset = 'algorithmic';
  private isFullscreen = false;
  private isPaused = false;
  private speedMultiplier = 1.0;
  private isWireframe = false;
  private animFrameId: number | null = null;
  private lastTime = 0;
  private totalTime = 0;
  private pointerX = 0;
  private pointerY = 0;
  private targetRotX = 0;
  private targetRotY = 0;

  // Materials for fast dynamic updates
  private titaniumMat: THREE.MeshStandardMaterial;
  private brassMat: THREE.MeshStandardMaterial;
  private crystalMat: THREE.MeshPhysicalMaterial;
  private glowMat: THREE.MeshBasicMaterial;
  private packetMat: THREE.MeshBasicMaterial;
  private satelliteMat: THREE.MeshStandardMaterial;
  private shadowMat: THREE.MeshBasicMaterial;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'scene3d-canvas';
    this.container.appendChild(this.canvas);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // 1. Renderer initialization
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !isHeadless,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isHeadless;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Studio PBR Environment
    this.scene = new THREE.Scene();
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = this.pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 5.8);
    this.camera.lookAt(0, 0, 0);

    // 4. Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x818cf8, 0x0b0f19, 1.2);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    this.dirLight.position.set(4, 6, 4);
    if (!isHeadless) {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 15;
      this.dirLight.shadow.camera.left = -3;
      this.dirLight.shadow.camera.right = 3;
      this.dirLight.shadow.camera.top = 3;
      this.dirLight.shadow.camera.bottom = -3;
    }
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.PointLight(0x6366f1, 2.0, 12);
    this.rimLight.position.set(-4, -2, -3);
    this.scene.add(this.rimLight);

    // 5. Materials
    this.titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.88,
      roughness: 0.22,
    });

    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.95,
      roughness: 0.18,
    });

    this.crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x818cf8,
      transmission: 0.94,
      opacity: 1,
      transparent: true,
      roughness: 0.08,
      ior: 1.62,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    this.glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    this.satelliteMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.75,
      roughness: 0.3,
    });

    this.packetMat = new THREE.MeshBasicMaterial({
      color: 0xa5b4fc,
    });

    // 6. Assemble Composite 3D Subject Group
    this.mainGroup = new THREE.Group();
    this.scene.add(this.mainGroup);

    // Part 1: Outer faceted chassis ring
    const chassisGeo = new THREE.TorusGeometry(1.65, 0.09, 16, 48);
    this.chassisMesh = new THREE.Mesh(chassisGeo, this.titaniumMat);
    this.chassisMesh.castShadow = !isHeadless;
    this.mainGroup.add(this.chassisMesh);

    // Part 2: Gimbal Ring A (Brass counter-rotator)
    const ringAGeo = new THREE.TorusGeometry(1.35, 0.05, 12, 40);
    this.outerRing = new THREE.Mesh(ringAGeo, this.brassMat);
    this.outerRing.castShadow = !isHeadless;
    this.mainGroup.add(this.outerRing);

    // Part 3: Gimbal Ring B (Orthogonal counter-rotator)
    const ringBGeo = new THREE.TorusGeometry(1.08, 0.04, 12, 36);
    this.innerRing = new THREE.Mesh(ringBGeo, this.brassMat);
    this.innerRing.rotation.x = Math.PI / 2;
    this.innerRing.castShadow = !isHeadless;
    this.mainGroup.add(this.innerRing);

    // Part 4: Inner Optical Crystal Core (Memetic / Algorithmic Core)
    const coreGeo = new THREE.IcosahedronGeometry(0.72, 0);
    this.crystalCore = new THREE.Mesh(coreGeo, this.crystalMat);
    this.mainGroup.add(this.crystalCore);

    // Part 5: Inner Pulsing Core Light
    const glowGeo = new THREE.OctahedronGeometry(0.3, 0);
    this.innerGlow = new THREE.Mesh(glowGeo, this.glowMat);
    this.mainGroup.add(this.innerGlow);

    // Part 6: Satellite Network Nodes (6 peripheral nodes with connecting pylons)
    this.satellitesGroup = new THREE.Group();
    const pylonGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
    const nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const satGroup = new THREE.Group();
      satGroup.position.set(Math.cos(angle) * 1.9, Math.sin(angle) * 1.9, 0);

      const pylon = new THREE.Mesh(pylonGeo, this.titaniumMat);
      pylon.rotation.z = angle + Math.PI / 2;
      satGroup.add(pylon);

      const nodeMesh = new THREE.Mesh(nodeGeo, this.satelliteMat);
      satGroup.add(nodeMesh);

      const capMesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), this.glowMat);
      capMesh.position.set(0, 0, 0.1);
      satGroup.add(capMesh);

      this.satellitesGroup.add(satGroup);
    }
    this.mainGroup.add(this.satellitesGroup);

    // Part 7: Ground Contact Shadow (Radial gradient procedural canvas texture)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    this.contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), this.shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = -2.0;
    this.scene.add(this.contactShadow);

    // Part 8: Floating Data Packets (InstancedMesh)
    const packetGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    this.dataPacketsMesh = new THREE.InstancedMesh(packetGeo, this.packetMat, 48);
    this.scene.add(this.dataPacketsMesh);

    // Pre-warm WebGL shaders
    this.renderer.compile(this.scene, this.camera);

    // 7. Event listeners & Resize
    this.initControls();
    this.handleResize();
    window.addEventListener('resize', this.onResize);
    this.container.addEventListener('pointermove', this.onPointerMove);

    this.applyPreset('algorithmic');
    this.startLoop();
  }

  private initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    this.controls.enablePan = false;
    this.controls.enabled = this.isFullscreen;
  }

  private onPointerMove = (e: PointerEvent) => {
    if (this.isFullscreen) return;
    const rect = this.container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    this.targetRotY = x * 1.5;
    this.targetRotX = y * 1.2;
  };

  private onResize = () => {
    this.handleResize();
  };

  public handleResize() {
    const width = this.container.clientWidth || 300;
    const height = this.container.clientHeight || 300;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setFullscreen(fullscreen: boolean) {
    this.isFullscreen = fullscreen;
    if (this.controls) {
      this.controls.enabled = fullscreen;
    }
    setTimeout(() => this.handleResize(), 50);
  }

  public applyPreset(presetKey: ScenePreset) {
    const p = PRESETS[presetKey];
    if (!p) return;
    this.activePreset = presetKey;

    _color.setHex(p.primaryColor);
    this.crystalMat.color.copy(_color);

    _color.setHex(p.accentColor);
    this.brassMat.color.copy(_color);

    _color.setHex(p.glowColor);
    this.glowMat.color.copy(_color);
    this.packetMat.color.copy(_color);
    this.rimLight.color.copy(_color);

    this.speedMultiplier = p.rotationSpeedMultiplier;
  }

  public setWireframe(enabled: boolean) {
    this.isWireframe = enabled;
    this.titaniumMat.wireframe = enabled;
    this.brassMat.wireframe = enabled;
    this.crystalMat.wireframe = enabled;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public triggerPulse() {
    // Expand scale momentarily
    let pulseT = 0;
    const pulseInterval = setInterval(() => {
      pulseT += 0.1;
      const s = 1 + Math.sin(pulseT * Math.PI) * 0.35;
      this.crystalCore.scale.set(s, s, s);
      this.innerGlow.scale.set(s * 1.4, s * 1.4, s * 1.4);
      if (pulseT >= 1.0) {
        clearInterval(pulseInterval);
        this.crystalCore.scale.set(1, 1, 1);
        this.innerGlow.scale.set(1, 1, 1);
      }
    }, 16);
  }

  public updateTheme(theme: 'dark' | 'light') {
    if (theme === 'light') {
      this.hemiLight.color.setHex(0x4f46e5);
      this.hemiLight.groundColor.setHex(0xe2e8f0);
      this.dirLight.intensity = 2.4;
      this.shadowMat.opacity = 0.25;
    } else {
      this.hemiLight.color.setHex(0x818cf8);
      this.hemiLight.groundColor.setHex(0x0b0f19);
      this.dirLight.intensity = 2.2;
      this.shadowMat.opacity = 0.5;
    }
  }

  private startLoop() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.animFrameId = requestAnimationFrame(tick);
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      if (!this.isPaused) {
        this.totalTime += dt * this.speedMultiplier;

        // Animate gimbal rings
        this.outerRing.rotation.y += dt * 0.8 * this.speedMultiplier;
        this.innerRing.rotation.x += dt * 1.1 * this.speedMultiplier;
        this.satellitesGroup.rotation.z -= dt * 0.4 * this.speedMultiplier;

        // Core pulsation & rotation
        this.crystalCore.rotation.x += dt * 0.5 * this.speedMultiplier;
        this.crystalCore.rotation.y += dt * 0.7 * this.speedMultiplier;
        const pulse = 1 + Math.sin(this.totalTime * 3) * 0.05;
        this.innerGlow.scale.set(pulse, pulse, pulse);

        // Smooth interactive damping on main group when not full OrbitControls
        if (!this.isFullscreen) {
          this.pointerX = dampValue(this.pointerX, this.targetRotX, 6, dt);
          this.pointerY = dampValue(this.pointerY, this.targetRotY, 6, dt);
          this.mainGroup.rotation.x = this.pointerX;
          this.mainGroup.rotation.y = this.totalTime * 0.25 + this.pointerY;
        } else if (this.controls) {
          this.controls.update();
        }

        // Animate InstancedMesh data packets
        const count = 48;
        for (let i = 0; i < count; i++) {
          const pt = calculateHelicalPosition(i, count, this.totalTime, 2.1, 1.4);
          _pos.set(pt.x, pt.y, pt.z);
          _quat.setFromAxisAngle(_vec3.set(0, 1, 0), this.totalTime * 2 + i);
          _mat4.compose(_pos, _quat, _scale);
          this.dataPacketsMesh.setMatrixAt(i, _mat4);
        }
        this.dataPacketsMesh.instanceMatrix.needsUpdate = true;
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.controls) {
      this.controls.dispose();
    }
  }
}
