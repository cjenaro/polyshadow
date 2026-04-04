import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, lerp, smoothstep, remap,
  randomRange, randomInt,
  distance2D, distance3D,
  normalize2D, vec3Add, vec3Scale
} from './math.js';

describe('clamp', () => {
  it('clamps value within range', () => {
    assert.equal(clamp(5, 0, 10), 5);
    assert.equal(clamp(-1, 0, 10), 0);
    assert.equal(clamp(15, 0, 10), 10);
  });

  it('handles min === max', () => {
    assert.equal(clamp(5, 3, 3), 3);
    assert.equal(clamp(1, 3, 3), 3);
  });

  it('handles negative ranges', () => {
    assert.equal(clamp(-5, -10, -3), -5);
    assert.equal(clamp(-15, -10, -3), -10);
    assert.equal(clamp(0, -10, -3), -3);
  });
});

describe('lerp', () => {
  it('returns a when t=0', () => {
    assert.equal(lerp(10, 20, 0), 10);
  });

  it('returns b when t=1', () => {
    assert.equal(lerp(10, 20, 1), 20);
  });

  it('returns midpoint at t=0.5', () => {
    assert.equal(lerp(0, 10, 0.5), 5);
  });

  it('handles t outside [0,1] (extrapolation)', () => {
    assert.equal(lerp(0, 10, 2), 20);
    assert.equal(lerp(0, 10, -1), -10);
  });
});

describe('smoothstep', () => {
  it('returns 0 at edge0', () => {
    assert.equal(smoothstep(0, 1, 0), 0);
  });

  it('returns 1 at edge1', () => {
    assert.equal(smoothstep(0, 1, 1), 1);
  });

  it('returns ~0.5 at midpoint', () => {
    const mid = smoothstep(0, 1, 0.5);
    assert.ok(Math.abs(mid - 0.5) < 0.001);
  });

  it('clamps below edge0 to 0', () => {
    assert.equal(smoothstep(0, 1, -0.5), 0);
  });

  it('clamps above edge1 to 1', () => {
    assert.equal(smoothstep(0, 1, 1.5), 1);
  });
});

describe('remap', () => {
  it('maps value from one range to another', () => {
    assert.equal(remap(5, 0, 10, 0, 100), 50);
  });

  it('maps lower bound', () => {
    assert.equal(remap(0, 0, 10, 0, 100), 0);
  });

  it('maps upper bound', () => {
    assert.equal(remap(10, 0, 10, 0, 100), 100);
  });

  it('handles negative output range', () => {
    assert.equal(remap(5, 0, 10, -1, 1), 0);
  });
});

describe('randomRange', () => {
  it('returns values within [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomRange(0, 1);
      assert.ok(v >= 0 && v < 1, `got ${v}`);
    }
  });

  it('returns values in custom range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomRange(10, 20);
      assert.ok(v >= 10 && v < 20, `got ${v}`);
    }
  });

  it('returns min when min === max', () => {
    assert.equal(randomRange(5, 5), 5);
  });
});

describe('randomInt', () => {
  it('returns integers within inclusive range', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomInt(1, 6);
      assert.ok(Number.isInteger(v), `got non-integer ${v}`);
      assert.ok(v >= 1 && v <= 6, `got ${v}`);
    }
  });

  it('returns min when min === max', () => {
    assert.equal(randomInt(3, 3), 3);
  });
});

describe('distance2D', () => {
  it('computes correct distance', () => {
    assert.equal(distance2D(0, 0, 3, 4), 5);
  });

  it('zero distance for same point', () => {
    assert.equal(distance2D(1, 2, 1, 2), 0);
  });
});

describe('distance3D', () => {
  it('computes correct distance', () => {
    assert.equal(distance3D(0, 0, 0, 1, 2, 2), 3);
  });

  it('zero distance for same point', () => {
    assert.equal(distance3D(1, 2, 3, 1, 2, 3), 0);
  });
});

describe('normalize2D', () => {
  it('normalizes a vector to unit length', () => {
    const n = normalize2D(3, 4);
    assert.ok(Math.abs(n.x - 0.6) < 1e-10);
    assert.ok(Math.abs(n.y - 0.8) < 1e-10);
  });

  it('returns {0,0} for zero vector', () => {
    const n = normalize2D(0, 0);
    assert.equal(n.x, 0);
    assert.equal(n.y, 0);
  });

  it('handles already unit vector', () => {
    const n = normalize2D(1, 0);
    assert.ok(Math.abs(n.x - 1) < 1e-10);
    assert.ok(Math.abs(n.y) < 1e-10);
  });
});

describe('vec3Add', () => {
  it('adds two vectors', () => {
    const r = vec3Add({ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
    assert.equal(r.x, 5);
    assert.equal(r.y, 7);
    assert.equal(r.z, 9);
  });
});

describe('vec3Scale', () => {
  it('scales a vector', () => {
    const r = vec3Scale({ x: 1, y: 2, z: 3 }, 3);
    assert.equal(r.x, 3);
    assert.equal(r.y, 6);
    assert.equal(r.z, 9);
  });

  it('scales by zero', () => {
    const r = vec3Scale({ x: 1, y: 2, z: 3 }, 0);
    assert.equal(r.x, 0);
    assert.equal(r.y, 0);
    assert.equal(r.z, 0);
  });
});
