import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWindSystem,
  updateWindSystem,
  getWindVector,
  isInWindCurrent,
} from './wind.js';

describe('createWindSystem', () => {
  it('creates wind system with default values', () => {
    const w = createWindSystem();
    assert.ok('direction' in w);
    assert.ok('strength' in w);
    assert.ok('gustStrength' in w);
    assert.ok('gustTimer' in w);
    assert.ok('gustDuration' in w);
    assert.ok('time' in w);
  });

  it('direction is in [0, 2*PI]', () => {
    const w = createWindSystem();
    assert.ok(w.direction >= 0 && w.direction <= Math.PI * 2);
  });

  it('strength is non-negative', () => {
    const w = createWindSystem();
    assert.ok(w.strength >= 0);
  });

  it('gustStrength starts at zero', () => {
    const w = createWindSystem();
    assert.strictEqual(w.gustStrength, 0);
  });

  it('accepts initial config overrides', () => {
    const w = createWindSystem({ direction: 1.5, strength: 8 });
    assert.strictEqual(w.direction, 1.5);
    assert.strictEqual(w.strength, 8);
  });
});

describe('updateWindSystem', () => {
  it('advances time', () => {
    const w = createWindSystem();
    const updated = updateWindSystem(w, 0.1);
    assert.ok(updated.time > w.time);
  });

  it('does not modify original system', () => {
    const w = createWindSystem();
    const origTime = w.time;
    updateWindSystem(w, 0.1);
    assert.strictEqual(w.time, origTime);
  });

  it('gustStrength becomes positive during a gust', () => {
    let w = createWindSystem({ gustCooldown: 0.01 });
    for (let i = 0; i < 500; i++) {
      w = updateWindSystem(w, 0.05);
    }
    assert.ok(w.gustStrength > 0, 'gust should have triggered within 500 updates');
  });

  it('direction changes slowly over time', () => {
    let w = createWindSystem({ direction: 0, strength: 5 });
    let dirChanged = false;
    for (let i = 0; i < 200; i++) {
      const next = updateWindSystem(w, 0.1);
      if (Math.abs(next.direction - w.direction) > 0.001) {
        dirChanged = true;
        break;
      }
      w = next;
    }
    assert.ok(dirChanged, 'direction should drift over time');
  });

  it('gust decays to zero after duration expires', () => {
    let w = createWindSystem({ gustCooldown: 0.01, gustMaxDuration: 0.2 });
    let hadGust = false;
    for (let i = 0; i < 1000; i++) {
      w = updateWindSystem(w, 0.05);
      if (w.gustStrength > 0) hadGust = true;
      if (hadGust && w.gustStrength === 0) return;
    }
    assert.ok(hadGust, 'gust should have occurred and decayed');
  });
});

describe('getWindVector', () => {
  it('returns vector with x and z components', () => {
    const w = createWindSystem({ direction: 0, strength: 5 });
    const v = getWindVector(w, 0, 0, 0);
    assert.ok('x' in v);
    assert.ok('z' in v);
  });

  it('zero strength gives zero vector', () => {
    const w = createWindSystem({ direction: 0, strength: 0 });
    const v = getWindVector(w, 0, 0, 0);
    assert.ok(Math.abs(v.x) < 1e-10);
    assert.ok(Math.abs(v.z) < 1e-10);
  });

  it('direction 0 blows primarily along +x axis', () => {
    const w = createWindSystem({ direction: 0, strength: 5 });
    const v = getWindVector(w, 0, 0, 0);
    assert.ok(v.x > 0, 'should blow in +x');
    assert.ok(Math.abs(v.x) > Math.abs(v.z), 'x component should dominate');
  });

  it('direction PI/2 blows primarily along +z axis', () => {
    const w = createWindSystem({ direction: Math.PI / 2, strength: 5 });
    const v = getWindVector(w, 0, 0, 0);
    assert.ok(v.z > 0, 'should blow in +z');
    assert.ok(Math.abs(v.z) > Math.abs(v.x), 'z component should dominate');
  });

  it('gust increases wind vector magnitude', () => {
    let w = createWindSystem({ direction: 0, strength: 5, gustStrength: 0 });
    const base = getWindVector(w, 0, 0, 0);
    const baseMag = Math.sqrt(base.x * base.x + base.z * base.z);
    const withGust = getWindVector({ ...w, gustStrength: 10 }, 0, 0, 0);
    const gustMag = Math.sqrt(withGust.x * withGust.x + withGust.z * withGust.z);
    assert.ok(gustMag > baseMag, 'gust should increase magnitude');
  });

  it('position affects wind via turbulence', () => {
    const w = createWindSystem({ direction: 0, strength: 5 });
    const v1 = getWindVector(w, 0, 0, 0);
    const v2 = getWindVector(w, 100, 0, 100);
    const diff = Math.abs(v1.x - v2.x) + Math.abs(v1.z - v2.z);
    assert.ok(diff > 0.01, 'different positions should give different wind');
  });
});

describe('isInWindCurrent', () => {
  it('returns boolean', () => {
    const w = createWindSystem();
    const result = isInWindCurrent(w, 0, 10, 0);
    assert.strictEqual(typeof result, 'boolean');
  });

  it('returns false with no wind currents defined', () => {
    const w = createWindSystem({ currents: [] });
    assert.strictEqual(isInWindCurrent(w, 0, 10, 0), false);
  });

  it('returns true when inside a defined wind current', () => {
    const w = createWindSystem({
      currents: [{
        x: 0, y: 10, z: 0,
        radius: 5, height: 5,
        direction: 0, strength: 10,
      }],
    });
    assert.strictEqual(isInWindCurrent(w, 0, 10, 0), true);
  });

  it('returns false when outside current radius', () => {
    const w = createWindSystem({
      currents: [{
        x: 0, y: 10, z: 0,
        radius: 2, height: 5,
        direction: 0, strength: 10,
      }],
    });
    assert.strictEqual(isInWindCurrent(w, 10, 10, 0), false);
  });

  it('returns false when above current height', () => {
    const w = createWindSystem({
      currents: [{
        x: 0, y: 10, z: 0,
        radius: 5, height: 3,
        direction: 0, strength: 10,
      }],
    });
    assert.strictEqual(isInWindCurrent(w, 0, 20, 0), false);
  });
});
