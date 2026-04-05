import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectLODLevel,
  isMobileDevice,
  LOD_LEVELS,
  LOD_THRESHOLDS,
  getShadowMapSize,
  getParticleCount,
  SHADOW_SIZE_DESKTOP,
  SHADOW_SIZE_MOBILE,
  PARTICLE_COUNT_DESKTOP,
  PARTICLE_COUNT_MOBILE,
} from './lod.js';

describe('selectLODLevel', () => {
  it('returns HIGH for close distance', () => {
    assert.strictEqual(selectLODLevel(10), LOD_LEVELS.HIGH);
  });

  it('returns MEDIUM for medium distance', () => {
    assert.strictEqual(selectLODLevel(50), LOD_LEVELS.MEDIUM);
  });

  it('returns LOW for far distance', () => {
    assert.strictEqual(selectLODLevel(100), LOD_LEVELS.LOW);
  });

  it('uses custom thresholds', () => {
    assert.strictEqual(selectLODLevel(5, [10, 20]), LOD_LEVELS.HIGH);
    assert.strictEqual(selectLODLevel(15, [10, 20]), LOD_LEVELS.MEDIUM);
    assert.strictEqual(selectLODLevel(25, [10, 20]), LOD_LEVELS.LOW);
  });

  it('returns HIGH at boundary just below first threshold', () => {
    assert.strictEqual(selectLODLevel(LOD_THRESHOLDS[0] - 0.01), LOD_LEVELS.HIGH);
  });

  it('returns MEDIUM at first threshold', () => {
    assert.strictEqual(selectLODLevel(LOD_THRESHOLDS[0]), LOD_LEVELS.MEDIUM);
  });

  it('returns LOW at second threshold', () => {
    assert.strictEqual(selectLODLevel(LOD_THRESHOLDS[1]), LOD_LEVELS.LOW);
  });

  it('handles zero distance', () => {
    assert.strictEqual(selectLODLevel(0), LOD_LEVELS.HIGH);
  });

  it('handles negative distance as HIGH', () => {
    assert.strictEqual(selectLODLevel(-5), LOD_LEVELS.HIGH);
  });

  it('returns correct levels across default threshold boundaries', () => {
    assert.strictEqual(selectLODLevel(29.9), LOD_LEVELS.HIGH);
    assert.strictEqual(selectLODLevel(30), LOD_LEVELS.MEDIUM);
    assert.strictEqual(selectLODLevel(79.9), LOD_LEVELS.MEDIUM);
    assert.strictEqual(selectLODLevel(80), LOD_LEVELS.LOW);
  });

  it('returns LOW for very large distance', () => {
    assert.strictEqual(selectLODLevel(10000), LOD_LEVELS.LOW);
  });
});

describe('isMobileDevice', () => {
  it('returns a boolean', () => {
    const result = isMobileDevice();
    assert.strictEqual(typeof result, 'boolean');
  });
});

describe('getShadowMapSize', () => {
  it('returns a positive number', () => {
    const size = getShadowMapSize();
    assert.ok(typeof size === 'number');
    assert.ok(size > 0);
  });

  it('returns either desktop or mobile size', () => {
    const size = getShadowMapSize();
    assert.ok(size === SHADOW_SIZE_DESKTOP || size === SHADOW_SIZE_MOBILE);
  });
});

describe('getParticleCount', () => {
  it('returns a positive integer', () => {
    const count = getParticleCount();
    assert.ok(Number.isInteger(count));
    assert.ok(count > 0);
  });

  it('returns either desktop or mobile count', () => {
    const count = getParticleCount();
    assert.ok(count === PARTICLE_COUNT_DESKTOP || count === PARTICLE_COUNT_MOBILE);
  });
});
