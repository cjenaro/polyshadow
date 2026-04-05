import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createDodgeState,
  tryStartDodge,
  updateDodge,
  applyDodgeMovement,
  getDodgeStaminaCost,
  canDodge,
  isDodging,
  DODGE_CONSTANTS,
  DODGE_STATES,
} from './dodge.js';

function makeStamina(overrides = {}) {
  return { current: 100, isDepleted: false, ...overrides };
}

function makePlayerState(overrides = {}) {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    ...overrides,
  };
}

describe('createDodgeState', () => {
  it('returns idle state with zero timer', () => {
    const state = createDodgeState();
    assert.strictEqual(state.state, DODGE_STATES.IDLE);
    assert.strictEqual(state.timer, 0);
    assert.strictEqual(state.isInvulnerable, false);
  });

  it('accepts overrides', () => {
    const state = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.3 });
    assert.strictEqual(state.state, DODGE_STATES.DODGING);
    assert.strictEqual(state.timer, 0.3);
  });
});

describe('tryStartDodge', () => {
  it('starts dodge when idle with enough stamina', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.DODGING);
    assert.strictEqual(result.timer, DODGE_CONSTANTS.DURATION);
    assert.strictEqual(result.isInvulnerable, true);
  });

  it('uses input direction for dodge direction', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 1, y: 0 }, stamina);
    assert.strictEqual(result.direction.x, 1);
    assert.strictEqual(result.direction.z, 0);
  });

  it('normalizes diagonal input direction', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 1, y: 1 }, stamina);
    const len = Math.sqrt(result.direction.x ** 2 + result.direction.z ** 2);
    assert.ok(Math.abs(len - 1) < 1e-6, 'direction should be normalized');
  });

  it('defaults to forward (z=-1) when no input', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 0, y: 0 }, stamina);
    assert.strictEqual(result.direction.x, 0);
    assert.strictEqual(result.direction.z, -1);
  });

  it('does not start dodge when already dodging', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.2 });
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.DODGING);
    assert.strictEqual(result, dodge, 'should return same state object');
  });

  it('does not start dodge when in cooldown', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.3 });
    const stamina = makeStamina();
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.COOLDOWN);
    assert.strictEqual(result, dodge, 'should return same state object');
  });

  it('does not start dodge when stamina is depleted', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina({ current: 0, isDepleted: true });
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.IDLE);
    assert.strictEqual(result, dodge, 'should return same state object');
  });

  it('does not start dodge when stamina is below cost', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina({ current: DODGE_CONSTANTS.STAMINA_COST - 1 });
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.IDLE);
    assert.strictEqual(result, dodge, 'should return same state object');
  });

  it('starts dodge with exactly enough stamina', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina({ current: DODGE_CONSTANTS.STAMINA_COST });
    const result = tryStartDodge(dodge, { x: 0, y: -1 }, stamina);
    assert.strictEqual(result.state, DODGE_STATES.DODGING);
  });
});

describe('updateDodge', () => {
  it('returns idle unchanged with isInvulnerable false', () => {
    const dodge = createDodgeState();
    const result = updateDodge(dodge, 0.1);
    assert.strictEqual(result.state, DODGE_STATES.IDLE);
    assert.strictEqual(result.timer, 0);
    assert.strictEqual(result.isInvulnerable, false);
  });

  it('ticks down timer during dodging', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.4, isInvulnerable: true });
    const result = updateDodge(dodge, 0.1);
    assert.strictEqual(result.state, DODGE_STATES.DODGING);
    assert.ok(Math.abs(result.timer - 0.3) < 1e-6);
    assert.strictEqual(result.isInvulnerable, true);
  });

  it('transitions to cooldown when timer expires', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.05, isInvulnerable: true });
    const result = updateDodge(dodge, 0.1);
    assert.strictEqual(result.state, DODGE_STATES.COOLDOWN);
    assert.strictEqual(result.timer, DODGE_CONSTANTS.COOLDOWN);
    assert.strictEqual(result.isInvulnerable, false);
  });

  it('transitions to cooldown exactly at timer=0', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.01, isInvulnerable: true });
    const result = updateDodge(dodge, 0.01);
    assert.strictEqual(result.state, DODGE_STATES.COOLDOWN);
  });

  it('ticks down timer during cooldown', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.5 });
    const result = updateDodge(dodge, 0.1);
    assert.strictEqual(result.state, DODGE_STATES.COOLDOWN);
    assert.strictEqual(result.timer, 0.4);
  });

  it('transitions back to idle when cooldown expires', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.05 });
    const result = updateDodge(dodge, 0.1);
    assert.strictEqual(result.state, DODGE_STATES.IDLE);
    assert.strictEqual(result.timer, 0);
    assert.strictEqual(result.isInvulnerable, false);
  });
});

