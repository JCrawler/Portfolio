/**
 * Pure mathematical and configuration logic for the dynamic Three.js 3D scene.
 * Decoupled from WebGL context for unit-testing and deterministic verification.
 */

export type ScenePreset = 'algorithmic' | 'network' | 'automation';

export interface PresetStyle {
  name: ScenePreset;
  label: string;
  primaryColor: number;
  accentColor: number;
  coreColor: number;
  glowColor: number;
  rotationSpeedMultiplier: number;
  packetCount: number;
}

export const PRESETS: Record<ScenePreset, PresetStyle> = {
  algorithmic: {
    name: 'algorithmic',
    label: 'Algorithmic Core (Memetic Optimizer)',
    primaryColor: 0x6366f1, // Indigo
    accentColor: 0x818cf8, // Light indigo
    coreColor: 0x4f46e5,    // Deep indigo
    glowColor: 0xa5b4fc,    // Soft violet
    rotationSpeedMultiplier: 1.0,
    packetCount: 36,
  },
  network: {
    name: 'network',
    label: 'Network Topology (Cisco VLAN Mesh)',
    primaryColor: 0x06b6d4, // Cyan
    accentColor: 0x38bdf8, // Sky blue
    coreColor: 0x0284c7,    // Deep cyan
    glowColor: 0x67e8f9,    // Bright cyan
    rotationSpeedMultiplier: 1.25,
    packetCount: 48,
  },
  automation: {
    name: 'automation',
    label: 'Automation Matrix (n8n Pipeline)',
    primaryColor: 0x10b981, // Emerald green
    accentColor: 0x34d399, // Mint
    coreColor: 0x059669,    // Deep emerald
    glowColor: 0x6ee7b7,    // Soft green
    rotationSpeedMultiplier: 1.4,
    packetCount: 42,
  },
};

/**
 * Calculates a point along a dual-ring or helical trajectory for data packets.
 */
export function calculateHelicalPosition(
  index: number,
  total: number,
  time: number,
  radius: number,
  heightSpan: number
): { x: number; y: number; z: number } {
  const fraction = index / Math.max(1, total);
  const angle = fraction * Math.PI * 2 + time * 0.8;
  const y = Math.sin(angle * 2 + index) * (heightSpan * 0.5);
  const currentRadius = radius + Math.cos(angle * 3) * 0.2;
  const x = Math.cos(angle) * currentRadius;
  const z = Math.sin(angle) * currentRadius;
  return { x, y, z };
}

/**
 * Exponential frame-rate independent damping formula: 1 - exp(-lambda * dt)
 */
export function dampValue(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/**
 * Calculates camera distance to fit a bounding sphere inside a vertical FOV.
 */
export function calculateCameraDistance(fovDegrees: number, boundingRadius: number): number {
  const fovRadians = (fovDegrees * Math.PI) / 360; // half-angle
  return (boundingRadius / Math.sin(fovRadians)) * 1.15;
}
