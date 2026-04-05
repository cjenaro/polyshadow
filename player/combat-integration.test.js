import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createIntegratedCombat,
  updateIntegratedCombat,
  handleShakeOff,
  getCombatStats,
} from './combat-integration.js';
import { COMBAT_CONFIG, createCombatState } from './combat.js';

function makeWeakPoint(overrides = {}) {
  return {
    id: 'head',
    position: { x: 0, y: 0, z: -3 },
    health: 50,
    maxHealth: 50,
    isDestroyed: false,
    isActive: true,
    ...overrides,
  };
}

function makeInput(overrides = {}) {
  return {
    attack: false,
    attackJustPressed: false,
    ...overrides,
  };
}

function makePlayerPos() {
  return { x: 0, y: 0, z: 0 };
}

describe('createIntegratedCombat', () => {
  it('returns a combat state with correct defaults', () => {
    const combat = createIntegratedCombat();
    assert.strictEqual(combat.slashCooldown, 0);
    assert.strictEqual(combat.isChargingStab, false);
    assert.strictEqual(combat.stabChargeProgress, 0);
    assert.strictEqual(combat.isShakingOff, false);
    assert.strictEqual(combat.shakeOffTimer, 0);
    assert.strictEqual(combat.totalDamageDealt, 0);
    assert.strictEqual(combat.hitsLanded, 0);
  });
});

describe('updateIntegratedCombat', () => {
  it('returns combatState and hitResult', () => {
    const combat = createIntegratedCombat();
    const input = makeInput();
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, [], false, 0.016);
    assert.ok(result.combatState);
    assert.ok(result.hitResult);
    assert.strictEqual(result.hitResult.attacked, false);
  });

  it('calls updateCombat to tick cooldowns', () => {
    const combat = createIntegratedCombat({ slashCooldown: 0.5 });
    const input = makeInput();
    updateIntegratedCombat(combat, input, makePlayerPos(), 0, [], false, 0.3);
    assert.ok(Math.abs(combat.slashCooldown - 0.2) < 1e-6);
  });

  it('does not allow combat when climbing', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attack: true });
    const weakPoints = [makeWeakPoint()];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, true, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
  });

  it('performs slash when attack just pressed and cooldown ready and not climbing', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attackJustPressed: true });
    const weakPoints = [makeWeakPoint()];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, true);
    assert.strictEqual(result.hitResult.isSlash, true);
    assert.strictEqual(result.hitResult.isStab, false);
  });

  it('returns no attack when attack just pressed but on cooldown', () => {
    const combat = createIntegratedCombat({ slashCooldown: 1 });
    const input = makeInput({ attackJustPressed: true });
    const weakPoints = [makeWeakPoint()];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
  });

  it('slash miss returns attacked false', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attackJustPressed: true });
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -100 } })];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
    assert.strictEqual(result.hitResult.isSlash, true);
  });

  it('starts stab charge when attack is held and not charging and not climbing', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attack: true, attackJustPressed: false });
    const weakPoints = [makeWeakPoint()];
    updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(combat.isChargingStab, true);
  });

  it('does not start stab charge while already charging', () => {
    const combat = createIntegratedCombat({ isChargingStab: true, stabChargeProgress: 0.5 });
    const input = makeInput({ attack: true });
    updateIntegratedCombat(combat, input, makePlayerPos(), 0, [], false, 0.016);
    assert.strictEqual(combat.isChargingStab, true);
  });

  it('releases stab when attack released with sufficient charge and hits', () => {
    const combat = createIntegratedCombat({ isChargingStab: true, stabChargeProgress: 0.9 });
    const input = makeInput({ attack: false });
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 } })];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, true);
    assert.strictEqual(result.hitResult.isStab, true);
    assert.strictEqual(result.hitResult.isSlash, false);
  });

  it('releases stab when attack released with sufficient charge but misses', () => {
    const combat = createIntegratedCombat({ isChargingStab: true, stabChargeProgress: 1.0 });
    const input = makeInput({ attack: false });
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -100 } })];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
    assert.strictEqual(result.hitResult.isStab, true);
  });

  it('cancels stab when attack released with insufficient charge', () => {
    const combat = createIntegratedCombat({ isChargingStab: true, stabChargeProgress: 0.5 });
    const input = makeInput({ attack: false });
    const weakPoints = [];
    updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(combat.isChargingStab, false);
    assert.strictEqual(combat.stabChargeProgress, 0);
  });

  it('does not slash when attack held but not just pressed', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attack: true, attackJustPressed: false });
    const weakPoints = [makeWeakPoint()];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
    assert.strictEqual(result.hitResult.isSlash, false);
  });

  it('slash hit result includes damage and weakPointId', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attackJustPressed: true });
    const weakPoints = [makeWeakPoint()];
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, weakPoints, false, 0.016);
    assert.strictEqual(result.hitResult.damage, COMBAT_CONFIG.SLASH_DAMAGE);
    assert.strictEqual(result.hitResult.weakPointId, 'head');
    assert.strictEqual(result.hitResult.hitWeakPoint, true);
  });

  it('no-op when no attack input and not climbing and not charging', () => {
    const combat = createIntegratedCombat();
    const input = makeInput({ attack: false, attackJustPressed: false });
    const result = updateIntegratedCombat(combat, input, makePlayerPos(), 0, [], false, 0.016);
    assert.strictEqual(result.hitResult.attacked, false);
    assert.strictEqual(result.hitResult.isSlash, false);
    assert.strictEqual(result.hitResult.isStab, false);
  });
});

describe('handleShakeOff', () => {
  it('sets isShakingOff and shakeOffTimer', () => {
    const combat = createCombatState();
    const stamina = { current: 100, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = handleShakeOff(combat, stamina, 0.016, true);
    assert.strictEqual(result.combatState.isShakingOff, true);
    assert.strictEqual(result.combatState.shakeOffTimer, COMBAT_CONFIG.SHAKE_OFF_DURATION);
  });

  it('drains stamina via applyShakeOff', () => {
    const combat = createCombatState();
    const stamina = { current: 100, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = handleShakeOff(combat, stamina, 0.016, true);
    assert.ok(result.staminaState.current < 100);
  });

  it('returns both combatState and staminaState', () => {
    const combat = createCombatState();
    const stamina = { current: 100, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = handleShakeOff(combat, stamina, 0.016, false);
    assert.ok(result.combatState);
    assert.ok(result.staminaState);
  });
});

describe('getCombatStats', () => {
  it('returns totalDamageDealt and hitsLanded', () => {
    const combat = createCombatState({ totalDamageDealt: 30, hitsLanded: 2 });
    const stats = getCombatStats(combat);
    assert.strictEqual(stats.totalDamageDealt, 30);
    assert.strictEqual(stats.hitsLanded, 2);
  });

  it('returns zeros for fresh combat state', () => {
    const combat = createCombatState();
    const stats = getCombatStats(combat);
    assert.strictEqual(stats.totalDamageDealt, 0);
    assert.strictEqual(stats.hitsLanded, 0);
  });
});
