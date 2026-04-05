import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIDE_TITAN_SCALE,
  TITAN_BEHAVIOR_CONFIG,
  createTitanDefinition,
  generateTitanSurfacePatches,
  getTitanWeakPointPositions,
  buildCombatWeakPoints,
  createTitanBehaviorState,
  updateTitanBehavior,
  getTitanPhase,
  getShellTilt,
  isArenaSubmerged,
  getSubmergeWarning,
  triggerTitanPhase2,
  getShockwaveForce,
  createTitanMesh,
  animateTitan,
  setTHREE,
} from './titan.js';
import { createColossusBody, getWeakPoints, getAllClimbableParts, getBodyBounds } from './base.js';
import { ColossusState } from './behavior.js';

describe('createTitanDefinition', () => {
  it('returns a valid body definition', () => {
    const def = createTitanDefinition();
    assert.ok(def.parts && def.parts.length > 0);
  });

  it('has exactly 4 weak points', () => {
    const def = createTitanDefinition();
    const weak = getWeakPoints(def);
    assert.equal(weak.length, 4);
  });

  it('weak points are shell_rune_left, shell_rune_right, shell_rune_center, and head', () => {
    const def = createTitanDefinition();
    const weak = getWeakPoints(def);
    const ids = weak.map(w => w.id);
    assert.ok(ids.includes('shell_rune_left'));
    assert.ok(ids.includes('shell_rune_right'));
    assert.ok(ids.includes('shell_rune_center'));
    assert.ok(ids.includes('head'));
  });

  it('head is not climbable and is a weak point with healthMultiplier 3.0', () => {
    const def = createTitanDefinition();
    const head = def.parts.find(p => p.id === 'head');
    assert.equal(head.isClimbable, false);
    assert.equal(head.isWeakPoint, true);
    assert.equal(head.healthMultiplier, 3.0);
  });

  it('shell rune parts are not climbable and are weak points', () => {
    const def = createTitanDefinition();
    for (const runeId of ['shell_rune_left', 'shell_rune_right', 'shell_rune_center']) {
      const rune = def.parts.find(p => p.id === runeId);
      assert.equal(rune.isClimbable, false, `${runeId} should not be climbable`);
      assert.equal(rune.isWeakPoint, true, `${runeId} should be weak point`);
    }
  });

  it('shell parts are climbable and not weak points', () => {
    const def = createTitanDefinition();
    for (const shellId of ['shell_main', 'shell_front', 'shell_rear', 'underbelly']) {
      const shell = def.parts.find(p => p.id === shellId);
      assert.equal(shell.isClimbable, true, `${shellId} should be climbable`);
      assert.equal(shell.isWeakPoint, false, `${shellId} should not be weak point`);
    }
  });

  it('non-weak-point parts are not marked as weak points', () => {
    const def = createTitanDefinition();
    const runeIds = ['shell_rune_left', 'shell_rune_right', 'shell_rune_center', 'head'];
    for (const part of def.parts) {
      if (runeIds.includes(part.id)) continue;
      assert.equal(part.isWeakPoint, false, `${part.id} should not be weak point`);
    }
  });

  it('total width is approximately 40 units', () => {
    const def = createTitanDefinition();
    const body = createColossusBody(def);
    const bounds = getBodyBounds(body);
    const width = bounds.max.x - bounds.min.x;
    assert.ok(width > 35 && width < 45, `width was ${width}`);
  });

  it('total height is approximately 10-14 units (wide and low)', () => {
    const def = createTitanDefinition();
    const body = createColossusBody(def);
    const height = getBodyBounds(body).max.y - getBodyBounds(body).min.y;
    assert.ok(height > 8 && height < 14, `height was ${height}`);
  });

  it('shell_main is the largest part by volume', () => {
    const def = createTitanDefinition();
    const shell = def.parts.find(p => p.id === 'shell_main');
    for (const part of def.parts) {
      if (part.id === 'shell_main') continue;
      const shellVol = shell.dimensions.width * shell.dimensions.height * shell.dimensions.depth;
      const partVol = part.dimensions.width * part.dimensions.height * part.dimensions.depth;
      assert.ok(shellVol >= partVol, `shell_main volume ${shellVol} should be >= ${part.id} volume ${partVol}`);
    }
  });

  it('all part types are from valid set', () => {
    const def = createTitanDefinition();
    const validTypes = new Set(['core', 'limb_upper', 'limb_lower', 'head']);
    for (const part of def.parts) {
      assert.ok(validTypes.has(part.type), `${part.id} has invalid type ${part.type}`);
    }
  });
});

