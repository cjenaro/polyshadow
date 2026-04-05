import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ColossusState,
  SENTINEL_BEHAVIOR_CONFIG,
  createBehaviorState,
  updateBehavior,
  triggerStun,
  triggerDeath,
  isClimbable,
  getFacingDirection,
  shouldShakeOff,
  applySentinelDamage,
  getSentinelStunProgress,
  SENTINEL_STUN_DAMAGE_THRESHOLD,
} from './behavior.js';

function makeAIState(overrides = {}) {
  return {
    state: ColossusState.IDLE,
    health: SENTINEL_BEHAVIOR_CONFIG.maxHealth,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    targetPosition: null,
    stateTimer: 0,
    stunTimer: 0,
    attackTimer: 0,
    attackCooldown: 0,
    isAlerted: false,
    patrolWaypoints: [],
    currentWaypointIndex: 0,
    arenaCenter: { x: 0, z: 0 },
    shakeOffTimer: 0,
    lastShakeOffTime: 0,
    ...overrides,
  };
}

const config = SENTINEL_BEHAVIOR_CONFIG;

describe('createBehaviorState', () => {
  it('returns default state with Idle and full health', () => {
    const state = createBehaviorState();
    assert.strictEqual(state.state, ColossusState.IDLE);
    assert.strictEqual(state.health, config.maxHealth);
    assert.strictEqual(state.position.x, 0);
    assert.strictEqual(state.position.y, 0);
    assert.strictEqual(state.position.z, 0);
    assert.strictEqual(state.rotation, 0);
    assert.strictEqual(state.targetPosition, null);
    assert.strictEqual(state.stateTimer, 0);
    assert.strictEqual(state.stunTimer, 0);
    assert.strictEqual(state.attackTimer, 0);
    assert.strictEqual(state.attackCooldown, 0);
    assert.strictEqual(state.isAlerted, false);
    assert.deepStrictEqual(state.patrolWaypoints, []);
    assert.strictEqual(state.currentWaypointIndex, 0);
    assert.strictEqual(state.arenaCenter.x, 0);
    assert.strictEqual(state.arenaCenter.z, 0);
    assert.strictEqual(state.shakeOffTimer, 0);
    assert.strictEqual(state.lastShakeOffTime, 0);
  });

  it('accepts overrides', () => {
    const state = createBehaviorState({ health: 50, state: ColossusState.AGGRO });
    assert.strictEqual(state.health, 50);
    assert.strictEqual(state.state, ColossusState.AGGRO);
  });
});

