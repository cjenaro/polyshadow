import {
  createStaminaState,
  updateStamina,
  drainStamina,
  isStaminaDepleted,
  isStaminaLow,
  STAMINA_CONSTANTS,
  syncStaminaConfig,
} from "./stamina.js";

export function createIntegratedStamina(overrides = {}) {
  return createStaminaState(overrides);
}

export function updateIntegratedStamina(staminaState, flags, dt) {
  const staminaStateNew = updateStamina(staminaState, flags, dt);
  return {
    staminaState: staminaStateNew,
    shouldPreventSprint: isStaminaDepleted(staminaStateNew),
  };
}

export function getStaminaForUI(staminaState) {
  return {
    current: staminaState.current,
    max: STAMINA_CONSTANTS.MAX,
    isLow: isStaminaLow(staminaState),
    isDepleted: isStaminaDepleted(staminaState),
    percent: staminaState.current / STAMINA_CONSTANTS.MAX,
  };
}

export function applyCombatDrain(staminaState, amount) {
  return drainStamina(staminaState, amount);
}

export { syncStaminaConfig };
