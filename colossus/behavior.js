import { distance3D, randomRange } from '../utils/math.js';
import { moveToward2D } from './steering.js';

export const ColossusState = {
  IDLE: 'idle',
  PATROL: 'patrol',
  AGGRO: 'aggro',
  STUNNED: 'stunned',
  DYING: 'dying',
};

export const SENTINEL_BEHAVIOR_CONFIG = {
  idleDuration: 3,
  patrolSpeed: 2,
  patrolRadius: 30,
  detectionRange: 40,
  loseInterestRange: 60,
  aggroSpeed: 6,
  attackRange: 8,
  attackCooldown: 3,
  stunDuration: 2,
  maxHealth: 100,
};

export const SENTINEL_STUN_DAMAGE_THRESHOLD = 40;

function generatePatrolWaypoints(center, radius, count = 4) {
  const waypoints = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    waypoints.push({
      x: center.x + Math.cos(angle) * radius * randomRange(0.5, 1),
      z: center.z + Math.sin(angle) * radius * randomRange(0.5, 1),
    });
  }
  return waypoints;
}

export function createBehaviorState(overrides = {}) {
  return {
    state: ColossusState.IDLE,
    health: SENTINEL_BEHAVIOR_CONFIG.maxHealth,
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    targetPosition: null,
    stateTimer: 0,
    stunTimer: 0,
    attackTimer: 0,
    attackCooldown: 0,
    isAlerted: false,
    patrolWaypoints: [],
    currentWaypointIndex: 0,
    arenaCenter: { x: 0, z: 0 },
    shakeOffTimer: 0,
    lastShakeOffTime: 0,
    stunDamageAccumulator: 0,
    ...overrides,
  };
}

function faceToward(position, target) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  return Math.atan2(dx, -dz);
}

export function updateBehavior(aiState, config, deltaTime, playerPosition, colossusPosition) {
  if (aiState.state === ColossusState.DYING) {
    return { ...aiState, shouldAttack: false };
  }

  let state = { ...aiState };
  state.attackCooldown = Math.max(0, state.attackCooldown - deltaTime);

  if (state.state === ColossusState.IDLE) {
    state.stateTimer += deltaTime;
    state.rotation += deltaTime * 0.2;

    if (state.stateTimer >= config.idleDuration) {
      const waypoints = generatePatrolWaypoints(state.arenaCenter, config.patrolRadius);
      state.state = ColossusState.PATROL;
      state.patrolWaypoints = waypoints;
      state.currentWaypointIndex = 0;
      state.stateTimer = 0;
    }

    return { ...state, shouldAttack: false };
  }

  if (state.state === ColossusState.PATROL) {
    const dist = distance3D(
      colossusPosition.x, colossusPosition.y, colossusPosition.z,
      playerPosition.x, playerPosition.y, playerPosition.z
    );

    if (dist <= config.detectionRange) {
      state.state = ColossusState.AGGRO;
      state.isAlerted = true;
      state.stateTimer = 0;
      const rotation = faceToward(colossusPosition, playerPosition);
      state.rotation = rotation;
      return { ...state, shouldAttack: false };
    }

    if (state.patrolWaypoints.length === 0 || state.currentWaypointIndex >= state.patrolWaypoints.length) {
      state.state = ColossusState.IDLE;
      state.stateTimer = 0;
      return { ...state, shouldAttack: false };
    }

    const waypoint = state.patrolWaypoints[state.currentWaypointIndex];
    const wpDist = Math.sqrt(
      (colossusPosition.x - waypoint.x) ** 2 + (colossusPosition.z - waypoint.z) ** 2
    );

    if (wpDist < 2) {
      state.currentWaypointIndex++;
      if (state.currentWaypointIndex >= state.patrolWaypoints.length) {
        state.state = ColossusState.IDLE;
        state.stateTimer = 0;
        return { ...state, shouldAttack: false };
      }
    }

    const target = state.patrolWaypoints[state.currentWaypointIndex];
    state.position = moveToward2D(colossusPosition, target, config.patrolSpeed, deltaTime);
    state.rotation = faceToward(colossusPosition, target);
    state.stateTimer += deltaTime;

    return { ...state, shouldAttack: false };
  }

  if (state.state === ColossusState.STUNNED) {
    state.stunTimer -= deltaTime;
    if (state.stunTimer <= 0) {
      state.state = ColossusState.AGGRO;
      state.stunTimer = 0;
      state.stateTimer = 0;
    }
    return { ...state, shouldAttack: false };
  }

  if (state.state === ColossusState.AGGRO) {
    const dist = distance3D(
      colossusPosition.x, colossusPosition.y, colossusPosition.z,
      playerPosition.x, playerPosition.y, playerPosition.z
    );

    if (dist > config.loseInterestRange) {
      state.state = ColossusState.PATROL;
      state.stateTimer = 0;
      const waypoints = generatePatrolWaypoints(state.arenaCenter, config.patrolRadius);
      state.patrolWaypoints = waypoints;
      state.currentWaypointIndex = 0;
      return { ...state, shouldAttack: false };
    }

    state.position = moveToward2D(colossusPosition, playerPosition, config.aggroSpeed, deltaTime);
    state.rotation = faceToward(colossusPosition, playerPosition);
    state.targetPosition = { x: playerPosition.x, z: playerPosition.z };
    state.shakeOffTimer += deltaTime;

    let shouldAttack = false;
    if (dist <= config.attackRange && state.attackCooldown <= 0) {
      shouldAttack = true;
      state.attackCooldown = config.attackCooldown;
    }

    state.stateTimer += deltaTime;
    return { ...state, shouldAttack };
  }

  return { ...state, shouldAttack: false };
}

