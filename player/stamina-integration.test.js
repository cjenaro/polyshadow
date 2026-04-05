import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createIntegratedStamina,
  updateIntegratedStamina,
  getStaminaForUI,
  applyCombatDrain,
} from './stamina-integration.js';

describe('createIntegratedStamina', () => {
  it('returns a stamina state with max current and not depleted', () => {
    const state = createIntegratedStamina();
    assert.strictEqual(state.current, 100);
    assert.strictEqual(state.isDepleted, false);
    assert.strictEqual(state.depletedTimer, 0);
    assert.strictEqual(state.isClimbing, false);
  });
});

describe('updateIntegratedStamina', () => {
  it('returns updated staminaState and shouldPreventSprint false when full', () => {
    const state = createIntegratedStamina();
    const result = updateIntegratedStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.1);
    assert.strictEqual(result.staminaState.current, 100);
    assert.strictEqual(result.shouldPreventSprint, false);
  });

  it('drains stamina when sprinting', () => {
    const state = createIntegratedStamina();
    const result = updateIntegratedStamina(state, { isSprinting: true, isGrounded: true, isClimbing: false }, 0.1);
    assert.ok(result.staminaState.current < 100);
  });

  it('returns shouldPreventSprint true when stamina is depleted', () => {
    const state = createIntegratedStamina({ current: 1 });
    const result = updateIntegratedStamina(state, { isSprinting: true, isGrounded: true, isClimbing: false }, 0.1);
    assert.strictEqual(result.shouldPreventSprint, true);
  });

  it('returns shouldPreventSprint true when stamina is already depleted', () => {
    const state = createIntegratedStamina({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const result = updateIntegratedStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.1);
    assert.strictEqual(result.shouldPreventSprint, true);
  });

  it('returns shouldPreventSprint false after depleted cooldown expires and stamina regens', () => {
    const state = createIntegratedStamina({ current: 0, isDepleted: true, depletedTimer: 0.1 });
    const result = updateIntegratedStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.2);
    assert.strictEqual(result.shouldPreventSprint, false);
  });

  it('drains when climbing', () => {
    const state = createIntegratedStamina();
    const result = updateIntegratedStamina(state, { isSprinting: false, isGrounded: false, isClimbing: true }, 0.1);
    assert.ok(result.staminaState.current < 100);
  });

  it('regens when grounded and idle', () => {
    const state = createIntegratedStamina({ current: 50 });
    const result = updateIntegratedStamina(state, { isSprinting: false, isGrounded: true, isClimbing: false }, 0.1);
    assert.ok(result.staminaState.current > 50);
  });
});

describe('getStaminaForUI', () => {
  it('returns full stamina info when at max', () => {
    const state = createIntegratedStamina();
    const ui = getStaminaForUI(state);
    assert.strictEqual(ui.current, 100);
    assert.strictEqual(ui.max, 100);
    assert.strictEqual(ui.isLow, false);
    assert.strictEqual(ui.isDepleted, false);
    assert.strictEqual(ui.percent, 1);
  });

  it('returns correct percent for partial stamina', () => {
    const state = createIntegratedStamina({ current: 75 });
    const ui = getStaminaForUI(state);
    assert.strictEqual(ui.percent, 0.75);
  });

  it('returns isLow true when below threshold', () => {
    const state = createIntegratedStamina({ current: 10 });
    const ui = getStaminaForUI(state);
    assert.strictEqual(ui.isLow, true);
  });

  it('returns isDepleted true when depleted', () => {
    const state = createIntegratedStamina({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const ui = getStaminaForUI(state);
    assert.strictEqual(ui.isDepleted, true);
  });
});

describe('applyCombatDrain', () => {
  it('reduces stamina by amount', () => {
    const state = createIntegratedStamina();
    const next = applyCombatDrain(state, 20);
    assert.strictEqual(next.current, 80);
  });

  it('returns unchanged state when already depleted', () => {
    const state = createIntegratedStamina({ current: 0, isDepleted: true, depletedTimer: 1.0 });
    const next = applyCombatDrain(state, 10);
    assert.strictEqual(next.current, 0);
  });

  it('does not mutate original state', () => {
    const state = createIntegratedStamina();
    applyCombatDrain(state, 20);
    assert.strictEqual(state.current, 100);
  });
});