describe('generateTitanSurfacePatches', () => {
  it('returns an array of surface patches', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    assert.ok(Array.isArray(patches));
    assert.ok(patches.length > 0);
  });

  it('has patches for climbable parts', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    const partIds = new Set(patches.map(p => p.bodyPartId));
    assert.ok(partIds.has('shell_main'), 'missing shell_main patches');
    assert.ok(partIds.has('underbelly'), 'missing underbelly patches');
    assert.ok(partIds.has('left_leg_front'), 'missing leg patches');
  });

  it('has no patches for non-climbable parts (head, runes)', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    const nonClimbableIds = def.parts.filter(p => !p.isClimbable).map(p => p.id);
    for (const patch of patches) {
      assert.ok(!nonClimbableIds.includes(patch.bodyPartId), `patch on non-climbable ${patch.bodyPartId}`);
    }
  });

  it('surface patches have valid normals (unit vectors)', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    for (const patch of patches) {
      const len = Math.sqrt(patch.normal.x ** 2 + patch.normal.y ** 2 + patch.normal.z ** 2);
      assert.ok(Math.abs(len - 1) < 0.01, `normal length was ${len}`);
    }
  });

  it('every climbable body part has patches', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    const climbableParts = def.parts.filter(p => p.isClimbable);
    const patchPartIds = new Set(patches.map(p => p.bodyPartId));
    for (const part of climbableParts) {
      assert.ok(patchPartIds.has(part.id), `climbable part ${part.id} has no patches`);
    }
  });

  it('shell_main has the most patches of any single part', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    const counts = {};
    for (const p of patches) {
      counts[p.bodyPartId] = (counts[p.bodyPartId] || 0) + 1;
    }
    const shellMainCount = counts['shell_main'] || 0;
    for (const [partId, count] of Object.entries(counts)) {
      if (partId !== 'shell_main') {
        assert.ok(shellMainCount > count, `shell_main (${shellMainCount}) should have more patches than ${partId} (${count})`);
      }
    }
  });

  it('patches cover multiple faces of shell_main', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    const shellPatches = patches.filter(p => p.bodyPartId === 'shell_main');
    const normals = new Set(shellPatches.map(p => `${p.normal.x},${p.normal.y},${p.normal.z}`));
    assert.ok(normals.has('0,1,0'), 'missing top face');
    assert.ok(normals.has('0,0,1') || normals.has('0,0,-1'), 'missing front/back face');
    assert.ok(normals.has('-1,0,0') || normals.has('1,0,0'), 'missing left/right face');
  });

  it('total patch count is reasonable for titan size', () => {
    const def = createTitanDefinition();
    const patches = generateTitanSurfacePatches(def);
    assert.ok(patches.length > 500, `only ${patches.length} patches, expected more for titan-sized body`);
    assert.ok(patches.length < 5000, `${patches.length} patches, too many`);
  });
});

