import { vec3Add, vec3Scale, distance3D, randomRange } from "../utils/math.js";
import { createColossusBody, getBodyPartWorldPosition, getWeakPoints } from "./base.js";
import { ColossusState } from "./behavior.js";
import { moveToward2D } from "./steering.js";
import { generateNormalMapData } from "../utils/normal-map.js";

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

function getTHREE() {
  return _THREE;
}

export const TIDE_TITAN_SCALE = 40;

export function createTitanDefinition() {
  const S = TIDE_TITAN_SCALE;

  const shellW = S * 0.75;
  const shellH = S * 0.1;
  const shellD = S * 0.55;
  const shellY = S * 0.25;

  const shellFrontW = S * 0.5;
  const shellFrontH = S * 0.08;
  const shellFrontD = S * 0.15;

  const shellRearW = S * 0.5;
  const shellRearH = S * 0.08;
  const shellRearD = S * 0.15;

  const underbellyW = S * 0.65;
  const underbellyH = S * 0.08;
  const underbellyD = S * 0.5;
  const underbellyY = S * 0.12;

  const headW = S * 0.12;
  const headH = S * 0.1;
  const headD = S * 0.12;
  const headY = S * 0.22;

  const legW = S * 0.06;
  const legH = S * 0.15;
  const legY = S * 0.12;

  const clawUpperW = S * 0.1;
  const clawUpperH = S * 0.08;
  const clawUpperD = S * 0.08;
  const clawUpperY = S * 0.15;

  const clawLowerW = S * 0.07;
  const clawLowerH = S * 0.06;
  const clawLowerD = S * 0.1;
  const clawLowerY = S * 0.08;

  const legSpreadX = shellW / 2 + legW * 0.5;
  const clawSpreadX = shellW / 2 + clawUpperW * 0.5;
  const shellFrontZ = shellD / 2 + shellFrontD / 2;
  const shellRearZ = -(shellD / 2 + shellRearD / 2);
  const headZ = shellFrontZ + shellFrontD / 2 + headD / 2;

  const parts = [
    {
      id: "shell_main",
      name: "Shell Main",
      type: "core",
      position: { x: 0, y: shellY, z: 0 },
      dimensions: { width: shellW, height: shellH, depth: shellD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: null,
      isClimbable: true,
      isWeakPoint: false,
      isRestSpot: true,
      healthMultiplier: 1.0,
    },
    {
      id: "shell_front",
      name: "Shell Front",
      type: "core",
      position: { x: 0, y: shellY - shellH * 0.1, z: shellFrontZ },
      dimensions: { width: shellFrontW, height: shellFrontH, depth: shellFrontD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      isRestSpot: true,
      healthMultiplier: 1.0,
    },
    {
      id: "shell_rear",
      name: "Shell Rear",
      type: "core",
      position: { x: 0, y: shellY - shellH * 0.1, z: shellRearZ },
      dimensions: { width: shellRearW, height: shellRearH, depth: shellRearD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      isRestSpot: true,
      healthMultiplier: 1.0,
    },
    {
      id: "underbelly",
      name: "Underbelly",
      type: "core",
      position: { x: 0, y: underbellyY, z: 0 },
      dimensions: { width: underbellyW, height: underbellyH, depth: underbellyD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "head",
      name: "Head",
      type: "head",
      position: { x: 0, y: headY, z: headZ },
      dimensions: { width: headW, height: headH, depth: headD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_front",
      isClimbable: false,
      isWeakPoint: true,
      healthMultiplier: 3.0,
    },
    {
      id: "left_claw_upper",
      name: "Left Claw Upper",
      type: "limb_upper",
      position: { x: -clawSpreadX, y: clawUpperY, z: shellD * 0.3 },
      dimensions: { width: clawUpperW, height: clawUpperH, depth: clawUpperD },
      rotation: { x: 0, y: 0, z: 0.2 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "left_claw_lower",
      name: "Left Claw Lower",
      type: "limb_lower",
      position: {
        x: -(clawSpreadX + clawLowerW * 0.3),
        y: clawLowerY,
        z: shellD * 0.35 + clawLowerD * 0.3,
      },
      dimensions: { width: clawLowerW, height: clawLowerH, depth: clawLowerD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "left_claw_upper",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "right_claw_upper",
      name: "Right Claw Upper",
      type: "limb_upper",
      position: { x: clawSpreadX, y: clawUpperY, z: shellD * 0.3 },
      dimensions: { width: clawUpperW, height: clawUpperH, depth: clawUpperD },
      rotation: { x: 0, y: 0, z: -0.2 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "right_claw_lower",
      name: "Right Claw Lower",
      type: "limb_lower",
      position: {
        x: clawSpreadX + clawLowerW * 0.3,
        y: clawLowerY,
        z: shellD * 0.35 + clawLowerD * 0.3,
      },
      dimensions: { width: clawLowerW, height: clawLowerH, depth: clawLowerD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "right_claw_upper",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "left_leg_front",
      name: "Left Leg Front",
      type: "limb_upper",
      position: { x: -legSpreadX, y: legY, z: shellD * 0.3 },
      dimensions: { width: legW, height: legH, depth: legW },
      rotation: { x: 0, y: 0, z: 0.1 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "left_leg_rear",
      name: "Left Leg Rear",
      type: "limb_upper",
      position: { x: -legSpreadX, y: legY, z: -shellD * 0.3 },
      dimensions: { width: legW, height: legH, depth: legW },
      rotation: { x: 0, y: 0, z: 0.1 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "right_leg_front",
      name: "Right Leg Front",
      type: "limb_upper",
      position: { x: legSpreadX, y: legY, z: shellD * 0.3 },
      dimensions: { width: legW, height: legH, depth: legW },
      rotation: { x: 0, y: 0, z: -0.1 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "right_leg_rear",
      name: "Right Leg Rear",
      type: "limb_upper",
      position: { x: legSpreadX, y: legY, z: -shellD * 0.3 },
      dimensions: { width: legW, height: legH, depth: legW },
      rotation: { x: 0, y: 0, z: -0.1 },
      parent: "shell_main",
      isClimbable: true,
      isWeakPoint: false,
      healthMultiplier: 1.0,
    },
    {
      id: "shell_rune_left",
      name: "Shell Rune Left",
      type: "core",
      position: { x: -shellW * 0.25, y: shellY + shellH / 2 + 0.05, z: 0 },
      dimensions: { width: S * 0.075, height: 0.1, depth: S * 0.075 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: false,
      isWeakPoint: true,
      healthMultiplier: 2.0,
    },
    {
      id: "shell_rune_right",
      name: "Shell Rune Right",
      type: "core",
      position: { x: shellW * 0.25, y: shellY + shellH / 2 + 0.05, z: 0 },
      dimensions: { width: S * 0.075, height: 0.1, depth: S * 0.075 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: false,
      isWeakPoint: true,
      healthMultiplier: 2.0,
    },
    {
      id: "shell_rune_center",
      name: "Shell Rune Center",
      type: "core",
      position: { x: 0, y: shellY + shellH / 2 + 0.05, z: 0 },
      dimensions: { width: S * 0.1, height: 0.1, depth: S * 0.1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: "shell_main",
      isClimbable: false,
      isWeakPoint: true,
      healthMultiplier: 2.5,
    },
  ];

  return { parts };
}

export function generateTitanSurfacePatches(definition) {
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

export function getTitanWeakPointPositions(definition, colossusPosition, colossusRotation) {
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
export const TITAN_STUN_DAMAGE_THRESHOLD = 80;

export function buildCombatWeakPoints(
  definition,
  colossusPosition,
  colossusRotation,
  isStunned = false,
) {
  const body = definition.parts instanceof Map ? definition : createColossusBody(definition);
  const weak = getWeakPoints(body);
  const combatWeakPoints = [];

  for (const part of weak) {
    const pos = getBodyPartWorldPosition(body, part.id, colossusPosition, colossusRotation);
    if (pos) {
      const maxHealth = Math.round(WEAK_POINT_BASE_HEALTH * part.healthMultiplier);
      const isActive = part.type === "head" ? isStunned : true;
      combatWeakPoints.push({
        id: part.id,
        position: { ...pos },
        health: maxHealth,
        maxHealth,
        isDestroyed: false,
        isActive,
      });
    }
  }

  return combatWeakPoints;
}

export const TITAN_BEHAVIOR_CONFIG = {
  idleDuration: 4,
  patrolSpeed: 1.5,
  patrolRadius: 35,
  detectionRange: 45,
  loseInterestRange: 70,
  aggroSpeed: 3,
  attackRange: 12,
  attackCooldown: 5,
  stunDuration: 3,
  maxHealth: 150,
  shockwaveDamage: 15,
  shockwaveRadius: 15,
  phase2SpeedMultiplier: 1.5,
  phase2AttackCooldown: 3.5,
  submergeInterval: 15,
  submergeDuration: 5,
  submergeWarningTime: 3,
  tiltMaxAngle: 0.3,
  tiltRecoverySpeed: 0.5,
  tiltShakeForce: 2.0,
};

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

function faceToward(position, target) {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  return Math.atan2(dx, -dz);
}

export function createTitanBehaviorState(overrides = {}) {
  return {
    state: ColossusState.IDLE,
    health: TITAN_BEHAVIOR_CONFIG.maxHealth,
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
    phase: 1,
    submergeTimer: 0,
    submergeActive: false,
    submergeWarning: false,
    tiltAngle: 0,
    tiltDirection: { x: 0, z: 1 },
    isSubmerged: false,
    stunDamageAccumulator: 0,
    ...overrides,
  };
}

export function updateTitanBehavior(aiState, config, deltaTime, playerPosition, colossusPosition) {
  if (aiState.state === ColossusState.DYING) {
    return { ...aiState, shouldAttack: false };
  }

  let state = { ...aiState };
  state.attackCooldown = Math.max(0, state.attackCooldown - deltaTime);

  if (state.phase === 1 && state.health < config.maxHealth * 0.5) {
    state.phase = 2;
  }

  const speedMul = state.phase === 2 ? config.phase2SpeedMultiplier : 1;
  const currentAttackCooldown =
    state.phase === 2 ? config.phase2AttackCooldown : config.attackCooldown;
  const currentMaxTilt = state.phase === 2 ? config.tiltMaxAngle * 1.5 : config.tiltMaxAngle;

  if (
    state.phase === 2 &&
    state.state !== ColossusState.STUNNED &&
    state.state !== ColossusState.DYING
  ) {
    if (!state.submergeActive) {
      state.submergeTimer += deltaTime;
      if (state.submergeTimer >= config.submergeInterval - config.submergeWarningTime) {
        state.submergeWarning = true;
      }
      if (state.submergeTimer >= config.submergeInterval) {
        state.submergeActive = true;
        state.isSubmerged = true;
        state.submergeWarning = false;
      }
    } else {
      state.submergeTimer += deltaTime;
      if (state.submergeTimer >= config.submergeInterval + config.submergeDuration) {
        state.submergeActive = false;
        state.isSubmerged = false;
        state.submergeTimer = 0;
      }
    }
  }

  if (state.state === ColossusState.IDLE) {
    state.stateTimer += deltaTime;
    state.rotation += deltaTime * 0.2;
    state.tiltAngle = Math.max(0, state.tiltAngle - config.tiltRecoverySpeed * deltaTime);

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
      colossusPosition.x,
      colossusPosition.y,
      colossusPosition.z,
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
    );

    if (dist <= config.detectionRange) {
      state.state = ColossusState.AGGRO;
      state.isAlerted = true;
      state.stateTimer = 0;
      state.rotation = faceToward(colossusPosition, playerPosition);
      return { ...state, shouldAttack: false };
    }

    state.tiltAngle = Math.max(0, state.tiltAngle - config.tiltRecoverySpeed * deltaTime);

    if (
      state.patrolWaypoints.length === 0 ||
      state.currentWaypointIndex >= state.patrolWaypoints.length
    ) {
      state.state = ColossusState.IDLE;
      state.stateTimer = 0;
      return { ...state, shouldAttack: false };
    }

    const waypoint = state.patrolWaypoints[state.currentWaypointIndex];
    const wpDist = Math.sqrt(
      (colossusPosition.x - waypoint.x) ** 2 + (colossusPosition.z - waypoint.z) ** 2,
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
    state.position = moveToward2D(
      colossusPosition,
      target,
      config.patrolSpeed * speedMul,
      deltaTime,
    );
    state.rotation = faceToward(colossusPosition, target);
    state.stateTimer += deltaTime;

    return { ...state, shouldAttack: false };
  }

  if (state.state === ColossusState.STUNNED) {
    state.stunTimer -= deltaTime;
    state.tiltAngle = Math.max(0, state.tiltAngle - config.tiltRecoverySpeed * deltaTime);

    if (state.stunTimer <= 0) {
      state.state = ColossusState.AGGRO;
      state.stunTimer = 0;
      state.stateTimer = 0;
    }
    return { ...state, shouldAttack: false };
  }

  if (state.state === ColossusState.AGGRO) {
    const dist = distance3D(
      colossusPosition.x,
      colossusPosition.y,
      colossusPosition.z,
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
    );

    if (dist > config.loseInterestRange) {
      state.state = ColossusState.PATROL;
      state.stateTimer = 0;
      const waypoints = generatePatrolWaypoints(state.arenaCenter, config.patrolRadius);
      state.patrolWaypoints = waypoints;
      state.currentWaypointIndex = 0;
      return { ...state, shouldAttack: false };
    }

    state.position = moveToward2D(
      colossusPosition,
      playerPosition,
      config.aggroSpeed * speedMul,
      deltaTime,
    );
    state.rotation = faceToward(colossusPosition, playerPosition);
    state.targetPosition = { x: playerPosition.x, z: playerPosition.z };
    state.shakeOffTimer += deltaTime;

    const dx = playerPosition.x - colossusPosition.x;
    const dz = playerPosition.z - colossusPosition.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz);
    if (dist2D > 0.01) {
      state.tiltDirection = { x: dx / dist2D, z: dz / dist2D };
    }
    state.tiltAngle = Math.min(currentMaxTilt, state.tiltAngle + config.tiltShakeForce * deltaTime);

    let shouldAttack = false;
    if (dist <= config.attackRange && state.attackCooldown <= 0) {
      shouldAttack = true;
      state.attackCooldown = currentAttackCooldown;
    }

    state.stateTimer += deltaTime;
    return { ...state, shouldAttack };
  }

  return { ...state, shouldAttack: false };
}

export function getTitanPhase(aiState) {
  return aiState.phase;
}

export function getShellTilt(aiState) {
  return {
    angle: aiState.tiltAngle || 0,
    direction: aiState.tiltDirection || { x: 0, z: 1 },
  };
}

export function isArenaSubmerged(aiState) {
  return aiState.isSubmerged === true;
}

export function getSubmergeWarning(aiState) {
  return aiState.submergeWarning === true;
}

export function triggerTitanPhase2(aiState) {
  return {
    ...aiState,
    phase: 2,
  };
}

export function applyTitanDamage(aiState, config, damage) {
  if (aiState.state === ColossusState.STUNNED || aiState.state === ColossusState.DYING) {
    return { ...aiState };
  }

  const newAccumulator = (aiState.stunDamageAccumulator || 0) + damage;

  if (newAccumulator >= TITAN_STUN_DAMAGE_THRESHOLD) {
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

export function getTitanStunProgress(aiState) {
  const acc = aiState.stunDamageAccumulator || 0;
  return Math.min(1, acc / TITAN_STUN_DAMAGE_THRESHOLD);
}

export function getShockwaveForce(aiState, config, playerPosition, colossusPosition) {
  const dist = distance3D(
    playerPosition.x,
    playerPosition.y,
    playerPosition.z,
    colossusPosition.x,
    colossusPosition.y,
    colossusPosition.z,
  );
  if (dist > config.shockwaveRadius || dist < 0.01) return null;

  const direction = vec3Add(playerPosition, vec3Scale(colossusPosition, -1));
  const len = Math.sqrt(
    direction.x * direction.x + direction.y * direction.y + direction.z * direction.z,
  );
  const normalized = { x: direction.x / len, y: direction.y / len, z: direction.z / len };

  const strength = config.shockwaveDamage * (1 - dist / config.shockwaveRadius);
  return vec3Scale(normalized, strength);
}

let _colossusNormalMap = null;

function getColossusNormalMap() {
  if (_colossusNormalMap) return _colossusNormalMap;
  const T = getTHREE();
  if (!T || typeof document === "undefined") return null;
  const { data, width, height } = generateNormalMapData(256, 256, 0.1, 99, 2.5);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  _colossusNormalMap = new T.CanvasTexture(canvas);
  _colossusNormalMap.wrapS = T.RepeatWrapping;
  _colossusNormalMap.wrapT = T.RepeatWrapping;
  return _colossusNormalMap;
}

function createMaterial(type) {
  const T = getTHREE();
  const normalMap = getColossusNormalMap();
  const normalProps = normalMap ? { normalMap, normalScale: new T.Vector2(0.6, 0.6) } : {};
  if (type === "shell") {
    return new T.MeshStandardMaterial({
      color: 0x5a5046,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
      ...normalProps,
    });
  }
  if (type === "underbelly") {
    return new T.MeshStandardMaterial({
      color: 0x8a7e6e,
      roughness: 0.6,
      metalness: 0.05,
      ...normalProps,
    });
  }
  if (type === "rune") {
    return new T.MeshStandardMaterial({
      color: 0x00ccff,
      roughness: 0.3,
      metalness: 0.8,
      emissive: new T.Color(0x00ccff),
      emissiveIntensity: 0.5,
    });
  }
  if (type === "head") {
    return new T.MeshStandardMaterial({
      color: 0x4a4036,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
      ...normalProps,
    });
  }
  return new T.MeshStandardMaterial({
    color: 0x6a6056,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: true,
    ...normalProps,
  });
}

function getGeometryType(partId) {
  if (partId === "shell_main") return "sphere";
  if (partId === "underbelly") return "sphere";
  if (partId.startsWith("left_leg") || partId.startsWith("right_leg")) return "cylinder";
  return "box";
}

function createPartMesh(part) {
  const T = getTHREE();
  const { position: pos, dimensions: dim, id, rotation: rot } = part;
  let geometry;
  const geoType = getGeometryType(id);

  if (geoType === "sphere") {
    const radius = Math.max(dim.width, dim.depth) / 2;
    const heightScale = dim.height / radius;
    geometry = new T.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI);
    geometry.scale(1, heightScale, 1);
  } else if (geoType === "cylinder") {
    geometry = new T.CylinderGeometry(dim.width / 2, dim.width / 2, dim.height, 8);
  } else {
    geometry = new T.BoxGeometry(dim.width, dim.height, dim.depth);
  }

  let material;
  if (id === "underbelly") {
    material = createMaterial("underbelly");
  } else if (id === "head") {
    material = createMaterial("head");
  } else if (id.startsWith("shell_rune")) {
    material = createMaterial("rune");
  } else if (id.startsWith("shell")) {
    material = createMaterial("shell");
  } else {
    material = createMaterial("default");
  }

  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.rotation.set(rot.x, rot.y, rot.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return { mesh, geoType };
}

export function createTitanMesh(definition) {
  const T = getTHREE();
  const group = new T.Group();
  const children = [];
  const meshByPart = new Map();
  const originalPositions = new Map();

  for (const part of definition.parts) {
    const { mesh, geoType } = createPartMesh(part);
    const parentNode = part.parent ? meshByPart.get(part.parent) : null;
    if (parentNode) {
      parentNode.add(mesh);
    } else {
      group.add(mesh);
    }
    meshByPart.set(part.id, mesh);
    originalPositions.set(part.id, { x: part.position.x, y: part.position.y, z: part.position.z });
    children.push({
      partId: part.id,
      geometryType: geoType,
      position: { x: part.position.x, y: part.position.y, z: part.position.z },
      rotation: { x: part.rotation.x, y: part.rotation.y, z: part.rotation.z },
      material: {
        roughness: mesh.material.roughness,
        metalness: mesh.material.metalness,
        emissiveIntensity: mesh.material.emissiveIntensity || 0,
      },
    });
  }

  return { impl: group, children, meshByPart, originalPositions };
}

export function animateTitan(mesh, time, aiState) {
  const { meshByPart, originalPositions } = mesh;
  const shell = meshByPart.get("shell_main");
  if (!shell) return;

  const tilt = getShellTilt(aiState || {});
  shell.rotation.x = tilt.angle * tilt.direction.z;
  shell.rotation.z = tilt.angle * tilt.direction.x;

  const legs = ["left_leg_front", "left_leg_rear", "right_leg_front", "right_leg_rear"];
  for (let i = 0; i < legs.length; i++) {
    const leg = meshByPart.get(legs[i]);
    const orig = originalPositions ? originalPositions.get(legs[i]) : null;
    if (!leg) continue;
    const phase = time * 1.5 + i * Math.PI * 0.5;
    leg.rotation.x = Math.sin(phase) * 0.15;
    leg.position.y = (orig ? orig.y : leg.position.y) + Math.sin(phase) * 0.3;
  }

  const claws = ["left_claw_lower", "right_claw_lower"];
  for (let i = 0; i < claws.length; i++) {
    const claw = meshByPart.get(claws[i]);
    if (!claw) continue;
    const snapPhase = Math.sin(time * 2 + i * Math.PI);
    claw.rotation.z = snapPhase * 0.4;
  }

  const runes = ["shell_rune_left", "shell_rune_right", "shell_rune_center"];
  for (const runeId of runes) {
    const rune = meshByPart.get(runeId);
    if (!rune) continue;
    const baseIntensity = rune.material.emissiveIntensity || 0.5;
    rune.material.emissiveIntensity = baseIntensity + Math.sin(time * 3) * 0.3;
  }
}