describe('applyDodgeMovement', () => {
  it('moves player in dodge direction during dodging', () => {
    const dodge = createDodgeState({
      state: DODGE_STATES.DODGING,
      direction: { x: 0, z: -1 },
      timer: 0.3,
    });
    const player = makePlayerState();
    const result = applyDodgeMovement(player, dodge, 0, 0.1);
    assert.ok(result.position.z < 0, 'should have moved forward');
    assert.ok(result.velocity.z < 0, 'velocity should be forward');
  });

  it('does not move player when idle', () => {
    const dodge = createDodgeState();
    const player = makePlayerState({ position: { x: 5, y: 0, z: 5 } });
    const result = applyDodgeMovement(player, dodge, 0, 0.1);
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it('does not move player when in cooldown', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.3 });
    const player = makePlayerState({ position: { x: 5, y: 0, z: 5 } });
    const result = applyDodgeMovement(player, dodge, 0, 0.1);
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it('respects camera yaw for world-space direction', () => {
    const dodge = createDodgeState({
      state: DODGE_STATES.DODGING,
      direction: { x: 0, z: -1 },
      timer: 0.3,
    });
    const player = makePlayerState({ position: { x: 0, y: 0, z: 0 } });
    const result = applyDodgeMovement(player, dodge, Math.PI / 2, 0.1);
    assert.ok(result.position.x < 0, 'with yaw=PI/2, forward should become -x');
  });

  it('uses DODGE_CONSTANTS.SPEED for movement speed', () => {
    const dodge = createDodgeState({
      state: DODGE_STATES.DODGING,
      direction: { x: 1, z: 0 },
      timer: 0.3,
    });
    const player = makePlayerState({ position: { x: 0, y: 0, z: 0 } });
    const result = applyDodgeMovement(player, dodge, 0, 0.1);
    assert.ok(Math.abs(result.position.x - DODGE_CONSTANTS.SPEED * 0.1) < 1e-6);
  });
});

describe('getDodgeStaminaCost', () => {
  it('returns stamina cost when transitioning from idle to dodging', () => {
    const prev = createDodgeState();
    const curr = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.4, isInvulnerable: true });
    assert.strictEqual(getDodgeStaminaCost(curr, prev), DODGE_CONSTANTS.STAMINA_COST);
  });

  it('returns 0 when both idle', () => {
    const prev = createDodgeState();
    const curr = createDodgeState();
    assert.strictEqual(getDodgeStaminaCost(curr, prev), 0);
  });

  it('returns 0 when already dodging', () => {
    const prev = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.3 });
    const curr = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.2 });
    assert.strictEqual(getDodgeStaminaCost(curr, prev), 0);
  });

  it('returns 0 during cooldown', () => {
    const prev = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.05 });
    const curr = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.5 });
    assert.strictEqual(getDodgeStaminaCost(curr, prev), 0);
  });
});

describe('canDodge', () => {
  it('returns true when idle with enough stamina', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina();
    assert.strictEqual(canDodge(dodge, stamina), true);
  });

  it('returns false when already dodging', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.3 });
    const stamina = makeStamina();
    assert.strictEqual(canDodge(dodge, stamina), false);
  });

  it('returns false when in cooldown', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.3 });
    const stamina = makeStamina();
    assert.strictEqual(canDodge(dodge, stamina), false);
  });

  it('returns false when stamina depleted', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina({ current: 0, isDepleted: true });
    assert.strictEqual(canDodge(dodge, stamina), false);
  });

  it('returns false when stamina below cost', () => {
    const dodge = createDodgeState();
    const stamina = makeStamina({ current: 5 });
    assert.strictEqual(canDodge(dodge, stamina), false);
  });
});

describe('isDodging', () => {
  it('returns true during dodging', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.DODGING, timer: 0.3 });
    assert.strictEqual(isDodging(dodge), true);
  });

  it('returns false when idle', () => {
    assert.strictEqual(isDodging(createDodgeState()), false);
  });

  it('returns false during cooldown', () => {
    const dodge = createDodgeState({ state: DODGE_STATES.COOLDOWN, timer: 0.3 });
    assert.strictEqual(isDodging(dodge), false);
  });
});
