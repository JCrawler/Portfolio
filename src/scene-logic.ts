/**
 * Pure mathematical, coordinate, and state helpers for the portfolio 3D scrollytelling background.
 * Decoupled from WebGL context for rock-solid testability.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface NetworkNodeConfig {
  id: string;
  label: string;
  type: 'router' | 'switch' | 'server' | 'pipeline' | 'worker';
  position: Vector3D;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
}

export interface SceneDefinition {
  id: string;
  name: string;
  sectionId: string;
  tagline: string;
  baseY: number;
  cameraOffset: Vector3D;
  cameraLookAt: Vector3D;
}

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: 'hero',
    name: 'Cybernetic Core',
    sectionId: 'hero',
    tagline: 'Algorithmic Nucleus & Topology',
    baseY: 0,
    cameraOffset: { x: 0, y: 0.8, z: 6.2 },
    cameraLookAt: { x: 0, y: 0, z: 0 },
  },
  {
    id: 'about',
    name: 'Neural Lattice',
    sectionId: 'about',
    tagline: 'Heuristics & Neural Architecture',
    baseY: -15,
    cameraOffset: { x: 1.2, y: -14.6, z: 6.0 },
    cameraLookAt: { x: 0, y: -15, z: 0 },
  },
  {
    id: 'skills',
    name: 'Tech Gyroscope',
    sectionId: 'skills',
    tagline: 'Multi-tiered Skills Ecosystem',
    baseY: -30,
    cameraOffset: { x: -1.0, y: -29.5, z: 6.4 },
    cameraLookAt: { x: 0, y: -30, z: 0 },
  },
  {
    id: 'projects',
    name: 'Isometric Matrix',
    sectionId: 'projects',
    tagline: 'Systems & Microservices Cityscape',
    baseY: -45,
    cameraOffset: { x: 1.5, y: -43.2, z: 6.5 },
    cameraLookAt: { x: 0, y: -45, z: 0 },
  },
  {
    id: 'experience',
    name: 'Chrono Helix',
    sectionId: 'experience',
    tagline: 'Career Evolution & Continuous Growth',
    baseY: -60,
    cameraOffset: { x: -1.2, y: -59.5, z: 6.2 },
    cameraLookAt: { x: 0, y: -60, z: 0 },
  },
  {
    id: 'contact',
    name: 'Satellite Beacon',
    sectionId: 'contact',
    tagline: 'Global Telemetry & Direct Signal',
    baseY: -75,
    cameraOffset: { x: 0, y: -74.5, z: 6.0 },
    cameraLookAt: { x: 0, y: -75, z: 0 },
  },
];

export interface ScenePalette {
  coreColor: number;
  coreEmissive: number;
  ringColor: number;
  nodeColor: number;
  linkColor: number;
  particleColor: number;
  lightKeyColor: number;
  lightFillColor: number;
  wireframeColor: number;
  secondaryAccent: number;
  tertiaryAccent: number;
  bgAlpha: number;
}

/**
 * Calculates continuous scroll progress clamped between 0 and 1.
 */
export function calculateScrollProgress(scrollY: number, maxScroll: number): number {
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, scrollY / maxScroll));
}

/**
 * Determines current active scene index and smooth interpolated camera coordinates.
 */
