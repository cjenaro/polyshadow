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

export function applyMovement(state, inputMove, cameraYaw, dt, isSprinting, constants, adapter, world, playerBody) {
  const dir = calculateMovementDirection(inputMove, cameraYaw);
  const speed = isSprinting ? constants.RUN_SPEED : constants.WALK_SPEED;
  const factor = state.isGrounded ? 1 : constants.AIR_CONTROL_FACTOR;

  let newVelX, newVelZ;
  if (state.isGrounded) {
    newVelX = dir.x * speed;
    newVelZ = dir.z * speed;
  } else {
    newVelX = state.velocity.x + (dir.x * speed - state.velocity.x) * factor;
    newVelZ = state.velocity.z + (dir.z * speed - state.velocity.z) * factor;
  }

  if (adapter && world && playerBody) {
    const currentVel = adapter.getVelocity(world, playerBody);
    adapter.setVelocity(world, playerBody, { x: newVelX, y: currentVel.y, z: newVelZ });
    return {
      ...state,
      velocity: { x: newVelX, y: currentVel.y, z: newVelZ },
    };
  }

  return {
    ...state,
    velocity: { ...state.velocity, x: newVelX, z: newVelZ },
    position: {
      ...state.position,
      x: state.position.x + newVelX * dt,
      z: state.position.z + newVelZ * dt,
    },
  };
}

export function applyJump(state, constants, adapter, world, playerBody) {
  if (!state.isGrounded) return state;

  if (adapter && world && playerBody) {
    adapter.applyImpulse(world, playerBody, { x: 0, y: constants.JUMP_FORCE, z: 0 });
    return { ...state, isGrounded: false, isJumping: true };
  }

  return { ...state, velocity: { ...state.velocity, y: constants.JUMP_FORCE }, isGrounded: false, isJumping: true };
}

export function applyGravity(state, dt, constants, adapter, world, playerBody) {
  if (adapter && world && playerBody) {
    const pos = adapter.getPosition(world, playerBody);
    const vel = adapter.getVelocity(world, playerBody);
    const isGrounded = pos.y <= constants.GROUND_Y + 0.01;
    const result = {
      ...state,
      position: { ...pos },
      velocity: { ...vel },
      isGrounded,
    };
    if (isGrounded) {
      result.isJumping = false;
    }
    return result;
  }

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

export function updatePlayer(state, input, cameraYaw, dt, constants, physicsCtx) {
  let newState = { ...state };
  newState.isSprinting = !!input.sprint;

  const { adapter, world, playerBody } = physicsCtx || {};

  newState = applyMovement(newState, input, cameraYaw, dt, newState.isSprinting, constants, adapter, world, playerBody);

  if (input.jump) {
    newState = applyJump(newState, constants, adapter, world, playerBody);
  }

  newState = applyGravity(newState, dt, constants, adapter, world, playerBody);

  return newState;
}
