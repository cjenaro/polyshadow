import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createChain,
  CAPE_CONSTANTS,
  applyChainForces,
  solveChainConstraints,
  updateChain,
  getChainSegmentPositions,
  isCapeActive,
} from './cape.js';

function makeParticle(overrides = {}) {
  return { x: 0, y: 0, z: 0, px: 0, py: 0, py: 0, vx: 0, vy: 0, vz: 0, pinned: false, ...overrides };
}

describe('CAPE_CONSTANTS', () => {
  it('has positive NUM_NODES', () => {
    assert.ok(CAPE_CONSTANTS.NUM_NODES > 0);
  });

  it('has positive SEGMENT_LENGTH', () => {
    assert.ok(CAPE_CONSTANTS.SEGMENT_LENGTH > 0);
  });

  it('has GRAVITY that is negative', () => {
    assert.ok(CAPE_CONSTANTS.GRAVITY < 0);
  });

  it('has DAMPING between 0 and 1', () => {
    assert.ok(CAPE_CONSTANTS.DAMPING >= 0);
    assert.ok(CAPE_CONSTANTS.DAMPING <= 1);
  });

  it('has positive ITERATIONS', () => {
    assert.ok(CAPE_CONSTANTS.ITERATIONS > 0);
  });
});

describe('createChain', () => {
  it('creates chain with correct number of particles', () => {
    const chain = createChain({ x: 0, y: 5, z: 0 });
    assert.strictEqual(chain.particles.length, CAPE_CONSTANTS.NUM_NODES);
  });

  it('first particle is pinned', () => {
    const chain = createChain({ x: 0, y: 5, z: 0 });
    assert.strictEqual(chain.particles[0].pinned, true);
  });

  it('subsequent particles are not pinned', () => {
    const chain = createChain({ x: 0, y: 5, z: 0 });
    for (let i = 1; i < chain.particles.length; i++) {
      assert.strictEqual(chain.particles[i].pinned, false);
    }
  });

  it('particles start at anchor position', () => {
    const chain = createChain({ x: 1, y: 2, z: 3 });
    assert.strictEqual(chain.particles[0].x, 1);
    assert.strictEqual(chain.particles[0].y, 2);
    assert.strictEqual(chain.particles[0].z, 3);
  });

  it('subsequent particles are offset below anchor', () => {
    const chain = createChain({ x: 0, y: 10, z: 0 });
    for (let i = 1; i < chain.particles.length; i++) {
      assert.strictEqual(chain.particles[i].y, 10 - i * CAPE_CONSTANTS.SEGMENT_LENGTH);
    }
  });
});

describe('applyChainForces', () => {
  it('applies gravity to non-pinned particles', () => {
    const particles = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: true },
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: false },
    ];
    const result = applyChainForces(particles, 1.0, { windX: 0, windZ: 0, windStrength: 0 });
    const p = result[1];
    assert.ok(p.y < 0, 'non-pinned particle should move down with gravity');
  });

  it('does not move pinned particles', () => {
    const particles = [
      { x: 5, y: 5, z: 5, px: 5, py: 5, pz: 5, pinned: true },
    ];
    const result = applyChainForces(particles, 1.0, { windX: 0, windZ: 0, windStrength: 0 });
    assert.strictEqual(result[0].x, 5);
    assert.strictEqual(result[0].y, 5);
    assert.strictEqual(result[0].z, 5);
  });

  it('applies wind force', () => {
    const particles = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: true },
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: false },
    ];
    const result = applyChainForces(particles, 1.0, { windX: 1, windZ: 0, windStrength: 5 });
    const p = result[1];
    assert.ok(p.x !== 0 || p.z !== 0, 'wind should move non-pinned particle');
  });

  it('applies damping (velocity decay)', () => {
    const particles = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: true },
      { x: 0, y: 0, z: 0, px: -1, py: 0, pz: 0, pinned: false },
    ];
    const result = applyChainForces(particles, 0.016, { windX: 0, windZ: 0, windStrength: 0 });
    const p = result[1];
    const vx = p.x - p.px;
    assert.ok(vx < 1.0, 'damping should reduce velocity from initial');
    assert.ok(vx > 0, 'velocity should still be positive');
  });

  it('stores previous position for Verlet integration', () => {
    const particles = [
      { x: 0, y: 5, z: 0, px: 0, py: 5, pz: 0, pinned: true },
      { x: 0, y: 5, z: 0, px: 0, py: 5, pz: 0, pinned: false },
    ];
    const result = applyChainForces(particles, 1.0, { windX: 0, windZ: 0, windStrength: 0 });
    assert.ok(result[1].px !== undefined);
    assert.ok(result[1].py !== undefined);
  });
});

