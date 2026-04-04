import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWindCurrent,
  generateWindCurrentPath,
  isInWindCurrent,
  getWindForce,
  updateWindCurrent,
  createWindCurrentSystem,
} from './wind_currents.js';

describe('createWindCurrent', () => {
  it('creates a wind current with required properties', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.deepEqual(current.start, { x: 0, y: 20, z: 0 });
    assert.deepEqual(current.end, { x: 100, y: 30, z: 50 });
    assert.equal(current.strength, 5);
    assert.equal(current.width, 10);
  });

  it('has initial phase 0 and time 0', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
    });
    assert.equal(current.phase, 0);
    assert.equal(current.time, 0);
    assert.equal(current.active, true);
  });

  it('uses defaults when params omitted', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
    });
    assert.ok(typeof current.strength === 'number');
    assert.ok(typeof current.width === 'number');
    assert.ok(current.strength > 0);
    assert.ok(current.width > 0);
  });
});

describe('generateWindCurrentPath', () => {
  it('returns an array of 3D points', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    assert.ok(Array.isArray(points));
    assert.ok(points.length > 0);
    for (const p of points) {
      assert.ok(typeof p.x === 'number');
      assert.ok(typeof p.y === 'number');
      assert.ok(typeof p.z === 'number');
    }
  });

  it('first point is near start', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    const first = points[0];
    assert.ok(Math.abs(first.x - 0) < 0.5);
    assert.ok(Math.abs(first.y - 20) < 0.5);
    assert.ok(Math.abs(first.z - 0) < 0.5);
  });

  it('last point is near end', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    const last = points[points.length - 1];
    assert.ok(Math.abs(last.x - 100) < 0.5);
    assert.ok(Math.abs(last.y - 30) < 0.5);
    assert.ok(Math.abs(last.z - 50) < 0.5);
  });

  it('is deterministic with same seed', () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 99,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 99,
    });
    const p1 = generateWindCurrentPath(c1);
    const p2 = generateWindCurrentPath(c2);
    assert.equal(p1.length, p2.length);
    for (let i = 0; i < p1.length; i++) {
      assert.equal(p1[i].x, p2[i].x, `x mismatch at ${i}`);
      assert.equal(p1[i].y, p2[i].y, `y mismatch at ${i}`);
      assert.equal(p1[i].z, p2[i].z, `z mismatch at ${i}`);
    }
  });

  it('different seeds produce different paths', () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 1,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 2,
    });
    const p1 = generateWindCurrentPath(c1);
    const p2 = generateWindCurrentPath(c2);
    let diff = false;
    for (let i = 0; i < p1.length; i++) {
      if (p1[i].y !== p2[i].y) { diff = true; break; }
    }
    assert.ok(diff, 'different seeds should produce different paths');
  });
});

describe('isInWindCurrent', () => {
  it('returns true for a point on the wind path center', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    assert.ok(isInWindCurrent(current, { x: 50, y: 20, z: 0 }));
  });

  it('returns true for a point within width of the path', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    assert.ok(isInWindCurrent(current, { x: 50, y: 20, z: 4 }));
  });

  it('returns false for a point outside the current', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    assert.ok(!isInWindCurrent(current, { x: 50, y: 20, z: 20 }));
  });

  it('returns false for a point past the end', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    assert.ok(!isInWindCurrent(current, { x: 150, y: 20, z: 0 }));
  });

  it('returns false when current is inactive', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    current.active = false;
    assert.ok(!isInWindCurrent(current, { x: 50, y: 20, z: 0 }));
  });
});

