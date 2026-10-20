import test from 'node:test';
import assert from 'node:assert/strict';
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
  clampPitch,
  getScenePalette,
} from './scene-logic.ts';

test('calculateScrollProgress clamps correctly between 0 and 1', () => {
  assert.equal(calculateScrollProgress(0, 1000), 0);
  assert.equal(calculateScrollProgress(500, 1000), 0.5);
  assert.equal(calculateScrollProgress(1000, 1000), 1.0);
  assert.equal(calculateScrollProgress(-100, 1000), 0);
  assert.equal(calculateScrollProgress(2000, 1000), 1.0);
  assert.equal(calculateScrollProgress(100, 0), 0);
});

test('getActiveSceneState returns correct scene definitions and smooth camera targets across scroll', () => {
  // Start (hero)
  const heroState = getActiveSceneState(0);
  assert.equal(heroState.activeIndex, 0);
  assert.equal(heroState.activeScene.id, 'hero');
  assert.equal(heroState.cameraPosition.y, SCENE_DEFINITIONS[0].cameraOffset.y);

  // Midway through
  const midState = getActiveSceneState(0.5);
  assert.ok(midState.activeIndex >= 2 && midState.activeIndex <= 3);
  assert.ok(typeof midState.cameraPosition.y === 'number');
  assert.ok(midState.cameraPosition.y < 0);

  // End (contact)
  const endState = getActiveSceneState(1.0);
  assert.equal(endState.activeIndex, 5);
  assert.equal(endState.activeScene.id, 'contact');
});

test('generateOrbitalNodes creates specified count of nodes with valid coordinates', () => {
  const nodes = generateOrbitalNodes(8, 2.5);
  assert.equal(nodes.length, 8);
  for (const node of nodes) {
    assert.ok(node.id.startsWith('node-'));
    assert.ok(node.orbitRadius > 2.0);
    assert.ok(!isNaN(node.position.x));
    assert.ok(!isNaN(node.position.y));
    assert.ok(!isNaN(node.position.z));
  }
});

test('generateNeuralNetworkNodes generates points distributed on sphere surface', () => {
  const points = generateNeuralNetworkNodes(16, 2.0);
  assert.equal(points.length, 16);
  for (const pt of points) {
    const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
    assert.ok(Math.abs(dist - 2.0) < 0.05);
  }
});

test('generateIsometricCubes creates structured matrix of coordinates with height and speeds', () => {
  const cubes = generateIsometricCubes(5, 0.8);
  assert.equal(cubes.length, 25);
  for (const cube of cubes) {
    assert.ok(typeof cube.x === 'number');
    assert.ok(typeof cube.z === 'number');
    assert.ok(cube.height > 0);
    assert.ok(cube.speed > 0);
  }
});

test('generateHelixCoordinates creates dual synchronized helical strands', () => {
  const helix = generateHelixCoordinates(12, 1.5, 4.0, 2);
  assert.equal(helix.length, 12);
  for (const step of helix) {
    assert.ok(typeof step.strandA.x === 'number');
    assert.ok(typeof step.strandB.x === 'number');
    // Distance between corresponding points on dual strand should be ~2 * radius
    const dx = step.strandA.x - step.strandB.x;
    const dz = step.strandA.z - step.strandB.z;
    const strandDistance = Math.sqrt(dx * dx + dz * dz);
    assert.ok(Math.abs(strandDistance - 3.0) < 0.1);
  }
});

test('updateNodePosition calculates continuous coordinates around orbit with expansion', () => {
  const pos1 = updateNodePosition(0, 2.0, 1.0, 1.0, 0);
  assert.equal(Math.round(pos1.x * 100) / 100, 2.0);
  assert.equal(Math.round(pos1.z * 100) / 100, 0.0);

  const posExpanded = updateNodePosition(0, 2.0, 1.0, 1.5, 0);
  assert.equal(Math.round(posExpanded.x * 100) / 100, 3.0);
});

test('advancePacketProgress increments and wraps cyclically', () => {
  const progress1 = advancePacketProgress(0.2, 0.5, 1.0);
  assert.equal(Math.round(progress1 * 10) / 10, 0.7);

  const progressWrapped = advancePacketProgress(0.9, 0.3, 1.0);
  assert.equal(Math.round(progressWrapped * 10) / 10, 0.2);
});

test('clampPitch restricts angles within bounds', () => {
  assert.equal(clampPitch(0.5), 0.5);
  assert.equal(clampPitch(2.0, -1.0, 1.0), 1.0);
  assert.equal(clampPitch(-2.0, -1.0, 1.0), -1.0);
});

test('getScenePalette produces distinct color sets for dark and light mode', () => {
  const darkPalette = getScenePalette(true);
  const lightPalette = getScenePalette(false);

  assert.notEqual(darkPalette.ringColor, lightPalette.ringColor);
  assert.notEqual(darkPalette.particleColor, lightPalette.particleColor);
  assert.equal(darkPalette.bgAlpha, 0);
  assert.equal(lightPalette.bgAlpha, 0);
});
