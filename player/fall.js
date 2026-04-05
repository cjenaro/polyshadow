import { shouldTriggerFall } from './stamina.js';

export const FALL_CONSTANTS = {
  FREEFALL_THRESHOLD: -50,
  FALL_GRAVITY_MULTIPLIER: 1.5,
  MAX_FALL_TIME: 5,
  FREEFALL_CAMERA_ZOOM: 2.0,
  FREEFALL_CAMERA_OFFSET: 3.0,
};

export function enterFall(state, physicsCtx) {
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setVelocity(world, playerBody, { x: state.velocity.x, y: 0, z: state.velocity.z });
  }
  return {
    ...state,
    isFalling: true,
    isGrounded: false,
    isClimbing: false,
    fallTime: 0,
    velocity: { x: state.velocity.x, y: 0, z: state.velocity.z },
    climbSurface: null,
    climbNormal: null,
  };
}

export function updateFall(state, dt, constants, physicsCtx) {
  if (!state.isFalling) return state;
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    const bodyMass = playerBody.mass || 1;
    adapter.applyForce(world, playerBody, { x: 0, y: -20 * constants.FALL_GRAVITY_MULTIPLIER * bodyMass, z: 0 });
    const pos = adapter.getPosition(world, playerBody);
    const vel = adapter.getVelocity(world, playerBody);
    return {
      ...state,
      fallTime: state.fallTime + dt,
      velocity: { x: vel.x, y: vel.y, z: vel.z },
      position: { x: pos.x, y: pos.y, z: pos.z },
    };
  }
  const gravity = -20 * constants.FALL_GRAVITY_MULTIPLIER;
  const newVy = state.velocity.y + gravity * dt;
  const newY = state.position.y + newVy * dt;
  return {
    ...state,
    fallTime: state.fallTime + dt,
    velocity: {
      x: state.velocity.x,
      y: newVy,
      z: state.velocity.z,
    },
    position: {
      x: state.position.x + state.velocity.x * dt,
      y: newY,
      z: state.position.z + state.velocity.z * dt,
    },
  };
}

export function isFallThresholdBreached(position, threshold) {
  if (threshold === undefined) threshold = FALL_CONSTANTS.FREEFALL_THRESHOLD;
  return position.y < threshold;
}

export function findNearestRespawnPoint(position, respawnPoints) {
  if (respawnPoints.length === 0) return null;

  let nearest = null;
  let nearestDist = Infinity;

  for (const point of respawnPoints) {
    const dx = position.x - point.position.x;
    const dy = position.y - point.position.y;
    const dz = position.z - point.position.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = point;
    }
  }

  return nearest;
}

export function respawn(state, respawnPoints, physicsCtx) {
  const point = findNearestRespawnPoint(state.position, respawnPoints);
  if (!point) return state;
  if (physicsCtx) {
    const { adapter, world, playerBody } = physicsCtx;
    adapter.setPosition(world, playerBody, point.position);
    adapter.setVelocity(world, playerBody, { x: 0, y: 0, z: 0 });
  }
  return {
    ...state,
    position: { x: point.position.x, y: point.position.y, z: point.position.z },
    velocity: { x: 0, y: 0, z: 0 },
    isFalling: false,
    isGrounded: true,
    fallTime: 0,
  };
}

export function getFreefallCameraData(state, constants) {
  if (!state.isFalling) {
    return { zoom: 1, offsetY: 0, lookUp: false };
  }

  const progress = Math.min(state.fallTime / constants.MAX_FALL_TIME, 1);
  const zoom = constants.FREEFALL_CAMERA_ZOOM * (1 + progress * 0.5);

  return {
    zoom,
    offsetY: constants.FREEFALL_CAMERA_OFFSET * progress,
    lookUp: true,
  };
}

export function checkFall(state, staminaState, threshold) {
  const staminaFall = shouldTriggerFall(staminaState);
  const belowThreshold = isFallThresholdBreached(state.position, threshold);

  return {
    shouldFall: staminaFall || belowThreshold,
    shouldRespawn: belowThreshold && !!state.isFalling,
  };
}