describe('getTitanWeakPointPositions', () => {
  it('returns 4 positions', () => {
    const def = createTitanDefinition();
    const positions = getTitanWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(positions.length, 4);
  });

  it('each position has x, y, z and bodyPartId', () => {
    const def = createTitanDefinition();
    const positions = getTitanWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    for (const pos of positions) {
      assert.ok(typeof pos.x === 'number');
      assert.ok(typeof pos.y === 'number');
      assert.ok(typeof pos.z === 'number');
      assert.ok(typeof pos.bodyPartId === 'string');
    }
  });

  it('positions rotate with the colossus', () => {
    const def = createTitanDefinition();
    const at0 = getTitanWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = getTitanWeakPointPositions(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const runeLeft0 = at0.find(p => p.bodyPartId === 'shell_rune_left');
    const runeLeftPI = atPI.find(p => p.bodyPartId === 'shell_rune_left');
    assert.ok(runeLeft0 !== undefined);
    assert.ok(runeLeftPI !== undefined);
    assert.ok(Math.abs(runeLeft0.x + runeLeftPI.x) < 0.01);
    assert.ok(Math.abs(runeLeft0.z + runeLeftPI.z) < 0.01);
  });

  it('positions shift with colossus world position', () => {
    const def = createTitanDefinition();
    const at0 = getTitanWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const at10 = getTitanWeakPointPositions(def, { x: 10, y: 0, z: 0 }, 0);
    for (let i = 0; i < at0.length; i++) {
      assert.ok(Math.abs(at10[i].x - at0[i].x - 10) < 0.01, `part ${at0[i].bodyPartId} x offset wrong`);
    }
  });
});

describe('buildCombatWeakPoints', () => {
  it('returns 4 combat-ready weak points', () => {
    const def = createTitanDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(weakPoints.length, 4);
  });

  it('each weak point has id, position, health, maxHealth, isDestroyed, isActive', () => {
    const def = createTitanDefinition();
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

  it('health equals maxHealth for all weak points', () => {
    const def = createTitanDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.strictEqual(wp.health, wp.maxHealth);
    }
  });

  it('head has highest health (healthMultiplier 3.0)', () => {
    const def = createTitanDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const head = weakPoints.find(wp => wp.id === 'head');
    const center = weakPoints.find(wp => wp.id === 'shell_rune_center');
    const side = weakPoints.find(wp => wp.id === 'shell_rune_left');
    assert.ok(head.maxHealth > center.maxHealth, `head ${head.maxHealth} should be > center ${center.maxHealth}`);
    assert.ok(head.maxHealth > side.maxHealth, `head ${head.maxHealth} should be > side ${side.maxHealth}`);
  });

  it('center rune has higher health than side runes', () => {
    const def = createTitanDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const center = weakPoints.find(wp => wp.id === 'shell_rune_center');
    const left = weakPoints.find(wp => wp.id === 'shell_rune_left');
    const right = weakPoints.find(wp => wp.id === 'shell_rune_right');
    assert.ok(center.maxHealth > left.maxHealth, `center ${center.maxHealth} should be > left ${left.maxHealth}`);
    assert.ok(center.maxHealth > right.maxHealth, `center ${center.maxHealth} should be > right ${right.maxHealth}`);
  });

  it('positions account for colossus world position', () => {
    const def = createTitanDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const at10 = buildCombatWeakPoints(def, { x: 10, y: 0, z: 0 }, 0);
    for (let i = 0; i < at0.length; i++) {
      assert.ok(Math.abs(at10[i].position.x - at0[i].position.x - 10) < 0.01);
    }
  });

  it('positions account for colossus rotation', () => {
    const def = createTitanDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const rune0 = at0.find(wp => wp.id === 'shell_rune_left');
    const runePI = atPI.find(wp => wp.id === 'shell_rune_left');
    assert.ok(Math.abs(rune0.position.x + runePI.position.x) < 0.01);
    assert.ok(Math.abs(rune0.position.z + runePI.position.z) < 0.01);
  });
});

describe('createTitanBehaviorState', () => {
  it('returns default state with phase 1 and full health', () => {
    const state = createTitanBehaviorState();
    assert.strictEqual(state.phase, 1);
    assert.strictEqual(state.state, ColossusState.IDLE);
    assert.strictEqual(state.health, TITAN_BEHAVIOR_CONFIG.maxHealth);
  });

  it('accepts overrides', () => {
    const state = createTitanBehaviorState({ health: 50, phase: 2, state: ColossusState.AGGRO });
    assert.strictEqual(state.health, 50);
    assert.strictEqual(state.phase, 2);
    assert.strictEqual(state.state, ColossusState.AGGRO);
  });
});

describe('Titan AI Phase 1', () => {
  it('Idle transitions to Patrol after idleDuration', () => {
    const state = createTitanBehaviorState();
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, TITAN_BEHAVIOR_CONFIG.idleDuration,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.PATROL);
  });

  it('Idle does not transition before idleDuration', () => {
    const state = createTitanBehaviorState();
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, TITAN_BEHAVIOR_CONFIG.idleDuration - 0.1,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.IDLE);
  });

  it('Patrol moves at slow patrol speed', () => {
    const farPlayer = { x: -100, y: 0, z: -100 };
    const state = createTitanBehaviorState({
      state: ColossusState.PATROL,
      patrolWaypoints: [{ x: 10, z: 0 }],
      currentWaypointIndex: 0,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 1.0, farPlayer, { x: 0, y: 0, z: 0 });
    assert.ok(result.position.x > 0, 'should move toward waypoint');
    assert.ok(result.position.x <= TITAN_BEHAVIOR_CONFIG.patrolSpeed + 0.01, 'should not exceed patrol speed');
  });

  it('Patrol transitions to Aggro when player enters detection range', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.PATROL,
      position: { x: 0, y: 0, z: 0 },
      patrolWaypoints: [{ x: 30, z: 0 }],
      currentWaypointIndex: 0,
    });
    const playerPos = { x: 25, y: 0, z: 0 };
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.AGGRO);
    assert.strictEqual(result.isAlerted, true);
  });

  it('Aggro triggers shockwave when player in attack range and cooldown ready', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      attackCooldown: 0,
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, true);
  });

  it('sets attack cooldown after shockwave', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      attackCooldown: 0,
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.attackCooldown, TITAN_BEHAVIOR_CONFIG.attackCooldown);
  });

  it('does not attack when cooldown is active', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      attackCooldown: 3,
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, false);
  });

  it('Stunned prevents movement and attacks', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.STUNNED,
      stunTimer: 2,
      position: { x: 5, y: 0, z: 5 },
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.5, { x: 3, y: 0, z: 3 }, { x: 5, y: 0, z: 5 });
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
    assert.strictEqual(result.shouldAttack, false);
  });

  it('Stunned transitions to Aggro when stun expires', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.STUNNED,
      stunTimer: 0.1,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.2, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.AGGRO);
  });
});

