import {
  COMBAT_CONFIG,
  createCombatState,
  updateCombat,
  trySlash,
  startStabCharge,
  tryStab,
  cancelStabCharge,
  applyShakeOff,
} from './combat.js';

export function createIntegratedCombat(overrides = {}) {
  return createCombatState(overrides);
}

export function updateIntegratedCombat(combatState, input, playerPosition, playerRotation, weakPoints, isClimbing, dt) {
  updateCombat(combatState, dt);

  let hitResult = {
    attacked: false,
    isSlash: false,
    isStab: false,
  };

  if (isClimbing) {
    return { combatState, hitResult };
  }

  if (input.attackJustPressed && combatState.slashCooldown <= 0) {
    const slashResult = trySlash(combatState, playerPosition, playerRotation, weakPoints, { x: 0, y: 0, z: 0 });
    hitResult = {
      ...slashResult,
      isSlash: true,
      isStab: false,
    };
    return { combatState, hitResult };
  }

  if (combatState.isChargingStab) {
    if (!input.attack) {
      if (combatState.stabChargeProgress >= 0.8) {
        const stabResult = tryStab(combatState, combatState.stabChargeProgress, playerPosition, weakPoints);
        hitResult = {
          ...stabResult,
          isSlash: false,
          isStab: true,
        };
      } else {
        cancelStabCharge(combatState);
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
    startStabCharge(combatState);
  }

  return { combatState, hitResult };
}

export function handleShakeOff(combatState, staminaState, dt, isHoldingOn) {
  combatState.isShakingOff = true;
  combatState.shakeOffTimer = COMBAT_CONFIG.SHAKE_OFF_DURATION;
  const newStamina = applyShakeOff(staminaState, dt, isHoldingOn, COMBAT_CONFIG);
  return { combatState, staminaState: newStamina };
}

export function getCombatStats(combatState) {
  return {
    totalDamageDealt: combatState.totalDamageDealt,
    hitsLanded: combatState.hitsLanded,
  };
}
