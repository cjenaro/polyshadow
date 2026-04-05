import { describe, it } from "node:test";
import assert from "node:assert";
import {
  COMBAT_CONFIG,
  createCombatState,
  trySlash,
  tryStab,
  startStabCharge,
  updateStabCharge,
  cancelStabCharge,
  applyShakeOff,
  findHitWeakPoint,
  getSlashAttackOrigin,
  applyDamageToWeakPoint,
  updateCombat,
} from "./combat.js";
import { drainStamina, shouldTriggerFall } from "./stamina.js";

function makeWeakPoint(overrides = {}) {
  return {
    id: "head",
    position: { x: 0, y: 0, z: -3 },
    health: 50,
    maxHealth: 50,
    isDestroyed: false,
    isActive: true,
    ...overrides,
  };
}

describe("createCombatState", () => {
  it("returns state with correct defaults", () => {
    const state = createCombatState();
    assert.strictEqual(state.slashCooldown, 0);
    assert.strictEqual(state.isChargingStab, false);
    assert.strictEqual(state.stabChargeProgress, 0);
    assert.strictEqual(state.isShakingOff, false);
    assert.strictEqual(state.shakeOffTimer, 0);
    assert.strictEqual(state.lastAttackTime, 0);
    assert.strictEqual(state.totalDamageDealt, 0);
    assert.strictEqual(state.hitsLanded, 0);
  });

  it("allows overrides", () => {
    const state = createCombatState({ slashCooldown: 1, totalDamageDealt: 10 });
    assert.strictEqual(state.slashCooldown, 1);
    assert.strictEqual(state.totalDamageDealt, 10);
  });
});

describe("trySlash", () => {
  it("succeeds when weak point is in range", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -3 } })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, true);
    assert.strictEqual(result.hitWeakPoint, true);
    assert.strictEqual(result.weakPointId, "head");
  });

  it("fails when weak point is out of range", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -50 } })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("cooldown prevents rapid attacks", () => {
    const combat = createCombatState({ slashCooldown: 1 });
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -3 } })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("deals correct damage to weak point", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ health: 50 })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.weakPoints[0].health, 50 - COMBAT_CONFIG.SLASH_DAMAGE);
  });

  it("does not mutate original weak points", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ health: 50 })];
    trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(weakPoints[0].health, 50);
  });

  it("destroys weak point when health reaches 0", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ health: COMBAT_CONFIG.SLASH_DAMAGE })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, true);
    assert.strictEqual(result.weakPoints[0].health, 0);
    assert.strictEqual(result.weakPoints[0].isDestroyed, true);
  });

  it("fails on destroyed weak points", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ isDestroyed: true, isActive: false })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("fails on inactive weak points", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint({ isActive: false })];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("only hits nearest weak point if multiple in range", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [
      makeWeakPoint({ id: "far", position: { x: 0, y: 0, z: -4 } }),
      makeWeakPoint({ id: "near", position: { x: 0, y: 0, z: -2 } }),
    ];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.weakPointId, "near");
    assert.strictEqual(result.attacked, true);
  });

  it("returns damage in result", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint()];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.damage, COMBAT_CONFIG.SLASH_DAMAGE);
  });

  it("sets slash cooldown on successful attack", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const playerRot = 0;
    const weakPoints = [makeWeakPoint()];
    const result = trySlash(combat, playerPos, playerRot, weakPoints);
    assert.strictEqual(result.combatState.slashCooldown, COMBAT_CONFIG.SLASH_COOLDOWN);
  });
});