describe('Titan AI Phase 2', () => {
  it('auto-transitions to phase 2 when health drops below 50%', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      health: 74,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.phase, 2);
  });

  it('stays in phase 1 when health is above 50%', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      health: 76,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.phase, 1);
  });

  it('moves faster in aggro during phase 2', () => {
    const state1 = createTitanBehaviorState({ state: ColossusState.AGGRO, phase: 1, attackCooldown: 100 });
    const state2 = createTitanBehaviorState({ state: ColossusState.AGGRO, phase: 2, attackCooldown: 100 });
    const playerPos = { x: 30, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    const result1 = updateTitanBehavior(state1, TITAN_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    const result2 = updateTitanBehavior(state2, TITAN_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    assert.ok(result2.position.x > result1.position.x, 'phase 2 should move faster');
  });

  it('uses reduced attack cooldown in phase 2', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      phase: 2,
      attackCooldown: 0,
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.attackCooldown, TITAN_BEHAVIOR_CONFIG.phase2AttackCooldown);
  });

  it('submergeTimer counts up in phase 2', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      phase: 2,
      submergeTimer: 5,
      attackCooldown: 100,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 1.0, { x: 25, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.ok(result.submergeTimer > 5, 'submergeTimer should increase');
  });

  it('submerge cycle: warning then active then reset', () => {
    const config = TITAN_BEHAVIOR_CONFIG;
    let state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      phase: 2,
      submergeTimer: 0,
      attackCooldown: 100,
    });
    const playerPos = { x: 25, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };

    const warningTime = config.submergeInterval - config.submergeWarningTime;
    state = updateTitanBehavior(state, config, warningTime, playerPos, colossusPos);
    assert.strictEqual(getSubmergeWarning(state), true);
    assert.strictEqual(isArenaSubmerged(state), false);

    state = updateTitanBehavior(state, config, config.submergeWarningTime + 0.1, playerPos, colossusPos);
    assert.strictEqual(isArenaSubmerged(state), true);

    state = updateTitanBehavior(state, config, config.submergeDuration + 0.1, playerPos, colossusPos);
    assert.strictEqual(isArenaSubmerged(state), false);
    assert.ok(state.submergeTimer < 1, 'timer should have reset');
  });

  it('submerge does not occur in phase 1', () => {
    let state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      phase: 1,
      attackCooldown: 100,
    });
    const playerPos = { x: 25, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 40; i++) {
      state = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    }
    assert.strictEqual(isArenaSubmerged(state), false);
    assert.strictEqual(getSubmergeWarning(state), false);
  });
});

