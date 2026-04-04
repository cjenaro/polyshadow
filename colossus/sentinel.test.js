import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STONE_SENTINEL_SCALE,
  createSentinelDefinition,
  generateSentinelSurfacePatches,
  getSentinelWeakPointPositions,
} from './sentinel.js';
import { getBodyHeight, getAllClimbableParts, getWeakPoints } from './base.js';

describe('STONE_SENTINEL_SCALE', () => {
  it('is 20', () => {
    assert.equal(STONE_SENTINEL_SCALE, 20);
  });
});

describe('createSentinelDefinition', () => {
  it('returns a valid body definition', () => {
    const def = createSentinelDefinition();
    assert.ok(def.parts && def.parts.length > 0);
  });

  it('has the expected part ids', () => {
    const def = createSentinelDefinition();
    const ids = def.parts.map(p => p.id);
    assert.ok(ids.includes('torso'));
    assert.ok(ids.includes('hips'));
    assert.ok(ids.includes('head'));
    assert.ok(ids.includes('front_left_upper'));
    assert.ok(ids.includes('front_left_lower'));
    assert.ok(ids.includes('front_right_upper'));
    assert.ok(ids.includes('front_right_lower'));
    assert.ok(ids.includes('back_left_upper'));
    assert.ok(ids.includes('back_left_lower'));
    assert.ok(ids.includes('back_right_upper'));
    assert.ok(ids.includes('back_right_lower'));
  });

  it('head is not climbable and is a weak point', () => {
    const def = createSentinelDefinition();
    const head = def.parts.find(p => p.id === 'head');
    assert.equal(head.isClimbable, false);
    assert.equal(head.isWeakPoint, true);
  });

  it('has exactly 3 weak points', () => {
    const def = createSentinelDefinition();
    const body = def;
    const weak = getWeakPoints(body);
    assert.equal(weak.length, 3);
  });

  it('total height is approximately 20 units', () => {
    const def = createSentinelDefinition();
    const height = getBodyHeight(def);
    assert.ok(height > 18 && height < 22, `height was ${height}`);
  });

  it('non-weak-point parts are not marked as weak points', () => {
    const def = createSentinelDefinition();
    for (const part of def.parts) {
      if (part.id === 'head') continue;
      if (part.name === 'Back Rune Left' || part.name === 'Back Rune Right') continue;
      assert.equal(part.isWeakPoint, false, `${part.id} should not be weak point`);
    }
  });
});

describe('generateSentinelSurfacePatches', () => {
  it('returns an array of surface patches', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    assert.ok(Array.isArray(patches));
    assert.ok(patches.length > 0);
  });

  it('each patch has the correct format', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    for (const patch of patches) {
      assert.ok(patch.position !== undefined, 'missing position');
      assert.ok(typeof patch.position.x === 'number', 'position.x not number');
      assert.ok(typeof patch.position.y === 'number', 'position.y not number');
      assert.ok(typeof patch.position.z === 'number', 'position.z not number');
      assert.ok(patch.normal !== undefined, 'missing normal');
      assert.ok(typeof patch.normal.x === 'number', 'normal.x not number');
      assert.ok(typeof patch.normal.y === 'number', 'normal.y not number');
      assert.ok(typeof patch.normal.z === 'number', 'normal.z not number');
      assert.equal(patch.climbable, true);
      assert.equal(typeof patch.bodyPartId, 'string');
    }
  });

  it('has patches for climbable parts (torso, legs)', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const partIds = new Set(patches.map(p => p.bodyPartId));
    assert.ok(partIds.has('torso'), 'missing torso patches');
    assert.ok(partIds.has('front_left_upper') || partIds.has('front_left_lower'), 'missing leg patches');
  });

  it('has no patches for head (not climbable)', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const headPatches = patches.filter(p => p.bodyPartId === 'head');
    assert.equal(headPatches.length, 0);
  });

  it('surface patches have valid normals (unit vectors)', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    for (const patch of patches) {
      const len = Math.sqrt(
        patch.normal.x ** 2 + patch.normal.y ** 2 + patch.normal.z ** 2
      );
      assert.ok(Math.abs(len - 1) < 0.01, `normal length was ${len}`);
    }
  });
});

describe('getSentinelWeakPointPositions', () => {
  it('returns 3 positions', () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(positions.length, 3);
  });

  it('each position has x, y, z', () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    for (const pos of positions) {
      assert.ok(typeof pos.x === 'number');
      assert.ok(typeof pos.y === 'number');
      assert.ok(typeof pos.z === 'number');
    }
  });

  it('head weak point is at approximately expected height', () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const headPart = def.parts.find(p => p.id === 'head');
    const headWP = positions.find(p => p.bodyPartId === 'head');
    assert.ok(headWP !== undefined);
    assert.ok(Math.abs(headWP.y - headPart.position.y) < 2, `head y was ${headWP.y}`);
  });
});