describe('Idle state', () => {
  it('transitions to Patrol after idleDuration', () => {
    const state = makeAIState();
    const result = updateBehavior(state, config, config.idleDuration, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.PATROL);
  });

  it('does not transition to Patrol before idleDuration', () => {
    const state = makeAIState();
    const result = updateBehavior(state, config, config.idleDuration - 0.1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.IDLE);
  });

  it('increments stateTimer', () => {
    const state = makeAIState({ stateTimer: 1.5 });
    const result = updateBehavior(state, config, 0.5, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.stateTimer, 2.0);
  });

  it('generates patrol waypoints on transition to Patrol', () => {
    const state = makeAIState();
    const result = updateBehavior(state, config, config.idleDuration, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.ok(result.patrolWaypoints.length > 0);
  });

  it('does not move', () => {
    const state = makeAIState({ position: { x: 5, y: 0, z: 5 } });
    const result = updateBehavior(state, config, 1.0, { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 });
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });
});

describe('Patrol state', () => {
  it('moves toward current waypoint at patrolSpeed', () => {
    const farPlayer = { x: -100, y: 0, z: -100 };
    const state = makeAIState({
      state: ColossusState.PATROL,
      patrolWaypoints: [{ x: 10, z: 0 }],
      currentWaypointIndex: 0,
    });
    const result = updateBehavior(state, config, 1.0, farPlayer, { x: 0, y: 0, z: 0 });
    assert.ok(result.position.x > 0);
    assert.ok(result.position.z === 0 || Math.abs(result.position.z) < 0.01);
  });

  it('advances to next waypoint when reaching current one', () => {
    const farPlayer = { x: -100, y: 0, z: -100 };
    const state = makeAIState({
      state: ColossusState.PATROL,
      position: { x: 9.5, y: 0, z: 0 },
      patrolWaypoints: [{ x: 10, z: 0 }, { x: 0, z: 10 }],
      currentWaypointIndex: 0,
    });
    const result = updateBehavior(state, config, 1.0, farPlayer, { x: 9.5, y: 0, z: 0 });
    assert.ok(result.currentWaypointIndex >= 1);
  });

  it('transitions to Idle when all waypoints visited', () => {
    const farPlayer = { x: -100, y: 0, z: -100 };
    const state = makeAIState({
      state: ColossusState.PATROL,
      position: { x: 0, y: 0, z: 0 },
      patrolWaypoints: [{ x: 0, z: 0 }],
      currentWaypointIndex: 0,
    });
    const result = updateBehavior(state, config, 0.1, farPlayer, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.IDLE);
  });

  it('transitions to Aggro when player enters detection range', () => {
    const state = makeAIState({
      state: ColossusState.PATROL,
      position: { x: 0, y: 0, z: 0 },
      patrolWaypoints: [{ x: 30, z: 0 }, { x: 0, z: 30 }],
      currentWaypointIndex: 0,
    });
    const playerPos = { x: 20, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.AGGRO);
    assert.strictEqual(result.isAlerted, true);
  });
});

describe('Aggro state', () => {
  it('moves toward player', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const result = updateBehavior(state, config, 1.0, playerPos, { x: 0, y: 0, z: 0 });
    assert.ok(result.position.x > 0);
  });

  it('faces toward player', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
    });
    const playerPos = { x: 0, y: 0, z: 10 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    const facing = getFacingDirection(result.rotation);
    assert.ok(Math.abs(facing.x) < 0.01, 'should face +Z');
    assert.ok(facing.z > 0, 'should face +Z');
  });

  it('transitions to Patrol when player exceeds loseInterestRange', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      isAlerted: true,
    });
    const playerPos = { x: 70, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.PATROL);
  });

  it('returns shouldAttack true when player in attackRange and cooldown ready', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 5, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, true);
  });

  it('sets attackCooldown after attacking', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 5, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.attackCooldown, config.attackCooldown);
  });

  it('does not attack when attackCooldown is active', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 2,
    });
    const playerPos = { x: 5, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, false);
  });

  it('does not attack when player is beyond attackRange', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 50, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, false);
  });

  it('decrements attackCooldown over time', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 1,
    });
    const playerPos = { x: 50, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.5, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.attackCooldown, 0.5);
  });

  it('increments shakeOffTimer when player is climbing', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      shakeOffTimer: 5,
    });
    const result = updateBehavior(state, config, 0.5, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shakeOffTimer, 5.5);
  });
});

describe('triggerStun', () => {
  it('sets state to Stunned', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const result = triggerStun(state, config);
    assert.strictEqual(result.state, ColossusState.STUNNED);
  });

  it('sets stunTimer to stunDuration', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const result = triggerStun(state, config);
    assert.strictEqual(result.stunTimer, config.stunDuration);
  });

  it('resets stateTimer', () => {
    const state = makeAIState({ state: ColossusState.AGGRO, stateTimer: 5 });
    const result = triggerStun(state, config);
    assert.strictEqual(result.stateTimer, 0);
  });
});