describe('getTitanPhase', () => {
  it('returns 2 after phase transition', () => {
    const state = createTitanBehaviorState({ phase: 2 });
    assert.strictEqual(getTitanPhase(state), 2);
  });
});

describe('getShellTilt', () => {
  it('tilt increases during aggro', () => {
    let state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      attackCooldown: 100,
    });
    const playerPos = { x: 25, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 10; i++) {
      state = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.5, playerPos, colossusPos);
    }
    const tilt = getShellTilt(state, TITAN_BEHAVIOR_CONFIG);
    assert.ok(tilt.angle > 0, 'tilt should increase during aggro');
  });

  it('tilt angle is clamped to max', () => {
    let state = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      attackCooldown: 100,
    });
    const playerPos = { x: 25, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 100; i++) {
      state = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 0.5, playerPos, colossusPos);
    }
    const tilt = getShellTilt(state, TITAN_BEHAVIOR_CONFIG);
    assert.ok(tilt.angle <= TITAN_BEHAVIOR_CONFIG.tiltMaxAngle + 0.01,
      `tilt ${tilt.angle} should be clamped to ${TITAN_BEHAVIOR_CONFIG.tiltMaxAngle}`);
  });

  it('tilt recovers when idle', () => {
    const state = createTitanBehaviorState({
      state: ColossusState.IDLE,
      tiltAngle: 0.2,
      stateTimer: 0,
    });
    const result = updateTitanBehavior(state, TITAN_BEHAVIOR_CONFIG, 1.0, { x: 50, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.ok(result.tiltAngle < 0.2, 'tilt should recover during idle');
  });
});

describe('isArenaSubmerged', () => {
  it('returns false by default', () => {
    assert.strictEqual(isArenaSubmerged(createTitanBehaviorState()), false);
  });

  it('returns false in phase 1 even after long time', () => {
    const state = createTitanBehaviorState({ phase: 1, submergeTimer: 100 });
    assert.strictEqual(isArenaSubmerged(state), false);
  });

  it('returns true when submerge is active', () => {
    const state = createTitanBehaviorState({ phase: 2, isSubmerged: true, submergeActive: true });
    assert.strictEqual(isArenaSubmerged(state), true);
  });
});

describe('getSubmergeWarning', () => {
  it('returns false by default', () => {
    assert.strictEqual(getSubmergeWarning(createTitanBehaviorState()), false);
  });

  it('returns true during warning period', () => {
    const state = createTitanBehaviorState({ phase: 2, submergeWarning: true });
    assert.strictEqual(getSubmergeWarning(state), true);
  });
});

