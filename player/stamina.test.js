import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createStaminaState,
  drainStamina,
  regenStamina,
  updateStamina,
  shouldTriggerFall,
  STAMINA_CONSTANTS,
} from './stamina.js';

describe('updateStamina with rest spots', () => {
  it('regenerates stamina when climbing on a rest spot', () => {
    const state = createStaminaState({ current: 50 });
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      0.5
    );
    assert.ok(next.current > 50);
  });

  it('still drains stamina when climbing but NOT on a rest spot', () => {
    const state = createStaminaState();
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: false },
      0.5
    );
    assert.ok(next.current < STAMINA_CONSTANTS.MAX);
  });

  it('drains stamina when climbing with no isOnRestSpot flag (backwards compat)', () => {
    const state = createStaminaState();
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true },
      1.0
    );
    assert.ok(next.current < STAMINA_CONSTANTS.MAX);
  });

  it('rest spot regen uses REST_REGEN_RATE constant', () => {
    const state = createStaminaState({ current: 50 });
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      1.0
    );
    const expected = 50 + STAMINA_CONSTANTS.REST_REGEN_RATE;
    assert.ok(Math.abs(next.current - expected) < 0.01, `expected ${expected}, got ${next.current}`);
  });

  it('rest spot regen does not exceed max stamina', () => {
    const state = createStaminaState({ current: STAMINA_CONSTANTS.MAX - 1 });
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      10
    );
    assert.strictEqual(next.current, STAMINA_CONSTANTS.MAX);
  });

  it('does not regen on rest spot while in depleted cooldown', () => {
    const state = createStaminaState({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      0.5
    );
    assert.strictEqual(next.current, 0);
  });

  it('begins rest spot regen after depleted cooldown expires', () => {
    const state = createStaminaState({ current: 0, isDepleted: true, depletedTimer: 0.1 });
    const next = updateStamina(
      state,
      { isSprinting: false, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      0.2
    );
    assert.strictEqual(next.isDepleted, false);
    assert.ok(next.current > 0);
  });

  it('does not regen on rest spot when also sprinting', () => {
    const state = createStaminaState({ current: 50 });
    const next = updateStamina(
      state,
      { isSprinting: true, isGrounded: false, isClimbing: true, isOnRestSpot: true },
      0.5
    );
    assert.ok(next.current < 50);
  });
});

describe('createStaminaState', () => {
  it('returns state with max stamina and not depleted', () => {
    const state = createStaminaState();
    assert.strictEqual(state.current, STAMINA_CONSTANTS.MAX);
    assert.strictEqual(state.isDepleted, false);
    assert.strictEqual(state.depletedTimer, 0);
  });
});

describe('drainStamina', () => {
  it('reduces current stamina by amount', () => {
    const state = createStaminaState();
    const next = drainStamina(state, 10);
    assert.strictEqual(next.current, STAMINA_CONSTANTS.MAX - 10);
  });

  it('does not go below zero', () => {
    const state = createStaminaState();
    const next = drainStamina(state, 999);
    assert.strictEqual(next.current, 0);
  });

  it('sets isDepleted when stamina reaches zero', () => {
    const state = createStaminaState({ current: 5 });
    const next = drainStamina(state, 5);
    assert.strictEqual(next.current, 0);
    assert.strictEqual(next.isDepleted, true);
  });

  it('starts depleted cooldown timer when depleted', () => {
    const state = createStaminaState({ current: 1 });
    const next = drainStamina(state, 2);
    assert.strictEqual(next.depletedTimer, STAMINA_CONSTANTS.DEPLETED_COOLDOWN);
  });

  it('does not drain when in depleted cooldown', () => {
    const state = createStaminaState({ isDepleted: true, depletedTimer: 1.0, current: 0 });
    const next = drainStamina(state, 10);
    assert.strictEqual(next.current, 0);
  });
});

describe('regenStamina', () => {
  it('increases current stamina by regen rate times dt', () => {
    const state = createStaminaState({ current: 50 });
    const next = regenStamina(state, 0.5);
    assert.strictEqual(next.current, 50 + STAMINA_CONSTANTS.REGEN_RATE * 0.5);
  });

  it('does not exceed max stamina', () => {
    const state = createStaminaState({ current: STAMINA_CONSTANTS.MAX - 1 });
    const next = regenStamina(state, 10);
    assert.strictEqual(next.current, STAMINA_CONSTANTS.MAX);
  });

  it('does not regen when depleted (cooldown active)', () => {
    const state = createStaminaState({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const next = regenStamina(state, 0.5);
    assert.strictEqual(next.current, 0);
  });

  it('does not regen when climbing', () => {
    const state = createStaminaState({ current: 50, isClimbing: true });
    const next = regenStamina(state, 0.5);
    assert.strictEqual(next.current, 50);
  });
});

describe('updateStamina', () => {
  it('drains when sprinting on ground', () => {
    const state = createStaminaState();
    const next = updateStamina(state, { isSprinting: true, isGrounded: true, isClimbing: false }, 0.1);
    assert.ok(next.current < STAMINA_CONSTANTS.MAX);
  });

  it('drains when climbing', () => {
    const state = createStaminaState();
    const next = updateStamina(state, { isSprinting: false, isGrounded: false, isClimbing: true }, 0.1);
    assert.ok(next.current < STAMINA_CONSTANTS.MAX);
  });

  it('uses climb drain rate when climbing', () => {
    const state = createStaminaState();
    const next = updateStamina(state, { isSprinting: false, isGrounded: false, isClimbing: true }, 1.0);
    const expected = STAMINA_CONSTANTS.MAX - STAMINA_CONSTANTS.CLIMB_DRAIN_RATE;
    assert.ok(Math.abs(next.current - expected) < 0.01);
  });

  it('regens when grounded and not sprinting and not climbing', () => {
    const state = createStaminaState({ current: 50 });
    const next = updateStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.1);
    assert.ok(next.current > 50);
  });

  it('does not regen when sprinting even if grounded', () => {
    const state = createStaminaState({ current: 50 });
    const next = updateStamina(state, { isSprinting: true, isGrounded: true, isClimbing: false }, 0.1);
    assert.ok(next.current < 50);
  });

  it('ticks down depleted timer', () => {
    const state = createStaminaState({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const next = updateStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.3);
    assert.strictEqual(next.depletedTimer, 0.7);
  });

  it('clears isDepleted and begins regen when cooldown expires', () => {
    const state = createStaminaState({ current: 0, isDepleted: true, depletedTimer: 0.1 });
    const next = updateStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.2);
    assert.strictEqual(next.isDepleted, false);
    assert.strictEqual(next.depletedTimer, 0);
    assert.ok(next.current > 0);
  });

  it('does nothing when stamina is full and not draining', () => {
    const state = createStaminaState();
    const next = updateStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.1);
    assert.strictEqual(next.current, STAMINA_CONSTANTS.MAX);
  });
});

describe('shouldTriggerFall', () => {
  it('returns true when stamina is depleted and player is climbing', () => {
    assert.strictEqual(shouldTriggerFall({ isDepleted: true, isClimbing: true }), true);
  });

  it('returns false when stamina is depleted but not climbing', () => {
    assert.strictEqual(shouldTriggerFall({ isDepleted: true, isClimbing: false }), false);
  });

  it('returns false when climbing but stamina not depleted', () => {
    assert.strictEqual(shouldTriggerFall({ isDepleted: false, isClimbing: true }), false);
  });

  it('returns false when neither', () => {
    assert.strictEqual(shouldTriggerFall({ isDepleted: false, isClimbing: false }), false);
  });
});