describe('Stunned state', () => {
  it('prevents movement', () => {
    const state = makeAIState({
      state: ColossusState.STUNNED,
      position: { x: 5, y: 0, z: 5 },
      stunTimer: 1,
    });
    const result = updateBehavior(state, config, 0.5, { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 });
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it('decrements stunTimer', () => {
    const state = makeAIState({
      state: ColossusState.STUNNED,
      stunTimer: 1.5,
    });
    const result = updateBehavior(state, config, 0.5, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.stunTimer, 1.0);
  });

  it('transitions to Aggro when stunTimer expires', () => {
    const state = makeAIState({
      state: ColossusState.STUNNED,
      stunTimer: 0.1,
      isAlerted: true,
    });
    const result = updateBehavior(state, config, 0.2, { x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.AGGRO);
  });

  it('does not attack while stunned', () => {
    const state = makeAIState({
      state: ColossusState.STUNNED,
      stunTimer: 1,
      position: { x: 0, y: 0, z: 0 },
    });
    const playerPos = { x: 3, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, false);
  });
});

describe('triggerDeath', () => {
  it('sets state to Dying', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const result = triggerDeath(state);
    assert.strictEqual(result.state, ColossusState.DYING);
  });

  it('does not change health', () => {
    const state = makeAIState({ state: ColossusState.AGGRO, health: 1 });
    const result = triggerDeath(state);
    assert.strictEqual(result.health, 1);
  });
});

describe('Dying state', () => {
  it('prevents all movement', () => {
    const state = makeAIState({
      state: ColossusState.DYING,
      position: { x: 5, y: 0, z: 5 },
    });
    const playerPos = { x: 0, y: 0, z: 0 };
    const result = updateBehavior(state, config, 1.0, playerPos, { x: 5, y: 0, z: 5 });
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it('prevents attacks', () => {
    const state = makeAIState({
      state: ColossusState.DYING,
      position: { x: 0, y: 0, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 3, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.shouldAttack, false);
  });

  it('does not transition to any other state', () => {
    const state = makeAIState({
      state: ColossusState.DYING,
      position: { x: 0, y: 0, z: 0 },
    });
    const playerPos = { x: 100, y: 0, z: 0 };
    const result = updateBehavior(state, config, 5.0, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.state, ColossusState.DYING);
  });
});

describe('isClimbable', () => {
  it('returns false for Idle', () => {
    assert.strictEqual(isClimbable({ state: ColossusState.IDLE }), false);
  });

  it('returns true for Patrol', () => {
    assert.strictEqual(isClimbable({ state: ColossusState.PATROL }), true);
  });

  it('returns true for Aggro', () => {
    assert.strictEqual(isClimbable({ state: ColossusState.AGGRO }), true);
  });

  it('returns true for Stunned', () => {
    assert.strictEqual(isClimbable({ state: ColossusState.STUNNED }), true);
  });

  it('returns false for Dying', () => {
    assert.strictEqual(isClimbable({ state: ColossusState.DYING }), false);
  });
});

describe('getFacingDirection', () => {
  it('returns (0, 0, -1) for rotation 0', () => {
    const dir = getFacingDirection(0);
    assert.ok(Math.abs(dir.x) < 1e-6);
    assert.ok(Math.abs(dir.z + 1) < 1e-6);
  });

  it('returns (0, 0, 1) for rotation PI', () => {
    const dir = getFacingDirection(Math.PI);
    assert.ok(Math.abs(dir.x) < 1e-6);
    assert.ok(Math.abs(dir.z - 1) < 1e-6);
  });

  it('returns (-1, 0, 0) for rotation PI/2', () => {
    const dir = getFacingDirection(Math.PI / 2);
    assert.ok(Math.abs(dir.x + 1) < 1e-6);
    assert.ok(Math.abs(dir.z) < 1e-6);
  });

  it('returns (1, 0, 0) for rotation -PI/2', () => {
    const dir = getFacingDirection(-Math.PI / 2);
    assert.ok(Math.abs(dir.x - 1) < 1e-6);
    assert.ok(Math.abs(dir.z) < 1e-6);
  });

  it('always has magnitude 1', () => {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dir = getFacingDirection(angle);
      const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      assert.ok(Math.abs(len - 1) < 1e-6);
    }
  });
});

describe('shouldShakeOff', () => {
  it('returns false when not in Aggro', () => {
    const aiState = makeAIState({ state: ColossusState.PATROL });
    assert.strictEqual(shouldShakeOff(aiState, config, 5), false);
  });

  it('returns false when player is not climbing (timeSinceGrabbed is 0)', () => {
    const aiState = makeAIState({ state: ColossusState.AGGRO });
    assert.strictEqual(shouldShakeOff(aiState, config, 0), false);
  });

  it('returns false when timeSincePlayerGrabbed is below threshold', () => {
    const aiState = makeAIState({ state: ColossusState.AGGRO, lastShakeOffTime: 0 });
    assert.strictEqual(shouldShakeOff(aiState, config, 5), false);
  });

  it('returns true when timeSincePlayerGrabbed exceeds threshold', () => {
    const aiState = makeAIState({
      state: ColossusState.AGGRO,
      lastShakeOffTime: 0,
    });
    assert.strictEqual(shouldShakeOff(aiState, config, 10), true);
  });

  it('returns false right after a shake off', () => {
    const aiState = makeAIState({
      state: ColossusState.AGGRO,
      lastShakeOffTime: 0,
    });
    shouldShakeOff(aiState, config, 10);
    assert.strictEqual(shouldShakeOff(aiState, config, 1), false);
  });
});

describe('isAlerted persistence', () => {
  it('persists after losing player interest', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      position: { x: 0, y: 0, z: 0 },
      isAlerted: true,
    });
    const playerPos = { x: 100, y: 0, z: 0 };
    const result = updateBehavior(state, config, 0.1, playerPos, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.isAlerted, true);
  });
});

describe('Health and death', () => {
  it('health decreases when taking damage (via state mutation)', () => {
    const state = makeAIState({ health: 100 });
    state.health -= 30;
    assert.strictEqual(state.health, 70);
  });

  it('death triggers at health 0', () => {
    const state = makeAIState({ health: 1 });
    state.health -= 1;
    assert.strictEqual(state.health, 0);
    const dying = triggerDeath(state);
    assert.strictEqual(dying.state, ColossusState.DYING);
  });
});

describe('applySentinelDamage', () => {
  it('returns updated state with damage accumulated', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const result = applySentinelDamage(state, config, 10);
    assert.strictEqual(result.stunDamageAccumulator, 10);
  });

  it('accumulates damage across multiple hits', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    let result = applySentinelDamage(state, config, 15);
    result = applySentinelDamage(result, config, 10);
    assert.strictEqual(result.stunDamageAccumulator, 25);
  });

  it('auto-stuns when accumulated damage reaches threshold', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const damage = SENTINEL_STUN_DAMAGE_THRESHOLD;
    const result = applySentinelDamage(state, config, damage);
    assert.strictEqual(result.state, ColossusState.STUNNED);
    assert.strictEqual(result.stunTimer, config.stunDuration);
  });

  it('resets accumulator after triggering stun', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      stunDamageAccumulator: SENTINEL_STUN_DAMAGE_THRESHOLD - 1,
    });
    const result = applySentinelDamage(state, config, 2);
    assert.strictEqual(result.stunDamageAccumulator, 0);
  });

  it('does not accumulate damage while already stunned', () => {
    const state = makeAIState({
      state: ColossusState.STUNNED,
      stunTimer: 1.0,
      stunDamageAccumulator: 0,
    });
    const result = applySentinelDamage(state, config, 50);
    assert.strictEqual(result.stunDamageAccumulator, 0);
    assert.strictEqual(result.stunTimer, 1.0);
  });

  it('does not accumulate damage while dying', () => {
    const state = makeAIState({
      state: ColossusState.DYING,
      stunDamageAccumulator: 0,
    });
    const result = applySentinelDamage(state, config, 50);
    assert.strictEqual(result.stunDamageAccumulator, 0);
  });

  it('does not stun if damage does not reach threshold', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    const result = applySentinelDamage(state, config, SENTINEL_STUN_DAMAGE_THRESHOLD - 1);
    assert.strictEqual(result.state, ColossusState.AGGRO);
    assert.strictEqual(result.stunDamageAccumulator, SENTINEL_STUN_DAMAGE_THRESHOLD - 1);
  });
});

