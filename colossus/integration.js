import * as behavior from './behavior.js';
import * as sentinel from './sentinel.js';
import * as wraith from './wraith.js';
import * as titan from './titan.js';

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
  },
  wraith: {
    createDefinition: wraith.createWraithDefinition,
    createAIState: (pos) => wraith.createWraithBehaviorState({ position: { ...pos } }),
    behaviorConfig: wraith.WRAITH_BEHAVIOR_CONFIG,
    updateAI: wraith.updateWraithBehavior,
    generateSurfacePatches: wraith.generateWraithSurfacePatches,
    buildWeakPoints: wraith.buildWraithCombatWeakPoints,
    createMesh: wraith.createWraithMesh,
    isClimbable: (aiState) => aiState.state === 'circling' || aiState.state === 'stunned',
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
  },
};

export function createColossus(type, position) {
  const factory = COLossus_TYPES[type];
  if (!factory) throw new Error(`unknown colossus type: ${type}`);

  const definition = factory.createDefinition();
  const aiState = factory.createAIState(position);
  const surfacePatches = factory.generateSurfacePatches(definition);
  const weakPoints = factory.buildWeakPoints(definition, position, 0);
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
    const newState = factory.updateAI(c.aiState, c.behaviorConfig, dt, playerPosition, currentPos);
    c.aiState = newState;

    if (newState.shouldAttack) {
      const direction = behavior.getFacingDirection(newState.rotation);
      events.push({ type: 'attack', colossusType: c.type, direction });
    }

    const newPos = newState.position || currentPos;
    if (newPos !== currentPos && (newPos.x !== c.position.x || newPos.y !== c.position.y || newPos.z !== c.position.z)) {
      c.position = { x: newPos.x, y: newPos.y, z: newPos.z };
      c.mesh.impl.position.x = newPos.x;
      c.mesh.impl.position.y = newPos.y;
      c.mesh.impl.position.z = newPos.z;
      c.rotation = newState.rotation || 0;
      c.weakPoints = factory.buildWeakPoints(c.definition, c.position, c.rotation);
    }
  }

  return events;
}

export function getColossusSurfaces(colossi) {
  const allSurfaces = [];

  for (const c of colossi) {
    const pos = c.aiState.position || c.position;
    for (const patch of c.surfacePatches) {
      allSurfaces.push({
        position: {
          x: patch.position.x + pos.x,
          y: patch.position.y + pos.y,
          z: patch.position.z + pos.z,
        },
        normal: patch.normal,
        climbable: patch.climbable,
        bodyPartId: patch.bodyPartId,
        parentPartId: patch.parentPartId,
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
  if (!c) return { damaged: false, isDestroyed: false, allDestroyed: false };

  const wp = c.weakPoints.find(w => w.id === weakPointId);
  if (!wp || wp.isDestroyed) return { damaged: false, isDestroyed: false, allDestroyed: false };

  wp.health -= damage;

  if (wp.health <= 0) {
    wp.health = 0;
    wp.isDestroyed = true;
    wp.isActive = false;
  }

  const allDestroyed = c.weakPoints.every(w => w.isDestroyed);

  if (allDestroyed) {
    c.aiState = behavior.triggerDeath(c.aiState);
  }

  return { damaged: true, isDestroyed: wp.isDestroyed, allDestroyed };
}

export function getColossusByType(colossi, type) {
  return colossi.find(c => c.type === type) || null;
}