export function triggerStun(aiState, config) {
  return {
    ...aiState,
    state: ColossusState.STUNNED,
    stunTimer: config.stunDuration,
    stateTimer: 0,
  };
}

export function triggerDeath(aiState) {
  return {
    ...aiState,
    state: ColossusState.DYING,
  };
}

export function isClimbable(aiState) {
  return aiState.state === ColossusState.PATROL ||
         aiState.state === ColossusState.AGGRO ||
         aiState.state === ColossusState.STUNNED;
}

export function applySentinelDamage(aiState, config, damage) {
  if (aiState.state === ColossusState.STUNNED || aiState.state === ColossusState.DYING) {
    return { ...aiState };
  }

  const newAccumulator = (aiState.stunDamageAccumulator || 0) + damage;

  if (newAccumulator >= SENTINEL_STUN_DAMAGE_THRESHOLD) {
    return {
      ...aiState,
      state: ColossusState.STUNNED,
      stunTimer: config.stunDuration,
      stateTimer: 0,
      stunDamageAccumulator: 0,
    };
  }

  return {
    ...aiState,
    stunDamageAccumulator: newAccumulator,
  };
}

export function getSentinelStunProgress(aiState) {
  const acc = aiState.stunDamageAccumulator || 0;
  return Math.min(1, acc / SENTINEL_STUN_DAMAGE_THRESHOLD);
}

export function getFacingDirection(rotation) {
  return {
    x: -Math.sin(rotation),
    y: 0,
    z: -Math.cos(rotation),
  };
}

export function shouldShakeOff(aiState, config, timeSincePlayerGrabbed) {
  if (aiState.state !== ColossusState.AGGRO) return false;
  if (timeSincePlayerGrabbed <= 0) return false;
  if (timeSincePlayerGrabbed < 8) return false;

  const interval = 8 + ((aiState.lastShakeOffTime * 17) % 4);
  if (timeSincePlayerGrabbed >= interval) {
    aiState.lastShakeOffTime = timeSincePlayerGrabbed;
    return true;
  }

  return false;
}
