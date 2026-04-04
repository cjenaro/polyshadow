import { distance3D } from '../utils/math.js';

export function isGrabPressed(input) {
  return !!input.action;
}

export function findNearestClimbableSurface(playerPos, surfaces, maxGrabDistance) {
  let nearest = null;
  let nearestDist = maxGrabDistance;

  for (const surface of surfaces) {
    if (!surface.climbable) continue;
    const d = distance3D(
      playerPos.x, playerPos.y, playerPos.z,
      surface.position.x, surface.position.y, surface.position.z
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearest = surface;
    }
  }

  return nearest;
}

export function tryGrab(state, input, surfaces, maxGrabDistance) {
  if (!isGrabPressed(input)) return state;
  if (state.isClimbing) return state;

  const surface = findNearestClimbableSurface(state.position, surfaces, maxGrabDistance);
  if (!surface) return state;

  return {
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
}

export function applyClimbingMovement(state, input, dt, constants) {
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

  const moveX = (nx * tangentX + ny * binormalX) * speed * dt;
  const moveY = (nx * tangentY + ny * binormalY) * speed * dt;
  const moveZ = (nx * tangentZ + ny * binormalZ) * speed * dt;

  return {
    ...state,
    position: {
      x: state.position.x + moveX,
      y: state.position.y + moveY,
      z: state.position.z + moveZ,
    },
  };
}

export function tryJumpClimb(state, input, surfaces, maxJumpDistance) {
  if (!state.isClimbing) return state;
  if (!input.jump) return state;

  let nearest = null;
  let nearestDist = maxJumpDistance;

  for (const surface of surfaces) {
    if (!surface.climbable) continue;
    if (surface === state.climbSurface) continue;
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

  return {
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
  };
}

export function releaseGrab(state) {
  if (!state.isClimbing) return state;
  return {
    ...state,
    isClimbing: false,
    climbSurface: null,
    climbNormal: null,
  };
}
