export function calculateMovementDirection(inputMove, cameraYaw) {
  const ix = inputMove.x;
  const iy = inputMove.y;
  const len = Math.sqrt(ix * ix + iy * iy);
  if (len === 0) return { x: 0, z: 0 };

  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  const nx = ix / len;
  const nz = iy / len;

  return {
    x: nx * cos + nz * sin,
    z: -nx * sin + nz * cos,
  };
}

export function applyMovement(state, inputMove, cameraYaw, dt, isSprinting, constants) {
  const dir = calculateMovementDirection(inputMove, cameraYaw);
  const speed = isSprinting ? constants.RUN_SPEED : constants.WALK_SPEED;

  return {
    ...state,
    velocity: {
      ...state.velocity,
      x: dir.x * speed,
      z: dir.z * speed,
    },
    position: {
      ...state.position,
      x: state.position.x + dir.x * speed * dt,
      z: state.position.z + dir.z * speed * dt,
    },
  };
}

export function applyJump(state, constants) {
  if (!state.isGrounded) return state;
  return {
    ...state,
    velocity: { ...state.velocity, y: constants.JUMP_FORCE },
    isGrounded: false,
    isJumping: true,
  };
}

export function applyGravity(state, dt, constants) {
  let vy = state.velocity.y + constants.GRAVITY * dt;
  let newY = state.position.y + vy * dt;

  if (newY <= constants.GROUND_Y) {
    newY = constants.GROUND_Y;
    vy = 0;
    return {
      ...state,
      position: { ...state.position, y: newY },
      velocity: { ...state.velocity, y: vy },
      isGrounded: true,
      isJumping: false,
    };
  }

  return {
    ...state,
    position: { ...state.position, y: newY },
    velocity: { ...state.velocity, y: vy },
    isGrounded: false,
  };
}

export function updatePlayer(state, input, cameraYaw, dt, constants) {
  let newState = { ...state };
  newState.isSprinting = !!input.sprint;

  newState = applyMovement(newState, input, cameraYaw, dt, newState.isSprinting, constants);

  if (input.jump) {
    newState = applyJump(newState, constants);
  }

  newState = applyGravity(newState, dt, constants);

  return newState;
}
