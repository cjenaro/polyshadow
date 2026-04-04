import { clamp, lerp, randomRange } from '../utils/math.js';
import { noise3D } from '../utils/noise.js';

export const PARTICLE_DEFAULTS = {
  minLifetime: 3,
  maxLifetime: 8,
  minSize: 0.02,
  maxSize: 0.08,
  gravity: -0.3,
  windInfluence: 1.5,
  thermalStrength: 0.4,
  turbulenceScale: 0.02,
  drag: 0.98,
};

export const DEFAULT_BOUNDS = {
  xMin: -30, xMax: 30,
  yMin: 0, yMax: 60,
  zMin: -30, zMax: 30,
};

export function createParticle(bounds = DEFAULT_BOUNDS) {
  return {
    x: randomRange(bounds.xMin, bounds.xMax),
    y: randomRange(bounds.yMin, bounds.yMax),
    z: randomRange(bounds.zMin, bounds.zMax),
    vx: 0,
    vy: 0,
    vz: 0,
    lifetime: randomRange(PARTICLE_DEFAULTS.minLifetime, PARTICLE_DEFAULTS.maxLifetime),
    maxLifetime: PARTICLE_DEFAULTS.maxLifetime,
    size: randomRange(PARTICLE_DEFAULTS.minSize, PARTICLE_DEFAULTS.maxSize),
  };
}

export function createParticleSystem(count, bounds = DEFAULT_BOUNDS) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(createParticle(bounds));
  }
  return { particles, bounds };
}

function respawnParticle(bounds) {
  const p = createParticle(bounds);
  return { ...p, maxLifetime: p.lifetime };
}

export function updateParticleSystem(system, wind, dt) {
  const { particles, bounds } = system;
  const windInfluence = PARTICLE_DEFAULTS.windInfluence;
  const gravity = PARTICLE_DEFAULTS.gravity;
  const drag = PARTICLE_DEFAULTS.drag;
  const thermalStrength = PARTICLE_DEFAULTS.thermalStrength;
  const turbScale = PARTICLE_DEFAULTS.turbulenceScale;
  const time = performance.now() * 0.001;

  const updated = particles.map(p => {
    const dead = p.lifetime <= 0;
    const current = dead ? respawnParticle(bounds) : p;

    const wfx = (wind.x || 0) * windInfluence * (wind.strength || 1) * 0.1;
    const wfz = (wind.z || 0) * windInfluence * (wind.strength || 1) * 0.1;
    const thermal = current.y < 30 ? thermalStrength * (1 - current.y / 30) : 0;

    const tx = noise3D(current.x * turbScale, current.y * turbScale, time * 0.5) * 0.5;
    const tz = noise3D(current.x * turbScale + 50, current.y * turbScale + 50, time * 0.5) * 0.5;

    const nvx = current.vx * drag + (wfx + tx) * dt;
    const nvy = current.vy * drag + (gravity + thermal) * dt;
    const nvz = current.vz * drag + (wfz + tz) * dt;

    return {
      x: current.x + nvx * dt * 60,
      y: current.y + nvy * dt * 60,
      z: current.z + nvz * dt * 60,
      vx: nvx,
      vy: nvy,
      vz: nvz,
      lifetime: current.lifetime - dt,
      maxLifetime: current.maxLifetime,
      size: current.size,
    };
  });

  return { particles: updated, bounds };
}

export function calculateWindForce(x, y, z, strength) {
  if (strength === 0) return { x: 0, y: 0, z: 0 };

  const time = performance.now() * 0.001;
  const turbScale = PARTICLE_DEFAULTS.turbulenceScale;

  const tx = noise3D(x * turbScale, y * turbScale, time * 0.5);
  const tz = noise3D(x * turbScale + 100, y * turbScale + 100, time * 0.5);

  const thermal = y < 30 ? PARTICLE_DEFAULTS.thermalStrength * (1 - y / 30) : 0;

  return {
    x: tx * strength,
    y: thermal * strength * 0.3,
    z: tz * strength,
  };
}
