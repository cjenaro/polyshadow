import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFogSystem,
  updateFogSystem,
  calculateFogDensity,
} from './fog.js';

describe('createFogSystem', () => {
  it('creates fog system with layers', () => {
    const fog = createFogSystem();
    assert.ok(Array.isArray(fog.layers));
  });

  it('default system has at least one layer', () => {
    const fog = createFogSystem();
    assert.ok(fog.layers.length >= 1);
  });

  it('accepts custom layers', () => {
    const layers = [
      { height: 5, thickness: 3, density: 0.8, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0.2, driftOffset: 0 },
    ];
    const fog = createFogSystem(layers);
    assert.strictEqual(fog.layers.length, 1);
    assert.strictEqual(fog.layers[0].height, 5);
    assert.strictEqual(fog.layers[0].density, 0.8);
  });

  it('initializes with time zero', () => {
    const fog = createFogSystem();
    assert.strictEqual(fog.time, 0);
  });

  it('layers have required properties', () => {
    const fog = createFogSystem();
    for (const layer of fog.layers) {
      assert.ok('height' in layer);
      assert.ok('thickness' in layer);
      assert.ok('density' in layer);
      assert.ok('color' in layer);
      assert.ok('driftSpeed' in layer);
      assert.ok('driftOffset' in layer);
      assert.ok('currentDensity' in layer);
    }
  });
});

describe('updateFogSystem', () => {
  it('advances time', () => {
    const fog = createFogSystem();
    const updated = updateFogSystem(fog, 0.1);
    assert.ok(updated.time > fog.time);
  });

  it('does not modify original system', () => {
    const fog = createFogSystem();
    const origTime = fog.time;
    updateFogSystem(fog, 0.1);
    assert.strictEqual(fog.time, origTime);
  });

  it('updates currentDensity on layers', () => {
    const fog = createFogSystem();
    const updated = updateFogSystem(fog, 1.0);
    for (let i = 0; i < fog.layers.length; i++) {
      const orig = fog.layers[i].currentDensity;
      const curr = updated.layers[i].currentDensity;
      if (fog.layers[i].density > 0) {
        assert.ok(typeof curr === 'number');
      }
    }
  });

  it('updates driftOffset on layers', () => {
    const fog = createFogSystem();
    const updated = updateFogSystem(fog, 1.0);
    for (let i = 0; i < fog.layers.length; i++) {
      const layer = fog.layers[i];
      if (layer.driftSpeed > 0) {
        assert.ok(updated.layers[i].driftOffset !== layer.driftOffset);
      }
    }
  });
});

describe('calculateFogDensity', () => {
  it('returns zero at height far from any layer', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 2, density: 0.8, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const d = calculateFogDensity(fog, 100);
    assert.ok(d < 0.001, `density at far height should be ~0, got ${d}`);
  });

  it('returns peak density at layer center height', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 2, density: 0.8, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const d = calculateFogDensity(fog, 10);
    assert.ok(d > 0.5, `density at center should be high, got ${d}`);
  });

  it('density decreases away from layer center', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 2, density: 0.9, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const dCenter = calculateFogDensity(fog, 10);
    const dEdge = calculateFogDensity(fog, 9);
    assert.ok(dCenter > dEdge, 'center should be denser than edge');
  });

  it('returns zero for empty layers', () => {
    const fog = createFogSystem([]);
    assert.strictEqual(calculateFogDensity(fog, 5), 0);
  });

  it('combines multiple overlapping layers', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 3, density: 0.5, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
      { height: 12, thickness: 3, density: 0.5, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const dSingle = createFogSystem([
      { height: 10, thickness: 3, density: 0.5, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const dOverlap = calculateFogDensity(fog, 11);
    const dOne = calculateFogDensity(dSingle, 11);
    assert.ok(dOverlap > dOne, 'overlapping layers should be denser');
  });

  it('density is clamped to [0, 1]', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 1, density: 2.0, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const d = calculateFogDensity(fog, 10);
    assert.ok(d >= 0 && d <= 1, `density should be in [0,1], got ${d}`);
  });

  it('uses currentDensity after update', () => {
    const fog = createFogSystem([
      { height: 10, thickness: 2, density: 0.5, color: { r: 0.5, g: 0.5, b: 0.5 }, driftSpeed: 0, driftOffset: 0 },
    ]);
    const updated = updateFogSystem(fog, 1.0);
    const d = calculateFogDensity(updated, 10);
    assert.ok(typeof d === 'number');
    assert.ok(d >= 0);
  });
});