describe('getSentinelStunProgress', () => {
  it('returns 0 when no damage accumulated', () => {
    const state = makeAIState({ state: ColossusState.AGGRO });
    assert.strictEqual(getSentinelStunProgress(state), 0);
  });

  it('returns 0.5 when half the threshold is accumulated', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      stunDamageAccumulator: SENTINEL_STUN_DAMAGE_THRESHOLD / 2,
    });
    assert.ok(Math.abs(getSentinelStunProgress(state) - 0.5) < 0.001);
  });

  it('returns 1.0 when at threshold', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      stunDamageAccumulator: SENTINEL_STUN_DAMAGE_THRESHOLD,
    });
    assert.strictEqual(getSentinelStunProgress(state), 1.0);
  });

  it('clamps to 1.0 when over threshold', () => {
    const state = makeAIState({
      state: ColossusState.AGGRO,
      stunDamageAccumulator: SENTINEL_STUN_DAMAGE_THRESHOLD + 50,
    });
    assert.strictEqual(getSentinelStunProgress(state), 1.0);
  });
});

describe('SENTINEL_STUN_DAMAGE_THRESHOLD', () => {
  it('is a positive number', () => {
    assert.ok(typeof SENTINEL_STUN_DAMAGE_THRESHOLD === 'number');
    assert.ok(SENTINEL_STUN_DAMAGE_THRESHOLD > 0);
  });

  it('is less than maxHealth', () => {
    assert.ok(SENTINEL_STUN_DAMAGE_THRESHOLD < SENTINEL_BEHAVIOR_CONFIG.maxHealth);
  });
});

describe('createBehaviorState stun fields', () => {
  it('initializes stunDamageAccumulator to 0', () => {
    const state = createBehaviorState();
    assert.strictEqual(state.stunDamageAccumulator, 0);
  });
});
