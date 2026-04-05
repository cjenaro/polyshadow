import * as behavior from './behavior.js';
import * as sentinel from './sentinel.js';
import * as wraith from './wraith.js';
import * as titan from './titan.js';

const isStunned = (aiState) => aiState.state === behavior.ColossusState.STUNNED;

const COLossus_TYPES = {
  sentinel: {
    createDefinition: sentinel.createSentinelDefinition,
    createAIState: (pos) => behavior.createBehaviorState({ position: { ...pos } }),
    behaviorConfig: behavior.SENTINEL_BEHAVIOR_CONFIG,
    updateAI: behavior.updateBehavior,
    generateSurfacePatches: sentinel.generateSentinelSurfacePatches,
    buildWeakPoints: sentinel.buildCombatWeakPoints,
    createMesh: sentinel.createSentinelMesh,
    isClimbable: (aiState) => aiState.state === 'patrol' || aiState.state === 'aggro' || aiState.state === 'stunned',
    applyDamage: behavior.applySentinelDamage,
    isStunned: (aiState) => aiState.state === behavior.ColossusState.STUNNED,
  },
  wraith: {
    createDefinition: wraith.createWraithDefinition,
    createAIState: (pos) => wraith.createWraithBehaviorState({ position: { ...pos } }),
    behaviorConfig: wraith.WRAITH_BEHAVIOR_CONFIG,
    updateAI: wraith.updateWraithBehavior,
    generateSurfacePatches: wraith.generateWraithSurfacePatches,
    buildWeakPoints: wraith.buildWraithCombatWeakPoints,
    createMesh: wraith.createWraithMesh,
    isClimbable: (aiState) => aiState.state === 'circling' || aiState.state === 'swooping' || aiState.state === 'climbing_back' || aiState.state === 'stunned',
    applyDamage: wraith.applyWraithDamage,
    isStunned: (aiState) => aiState.state === wraith.WraithState.STUNNED,
  },
  titan: {
    createDefinition: titan.createTitanDefinition,
    createAIState: (pos) => titan.createTitanBehaviorState({ position: { ...pos } }),
    behaviorConfig: titan.TITAN_BEHAVIOR_CONFIG,
    updateAI: titan.updateTitanBehavior,
    generateSurfacePatches: titan.generateTitanSurfacePatches,
    buildWeakPoints: titan.buildCombatWeakPoints,
    createMesh: titan.createTitanMesh,
    isClimbable: (aiState) => aiState.state === 'patrol' || aiState.state === 'aggro' || aiState.state === 'stunned',
    applyDamage: titan.applyTitanDamage,
    isStunned: (aiState) => aiState.state === behavior.ColossusState.STUNNED,
  },
};

export function createColossus(type, position) {
  const factory = COLossus_TYPES[type];
  if (!factory) throw new Error(`unknown colossus type: ${type}`);

  const definition = factory.createDefinition();
  const aiState = factory.createAIState(position);
  const surfacePatches = factory.generateSurfacePatches(definition);
  const weakPoints = factory.buildWeakPoints(definition, position, 0, isStunned(aiState));
  const mesh = factory.createMesh(definition);
  mesh.impl.position.x = position.x;
  mesh.impl.position.y = position.y;
  mesh.impl.position.z = position.z;

  return {
    type,
    definition,
    aiState,
    behaviorConfig: factory.behaviorConfig,
    surfacePatches,
    weakPoints,
    mesh,
    position: { ...position },
    rotation: 0,
  };
}

