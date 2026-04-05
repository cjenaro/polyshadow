// Cape uses its own Verlet integration rather than the physics engine — it's cosmetic cloth simulation, not gameplay physics, and already has test coverage.
import { clamp } from '../utils/math.js';

export const CAPE_CONSTANTS = {
  NUM_NODES: 8,
  SEGMENT_LENGTH: 0.4,
  GRAVITY: -15,
  DAMPING: 0.98,
  WIND_SCALE: 3.0,
  ITERATIONS: 5,
  STAMINA_LOW_THRESHOLD: 25,
};

export function createChain(anchor) {
  const particles = [];
  for (let i = 0; i < CAPE_CONSTANTS.NUM_NODES; i++) {
    particles.push({
      x: anchor.x,
      y: anchor.y - i * CAPE_CONSTANTS.SEGMENT_LENGTH,
      z: anchor.z,
      px: anchor.x,
      py: anchor.y - i * CAPE_CONSTANTS.SEGMENT_LENGTH,
      pz: anchor.z,
      pinned: i === 0,
    });
  }
  return { particles };
}

export function applyChainForces(particles, dt, wind) {
  const grav = CAPE_CONSTANTS.GRAVITY;
  const damping = CAPE_CONSTANTS.DAMPING;
  const windScale = CAPE_CONSTANTS.WIND_SCALE;
  const wx = wind.windX * wind.windStrength * windScale;
  const wz = wind.windZ * wind.windStrength * windScale;

  return particles.map((p) => {
    if (p.pinned) return p;

    const vx = (p.x - p.px) * damping;
    const vy = (p.y - p.py) * damping;
    const vz = (p.z - p.pz) * damping;

    const nx = p.x + vx + wx * dt;
    const ny = p.y + vy + grav * dt * dt;
    const nz = p.z + vz + wz * dt;

    return {
      x: nx, y: ny, z: nz,
      px: p.x, py: p.y, pz: p.z,
      pinned: false,
    };
  });
}

export function solveChainConstraints(particles, iterations) {
  const len = CAPE_CONSTANTS.SEGMENT_LENGTH;

  let pts = particles.map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist === 0) continue;

      const diff = (len - dist) / dist;
      const correctionScale = (a.pinned === b.pinned) ? 0.5 : 1.0;
      const ox = dx * correctionScale * diff;
      const oy = dy * correctionScale * diff;
      const oz = dz * correctionScale * diff;

      if (!a.pinned) {
        pts[i] = { ...pts[i], x: a.x - ox, y: a.y - oy, z: a.z - oz };
      }
      if (!b.pinned) {
        pts[i + 1] = { ...pts[i + 1], x: b.x + ox, y: b.y + oy, z: b.z + oz };
      }
    }
  }

  return pts;
}

export function updateChain(chain, anchor, dt, wind) {
  const withAnchor = chain.particles.map((p, i) => {
    if (i === 0) {
      return {
        x: anchor.x, y: anchor.y, z: anchor.z,
        px: anchor.x, py: anchor.y, pz: anchor.z,
        pinned: true,
      };
    }
    return { ...p };
  });

  const withForces = applyChainForces(withAnchor, dt, wind);
  const constrained = solveChainConstraints(withForces, CAPE_CONSTANTS.ITERATIONS);

  return { particles: constrained };
}

export function getChainSegmentPositions(chain) {
  return chain.particles.map((p) => ({ x: p.x, y: p.y, z: p.z }));
}

export function isCapeActive(stamina) {
  return stamina > CAPE_CONSTANTS.STAMINA_LOW_THRESHOLD;
}
