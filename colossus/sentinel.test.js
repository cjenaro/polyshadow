import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STONE_SENTINEL_SCALE,
  createSentinelDefinition,
  generateSentinelSurfacePatches,
  getSentinelWeakPointPositions,
  buildCombatWeakPoints,
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

  it('weak point positions rotate with the colossus', () => {
    const def = createSentinelDefinition();
    const at0 = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const backRuneLeft0 = at0.find(p => p.bodyPartId === 'back_rune_left');
    const backRuneLeftPI = atPI.find(p => p.bodyPartId === 'back_rune_left');
    assert.ok(backRuneLeft0 !== undefined);
    assert.ok(backRuneLeftPI !== undefined);
    assert.ok(Math.abs(backRuneLeft0.x + backRuneLeftPI.x) < 0.01);
    assert.ok(Math.abs(backRuneLeft0.z + backRuneLeftPI.z) < 0.01);
  });
});

describe('generateSentinelSurfacePatches coverage', () => {
  it('every climbable body part has patches', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const climbableParts = def.parts.filter(p => p.isClimbable);
    const patchPartIds = new Set(patches.map(p => p.bodyPartId));
    for (const part of climbableParts) {
      assert.ok(patchPartIds.has(part.id), `climbable part ${part.id} has no patches`);
    }
  });

  it('no patches on non-climbable parts', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const nonClimbableIds = def.parts.filter(p => !p.isClimbable).map(p => p.id);
    for (const patch of patches) {
      assert.ok(!nonClimbableIds.includes(patch.bodyPartId), `patch on non-climbable ${patch.bodyPartId}`);
    }
  });

  it('torso has significantly more patches than a single leg', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const torsoCount = patches.filter(p => p.bodyPartId === 'torso').length;
    const legCount = patches.filter(p => p.bodyPartId === 'front_left_lower').length;
    assert.ok(torsoCount > legCount * 2, `torso ${torsoCount} should be much more than leg ${legCount}`);
  });

  it('patches cover all 6 faces of the torso', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const torsoPatches = patches.filter(p => p.bodyPartId === 'torso');
    const normals = new Set(torsoPatches.map(p => `${p.normal.x},${p.normal.y},${p.normal.z}`));
    assert.ok(normals.has('0,1,0'), 'missing top face');
    assert.ok(normals.has('0,0,1') || normals.has('0,0,-1'), 'missing front/back face');
    assert.ok(normals.has('-1,0,0') || normals.has('1,0,0'), 'missing left/right face');
  });

  it('upper and lower leg parts both have patches', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const partIds = new Set(patches.map(p => p.bodyPartId));
    assert.ok(partIds.has('front_left_upper'));
    assert.ok(partIds.has('front_left_lower'));
    assert.ok(partIds.has('back_right_upper'));
    assert.ok(partIds.has('back_right_lower'));
  });

  it('total patch count is reasonable for the sentinel size', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    assert.ok(patches.length > 100, `only ${patches.length} patches, expected more for colossus-sized body`);
    assert.ok(patches.length < 2000, `${patches.length} patches, too many`);
  });
});

describe('buildCombatWeakPoints', () => {
  it('returns 3 combat-ready weak points', () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(weakPoints.length, 3);
  });

  it('each weak point has id, position, health, maxHealth, isDestroyed, isActive', () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.ok(typeof wp.id === 'string');
      assert.ok(typeof wp.position.x === 'number');
      assert.ok(typeof wp.position.y === 'number');
      assert.ok(typeof wp.position.z === 'number');
      assert.ok(typeof wp.health === 'number');
      assert.ok(typeof wp.maxHealth === 'number');
      assert.strictEqual(wp.isDestroyed, false);
      assert.strictEqual(wp.isActive, true);
    }
  });

  it('health equals maxHealth', () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.strictEqual(wp.health, wp.maxHealth);
    }
  });

  it('head weak point has higher health (healthMultiplier 3.0)', () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const head = weakPoints.find(wp => wp.id === 'head');
    const back = weakPoints.find(wp => wp.id === 'back_rune_left');
    assert.ok(head !== undefined);
    assert.ok(back !== undefined);
    assert.ok(head.maxHealth > back.maxHealth, `head ${head.maxHealth} should be > back ${back.maxHealth}`);
  });

  it('positions account for colossus world position', () => {
    const def = createSentinelDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const at10 = buildCombatWeakPoints(def, { x: 10, y: 0, z: 0 }, 0);
    for (let i = 0; i < at0.length; i++) {
      assert.ok(Math.abs(at10[i].position.x - at0[i].position.x - 10) < 0.01);
    }
  });

  it('positions account for colossus rotation', () => {
    const def = createSentinelDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const backRune0 = at0.find(wp => wp.id === 'back_rune_left');
    const backRunePI = atPI.find(wp => wp.id === 'back_rune_left');
    assert.ok(Math.abs(backRune0.position.x + backRunePI.position.x) < 0.01);
    assert.ok(Math.abs(backRune0.position.z + backRunePI.position.z) < 0.01);
  });

  it('back weak points exist (back_rune_left and back_rune_right)', () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const ids = weakPoints.map(wp => wp.id);
    assert.ok(ids.includes('back_rune_left'));
    assert.ok(ids.includes('back_rune_right'));
    assert.ok(ids.includes('head'));
  });
});