describe('getShockwaveForce', () => {
  it('returns force vector when player is in shockwave range', () => {
    const state = createTitanBehaviorState();
    const playerPos = { x: 10, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    const force = getShockwaveForce(state, TITAN_BEHAVIOR_CONFIG, playerPos, colossusPos);
    assert.ok(force !== null);
    assert.ok(typeof force.x === 'number');
    assert.ok(typeof force.y === 'number');
    assert.ok(typeof force.z === 'number');
  });

  it('returns null when player is outside shockwave range', () => {
    const state = createTitanBehaviorState();
    const playerPos = { x: 20, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    const force = getShockwaveForce(state, TITAN_BEHAVIOR_CONFIG, playerPos, colossusPos);
    assert.strictEqual(force, null);
  });

  it('force pushes player away from titan', () => {
    const state = createTitanBehaviorState();
    const playerPos = { x: 10, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 0, z: 0 };
    const force = getShockwaveForce(state, TITAN_BEHAVIOR_CONFIG, playerPos, colossusPos);
    assert.ok(force.x > 0, 'force should push in +x direction (away from titan)');
  });

  it('force is stronger when closer', () => {
    const state = createTitanBehaviorState();
    const colossusPos = { x: 0, y: 0, z: 0 };
    const forceNear = getShockwaveForce(state, TITAN_BEHAVIOR_CONFIG, { x: 3, y: 0, z: 0 }, colossusPos);
    const forceFar = getShockwaveForce(state, TITAN_BEHAVIOR_CONFIG, { x: 12, y: 0, z: 0 }, colossusPos);
    assert.ok(forceNear !== null && forceFar !== null);
    const nearMag = Math.sqrt(forceNear.x ** 2 + forceNear.y ** 2 + forceNear.z ** 2);
    const farMag = Math.sqrt(forceFar.x ** 2 + forceFar.y ** 2 + forceFar.z ** 2);
    assert.ok(nearMag > farMag, 'closer player should get stronger force');
  });
});

describe('triggerTitanPhase2', () => {
  it('transitions to phase 2 regardless of health', () => {
    const state = createTitanBehaviorState({ health: TITAN_BEHAVIOR_CONFIG.maxHealth });
    const result = triggerTitanPhase2(state, TITAN_BEHAVIOR_CONFIG);
    assert.strictEqual(result.phase, 2);
  });

  it('preserves other state fields', () => {
    const state = createTitanBehaviorState({ health: 100, state: ColossusState.AGGRO, rotation: 1.5 });
    const result = triggerTitanPhase2(state, TITAN_BEHAVIOR_CONFIG);
    assert.strictEqual(result.health, 100);
    assert.strictEqual(result.state, ColossusState.AGGRO);
    assert.strictEqual(result.rotation, 1.5);
  });
});

function createMockTHREE() {
  function createMockMesh() {
    const mesh = {
      position: { x: 0, y: 0, z: 0, set(x, y, z) { mesh.position.x = x; mesh.position.y = y; mesh.position.z = z; } },
      rotation: { x: 0, y: 0, z: 0, set(x, y, z) { mesh.rotation.x = x; mesh.rotation.y = y; mesh.rotation.z = z; } },
      castShadow: false, receiveShadow: false, material: null,
      add(child) { mesh.children.push(child); }, children: [],
    };
    return mesh;
  }
  function createMockMaterial(opts = {}) {
    return {
      color: opts.color || 0x888888,
      roughness: opts.roughness !== undefined ? opts.roughness : 0.8,
      metalness: opts.metalness !== undefined ? opts.metalness : 0.1,
      emissive: opts.emissive || null,
      emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0,
      flatShading: opts.flatShading || false,
    };
  }
  return {
    Group: function() { return { children: [], add(child) { this.children.push(child); } }; },
    Mesh: function(geo, mat) { const m = createMockMesh(); m.material = mat; return m; },
    MeshStandardMaterial: createMockMaterial,
    SphereGeometry: function(...args) { return { scale() {} }; },
    BoxGeometry: function(...args) { return {}; },
    CylinderGeometry: function(...args) { return {}; },
    Color: function(c) { return c; },
  };
}

describe('createTitanMesh', () => {
  before(() => { setTHREE(createMockTHREE()); });

  it('returns an object with children array', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    assert.ok(mesh !== null);
    assert.ok(Array.isArray(mesh.children));
  });

  it('creates a child for each body part', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    assert.equal(mesh.children.length, def.parts.length,
      `expected ${def.parts.length} children, got ${mesh.children.length}`);
  });

  it('children are keyed by part id', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const part of def.parts) {
      assert.ok(mesh.children.some(c => c.partId === part.id),
        `missing child for part ${part.id}`);
    }
  });

  it('shell_main child uses SphereGeometry', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const shell = mesh.children.find(c => c.partId === 'shell_main');
    assert.ok(shell !== undefined, 'shell_main child missing');
    assert.strictEqual(shell.geometryType, 'sphere');
  });

  it('legs use CylinderGeometry', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const id of ['left_leg_front', 'left_leg_rear', 'right_leg_front', 'right_leg_rear']) {
      const leg = mesh.children.find(c => c.partId === id);
      assert.ok(leg !== undefined, `${id} child missing`);
      assert.strictEqual(leg.geometryType, 'cylinder', `${id} should use cylinder`);
    }
  });

  it('claws use BoxGeometry', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const id of ['left_claw_upper', 'left_claw_lower', 'right_claw_upper', 'right_claw_lower']) {
      const claw = mesh.children.find(c => c.partId === id);
      assert.ok(claw !== undefined, `${id} child missing`);
      assert.strictEqual(claw.geometryType, 'box', `${id} should use box`);
    }
  });

  it('children inherit position from definition', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const part of def.parts) {
      const child = mesh.children.find(c => c.partId === part.id);
      assert.ok(child !== undefined, `missing ${part.id}`);
      assert.ok(Math.abs(child.position.x - part.position.x) < 0.01,
        `${part.id} x: ${child.position.x} != ${part.position.x}`);
      assert.ok(Math.abs(child.position.y - part.position.y) < 0.01,
        `${part.id} y: ${child.position.y} != ${part.position.y}`);
      assert.ok(Math.abs(child.position.z - part.position.z) < 0.01,
        `${part.id} z: ${child.position.z} != ${part.position.z}`);
    }
  });

  it('children inherit rotation from definition', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const part of def.parts) {
      const child = mesh.children.find(c => c.partId === part.id);
      assert.ok(child !== undefined, `missing ${part.id}`);
      assert.ok(Math.abs(child.rotation.x - part.rotation.x) < 0.01,
        `${part.id} rot x wrong`);
      assert.ok(Math.abs(child.rotation.y - part.rotation.y) < 0.01,
        `${part.id} rot y wrong`);
      assert.ok(Math.abs(child.rotation.z - part.rotation.z) < 0.01,
        `${part.id} rot z wrong`);
    }
  });

  it('shell material has roughness (rocky texture)', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const shell = mesh.children.find(c => c.partId === 'shell_main');
    assert.ok(shell !== undefined);
    assert.ok(typeof shell.material.roughness === 'number');
    assert.ok(shell.material.roughness > 0.5, 'shell should be rough (rocky)');
  });

  it('underbelly material is smoother than shell', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const shell = mesh.children.find(c => c.partId === 'shell_main');
    const belly = mesh.children.find(c => c.partId === 'underbelly');
    assert.ok(shell !== undefined);
    assert.ok(belly !== undefined);
    assert.ok(belly.material.roughness < shell.material.roughness,
      `underbelly roughness ${belly.material.roughness} should be < shell ${shell.material.roughness}`);
  });

  it('rune parts have emissive glow', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    for (const id of ['shell_rune_left', 'shell_rune_right', 'shell_rune_center']) {
      const rune = mesh.children.find(c => c.partId === id);
      assert.ok(rune !== undefined, `missing ${id}`);
      assert.ok(rune.material.emissiveIntensity > 0, `${id} should have emissive glow`);
    }
  });
});