export function getActiveSceneState(scrollProgress: number): {
  activeIndex: number;
  activeScene: SceneDefinition;
  cameraPosition: Vector3D;
  cameraLookAt: Vector3D;
} {
  const sceneCount = SCENE_DEFINITIONS.length;
  const scaledProgress = scrollProgress * (sceneCount - 1);
  const activeIndex = Math.min(Math.floor(scaledProgress), sceneCount - 2);
  const localFactor = scaledProgress - activeIndex;

  const current = SCENE_DEFINITIONS[activeIndex];
  const next = SCENE_DEFINITIONS[Math.min(activeIndex + 1, sceneCount - 1)];

  // Smooth Hermite interpolation factor
  const t = localFactor * localFactor * (3 - 2 * localFactor);

  const cameraPosition: Vector3D = {
    x: current.cameraOffset.x + (next.cameraOffset.x - current.cameraOffset.x) * t,
    y: current.cameraOffset.y + (next.cameraOffset.y - current.cameraOffset.y) * t,
    z: current.cameraOffset.z + (next.cameraOffset.z - current.cameraOffset.z) * t,
  };

  const cameraLookAt: Vector3D = {
    x: current.cameraLookAt.x + (next.cameraLookAt.x - current.cameraLookAt.x) * t,
    y: current.cameraLookAt.y + (next.cameraLookAt.y - current.cameraLookAt.y) * t,
    z: current.cameraLookAt.z + (next.cameraLookAt.z - current.cameraLookAt.z) * t,
  };

  const dominantIndex = Math.round(scaledProgress);
  return {
    activeIndex: Math.min(dominantIndex, sceneCount - 1),
    activeScene: SCENE_DEFINITIONS[Math.min(dominantIndex, sceneCount - 1)],
    cameraPosition,
    cameraLookAt,
  };
}

/**
 * Generates initial orbital positions for network and pipeline nodes (Scene 1).
 */
export function generateOrbitalNodes(count: number, baseRadius: number = 2.4): NetworkNodeConfig[] {
  const nodeTypes: ('router' | 'switch' | 'server' | 'pipeline' | 'worker')[] = [
    'router',
    'switch',
    'server',
    'pipeline',
    'worker',
    'router',
    'pipeline',
    'server',
  ];

  const labels = [
    'VLAN Core',
    'Memetic Alg',
    'n8n Webhook',
    'Tabu Search',
    'Supabase DB',
    'ACL Firewall',
    'Render Node',
    'CCNA Gateway',
  ];

  const nodes: NetworkNodeConfig[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = baseRadius + (i % 2 === 0 ? 0.35 : -0.25);
    const heightVariation = Math.sin(angle * 2) * 0.45;

    nodes.push({
      id: `node-${i}`,
      label: labels[i % labels.length],
      type: nodeTypes[i % nodeTypes.length],
      orbitRadius: radius,
      orbitSpeed: 0.35 + (i % 3) * 0.12,
      angle: angle,
      position: {
        x: Math.cos(angle) * radius,
        y: heightVariation,
        z: Math.sin(angle) * radius,
      },
    });
  }

  return nodes;
}

/**
 * Generates positions for Neural Synaptic Lattice nodes on a sphere (Scene 2).
 */
export function generateNeuralNetworkNodes(count: number, radius: number = 2.2): Vector3D[] {
  const points: Vector3D[] = [];
  const phi = Math.PI * (Math.sqrt(5) - 1); // Golden ratio angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    points.push({
      x: Math.cos(theta) * radiusAtY * radius,
      y: y * radius,
      z: Math.sin(theta) * radiusAtY * radius,
    });
  }

  return points;
}

/**
 * Generates isometric city/server blocks for projects (Scene 4).
 */
export function generateIsometricCubes(gridSize: number, spacing: number = 0.85): {
  x: number;
  y: number;
  z: number;
  height: number;
  speed: number;
}[] {
  const cubes: { x: number; y: number; z: number; height: number; speed: number }[] = [];
  const half = (gridSize - 1) / 2;

  for (let ix = 0; ix < gridSize; ix++) {
    for (let iz = 0; iz < gridSize; iz++) {
      const distFromCenter = Math.sqrt((ix - half) ** 2 + (iz - half) ** 2);
      const height = Math.max(0.4, 2.2 - distFromCenter * 0.45 + (Math.sin(ix * 3 + iz) * 0.3));
      cubes.push({
        x: (ix - half) * spacing,
        y: 0,
        z: (iz - half) * spacing,
        height,
        speed: 0.8 + Math.random() * 0.6,
      });
    }
  }

  return cubes;
}

