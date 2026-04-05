export const STAMINA_CONSTANTS = {
  MAX: 100,
  SPRINT_DRAIN_RATE: 15,
  CLIMB_DRAIN_RATE: 12,
  GRIP_DRAIN_RATE: 3,
  REGEN_RATE: 20,
  REST_REGEN_RATE: 15,
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
    state.current + STAMINA_CONSTANTS.REGEN_RATE * dt,
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
    if (!flags.isSprinting && flags.isOnRestSpot) {
      const newCurrent = Math.min(
        STAMINA_CONSTANTS.MAX,
        next.current + STAMINA_CONSTANTS.REST_REGEN_RATE * dt,
      );
      next.current = newCurrent;
    } else {
      const rate = flags.isActivelyClimbing
        ? STAMINA_CONSTANTS.CLIMB_DRAIN_RATE
        : STAMINA_CONSTANTS.GRIP_DRAIN_RATE;
      next = drainStamina(next, rate * dt);
    }
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