describe("getSlashAttackOrigin", () => {
  it("calculates correct forward position with rotation 0", () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const origin = getSlashAttackOrigin(playerPos, 0);
    assert.ok(Math.abs(origin.z - -2) < 1e-6);
    assert.ok(Math.abs(origin.x) < 1e-6);
    assert.ok(Math.abs(origin.y) < 1e-6);
  });

  it("calculates correct forward position with rotation PI/2", () => {
    const playerPos = { x: 0, y: 0, z: 0 };
    const origin = getSlashAttackOrigin(playerPos, Math.PI / 2);
    assert.ok(Math.abs(origin.x - -2) < 1e-6);
    assert.ok(Math.abs(origin.z) < 1e-6);
  });
});

describe("tryStab", () => {
  it("succeeds with full charge and near weak point", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 } })];
    const result = tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(result.attacked, true);
    assert.strictEqual(result.hitWeakPoint, true);
    assert.strictEqual(result.weakPointId, "head");
  });

  it("fails with insufficient charge", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 } })];
    const result = tryStab(combat, 0.5, playerPos, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("deals proportional damage for partial charges >= 0.8", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 }, health: 100 })];
    const result = tryStab(combat, 0.9, playerPos, weakPoints);
    assert.strictEqual(result.attacked, true);
    assert.ok(Math.abs(result.damage - COMBAT_CONFIG.STAB_DAMAGE * 0.9) < 1e-6);
    assert.ok(
      Math.abs(result.weakPoints[0].health - (100 - COMBAT_CONFIG.STAB_DAMAGE * 0.9)) < 1e-6,
    );
  });

  it("fails when no weak point in range", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -100 } })];
    const result = tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(result.attacked, false);
  });

  it("deals full damage at charge 1.0", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 }, health: 100 })];
    const result = tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(result.damage, COMBAT_CONFIG.STAB_DAMAGE);
    assert.strictEqual(result.weakPoints[0].health, 100 - COMBAT_CONFIG.STAB_DAMAGE);
  });

  it("does not mutate original weak points", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 }, health: 100 })];
    tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(weakPoints[0].health, 100);
  });

  it("resets stab charge after successful attack", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 1.0 });
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 } })];
    const result = tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(result.combatState.isChargingStab, false);
    assert.strictEqual(result.combatState.stabChargeProgress, 0);
  });
});

describe("stab charge lifecycle", () => {
  it("startStabCharge begins charging", () => {
    const combat = createCombatState();
    const result = startStabCharge(combat);
    assert.strictEqual(result.isChargingStab, true);
    assert.strictEqual(result.stabChargeProgress, 0);
  });

  it("does not mutate original state", () => {
    const combat = createCombatState();
    startStabCharge(combat);
    assert.strictEqual(combat.isChargingStab, false);
  });

  it("updateStabCharge increases progress", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 0 });
    const result = updateStabCharge(combat, 0.5);
    assert.ok(result.stabChargeProgress > 0);
    assert.strictEqual(result.isChargingStab, true);
  });

  it("cancelStabCharge resets charge", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 0.5 });
    const result = cancelStabCharge(combat);
    assert.strictEqual(result.isChargingStab, false);
    assert.strictEqual(result.stabChargeProgress, 0);
  });

  it("charge reaches 1.0 after STAB_CHARGE_TIME seconds", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 0 });
    const result = updateStabCharge(combat, COMBAT_CONFIG.STAB_CHARGE_TIME);
    assert.strictEqual(result.stabChargeProgress, 1);
  });

  it("charge does not exceed 1.0", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 0.9 });
    const result = updateStabCharge(combat, 10);
    assert.strictEqual(result.stabChargeProgress, 1);
  });

  it("updateStabCharge does nothing when not charging", () => {
    const combat = createCombatState({ isChargingStab: false, stabChargeProgress: 0 });
    const result = updateStabCharge(combat, 1);
    assert.strictEqual(result.stabChargeProgress, 0);
  });
});