describe('solveChainConstraints', () => {
  it('maintains segment length between adjacent particles', () => {
    const particles = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: true },
      { x: 0, y: -20, z: 0, px: 0, py: 0, pz: 0, pinned: false },
    ];
    const result = solveChainConstraints(particles, CAPE_CONSTANTS.ITERATIONS);
    const dx = result[0].x - result[1].x;
    const dy = result[0].y - result[1].y;
    const dz = result[0].z - result[1].z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    assert.ok(Math.abs(dist - CAPE_CONSTANTS.SEGMENT_LENGTH) < 2.0,
      `segment length ${dist} should be close to ${CAPE_CONSTANTS.SEGMENT_LENGTH}`);
  });

  it('handles chain of 3+ particles', () => {
    const len = CAPE_CONSTANTS.SEGMENT_LENGTH;
    const particles = [
      { x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: true },
      { x: 0, y: -50, z: 0, px: 0, py: 0, pz: 0, pinned: false },
      { x: 0, y: -100, z: 0, px: 0, py: 0, pz: 0, pinned: false },
    ];
    const result = solveChainConstraints(particles, 20);
    for (let i = 0; i < result.length - 1; i++) {
      const dx = result[i].x - result[i + 1].x;
      const dy = result[i].y - result[i + 1].y;
      const dz = result[i].z - result[i + 1].z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      assert.ok(Math.abs(dist - len) < 2.0,
        `segment ${i}-${i + 1} length ${dist} should be close to ${len}`);
    }
  });

  it('pinned particle does not move during constraint solve', () => {
    const particles = [
      { x: 10, y: 10, z: 10, px: 10, py: 10, pz: 10, pinned: true },
      { x: 0, y: -100, z: 0, px: 0, py: 0, pz: 0, pinned: false },
    ];
    const result = solveChainConstraints(particles, CAPE_CONSTANTS.ITERATIONS);
    assert.strictEqual(result[0].x, 10);
    assert.strictEqual(result[0].y, 10);
    assert.strictEqual(result[0].z, 10);
  });
});

describe('updateChain', () => {
  it('moves anchor to new position', () => {
    const chain = createChain({ x: 0, y: 0, z: 0 });
    const updated = updateChain(chain, { x: 5, y: 5, z: 5 }, 0.016, { windX: 0, windZ: 0, windStrength: 0 });
    assert.strictEqual(updated.particles[0].x, 5);
    assert.strictEqual(updated.particles[0].y, 5);
    assert.strictEqual(updated.particles[0].z, 5);
  });

  it('chain drapes downward over time', () => {
    const chain = createChain({ x: 0, y: 10, z: 0 });
    let updated = chain;
    for (let i = 0; i < 30; i++) {
      updated = updateChain(updated, { x: 0, y: 10, z: 0 }, 0.016, { windX: 0, windZ: 0, windStrength: 0 });
    }
    const last = updated.particles[updated.particles.length - 1];
    assert.ok(last.y < 10, 'end of chain should droop below anchor');
  });

  it('wind pushes chain horizontally', () => {
    const chain = createChain({ x: 0, y: 10, z: 0 });
    let updated = chain;
    for (let i = 0; i < 60; i++) {
      updated = updateChain(updated, { x: 0, y: 10, z: 0 }, 0.016, { windX: 1, windZ: 0, windStrength: 10 });
    }
    const last = updated.particles[updated.particles.length - 1];
    assert.ok(Math.abs(last.x) > 0.1, 'wind should push chain horizontally');
  });

  it('does not modify original chain', () => {
    const chain = createChain({ x: 0, y: 0, z: 0 });
    const origY = chain.particles[1].y;
    updateChain(chain, { x: 5, y: 5, z: 5 }, 0.016, { windX: 0, windZ: 0, windStrength: 0 });
    assert.strictEqual(chain.particles[1].y, origY);
  });
});

describe('getChainSegmentPositions', () => {
  it('returns array of segment positions', () => {
    const chain = createChain({ x: 0, y: 10, z: 0 });
    const segments = getChainSegmentPositions(chain);
    assert.strictEqual(segments.length, chain.particles.length);
  });

  it('each segment has x, y, z', () => {
    const chain = createChain({ x: 0, y: 10, z: 0 });
    const segments = getChainSegmentPositions(chain);
    for (const seg of segments) {
      assert.ok('x' in seg);
      assert.ok('y' in seg);
      assert.ok('z' in seg);
    }
  });
});

describe('isCapeActive', () => {
  it('returns true when stamina is above low threshold', () => {
    assert.strictEqual(isCapeActive(80), true);
  });

  it('returns false when stamina is below low threshold', () => {
    assert.strictEqual(isCapeActive(5), false);
  });

  it('returns true when stamina just above low threshold', () => {
    assert.strictEqual(isCapeActive(CAPE_CONSTANTS.STAMINA_LOW_THRESHOLD + 1), true);
  });

  it('returns false when stamina equals low threshold', () => {
    assert.strictEqual(isCapeActive(CAPE_CONSTANTS.STAMINA_LOW_THRESHOLD), false);
  });
});
