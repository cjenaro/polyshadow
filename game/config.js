export const RUNTIME_CONFIG = {
  player: {
    moveSpeed: 8,
    sprintMultiplier: 1.8,
    jumpForce: 12,
    climbSpeed: 4,
  },
  camera: {
    distance: 18,
    minDistance: 2,
    maxDistance: 30,
    lerpSpeed: 5,
  },
  combat: {
    slashRange: 5,
    slashDamage: 5,
    slashCooldown: 0.8,
    stabChargeTime: 1.2,
    stabDamage: 25,
    stabRange: 4,
  },
  stamina: {
    maxStamina: 100,
    drainRate: 20,
    regenRate: 15,
    regenDelay: 1.5,
  },
  colossus: {
    titanHealth: 500,
    wraithHealth: 350,
    sentinelHealth: 400,
    damageScale: 1,
  },
  debug: {
    showFPS: false,
    showCollision: false,
    showPaths: false,
    godMode: false,
    infiniteStamina: false,
  },
};

export function updateRuntimeConfig(path, value) {
  const keys = path.split(".");
  let obj = RUNTIME_CONFIG;
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
}

export function getRuntimeConfig(path) {
  const keys = path.split(".");
  let obj = RUNTIME_CONFIG;
  for (const key of keys) {
    obj = obj[key];
  }
  return obj;
}