describe("applyShakeOff", () => {
  it("drains extra stamina", () => {
    const stamina = { current: 80, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = applyShakeOff(stamina, 1.0, false, COMBAT_CONFIG);
    assert.ok(result.current < 80);
  });

  it("with holdOn reduces drain but still costs stamina", () => {
    const staminaHolding = { current: 80, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const staminaNotHolding = {
      current: 80,
      isDepleted: false,
      depletedTimer: 0,
      isClimbing: true,
    };
    const reducedConfig = { ...COMBAT_CONFIG, SHAKE_OFF_HOLD_COST: 0 };
    const resultHolding = applyShakeOff(staminaHolding, 1.0, true, reducedConfig);
    const resultNotHolding = applyShakeOff(staminaNotHolding, 1.0, false, reducedConfig);
    assert.ok(resultHolding.current > resultNotHolding.current);
  });

  it("timer counts down and shake-off ends", () => {
    const combat = createCombatState({
      isShakingOff: true,
      shakeOffTimer: COMBAT_CONFIG.SHAKE_OFF_DURATION,
    });
    const stamina = { current: 100, isDepleted: false, depletedTimer: 0, isClimbing: true };
    let current = combat;
    let dt = 0.1;
    let totalTime = 0;
    while (totalTime < COMBAT_CONFIG.SHAKE_OFF_DURATION) {
      current = updateCombat(current, dt);
      applyShakeOff(stamina, dt, false, COMBAT_CONFIG);
      totalTime += dt;
      if (!current.isShakingOff) break;
    }
    assert.strictEqual(current.isShakingOff, false);
    assert.strictEqual(current.shakeOffTimer, 0);
  });

  it("shake-off with holdOn applies flat hold cost", () => {
    const stamina = { current: 100, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = applyShakeOff(stamina, 0.0, true, COMBAT_CONFIG);
    assert.strictEqual(result.current, 100 - COMBAT_CONFIG.SHAKE_OFF_HOLD_COST);
  });

  it("can deplete stamina during shake-off", () => {
    const stamina = { current: 5, isDepleted: false, depletedTimer: 0, isClimbing: true };
    const result = applyShakeOff(stamina, 5.0, false, COMBAT_CONFIG);
    assert.strictEqual(result.current, 0);
    assert.strictEqual(result.isDepleted, true);
  });
});

describe("findHitWeakPoint", () => {
  it("returns nearest active weak point within range", () => {
    const weakPoints = [makeWeakPoint({ id: "close", position: { x: 0, y: 0, z: -2 } })];
    const result = findHitWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.id, "close");
  });

  it("returns null when no weak points in range", () => {
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -100 } })];
    const result = findHitWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result, null);
  });

  it("returns nearest when multiple in range", () => {
    const weakPoints = [
      makeWeakPoint({ id: "far", position: { x: 0, y: 0, z: -4 } }),
      makeWeakPoint({ id: "near", position: { x: 0, y: 0, z: -1 } }),
    ];
    const result = findHitWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result.id, "near");
  });
});

describe("applyDamageToWeakPoint", () => {
  it("correctly reduces health", () => {
    const wp = makeWeakPoint({ health: 50 });
    const result = applyDamageToWeakPoint(wp, 10);
    assert.strictEqual(result.remainingHealth, 40);
    assert.strictEqual(result.damaged, true);
    assert.strictEqual(result.isDestroyed, false);
  });

  it("sets isDestroyed when health reaches 0", () => {
    const wp = makeWeakPoint({ health: 5 });
    const result = applyDamageToWeakPoint(wp, 5);
    assert.strictEqual(result.remainingHealth, 0);
    assert.strictEqual(result.isDestroyed, true);
    assert.strictEqual(result.damaged, true);
  });

  it("clamps health to 0 and does not go negative", () => {
    const wp = makeWeakPoint({ health: 3 });
    const result = applyDamageToWeakPoint(wp, 10);
    assert.strictEqual(result.remainingHealth, 0);
    assert.strictEqual(result.isDestroyed, true);
  });

  it("returns new weak point without mutating original", () => {
    const wp = makeWeakPoint({ health: 50 });
    const result = applyDamageToWeakPoint(wp, 10);
    assert.strictEqual(result.weakPoint.health, 40);
    assert.strictEqual(result.weakPoint.isDestroyed, false);
    assert.strictEqual(wp.health, 50);
  });
});

