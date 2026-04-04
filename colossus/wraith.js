import { vec3Add, vec3Scale } from '../utils/math.js';
import { createColossusBody, getBodyPartWorldPosition, getWeakPoints } from './base.js';
import { distance3D } from '../utils/math.js';

export const WIND_WRAITH_SCALE = 30;

export function createWraithDefinition() {
  const S = WIND_WRAITH_SCALE;

  const bodyLen = S * 0.7;
  const bodyW = S * 0.15;
  const bodyH = S * 0.35;

  const neckY = S * 0.6;
  const neckLen = S * 0.2;
  const neckZ = bodyLen * 0.5 + neckLen * 0.5;

  const headSize = S * 0.12;
  const headY = S * 0.85;
  const headZ = neckZ + neckLen * 0.5 + headSize * 0.5;

  const chestZ = bodyLen * 0.15;
  const tailBaseZ = -bodyLen * 0.15;
  const tailMidZ = -bodyLen * 0.35;
  const tailTipZ = -bodyLen * 0.5;

  const wingW = S * 0.45;
  const wingD = S * 0.18;
  const wingH = S * 0.04;
  const wingZ = chestZ + wingD * 0.1;

  const parts = [
    {
      id: 'neck', name: 'Neck', type: 'core',
      position: { x: 0, y: neckY, z: neckZ },
      dimensions: { width: bodyW * 0.8, height: bodyH * 0.9, depth: neckLen },
      rotation: { x: 0, y: 0, z: 0 },
      parent: null, isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'chest', name: 'Chest', type: 'core',
      position: { x: 0, y: S * 0.55, z: chestZ },
      dimensions: { width: bodyW, height: bodyH, depth: bodyLen * 0.4 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'neck', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'tail_base', name: 'Tail Base', type: 'core',
      position: { x: 0, y: S * 0.4, z: tailBaseZ },
      dimensions: { width: bodyW * 0.85, height: bodyH * 0.85, depth: bodyLen * 0.25 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'chest', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'tail_mid', name: 'Tail Mid', type: 'core',
      position: { x: 0, y: S * 0.2, z: tailMidZ },
      dimensions: { width: bodyW * 0.6, height: bodyH * 0.7, depth: bodyLen * 0.25 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'tail_base', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'tail_tip', name: 'Tail Tip', type: 'core',
      position: { x: 0, y: S * 0.05, z: tailTipZ },
      dimensions: { width: bodyW * 0.35, height: bodyH * 0.5, depth: bodyLen * 0.2 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'tail_mid', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'head', name: 'Head', type: 'head',
      position: { x: 0, y: headY, z: headZ },
      dimensions: { width: headSize, height: headSize, depth: headSize * 1.3 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'neck', isClimbable: false, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'left_wing', name: 'Left Wing', type: 'limb_upper',
      position: { x: -(bodyW * 0.5 + wingW * 0.5), y: neckY + wingH * 0.5, z: wingZ },
      dimensions: { width: wingW, height: wingH, depth: wingD },
      rotation: { x: 0, y: 0, z: 0.05 },
      parent: 'chest', isClimbable: true, isWeakPoint: true, healthMultiplier: 2.0,
    },
    {
      id: 'right_wing', name: 'Right Wing', type: 'limb_upper',
      position: { x: bodyW * 0.5 + wingW * 0.5, y: neckY + wingH * 0.5, z: wingZ },
      dimensions: { width: wingW, height: wingH, depth: wingD },
      rotation: { x: 0, y: 0, z: -0.05 },
      parent: 'chest', isClimbable: true, isWeakPoint: true, healthMultiplier: 2.0,
    },
    {
      id: 'neck_rune', name: 'Neck Rune', type: 'core',
      position: { x: 0, y: neckY + bodyH * 0.55, z: neckZ - neckLen * 0.15 },
      dimensions: { width: bodyW * 0.3, height: bodyH * 0.15, depth: 0.1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'neck', isClimbable: false, isWeakPoint: true, healthMultiplier: 3.0,
    },
  ];

  return { parts };
}

export function generateWraithSurfacePatches(definition) {
  const patches = [];
  const partList = definition.parts;

  for (const part of partList) {
    if (!part.isClimbable) continue;

    const { position: pos, dimensions: dim } = part;
    const hw = dim.width / 2;
    const hh = dim.height / 2;
    const hd = dim.depth / 2;
    const parent = part.parent || part.id;

    const topY = pos.y + hh;
    const bottomY = pos.y - hh;
    const leftX = pos.x - hw;
    const rightX = pos.x + hw;
    const frontZ = pos.z + hd;
    const backZ = pos.z - hd;

    const stepsX = Math.max(2, Math.ceil(dim.width / 2));
    const stepsZ = Math.max(2, Math.ceil(dim.depth / 2));
    const stepsY = Math.max(2, Math.ceil(dim.height / 2));

    for (let i = 0; i <= stepsX; i++) {
      const t = stepsX === 0 ? 0.5 : i / stepsX;
      const x = leftX + t * dim.width;

      for (let j = 0; j <= stepsZ; j++) {
        const s = stepsZ === 0 ? 0.5 : j / stepsZ;
        const z = backZ + s * dim.depth;

        patches.push({
          position: { x, y: topY, z },
          normal: { x: 0, y: 1, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }

    for (let i = 0; i <= stepsX; i++) {
      const t = stepsX === 0 ? 0.5 : i / stepsX;
      const x = leftX + t * dim.width;

      for (let j = 0; j <= stepsY; j++) {
        const s = stepsY === 0 ? 0.5 : j / stepsY;
        const y = bottomY + s * dim.height;

        patches.push({
          position: { x, y, z: frontZ },
          normal: { x: 0, y: 0, z: 1 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
        patches.push({
          position: { x, y, z: backZ },
          normal: { x: 0, y: 0, z: -1 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }

    for (let j = 0; j <= stepsZ; j++) {
      const s = stepsZ === 0 ? 0.5 : j / stepsZ;
      const z = backZ + s * dim.depth;

      for (let k = 0; k <= stepsY; k++) {
        const u = stepsY === 0 ? 0.5 : k / stepsY;
        const y = bottomY + u * dim.height;

        patches.push({
          position: { x: leftX, y, z },
          normal: { x: -1, y: 0, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
        patches.push({
          position: { x: rightX, y, z },
          normal: { x: 1, y: 0, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }
  }

  return patches;
}

export function getWraithWeakPointPositions(definition, colossusPosition, colossusRotation) {
  const body = definition.parts instanceof Map ? definition : createColossusBody(definition);
  const weak = getWeakPoints(body);
  const positions = [];

  for (const part of weak) {
    const pos = getBodyPartWorldPosition(body, part.id, colossusPosition, colossusRotation);
    if (pos) {
      positions.push({ ...pos, bodyPartId: part.id });
    }
  }

  return positions;
}

export const WEAK_POINT_BASE_HEALTH = 50;

export function buildWraithCombatWeakPoints(definition, colossusPosition, colossusRotation) {
  const body = definition.parts instanceof Map ? definition : createColossusBody(definition);
  const weak = getWeakPoints(body);
  const combatWeakPoints = [];

  for (const part of weak) {
    const pos = getBodyPartWorldPosition(body, part.id, colossusPosition, colossusRotation);
    if (pos) {
      const maxHealth = Math.round(WEAK_POINT_BASE_HEALTH * part.healthMultiplier);
      combatWeakPoints.push({
        id: part.id,
        position: { ...pos },
        health: maxHealth,
        maxHealth,
        isDestroyed: false,
        isActive: true,
      });
    }
  }

  return combatWeakPoints;
}

export const WraithState = {
  IDLE: 'idle',
  CIRCLING: 'circling',
  SWOOPING: 'swooping',
  CLIMBING_BACK: 'climbing_back',
  STUNNED: 'stunned',
  DYING: 'dying',
};

export const WRAITH_BEHAVIOR_CONFIG = {
  idleDuration: 2,
  patrolSpeed: 8,
  patrolRadius: 50,
  patrolAltitude: 25,
  detectionRange: 50,
  loseInterestRange: 80,
  aggroSpeed: 12,
  attackRange: 15,
  attackCooldown: 4,
  stunDuration: 2.5,
  maxHealth: 120,
  swoopSpeed: 20,
  swoopPullUpDistance: 8,
  windPushForce: 5,
  windPushRadius: 20,
  flightPatternChangeTime: 6,
};

export function createWraithBehaviorState(overrides = {}) {
  return {
    state: WraithState.IDLE,
    health: WRAITH_BEHAVIOR_CONFIG.maxHealth,
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
    altitude: 0,
    swoopTarget: null,
    flightPhase: 0,
    windPushTimer: 0,
    ...overrides,
  };
}

function moveToward3D(position, target, speed, dt) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const dz = target.z - position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.01) return position;

  const step = Math.min(speed * dt, dist);
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  return {
    x: position.x + nx * step,
    y: position.y + ny * step,
    z: position.z + nz * step,
  };
}

function moveToward2D(position, target, speed, dt) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.01) return position;

  const step = Math.min(speed * dt, dist);
  const nx = dx / dist;
  const nz = dz / dist;

  return {
    x: position.x + nx * step,
    y: position.y,
    z: position.z + nz * step,
  };
}

function faceToward(position, target) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  return Math.atan2(dx, -dz);
}

export function updateWraithBehavior(aiState, config, deltaTime, playerPosition, colossusPosition) {
  if (aiState.state === WraithState.DYING) {
    return { ...aiState, shouldAttack: false };
  }

  let state = { ...aiState };
  state.attackCooldown = Math.max(0, state.attackCooldown - deltaTime);

  if (state.state === WraithState.IDLE) {
    state.stateTimer += deltaTime;
    state.rotation += deltaTime * 0.3;

    if (state.stateTimer >= config.idleDuration) {
      state.state = WraithState.CIRCLING;
      state.altitude = config.patrolAltitude;
      state.flightPhase = 0;
      state.stateTimer = 0;
    }

    return { ...state, shouldAttack: false };
  }

  if (state.state === WraithState.CIRCLING) {
    const dist = distance3D(
      colossusPosition.x, colossusPosition.y, colossusPosition.z,
      playerPosition.x, playerPosition.y, playerPosition.z
    );

    if (dist <= config.detectionRange && state.attackCooldown <= 0) {
      state.state = WraithState.SWOOPING;
      state.swoopTarget = { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z };
      state.isAlerted = true;
      state.stateTimer = 0;
      state.rotation = faceToward(colossusPosition, playerPosition);
      return { ...state, shouldAttack: false };
    }

    state.flightPhase += deltaTime;
    const angle = state.flightPhase * (config.patrolSpeed / config.patrolRadius);
    const cx = state.arenaCenter.x;
    const cz = state.arenaCenter.z;
    const targetX = cx + Math.cos(angle) * config.patrolRadius;
    const targetZ = cz + Math.sin(angle) * config.patrolRadius;

    state.position = moveToward2D(colossusPosition, { x: targetX, z: targetZ }, config.patrolSpeed, deltaTime);
    state.position.y = state.altitude;
    state.rotation = faceToward(colossusPosition, { x: targetX, z: targetZ });
    state.stateTimer += deltaTime;
    state.altitude = config.patrolAltitude;

    return { ...state, shouldAttack: false };
  }

  if (state.state === WraithState.SWOOPING) {
    const target = state.swoopTarget || playerPosition;
    const swoopTarget = { x: target.x, y: target.y, z: target.z };
    state.position = moveToward3D(colossusPosition, swoopTarget, config.swoopSpeed, deltaTime);
    state.altitude = state.position.y;
    state.rotation = faceToward(colossusPosition, swoopTarget);
    state.windPushTimer += deltaTime;
    state.stateTimer += deltaTime;

    const groundDist = state.position.y;

    if (groundDist <= config.swoopPullUpDistance) {
      state.state = WraithState.CLIMBING_BACK;
      state.altitude = state.position.y;
      state.attackCooldown = config.attackCooldown;
      state.stateTimer = 0;
      return { ...state, shouldAttack: false };
    }

    let shouldAttack = false;
    const dist = distance3D(
      state.position.x, state.position.y, state.position.z,
      playerPosition.x, playerPosition.y, playerPosition.z
    );
    if (dist <= config.attackRange && state.attackCooldown <= 0) {
      shouldAttack = true;
    }

    return { ...state, shouldAttack };
  }

  if (state.state === WraithState.CLIMBING_BACK) {
    state.altitude += config.aggroSpeed * deltaTime;
    state.position.y = state.altitude;
    state.rotation += deltaTime * 0.2;
    state.stateTimer += deltaTime;

    if (state.altitude >= config.patrolAltitude) {
      state.state = WraithState.CIRCLING;
      state.altitude = config.patrolAltitude;
      state.flightPhase = state.stateTimer;
      state.stateTimer = 0;
    }

    return { ...state, shouldAttack: false };
  }

  if (state.state === WraithState.STUNNED) {
    state.stunTimer -= deltaTime;
    if (state.stunTimer <= 0) {
      state.state = WraithState.CIRCLING;
      state.altitude = state.altitude || config.patrolAltitude;
      state.flightPhase = 0;
      state.stunTimer = 0;
      state.stateTimer = 0;
    }
    return { ...state, shouldAttack: false };
  }

  return { ...state, shouldAttack: false };
}

export function getWraithWindForce(aiState, config, targetPosition) {
  if (aiState.state !== WraithState.SWOOPING) {
    return { x: 0, y: 0, z: 0 };
  }

  const dx = targetPosition.x - aiState.position.x;
  const dy = targetPosition.y - aiState.position.y;
  const dz = targetPosition.z - aiState.position.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist > config.windPushRadius || dist < 0.01) {
    return { x: 0, y: 0, z: 0 };
  }

  const strength = config.windPushForce * (1 - dist / config.windPushRadius);
  return {
    x: (dx / dist) * strength,
    y: (dy / dist) * strength + strength * 0.3,
    z: (dz / dist) * strength,
  };
}

export function isWraithClimbable(aiState) {
  return aiState.state === WraithState.CIRCLING ||
         aiState.state === WraithState.STUNNED;
}