/**
 * Generates double-helix coordinates for career trajectory (Scene 5).
 */
export function generateHelixCoordinates(
  count: number,
  radius: number = 1.6,
  height: number = 5.0,
  turns: number = 2.5
): { strandA: Vector3D; strandB: Vector3D; progress: number }[] {
  const items: { strandA: Vector3D; strandB: Vector3D; progress: number }[] = [];

  for (let i = 0; i < count; i++) {
    const p = i / (count - 1);
    const angle = p * Math.PI * 2 * turns;
    const y = (p - 0.5) * height;

    items.push({
      strandA: {
        x: Math.cos(angle) * radius,
        y: y,
        z: Math.sin(angle) * radius,
      },
      strandB: {
        x: Math.cos(angle + Math.PI) * radius,
        y: y,
        z: Math.sin(angle + Math.PI) * radius,
      },
      progress: p,
    });
  }

  return items;
}

/**
 * Calculates updated node positions based on elapsed time and target expansion ratio.
 */
export function updateNodePosition(
  baseAngle: number,
  orbitRadius: number,
  orbitSpeed: number,
  expansion: number,
  time: number
): Vector3D {
  const currentAngle = baseAngle + time * orbitSpeed;
  const currentRadius = orbitRadius * expansion;
  return {
    x: Math.cos(currentAngle) * currentRadius,
    y: Math.sin(currentAngle * 2) * 0.45 * expansion,
    z: Math.sin(currentAngle) * currentRadius,
  };
}

/**
 * Advances a data packet's progress along a node-to-node line.
 */
export function advancePacketProgress(currentProgress: number, speed: number, delta: number): number {
  let next = currentProgress + speed * delta;
  if (next > 1) {
    next = next % 1;
  }
  return next;
}

/**
 * Clamps vertical pitch angle so the camera or model does not invert.
 */
export function clampPitch(pitch: number, min: number = -Math.PI / 3, max: number = Math.PI / 3): number {
  return Math.max(min, Math.min(max, pitch));
}

/**
 * Returns color palettes harmonized for Dark and Light themes.
 */
export function getScenePalette(isDark: boolean): ScenePalette {
  if (isDark) {
    return {
      coreColor: 0x6366f1,        // Electric Indigo
      coreEmissive: 0x4338ca,     // Deep Indigo Glow
      ringColor: 0x334155,        // Slate metallic
      nodeColor: 0x06b6d4,        // Cyan Data Node
      linkColor: 0x818cf8,        // Translucent Indigo Link
      particleColor: 0x38bdf8,    // Sky Blue Data Packet
      lightKeyColor: 0x818cf8,    // Indigo Key
      lightFillColor: 0x0ea5e9,   // Sky Blue Fill
      wireframeColor: 0xa5b4fc,   // High-contrast wireframe
      secondaryAccent: 0x10b981,  // Emerald
      tertiaryAccent: 0xf59e0b,   // Amber
      bgAlpha: 0,                 // Transparent for HTML layering
    };
  } else {
    return {
      coreColor: 0x4f46e5,        // Deep Royal Indigo
      coreEmissive: 0x312e81,     // Rich Navy Glow
      ringColor: 0x94a3b8,        // Polished Titanium Slate
      nodeColor: 0x0284c7,        // Deep Sky Blue Node
      linkColor: 0x6366f1,        // Crisp Indigo Link
      particleColor: 0x2563eb,    // Cobalt Packet
      lightKeyColor: 0x4338ca,    // Rich Blue Key
      lightFillColor: 0x38bdf8,   // Cyan Fill
      wireframeColor: 0x4338ca,   // Dark Indigo wireframe
      secondaryAccent: 0x059669,  // Rich Emerald
      tertiaryAccent: 0xd97706,   // Warm Amber
      bgAlpha: 0,
    };
  }
}