describe("updateCombat", () => {
  it("reduces slash cooldown", () => {
    const combat = createCombatState({ slashCooldown: 1 });
    const result = updateCombat(combat, 0.3);
    assert.ok(Math.abs(result.slashCooldown - 0.7) < 1e-6);
  });

  it("does not let cooldown go below 0", () => {
    const combat = createCombatState({ slashCooldown: 0.5 });
    const result = updateCombat(combat, 1.0);
    assert.strictEqual(result.slashCooldown, 0);
  });

  it("does not mutate original state", () => {
    const combat = createCombatState({ slashCooldown: 1 });
    updateCombat(combat, 0.3);
    assert.strictEqual(combat.slashCooldown, 1);
  });

  it("reduces shake-off timer", () => {
    const combat = createCombatState({ isShakingOff: true, shakeOffTimer: 2.0 });
    const result = updateCombat(combat, 0.5);
    assert.ok(Math.abs(result.shakeOffTimer - 1.5) < 1e-6);
  });

  it("ends shake-off when timer reaches 0", () => {
    const combat = createCombatState({ isShakingOff: true, shakeOffTimer: 0.3 });
    const result = updateCombat(combat, 0.5);
    assert.strictEqual(result.isShakingOff, false);
    assert.strictEqual(result.shakeOffTimer, 0);
  });

  it("updates stab charge progress when charging", () => {
    const combat = createCombatState({ isChargingStab: true, stabChargeProgress: 0 });
    const result = updateCombat(combat, 0.5);
    assert.ok(result.stabChargeProgress > 0);
  });

  it("does not update stab charge when not charging", () => {
    const combat = createCombatState({ isChargingStab: false, stabChargeProgress: 0 });
    const result = updateCombat(combat, 1.0);
    assert.strictEqual(result.stabChargeProgress, 0);
  });
});

describe("combat stats", () => {
  it("tracks totalDamageDealt on slash hit", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint()];
    const result = trySlash(combat, playerPos, 0, weakPoints);
    assert.strictEqual(result.combatState.totalDamageDealt, COMBAT_CONFIG.SLASH_DAMAGE);
    assert.strictEqual(result.combatState.hitsLanded, 1);
  });

  it("tracks totalDamageDealt on stab hit", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -2 } })];
    const result = tryStab(combat, 1.0, playerPos, weakPoints);
    assert.strictEqual(result.combatState.totalDamageDealt, COMBAT_CONFIG.STAB_DAMAGE);
    assert.strictEqual(result.combatState.hitsLanded, 1);
  });

  it("does not track stats on miss", () => {
    const combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    const weakPoints = [makeWeakPoint({ position: { x: 0, y: 0, z: -100 } })];
    const result = trySlash(combat, playerPos, 0, weakPoints);
    assert.strictEqual(result.combatState.totalDamageDealt, 0);
    assert.strictEqual(result.combatState.hitsLanded, 0);
  });

  it("accumulates across multiple hits", () => {
    let combat = createCombatState();
    const playerPos = { x: 0, y: 0, z: 0 };
    let weakPoints = [makeWeakPoint({ health: 100 })];
    const result1 = trySlash(combat, playerPos, 0, weakPoints);
    combat = result1.combatState;
    weakPoints = result1.weakPoints;
    combat = updateCombat(combat, COMBAT_CONFIG.SLASH_COOLDOWN);
    const result2 = trySlash(combat, playerPos, 0, weakPoints);
    assert.strictEqual(result2.combatState.totalDamageDealt, COMBAT_CONFIG.SLASH_DAMAGE * 2);
    assert.strictEqual(result2.combatState.hitsLanded, 2);
  });
});