describe('animateTitan', () => {
  before(() => { setTHREE(createMockTHREE()); });

  it('applies shell tilt from ai state', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const aiState = createTitanBehaviorState({
      state: ColossusState.AGGRO,
      tiltAngle: 0.2,
      tiltDirection: { x: 1, z: 0 },
      attackCooldown: 100,
    });
    animateTitan(mesh, 0, aiState);
    const shell = mesh.meshByPart.get('shell_main');
    assert.ok(shell !== undefined);
    assert.ok(Math.abs(shell.rotation.z - 0.2) < 0.01,
      `shell rotation.z should be 0.2, got ${shell.rotation.z}`);
  });

  it('animates legs over time', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const aiState = createTitanBehaviorState();
    animateTitan(mesh, 0, aiState);
    const leg0y = mesh.meshByPart.get('left_leg_front').position.y;
    const leg0rx = mesh.meshByPart.get('left_leg_front').rotation.x;
    animateTitan(mesh, 1, aiState);
    const leg1y = mesh.meshByPart.get('left_leg_front').position.y;
    const leg1rx = mesh.meshByPart.get('left_leg_front').rotation.x;
    assert.ok(leg0y !== leg1y || leg0rx !== leg1rx,
      'legs should animate with time');
  });

  it('animates claw snapping', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const aiState = createTitanBehaviorState();
    animateTitan(mesh, 0, aiState);
    const claw0rz = mesh.meshByPart.get('left_claw_lower').rotation.z;
    animateTitan(mesh, 1, aiState);
    const claw1rz = mesh.meshByPart.get('left_claw_lower').rotation.z;
    assert.ok(Math.abs(claw0rz - claw1rz) > 0.01,
      `claw rotation.z should change: ${claw0rz} vs ${claw1rz}`);
  });

  it('returns void and does not throw', () => {
    const def = createTitanDefinition();
    const mesh = createTitanMesh(def);
    const aiState = createTitanBehaviorState();
    assert.doesNotThrow(() => animateTitan(mesh, 0, aiState));
  });
});
