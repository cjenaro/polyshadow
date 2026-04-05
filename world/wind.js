import { clamp, lerp } from '../utils/math.js';
import { noise2D, noise3D } from '../utils/noise.js';

export const WIND_DEFAULTS = {
  direction: 0,
  strength: 3,
  gustStrength: 0,
  gustTimer: 0,
  gustDuration: 0,
  gustCooldown: 2,
  gustMaxDuration: 2,
  gustMaxStrength: 15,
  directionDrift: 0.3,
  time: 0,
};

export function createWindSystem(config = {}) {
  const c = { ...WIND_DEFAULTS, ...config };
  c.direction = config.direction != null ? config.direction : Math.random() * Math.PI * 2;
  return c;
}

export function updateWindSystem(system, dt) {
  let { direction, strength, gustStrength, gustTimer, gustDuration, gustCooldown, gustMaxDuration, gustMaxStrength, directionDrift, time } = system;

  time += dt;

  const dirNoise = noise2D(time * 0.05, 42) * directionDrift * dt;
  direction = (direction + dirNoise + Math.PI * 2) % (Math.PI * 2);

  gustTimer -= dt;
  if (gustTimer <= 0 && gustStrength <= 0) {
    gustStrength = gustMaxStrength * (0.5 + 0.5 * Math.abs(noise3D(time * 0.1, 0, 0)));
    gustDuration = gustMaxDuration * (0.5 + 0.5 * Math.abs(noise3D(time * 0.1, 10, 0)));
    gustTimer = gustCooldown * (0.5 + 0.5 * Math.abs(noise3D(time * 0.1, 20, 0)));
  }

  if (gustDuration > 0) {
    gustDuration -= dt;
    if (gustDuration <= 0) {
      gustDuration = 0;
      gustStrength = 0;
    }
  }

  return { direction, strength, gustStrength, gustTimer, gustDuration, gustCooldown, gustMaxDuration, gustMaxStrength, directionDrift, time };
}

export function getWindVector(system, x, y, z) {
  const turbX = noise3D(x * 0.05 + 3.7, y * 0.05 + 7.3, system.time * 0.3 + x * 0.02 + 1.1) * 2;
  const turbZ = noise3D(x * 0.05 + 103.7, y * 0.05 + 107.3, system.time * 0.3 + z * 0.02 + 11.1) * 2;

  const totalStrength = system.strength + system.gustStrength;
  const wx = Math.cos(system.direction) * totalStrength + turbX * system.strength;
  const wz = Math.sin(system.direction) * totalStrength + turbZ * system.strength;

  return { x: wx, z: wz };
}
