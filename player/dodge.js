export const DODGE_CONSTANTS = {
  DURATION: 0.4,
  COOLDOWN: 0.5,
  SPEED: 15,
  STAMINA_COST: 20,
};

export const DODGE_STATES = {
  IDLE: "idle",
  DODGING: "dodging",
  COOLDOWN: "cooldown",
};

export function createDodgeState(overrides = {}) {
  return {
    state: DODGE_STATES.IDLE,
    timer: 0,
    direction: { x: 0, z: 0 },
    isInvulnerable: false,
    ...overrides,
  };
}

export function tryStartDodge(dodgeState, inputMove, staminaState) {
  if (dodgeState.state !== DODGE_STATES.IDLE) return dodgeState;
  if (staminaState.isDepleted) return dodgeState;
  if (staminaState.current < DODGE_CONSTANTS.STAMINA_COST) return dodgeState;

  const ix = inputMove.x || 0;
  const iy = inputMove.y || 0;
  const len = Math.sqrt(ix * ix + iy * iy);

  let dir;
  if (len > 0.1) {
    dir = { x: ix / len, z: iy / len };
  } else {
    dir = { x: 0, z: -1 };
  }

  return {
    ...dodgeState,
    state: DODGE_STATES.DODGING,
    timer: DODGE_CONSTANTS.DURATION,
    direction: dir,
    isInvulnerable: true,
  };
}

export function updateDodge(dodgeState, dt) {
  if (dodgeState.state === DODGE_STATES.IDLE) {
    return { ...dodgeState, isInvulnerable: false };
  }

  const nextTimer = dodgeState.timer - dt;

  if (nextTimer <= 0) {
    const nextState =
      dodgeState.state === DODGE_STATES.DODGING ? DODGE_STATES.COOLDOWN : DODGE_STATES.IDLE;
    return {
      ...dodgeState,
      state: nextState,
      timer: nextState === DODGE_STATES.COOLDOWN ? DODGE_CONSTANTS.COOLDOWN : 0,
      isInvulnerable: false,
    };
  }

  return {
    ...dodgeState,
    timer: nextTimer,
  };
}

export function applyDodgeMovement(playerState, dodgeState, cameraYaw, dt) {
  if (dodgeState.state !== DODGE_STATES.DODGING) return playerState;

  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  const dx = dodgeState.direction.x;
  const dz = dodgeState.direction.z;

  const worldX = dx * cos + dz * sin;
  const worldZ = -dx * sin + dz * cos;

  const speed = DODGE_CONSTANTS.SPEED;

  return {
    ...playerState,
    velocity: {
      ...playerState.velocity,
      x: worldX * speed,
      z: worldZ * speed,
    },
    position: {
      ...playerState.position,
      x: playerState.position.x + worldX * speed * dt,
      z: playerState.position.z + worldZ * speed * dt,
    },
  };
}

export function getDodgeStaminaCost(currDodgeState, prevDodgeState) {
  if (prevDodgeState.state === DODGE_STATES.IDLE && currDodgeState.state === DODGE_STATES.DODGING) {
    return DODGE_CONSTANTS.STAMINA_COST;
  }
  return 0;
}

export function canDodge(dodgeState, staminaState) {
  return (
    dodgeState.state === DODGE_STATES.IDLE &&
    !staminaState.isDepleted &&
    staminaState.current >= DODGE_CONSTANTS.STAMINA_COST
  );
}

export function isDodging(dodgeState) {
  return dodgeState.state === DODGE_STATES.DODGING;
}
