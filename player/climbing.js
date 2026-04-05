import { distance3D, lerp } from '../utils/math.js';

const JUMP_CLIMB_COOLDOWN = 0.3;
const BEHIND_PENALTY = 3;
export const DISMOUNT_FORCE = 10;
export const DISMOUNT_MOMENTUM_FACTOR = 0.5;

export function isGrabPressed(input) {
  return !!input.action;
}

export function findNearestClimbableSurface(playerPos, surfaces, maxGrabDistance, { facingDir, skipSurface } = {}) {
  let nearest = null;
  let nearestDist = maxGrabDistance;

  for (const surface of surfaces) {
    if (!surface.climbable) continue;
    if (surface === skipSurface) continue;
    const d = distance3D(
      playerPos.x, playerPos.y, playerPos.z,
      surface.position.x, surface.position.y, surface.position.z
    );

    let effectiveDist = d;
    if (facingDir && d > 0) {
      const dirX = (surface.position.x - playerPos.x) / d;
      const dirY = (surface.position.y - playerPos.y) / d;
      const dirZ = (surface.position.z - playerPos.z) / d;
      const dot = dirX * facingDir.x + dirY * facingDir.y + dirZ * facingDir.z;
      if (dot < 0) {
        effectiveDist = d * BEHIND_PENALTY;
      }
    }

    if (effectiveDist < nearestDist) {
      nearestDist = effectiveDist;
      nearest = surface;
    }
  }

  return nearest;
}

export function tryGrab(state, input, surfaces, maxGrabDistance, physicsCtx, { facingDir } = {}) {
  if (!isGrabPressed(input)) return state;
  if (state.isClimbing) return state;

  const surface = findNearestClimbableSurface(state.position, surfaces, maxGrabDistance, { facingDir });
  if (!surface) return state;

  const newState = {
    ...state,
    position: {
      x: surface.position.x,
      y: surface.position.y,
      z: surface.position.z,
    },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: false,
    isClimbing: true,
    climbSurface: surface,
    climbNormal: {
      x: surface.normal.x,
      y: surface.normal.y,
      z: surface.normal.z,
    },
  };
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setPosition(world, playerBody, surface.position);
    adapter.setVelocity(world, playerBody, { x: 0, y: 0, z: 0 });
  }
  return newState;
}

export function applyClimbingMovement(state, input, dt, constants, physicsCtx) {
  if (!state.isClimbing) return state;

  const mx = input.move.x;
  const my = input.move.y;
  const len = Math.sqrt(mx * mx + my * my);
  if (len === 0) return state;

  const nx = mx / len;
  const ny = my / len;
  const speed = constants.CLIMB_SPEED;

  const n = state.climbNormal;
  let tangentX, tangentY, tangentZ;

  if (Math.abs(n.y) < 0.999) {
    const upX = 0, upY = 1, upZ = 0;
    tangentX = upY * n.z - upZ * n.y;
    tangentY = upZ * n.x - upX * n.z;
    tangentZ = upX * n.y - upY * n.x;
  } else {
    tangentX = 1;
    tangentY = 0;
    tangentZ = 0;
  }

  const tLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
  tangentX /= tLen;
  tangentY /= tLen;
  tangentZ /= tLen;

  const binormalX = n.y * tangentZ - n.z * tangentY;
  const binormalY = n.z * tangentX - n.x * tangentZ;
  const binormalZ = n.x * tangentY - n.y * tangentX;

  const dirX = nx * tangentX + ny * binormalX;
  const dirY = nx * tangentY + ny * binormalY;
  const dirZ = nx * tangentZ + ny * binormalZ;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  const climbMoveDir = {
    x: dirLen > 1e-10 ? dirX / dirLen : 0,
    y: dirLen > 1e-10 ? dirY / dirLen : 0,
    z: dirLen > 1e-10 ? dirZ / dirLen : 0,
  };

  const moveX = dirX * speed * dt;
  const moveY = dirY * speed * dt;
  const moveZ = dirZ * speed * dt;

  const newPosition = {
    x: state.position.x + moveX,
    y: state.position.y + moveY,
    z: state.position.z + moveZ,
  };
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setPosition(world, playerBody, newPosition);
  }
  return {
    ...state,
    position: newPosition,
    climbMoveDir,
  };
}

export function tryJumpClimb(state, input, surfaces, maxJumpDistance, physicsCtx, { now = 0, stamina = 100, facingDir } = {}) {
  if (!state.isClimbing) return state;
  if (!input.jump) return state;
  if (now - state.lastJumpClimbTime < JUMP_CLIMB_COOLDOWN) return state;
  if (stamina <= 0) return state;

  const nearest = findNearestClimbableSurface(state.position, surfaces, maxJumpDistance, {
    facingDir,
    skipSurface: state.climbSurface,
  });

  if (!nearest) return state;

  const newState = {
    ...state,
    position: {
      x: nearest.position.x,
      y: nearest.position.y,
      z: nearest.position.z,
    },
    velocity: { x: 0, y: 0, z: 0 },
    climbSurface: nearest,
    climbNormal: {
      x: nearest.normal.x,
      y: nearest.normal.y,
      z: nearest.normal.z,
    },
    lastJumpClimbTime: now,
  };
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setPosition(world, playerBody, nearest.position);
  }
  return newState;
}

export function updateClimbNormal(state, surfaces, { smoothFactor = 0.2 } = {}) {
  if (!state.isClimbing || !state.climbNormal) return state;

  let nearest = null;
  let nearestDist = Infinity;

  for (const surface of surfaces) {
    if (!surface.climbable) continue;
    const d = distance3D(
      state.position.x, state.position.y, state.position.z,
      surface.position.x, surface.position.y, surface.position.z
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearest = surface;
    }
  }

  if (!nearest) return state;

  const target = nearest.normal;
  const n = state.climbNormal;
  const nx = lerp(n.x, target.x, smoothFactor);
  const ny = lerp(n.y, target.y, smoothFactor);
  const nz = lerp(n.z, target.z, smoothFactor);
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  const invLen = len > 1e-10 ? 1 / len : 0;

  return {
    ...state,
    climbSurface: nearest,
    climbNormal: { x: nx * invLen, y: ny * invLen, z: nz * invLen },
  };
}

export function releaseGrab(state, physicsCtx) {
  if (!state.isClimbing) return state;

  const n = state.climbNormal;
  const dirX = n.x;
  const dirY = n.y + 1;
  const dirZ = n.z;
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  const nx = dirX / len;
  const ny = dirY / len;
  const nz = dirZ / len;

  let velX = nx * DISMOUNT_FORCE;
  let velY = ny * DISMOUNT_FORCE;
  let velZ = nz * DISMOUNT_FORCE;

  if (state.climbMoveDir) {
    const m = state.climbMoveDir;
    velX += m.x * DISMOUNT_FORCE * DISMOUNT_MOMENTUM_FACTOR;
    velY += m.y * DISMOUNT_FORCE * DISMOUNT_MOMENTUM_FACTOR;
    velZ += m.z * DISMOUNT_FORCE * DISMOUNT_MOMENTUM_FACTOR;
  }

  const vel = { x: velX, y: velY, z: velZ };

  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setVelocity(world, playerBody, vel);
  }

  return {
    ...state,
    isClimbing: false,
    climbSurface: null,
    climbNormal: null,
    climbMoveDir: null,
    velocity: vel,
    isGrounded: false,
    isJumping: true,
  };
}
