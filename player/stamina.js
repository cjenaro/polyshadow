import { clamp } from '../utils/math.js';

export const STAMINA_CONSTANTS = {
  MAX: 100,
  SPRINT_DRAIN_RATE: 15,
  CLIMB_DRAIN_RATE: 12,
  REGEN_RATE: 20,
  LOW_THRESHOLD: 25,
  DEPLETED_COOLDOWN: 1.5,
};

export function createStaminaState(overrides = {}) {
  return {
    current: STAMINA_CONSTANTS.MAX,
    isDepleted: false,
    depletedTimer: 0,
    isClimbing: false,
    ...overrides,
  };
}

export function drainStamina(state, amount) {
  if (state.isDepleted) return state;

  const newCurrent = Math.max(0, state.current - amount);

  if (newCurrent === 0) {
    return {
      ...state,
      current: 0,
      isDepleted: true,
      depletedTimer: STAMINA_CONSTANTS.DEPLETED_COOLDOWN,
    };
  }

  return {
    ...state,
    current: newCurrent,
  };
}

export function regenStamina(state, dt) {
  if (state.isDepleted || state.isClimbing) return state;

  const newCurrent = Math.min(
    STAMINA_CONSTANTS.MAX,
    state.current + STAMINA_CONSTANTS.REGEN_RATE * dt
  );

  return {
    ...state,
    current: newCurrent,
  };
}

export function updateStamina(state, flags, dt) {
  let next = { ...state };

  if (next.isDepleted) {
    next.depletedTimer -= dt;
    if (next.depletedTimer <= 0) {
      next = {
        ...next,
        isDepleted: false,
        depletedTimer: 0,
      };
    } else {
      return next;
    }
  }

  next.isClimbing = !!flags.isClimbing;

  if (flags.isClimbing) {
    next = drainStamina(next, STAMINA_CONSTANTS.CLIMB_DRAIN_RATE * dt);
  } else if (flags.isSprinting) {
    next = drainStamina(next, STAMINA_CONSTANTS.SPRINT_DRAIN_RATE * dt);
  } else if (flags.isGrounded) {
    next = regenStamina(next, dt);
  }

  return next;
}

export function isStaminaDepleted(state) {
  return !!state.isDepleted;
}

export function isStaminaLow(state) {
  return state.current < STAMINA_CONSTANTS.LOW_THRESHOLD;
}

export function shouldTriggerFall(state) {
  return state.isDepleted && !!state.isClimbing;
}
