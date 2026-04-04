import { distance3D, vec3Add, vec3Scale, clamp } from '../utils/math.js';
import { drainStamina } from './stamina.js';

export const COMBAT_CONFIG = {
  SLASH_RANGE: 5,
  SLASH_DAMAGE: 5,
  SLASH_COOLDOWN: 0.8,
  STAB_CHARGE_TIME: 1.2,
  STAB_DAMAGE: 25,
  STAB_RANGE: 4,
  SHAKE_OFF_STAMINA_DRAIN: 30,
  SHAKE_OFF_HOLD_COST: 20,
  SHAKE_OFF_DURATION: 2.0,
  WEAK_POINT_HIT_RADIUS: 3,
};

export function createCombatState(overrides = {}) {
  return {
    slashCooldown: 0,
    isChargingStab: false,
    stabChargeProgress: 0,
    isShakingOff: false,
    shakeOffTimer: 0,
    lastAttackTime: 0,
    totalDamageDealt: 0,
    hitsLanded: 0,
    ...overrides,
  };
}

export function getSlashAttackOrigin(playerPosition, playerRotation) {
  const forwardX = -Math.sin(playerRotation);
  const forwardZ = -Math.cos(playerRotation);
  return {
    x: playerPosition.x + forwardX * 2,
    y: playerPosition.y,
    z: playerPosition.z + forwardZ * 2,
  };
}

export function findHitWeakPoint(playerPosition, weakPoints, range) {
  let nearest = null;
  let nearestDist = range;

  for (const wp of weakPoints) {
    if (!wp.isActive || wp.isDestroyed) continue;
    const d = distance3D(
      playerPosition.x, playerPosition.y, playerPosition.z,
      wp.position.x, wp.position.y, wp.position.z
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearest = wp;
    }
  }

  return nearest;
}

export function trySlash(combatState, playerPosition, playerRotation, weakPoints, colossusPosition) {
  if (combatState.slashCooldown > 0) return { attacked: false };

  const slashOrigin = getSlashAttackOrigin(playerPosition, playerRotation);
  const hit = findHitWeakPoint(slashOrigin, weakPoints, COMBAT_CONFIG.SLASH_RANGE);

  if (!hit) return { attacked: false };

  const damage = COMBAT_CONFIG.SLASH_DAMAGE;
  hit.health = Math.max(0, hit.health - damage);
  hit.isDestroyed = hit.health <= 0;

  combatState.slashCooldown = COMBAT_CONFIG.SLASH_COOLDOWN;
  combatState.totalDamageDealt += damage;
  combatState.hitsLanded += 1;

  return {
    attacked: true,
    hitWeakPoint: true,
    damage,
    weakPointId: hit.id,
  };
}

export function startStabCharge(combatState) {
  combatState.isChargingStab = true;
  combatState.stabChargeProgress = 0;
}

export function updateStabCharge(combatState, dt) {
  if (!combatState.isChargingStab) return;
  combatState.stabChargeProgress = clamp(
    combatState.stabChargeProgress + dt / COMBAT_CONFIG.STAB_CHARGE_TIME,
    0,
    1
  );
}

export function cancelStabCharge(combatState) {
  combatState.isChargingStab = false;
  combatState.stabChargeProgress = 0;
}

export function tryStab(combatState, chargeProgress, playerPosition, weakPoints) {
  if (chargeProgress < 0.8) return { attacked: false };

  const hit = findHitWeakPoint(playerPosition, weakPoints, COMBAT_CONFIG.STAB_RANGE);

  if (!hit) return { attacked: false };

  const damage = chargeProgress * COMBAT_CONFIG.STAB_DAMAGE;
  hit.health = Math.max(0, hit.health - damage);
  hit.isDestroyed = hit.health <= 0;

  combatState.isChargingStab = false;
  combatState.stabChargeProgress = 0;
  combatState.totalDamageDealt += damage;
  combatState.hitsLanded += 1;

  return {
    attacked: true,
    hitWeakPoint: true,
    damage,
    weakPointId: hit.id,
  };
}

export function applyDamageToWeakPoint(weakPoint, damage) {
  weakPoint.health = Math.max(0, weakPoint.health - damage);
  weakPoint.isDestroyed = weakPoint.health <= 0;
  return {
    damaged: true,
    remainingHealth: weakPoint.health,
    isDestroyed: weakPoint.isDestroyed,
  };
}

export function applyShakeOff(staminaState, dt, isHoldingOn, combatConfig) {
  let next = { ...staminaState };

  if (isHoldingOn) {
    next = drainStamina(next, combatConfig.SHAKE_OFF_HOLD_COST);
    const reducedDrain = combatConfig.SHAKE_OFF_STAMINA_DRAIN * 0.5 * dt;
    next = drainStamina(next, reducedDrain);
  } else {
    const fullDrain = combatConfig.SHAKE_OFF_STAMINA_DRAIN * dt;
    next = drainStamina(next, fullDrain);
  }

  return next;
}

export function updateCombat(combatState, dt) {
  combatState.slashCooldown = Math.max(0, combatState.slashCooldown - dt);

  if (combatState.isShakingOff) {
    combatState.shakeOffTimer -= dt;
    if (combatState.shakeOffTimer <= 0) {
      combatState.isShakingOff = false;
      combatState.shakeOffTimer = 0;
    }
  }

  if (combatState.isChargingStab) {
    updateStabCharge(combatState, dt);
  }
}
