import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRESETS,
  calculateHelicalPosition,
  dampValue,
  calculateCameraDistance,
} from './scene3d-logic.ts';

test('PRESETS provides definitions for algorithmic, network, and automation', () => {
  assert.ok(PRESETS.algorithmic);
  assert.ok(PRESETS.network);
  assert.ok(PRESETS.automation);
  assert.equal(PRESETS.algorithmic.primaryColor, 0x6366f1);
  assert.equal(PRESETS.network.primaryColor, 0x06b6d4);
  assert.equal(PRESETS.automation.primaryColor, 0x10b981);
});

test('calculateHelicalPosition computes non-NaN finite coordinates', () => {
  const pos = calculateHelicalPosition(5, 36, 1.2, 2.5, 1.0);
  assert.ok(Number.isFinite(pos.x));
  assert.ok(Number.isFinite(pos.y));
  assert.ok(Number.isFinite(pos.z));
});

test('dampValue asymptotically approaches target', () => {
  let val = 0;
  const target = 10;
  for (let i = 0; i < 60; i++) {
    val = dampValue(val, target, 8, 1 / 60);
  }
  assert.ok(Math.abs(val - target) < 0.05);
});

test('calculateCameraDistance calculates positive distance for realistic FOV', () => {
  const dist = calculateCameraDistance(45, 3);
  assert.ok(dist > 3);
  assert.ok(Number.isFinite(dist));
});
