import {
  COMBAT_CONFIG,
  createCombatState,
  updateCombat,
  trySlash,
  startStabCharge,
  tryStab,
  cancelStabCharge,
  applyShakeOff,
  syncCombatConfig,
} from "./combat.js";

export function createIntegratedCombat(overrides = {}) {
  return createCombatState(overrides);
}

export { syncCombatConfig };

export function updateIntegratedCombat(
  combatState,
  input,
  playerPosition,
  playerRotation,
  weakPoints,
  isClimbing,
  dt,
) {
  combatState = updateCombat(combatState, dt);

  let hitResult = {
    attacked: false,
    isSlash: false,
    isStab: false,
  };

  if (isClimbing) {
    return { combatState, hitResult };
  }

  if (input.attackJustPressed && combatState.slashCooldown <= 0) {
    const slashResult = trySlash(combatState, playerPosition, playerRotation, weakPoints);
    hitResult = {
      ...slashResult,
      isSlash: true,
      isStab: false,
    };
    return { combatState: slashResult.combatState, hitResult };
  }

  if (combatState.isChargingStab) {
    if (!input.attack) {
      if (combatState.stabChargeProgress >= 0.8) {
        const stabResult = tryStab(
          combatState,
          combatState.stabChargeProgress,
          playerPosition,
          weakPoints,
        );
        hitResult = {
          ...stabResult,
          isSlash: false,
          isStab: true,
        };
        return { combatState: stabResult.combatState, hitResult };
      } else {
        combatState = cancelStabCharge(combatState);
        hitResult = {
          attacked: false,
          isSlash: false,
          isStab: true,
        };
      }
    }
    return { combatState, hitResult };
  }

  if (input.attack && !input.attackJustPressed) {
    combatState = startStabCharge(combatState);
  }

  return { combatState, hitResult };
}

export function handleShakeOff(combatState, staminaState, dt, isHoldingOn) {
  return {
    combatState: {
      ...combatState,
      isShakingOff: true,
      shakeOffTimer: COMBAT_CONFIG.SHAKE_OFF_DURATION,
    },
    staminaState: applyShakeOff(staminaState, dt, isHoldingOn, COMBAT_CONFIG),
  };
}

export function getCombatStats(combatState) {
  return {
    totalDamageDealt: combatState.totalDamageDealt,
    hitsLanded: combatState.hitsLanded,
  };
}
