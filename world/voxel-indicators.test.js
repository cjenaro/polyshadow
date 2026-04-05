import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVoxelArrowMesh,
  getIndicatorPosition,
  updateIndicatorOpacity
} from './voxel-indicators.js';

describe('createVoxelArrowMesh', () => {
  it('returns an object with voxels array, color, and glow', () => {
    const arrow = createVoxelArrowMesh();
    assert.ok(Array.isArray(arrow.voxels));
    assert.ok(Array.isArray(arrow.color));
    assert.equal(arrow.color.length, 3);
    assert.equal(typeof arrow.glow, 'boolean');
  });

  it('returns correct total voxel count (stem + head)', () => {
    const arrow = createVoxelArrowMesh();
    const STEM_VOXELS = 3;
    const HEAD_VOXELS = 3;
    assert.equal(arrow.voxels.length, STEM_VOXELS + HEAD_VOXELS);
  });

  it('each voxel has x, y, z, and blockType', () => {
    const arrow = createVoxelArrowMesh();
    for (const v of arrow.voxels) {
      assert.ok(typeof v.x === 'number', 'voxel x should be a number');
      assert.ok(typeof v.y === 'number', 'voxel y should be a number');
      assert.ok(typeof v.z === 'number', 'voxel z should be a number');
      assert.ok(typeof v.blockType === 'string', 'voxel blockType should be a string');
    }
  });
});

describe('getIndicatorPosition', () => {
  it('places indicator in correct direction from player', () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 100, y: 0, z: 0 };
    const pos = getIndicatorPosition(playerPos, colossusPos, 20);
    assert.ok(pos.x > 0, 'indicator should be in positive x direction');
    assert.equal(pos.z, 0);
  });

  it('uses correct distance (20 units default)', () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 100, y: 0, z: 0 };
    const pos = getIndicatorPosition(playerPos, colossusPos, 20);
    const dx = pos.x - playerPos.x;
    const dz = pos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    assert.ok(Math.abs(dist - 20) < 0.01, `expected distance 20, got ${dist}`);
  });

  it('applies height offset of 3 units above player', () => {
    const playerPos = { x: 0, y: 5, z: 0 };
    const colossusPos = { x: 100, y: 0, z: 0 };
    const pos = getIndicatorPosition(playerPos, colossusPos, 20);
    assert.equal(pos.y, playerPos.y + 3);
  });

  it('uses default distance when not specified', () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 100, y: 0, z: 0 };
    const pos = getIndicatorPosition(playerPos, colossusPos);
    const dx = pos.x - playerPos.x;
    const dz = pos.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    assert.ok(Math.abs(dist - 20) < 0.01);
  });

  it('handles arbitrary directions correctly', () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 50 };
    const pos = getIndicatorPosition(playerPos, colossusPos, 20);
    const dx = pos.x - playerPos.x;
    const dz = pos.z - playerPos.z;
    assert.ok(Math.abs(dx) < 0.01, 'x should be ~0');
    assert.ok(dz > 0, 'z should be positive');
  });
});

describe('updateIndicatorOpacity', () => {
  it('returns array of opacity entries for each indicator', () => {
    const indicators = [{ colossusId: 'c1' }, { colossusId: 'c2' }];
    const colossi = [
      { id: 'c1', x: 100, z: 0, defeated: false },
      { id: 'c2', x: 200, z: 0, defeated: false }
    ];
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateIndicatorOpacity(indicators, colossi, playerPos);
    assert.equal(result.length, 2);
    for (const entry of result) {
      assert.ok(typeof entry.indicatorIndex === 'number');
      assert.ok(typeof entry.opacity === 'number');
    }
  });

  it('returns 0 when very close to colossus (< 15 units)', () => {
    const indicators = [{ colossusId: 'c1' }];
    const colossi = [{ id: 'c1', x: 10, z: 0, defeated: false }];
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateIndicatorOpacity(indicators, colossi, playerPos);
    assert.equal(result[0].opacity, 0);
  });

  it('returns 1 when far from colossus (> 20 units)', () => {
    const indicators = [{ colossusId: 'c1' }];
    const colossi = [{ id: 'c1', x: 100, z: 0, defeated: false }];
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateIndicatorOpacity(indicators, colossi, playerPos);
    assert.equal(result[0].opacity, 1);
  });

  it('returns smooth transition values between 15 and 20 units', () => {
    const indicators = [{ colossusId: 'c1' }];
    const colossi = [{ id: 'c1', x: 17.5, z: 0, defeated: false }];
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateIndicatorOpacity(indicators, colossi, playerPos);
    assert.ok(result[0].opacity > 0, 'opacity should be > 0');
    assert.ok(result[0].opacity < 1, 'opacity should be < 1');
  });

  it('returns 0 for defeated colossi', () => {
    const indicators = [{ colossusId: 'c1' }];
    const colossi = [{ id: 'c1', x: 100, z: 0, defeated: true }];
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateIndicatorOpacity(indicators, colossi, playerPos);
    assert.equal(result[0].opacity, 0);
  });
});