describe('getWindForce', () => {
  it('returns a force vector with x, y, z', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 25, z: 0 },
      strength: 5,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    const force = getWindForce(current, { x: 50, y: 22, z: 0 });
    assert.ok(typeof force.x === 'number');
    assert.ok(typeof force.y === 'number');
    assert.ok(typeof force.z === 'number');
  });

  it('force direction follows the path direction', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    const force = getWindForce(current, { x: 50, y: 20, z: 0 });
    assert.ok(force.x > 0, 'force should push toward end (positive x)');
  });

  it('force magnitude is proportional to strength', () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 2,
      seed: 42,
    });
    c1.points = generateWindCurrentPath(c1);

    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      seed: 42,
    });
    c2.points = generateWindCurrentPath(c2);

    const f1 = getWindForce(c1, { x: 50, y: 20, z: 0 });
    const f2 = getWindForce(c2, { x: 50, y: 20, z: 0 });

    const mag1 = Math.sqrt(f1.x * f1.x + f1.y * f1.y + f1.z * f1.z);
    const mag2 = Math.sqrt(f2.x * f2.x + f2.y * f2.y + f2.z * f2.z);
    assert.ok(mag2 > mag1, `stronger current should produce more force: ${mag2} vs ${mag1}`);
  });

  it('returns zero force when outside current', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 5,
      seed: 42,
    });
    current.points = generateWindCurrentPath(current);
    const force = getWindForce(current, { x: 50, y: 20, z: 100 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });
});

describe('updateWindCurrent', () => {
  it('advances time by dt', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = updateWindCurrent(current, 0.1);
    assert.ok(updated.time > current.time);
    assert.ok(Math.abs(updated.time - current.time - 0.1) < 0.001);
  });

  it('advances phase for particle animation', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = updateWindCurrent(current, 0.1);
    assert.ok(updated.phase !== current.phase || updated.time > current.time);
  });

  it('does not mutate the original', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const originalTime = current.time;
    updateWindCurrent(current, 0.1);
    assert.equal(current.time, originalTime);
  });

  it('phase wraps around periodically', () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    let updated = current;
    for (let i = 0; i < 1000; i++) {
      updated = updateWindCurrent(updated, 0.1);
    }
    assert.ok(updated.phase < Math.PI * 2, `phase should stay bounded, got ${updated.phase}`);
  });
});

describe('createWindCurrentSystem', () => {
  it('creates a system with empty currents array', () => {
    const system = createWindCurrentSystem();
    assert.ok(Array.isArray(system.currents));
    assert.equal(system.currents.length, 0);
  });

  it('addCurrent adds a current to the system', () => {
    const system = createWindCurrentSystem();
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = system.addCurrent(current);
    assert.equal(updated.currents.length, 1);
    assert.equal(updated.currents[0].strength, 5);
  });

  it('removeCurrent removes a current from the system', () => {
    const system = createWindCurrentSystem();
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      id: 'wind1',
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 50 },
      end: { x: 100, y: 20, z: 50 },
      strength: 3,
      id: 'wind2',
    });
    let updated = system.addCurrent(c1).addCurrent(c2);
    assert.equal(updated.currents.length, 2);
    updated = updated.removeCurrent('wind1');
    assert.equal(updated.currents.length, 1);
    assert.equal(updated.currents[0].id, 'wind2');
  });

  it('update advances all currents', () => {
    const system = createWindCurrentSystem();
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 50 },
      end: { x: 100, y: 20, z: 50 },
      strength: 3,
      seed: 99,
    });
    const sys = system.addCurrent(c1).addCurrent(c2);
    const updated = sys.update(0.1);
    for (const c of updated.currents) {
      assert.ok(c.time > 0);
    }
  });

  it('getForceAt returns combined force from all affecting currents', () => {
    const system = createWindCurrentSystem();
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const sys = system.addCurrent(c1);
    const force = sys.getForceAt({ x: 50, y: 20, z: 0 });
    assert.ok(typeof force.x === 'number');
    assert.ok(typeof force.y === 'number');
    assert.ok(typeof force.z === 'number');
  });

  it('getForceAt returns zero when no currents affect position', () => {
    const system = createWindCurrentSystem();
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 2,
      seed: 42,
    });
    const sys = system.addCurrent(c1);
    const force = sys.getForceAt({ x: 500, y: 20, z: 500 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });
});
