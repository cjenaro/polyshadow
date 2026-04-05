import { distance3D, clamp } from "../utils/math.js";
import { drainStamina } from "./stamina.js";

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
      playerPosition.x,
      playerPosition.y,
      playerPosition.z,
      wp.position.x,
      wp.position.y,
      wp.position.z,
    );
    if (d < nearestDist) {
      nearestDist = d;
      nearest = wp;
    }
  }

  return nearest;
}

function applyDamageToWeakPointObj(weakPoint, damage) {
  const newHealth = Math.max(0, weakPoint.health - damage);
  const isDestroyed = newHealth <= 0;
  return {
    ...weakPoint,
    health: newHealth,
    isDestroyed,
  };
}

export function trySlash(combatState, playerPosition, playerRotation, weakPoints) {
  if (combatState.slashCooldown > 0) return { attacked: false, combatState };

  const slashOrigin = getSlashAttackOrigin(playerPosition, playerRotation);
  const hitIndex = weakPoints.findIndex(
    (wp) => wp === findHitWeakPoint(slashOrigin, weakPoints, COMBAT_CONFIG.SLASH_RANGE),
  );

  if (hitIndex === -1) return { attacked: false, combatState };

  const damage = COMBAT_CONFIG.SLASH_DAMAGE;
  const updatedWeakPoints = weakPoints.map((wp, i) =>
    i === hitIndex ? applyDamageToWeakPointObj(wp, damage) : wp,
  );

  return {
    attacked: true,
    hitWeakPoint: true,
    damage,
    weakPointId: weakPoints[hitIndex].id,
    weakPoints: updatedWeakPoints,
    combatState: {
      ...combatState,
      slashCooldown: COMBAT_CONFIG.SLASH_COOLDOWN,
      totalDamageDealt: combatState.totalDamageDealt + damage,
      hitsLanded: combatState.hitsLanded + 1,
    },
  };
}

export function startStabCharge(combatState) {
  return {
    ...combatState,
    isChargingStab: true,
    stabChargeProgress: 0,
  };
}

export function updateStabCharge(combatState, dt) {
  if (!combatState.isChargingStab) return combatState;
  return {
    ...combatState,
    stabChargeProgress: clamp(
      combatState.stabChargeProgress + dt / COMBAT_CONFIG.STAB_CHARGE_TIME,
      0,
      1,
    ),
  };
}

export function cancelStabCharge(combatState) {
  return {
    ...combatState,
    isChargingStab: false,
    stabChargeProgress: 0,
  };
}

export function tryStab(combatState, chargeProgress, playerPosition, weakPoints) {
  if (chargeProgress < 0.8) return { attacked: false, combatState };

  const hitIndex = weakPoints.findIndex(
    (wp) => wp === findHitWeakPoint(playerPosition, weakPoints, COMBAT_CONFIG.STAB_RANGE),
  );

  if (hitIndex === -1) return { attacked: false, combatState };

  const damage = chargeProgress * COMBAT_CONFIG.STAB_DAMAGE;
  const updatedWeakPoints = weakPoints.map((wp, i) =>
    i === hitIndex ? applyDamageToWeakPointObj(wp, damage) : wp,
  );

  return {
    attacked: true,
    hitWeakPoint: true,
    damage,
    weakPointId: weakPoints[hitIndex].id,
    weakPoints: updatedWeakPoints,
    combatState: {
      ...combatState,
      isChargingStab: false,
      stabChargeProgress: 0,
      totalDamageDealt: combatState.totalDamageDealt + damage,
      hitsLanded: combatState.hitsLanded + 1,
    },
  };
}

export function applyDamageToWeakPoint(weakPoint, damage) {
  const newHealth = Math.max(0, weakPoint.health - damage);
  const isDestroyed = newHealth <= 0;
  return {
    weakPoint: {
      ...weakPoint,
      health: newHealth,
      isDestroyed,
    },
    damaged: true,
    remainingHealth: newHealth,
    isDestroyed,
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
  let next = { ...combatState };
  next.slashCooldown = Math.max(0, next.slashCooldown - dt);

  if (next.isShakingOff) {
    next.shakeOffTimer -= dt;
    if (next.shakeOffTimer <= 0) {
      next = {
        ...next,
        isShakingOff: false,
        shakeOffTimer: 0,
      };
    }
  }

  if (next.isChargingStab) {
    next = updateStabCharge(next, dt);
  }

  return next;
}
