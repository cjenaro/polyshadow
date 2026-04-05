import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createParticle,
  createParticleSystem,
  updateParticleSystem,
  calculateWindForce,
} from './particles.js';

describe('createParticle', () => {
  it('creates particle with all required properties', () => {
    const p = createParticle();
    assert.ok('x' in p && 'y' in p && 'z' in p);
    assert.ok('vx' in p && 'vy' in p && 'vz' in p);
    assert.ok('lifetime' in p);
    assert.ok(p.lifetime > 0);
    assert.ok('maxLifetime' in p);
    assert.ok(p.maxLifetime >= p.lifetime);
    assert.ok('size' in p);
    assert.ok(p.size > 0);
  });

  it('respects bounds parameter', () => {
    const bounds = { xMin: -10, xMax: 10, yMin: 5, yMax: 15, zMin: -10, zMax: 10 };
    const p = createParticle(bounds);
    assert.ok(p.x >= bounds.xMin && p.x <= bounds.xMax);
    assert.ok(p.y >= bounds.yMin && p.y <= bounds.yMax);
    assert.ok(p.z >= bounds.zMin && p.z <= bounds.zMax);
  });
});

describe('createParticleSystem', () => {
  it('creates system with requested particle count', () => {
    const sys = createParticleSystem(50);
    assert.strictEqual(sys.particles.length, 50);
  });

  it('particles have all required fields', () => {
    const sys = createParticleSystem(10);
    for (const p of sys.particles) {
      assert.ok('x' in p && 'y' in p && 'z' in p);
      assert.ok('vx' in p && 'vy' in p && 'vz' in p);
      assert.ok('lifetime' in p);
      assert.ok('maxLifetime' in p);
      assert.ok('size' in p);
    }
  });

  it('uses default bounds', () => {
    const sys = createParticleSystem(10);
    for (const p of sys.particles) {
      assert.ok(typeof p.x === 'number');
      assert.ok(typeof p.y === 'number');
      assert.ok(typeof p.z === 'number');
    }
  });

  it('accepts custom bounds', () => {
    const bounds = { xMin: 0, xMax: 1, yMin: 0, yMax: 1, zMin: 0, zMax: 1 };
    const sys = createParticleSystem(20, bounds);
    for (const p of sys.particles) {
      assert.ok(p.x >= 0 && p.x <= 1);
      assert.ok(p.y >= 0 && p.y <= 1);
      assert.ok(p.z >= 0 && p.z <= 1);
    }
  });
});

describe('updateParticleSystem', () => {
  it('decreases particle lifetime', () => {
    const sys = createParticleSystem(10);
    const updated = updateParticleSystem(sys, { x: 0, z: 0, strength: 0 }, 0.1, 1.0);
    for (let i = 0; i < sys.particles.length; i++) {
      assert.ok(updated.particles[i].lifetime <= sys.particles[i].lifetime);
    }
  });

  it('does not modify original system', () => {
    const sys = createParticleSystem(10);
    const origLifetime = sys.particles[0].lifetime;
    updateParticleSystem(sys, { x: 0, z: 0, strength: 0 }, 0.1, 1.0);
    assert.strictEqual(sys.particles[0].lifetime, origLifetime);
  });

  it('respawns dead particles', () => {
    const sys = createParticleSystem(10);
    const deadSys = {
      particles: sys.particles.map(p => ({ ...p, lifetime: -1, maxLifetime: p.maxLifetime })),
      bounds: sys.bounds,
    };
    const updated = updateParticleSystem(deadSys, { x: 0, z: 0, strength: 0 }, 0.1, 1.0);
    const alive = updated.particles.filter(p => p.lifetime > 0);
    assert.ok(alive.length > 0, 'some particles should be respawned');
  });

  it('wind moves particles', () => {
    const sys = createParticleSystem(10);
    const wind = { x: 10, z: 0, strength: 5 };
    let updated = sys;
    let elapsed = 1.0;
    for (let i = 0; i < 30; i++) {
      updated = updateParticleSystem(updated, wind, 0.016, elapsed);
      elapsed += 0.016;
    }
    const moved = updated.particles.some(p => Math.abs(p.x) > 0.1);
    assert.ok(moved, 'wind should displace particles over time');
  });

  it('particles have gravity effect on y', () => {
    const sys = createParticleSystem(10);
    let updated = sys;
    let elapsed = 1.0;
    for (let i = 0; i < 60; i++) {
      updated = updateParticleSystem(updated, { x: 0, z: 0, strength: 0 }, 0.016, elapsed);
      elapsed += 0.016;
    }
    const avgY = updated.particles.reduce((s, p) => s + p.y, 0) / updated.particles.length;
    const origAvgY = sys.particles.reduce((s, p) => s + p.y, 0) / sys.particles.length;
    assert.ok(avgY < origAvgY, 'particles should drift down over time');
  });
});

describe('calculateWindForce', () => {
  it('returns vector with x, y, z', () => {
    const f = calculateWindForce(0, 0, 0, 0, 1.0);
    assert.ok('x' in f);
    assert.ok('y' in f);
    assert.ok('z' in f);
  });

  it('zero wind strength gives zero force', () => {
    const f = calculateWindForce(0, 0, 0, 0, 1.0);
    assert.strictEqual(f.x, 0);
    assert.strictEqual(f.z, 0);
  });

  it('non-zero wind gives non-zero horizontal force', () => {
    const f = calculateWindForce(0, 0, 0, 5, 1.0);
    assert.ok(Math.abs(f.x) > 0 || Math.abs(f.z) > 0, 'should have horizontal force');
  });

  it('different positions give different turbulence', () => {
    const f1 = calculateWindForce(0, 0, 0, 5, 1.0);
    const f2 = calculateWindForce(50, 0, 50, 5, 1.0);
    const diff = Math.abs(f1.x - f2.x) + Math.abs(f1.z - f2.z);
    assert.ok(diff > 0.001, 'turbulence should vary by position');
  });

  it('higher wind strength gives stronger force', () => {
    const f1 = calculateWindForce(0, 0, 0, 2, 1.0);
    const f2 = calculateWindForce(0, 0, 0, 10, 1.0);
    const mag1 = Math.abs(f1.x) + Math.abs(f1.z);
    const mag2 = Math.abs(f2.x) + Math.abs(f2.z);
    assert.ok(mag2 >= mag1, 'stronger wind should produce stronger force');
  });

  it('force includes upward component for thermal effect', () => {
    const f = calculateWindForce(0, 10, 0, 3, 1.0);
    assert.ok(f.y >= 0, 'should have non-negative y component (thermal lift)');
  });
});