export function updateColossi(colossi, playerPosition, dt) {
  const events = [];

  for (const c of colossi) {
    const factory = COLossus_TYPES[c.type];
    if (!factory) continue;

    const currentPos = c.aiState.position || c.position;
    const wasStunned = isStunned(c.aiState);
    const newState = factory.updateAI(c.aiState, c.behaviorConfig, dt, playerPosition, currentPos);
    c.aiState = newState;

    if (newState.shouldAttack) {
      const direction = behavior.getFacingDirection(newState.rotation);
      events.push({ type: 'attack', colossusType: c.type, direction });
    }

    const newPos = newState.position || currentPos;
    const nowStunned = isStunned(newState);
    const posChanged = newPos !== currentPos && (newPos.x !== c.position.x || newPos.y !== c.position.y || newPos.z !== c.position.z);
    if (posChanged) {
      c.position = { x: newPos.x, y: newPos.y, z: newPos.z };
      c.mesh.impl.position.x = newPos.x;
      c.mesh.impl.position.y = newPos.y;
      c.mesh.impl.position.z = newPos.z;
      c.rotation = newState.rotation || 0;
    }
    if (wasStunned !== nowStunned || posChanged) {
      c.weakPoints = factory.buildWeakPoints(c.definition, c.position, c.rotation, nowStunned);
    }
  }

  return events;
}

export function getColossusSurfaces(colossi) {
  const allSurfaces = [];

  for (const c of colossi) {
    const pos = c.aiState.position || c.position;
    const rot = c.rotation || 0;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    for (const patch of c.surfacePatches) {
      const partDef = c.definition.parts.find(p => p.id === patch.bodyPartId);
      const isRestSpot = partDef?.isRestSpot || false;

      const lx = patch.position.x;
      const lz = patch.position.z;
      const rx = lx * cosR - lz * sinR;
      const rz = lx * sinR + lz * cosR;

      const nx = patch.normal.x;
      const nz = patch.normal.z;
      const rnx = nx * cosR - nz * sinR;
      const rnz = nx * sinR + nz * cosR;

      allSurfaces.push({
        position: {
          x: rx + pos.x,
          y: patch.position.y + pos.y,
          z: rz + pos.z,
        },
        normal: {
          x: rnx,
          y: patch.normal.y,
          z: rnz,
        },
        climbable: patch.climbable,
        bodyPartId: patch.bodyPartId,
        parentPartId: patch.parentPartId,
        isRestSpot,
      });
    }
  }

  return allSurfaces;
}

export function getColossusWeakPoints(colossi) {
  const all = [];

  for (const c of colossi) {
    for (const wp of c.weakPoints) {
      if (wp.isActive && !wp.isDestroyed) {
        all.push(wp);
      }
    }
  }

  return all;
}

export function damageColossus(colossi, colossusType, weakPointId, damage) {
  const c = colossi.find(col => col.type === colossusType);
  if (!c) return { damaged: false, isDestroyed: false, allDestroyed: false, stunned: false };

  const factory = COLossus_TYPES[colossusType];
  const wp = c.weakPoints.find(w => w.id === weakPointId);
  if (!wp || wp.isDestroyed) return { damaged: false, isDestroyed: false, allDestroyed: false, stunned: false };

  wp.health -= damage;
  let isDestroyed = false;

  if (wp.health <= 0) {
    wp.health = 0;
    wp.isDestroyed = true;
    wp.isActive = false;
    isDestroyed = true;
  }

  let stunned = false;
  if (factory.applyDamage) {
    const wasStunned = factory.isStunned ? factory.isStunned(c.aiState) : isStunned(c.aiState);
    c.aiState = factory.applyDamage(c.aiState, c.behaviorConfig, damage);
    const nowStunned = factory.isStunned ? factory.isStunned(c.aiState) : isStunned(c.aiState);

    if (nowStunned && !wasStunned) {
      stunned = true;
      for (const w of c.weakPoints) {
        if (!w.isDestroyed) {
          w.isActive = true;
        }
      }
    }
  }

  const allDestroyed = c.weakPoints.every(w => w.isDestroyed);

  if (allDestroyed) {
    c.aiState = behavior.triggerDeath(c.aiState);
  }

  return { damaged: true, isDestroyed, allDestroyed, stunned };
}

export function getColossusByType(colossi, type) {
  return colossi.find(c => c.type === type) || null;
}
