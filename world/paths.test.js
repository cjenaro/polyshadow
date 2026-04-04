import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPath,
  generatePathPoints,
  getPathSegment,
  getPathDirection,
  isOnPath,
  getPathWidth,
  createBridgePath,
  createSteppingStonesPath,
} from './paths.js';

describe('createPath', () => {
  const start = { x: 0, y: 0, z: 0 };
  const end = { x: 100, y: 0, z: 0 };

  it('creates a bridge path with correct type', () => {
    const path = createPath({ start, end, type: 'bridge' });
    assert.equal(path.type, 'bridge');
    assert.deepEqual(path.start, start);
    assert.deepEqual(path.end, end);
  });

  it('creates a stepping_stones path with correct type', () => {
    const path = createPath({ start, end, type: 'stepping_stones', count: 5 });
    assert.equal(path.type, 'stepping_stones');
    assert.equal(path.count, 5);
  });

  it('creates a wind_glide path with correct type', () => {
    const path = createPath({ start, end, type: 'wind_glide', strength: 2.5 });
    assert.equal(path.type, 'wind_glide');
    assert.equal(path.strength, 2.5);
  });

  it('has default seed for deterministic generation', () => {
    const p1 = createPath({ start, end, type: 'bridge', seed: 42 });
    const p2 = createPath({ start, end, type: 'bridge', seed: 42 });
    assert.equal(p1.seed, p2.seed);
  });

  it('different seeds produce different paths after generation', () => {
    const p1 = createPath({ start, end, type: 'bridge', seed: 1 });
    const p2 = createPath({ start, end, type: 'bridge', seed: 2 });
    const g1 = generatePathPoints(p1);
    const g2 = generatePathPoints(p2);
    let diff = false;
    for (let i = 0; i < g1.length; i++) {
      if (g1[i].x !== g2[i].x || g1[i].y !== g2[i].y || g1[i].z !== g2[i].z) {
        diff = true;
        break;
      }
    }
    assert.ok(diff, 'different seeds should produce different path points');
  });
});

describe('generatePathPoints', () => {
  it('returns an array of points', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
    });
    const points = generatePathPoints(path);
    assert.ok(Array.isArray(points));
    assert.ok(points.length > 0);
  });

  it('first point is near start', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
    });
    const points = generatePathPoints(path);
    const first = points[0];
    assert.ok(Math.abs(first.x - 0) < 0.1, `first.x=${first.x}`);
    assert.ok(Math.abs(first.y - 5) < 0.1, `first.y=${first.y}`);
    assert.ok(Math.abs(first.z - 0) < 0.1, `first.z=${first.z}`);
  });

  it('last point is near end', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
    });
    const points = generatePathPoints(path);
    const last = points[points.length - 1];
    assert.ok(Math.abs(last.x - 100) < 0.1, `last.x=${last.x}`);
    assert.ok(Math.abs(last.y - 5) < 0.1, `last.y=${last.y}`);
    assert.ok(Math.abs(last.z - 0) < 0.1, `last.z=${last.z}`);
  });

  it('bridge path has points that form a curve (not all on a straight line)', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    let hasZVariation = false;
    for (const p of points) {
      if (Math.abs(p.z) > 0.1) {
        hasZVariation = true;
        break;
      }
    }
    assert.ok(hasZVariation, 'bridge path should have some curve deviation');
  });

  it('stepping_stones path returns discrete stone positions', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'stepping_stones',
      count: 5,
      seed: 42,
    });
    const points = generatePathPoints(path);
    assert.equal(points.length, 5 + 2, 'should have count + 2 points (start + stones + end)');
  });
});

describe('getPathSegment', () => {
  let path, generated;

  it('setup: generate a bridge path', () => {
    path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 10, z: 20 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    generated = generatePathPoints(path);
    assert.ok(generated.length > 0);
  });

  it('returns start position at t=0', () => {
    const pos = getPathSegment(generated, 0);
    assert.ok(Math.abs(pos.x - 0) < 0.5);
    assert.ok(Math.abs(pos.y - 5) < 0.5);
    assert.ok(Math.abs(pos.z - 0) < 0.5);
  });

  it('returns end position at t=1', () => {
    const pos = getPathSegment(generated, 1);
    assert.ok(Math.abs(pos.x - 100) < 0.5);
    assert.ok(Math.abs(pos.y - 10) < 0.5);
    assert.ok(Math.abs(pos.z - 20) < 0.5);
  });

  it('returns midpoint between start and end at t=0.5', () => {
    const pos = getPathSegment(generated, 0.5);
    assert.ok(pos.x > 30 && pos.x < 70, `midpoint x should be ~50, got ${pos.x}`);
  });

  it('clamps t to [0, 1]', () => {
    const posLow = getPathSegment(generated, -1);
    const posStart = getPathSegment(generated, 0);
    assert.ok(Math.abs(posLow.x - posStart.x) < 0.01);

    const posHigh = getPathSegment(generated, 2);
    const posEnd = getPathSegment(generated, 1);
    assert.ok(Math.abs(posHigh.x - posEnd.x) < 0.01);
  });
});

describe('getPathDirection', () => {
  it('returns a direction vector at a given t', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    const dir = getPathDirection(points, 0.5);
    assert.ok(typeof dir.x === 'number');
    assert.ok(typeof dir.y === 'number');
    assert.ok(typeof dir.z === 'number');
  });

  it('direction has a non-zero component for a straight path', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    const dir = getPathDirection(points, 0.5);
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    assert.ok(len > 0.01, 'direction should be non-zero');
  });

  it('direction at t=0 points roughly toward end', () => {
    const path = createPath({
      start: { x: 0, y: 5, z: 0 },
      end: { x: 100, y: 5, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    const dir = getPathDirection(points, 0);
    assert.ok(dir.x > 0, 'direction should point toward positive x (toward end)');
  });
});

describe('isOnPath', () => {
  it('returns true for a point on the path', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    const pos = getPathSegment(points, 0.5);
    assert.ok(isOnPath(points, pos.x, pos.z, 5));
  });

  it('returns false for a point far from the path', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    assert.ok(!isOnPath(points, 50, 500, 5));
  });

  it('returns true for start point', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    assert.ok(isOnPath(points, 0, 0, 5));
  });

  it('returns true for end point', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      segments: 20,
    });
    const points = generatePathPoints(path);
    assert.ok(isOnPath(points, 100, 0, 5));
  });
});

describe('getPathWidth', () => {
  it('bridge path is narrower in the middle', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'bridge',
      seed: 42,
      maxWidth: 4,
      minWidth: 1,
    });
    const wStart = getPathWidth(path, 0);
    const wMid = getPathWidth(path, 0.5);
    const wEnd = getPathWidth(path, 1);
    assert.ok(wStart > wMid, `start width ${wStart} should be > mid width ${wMid}`);
    assert.ok(wEnd > wMid, `end width ${wEnd} should be > mid width ${wMid}`);
  });

  it('stepping_stones has constant width', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'stepping_stones',
      stoneRadius: 2,
    });
    const w0 = getPathWidth(path, 0);
    const w5 = getPathWidth(path, 0.5);
    const w1 = getPathWidth(path, 1);
    assert.equal(w0, 2 * 2);
    assert.equal(w5, 2 * 2);
    assert.equal(w1, 2 * 2);
  });

  it('wind_glide has constant width', () => {
    const path = createPath({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 100, y: 0, z: 0 },
      type: 'wind_glide',
      width: 8,
    });
    assert.equal(getPathWidth(path, 0), 8);
    assert.equal(getPathWidth(path, 0.5), 8);
    assert.equal(getPathWidth(path, 1), 8);
  });
});

describe('createBridgePath', () => {
  it('creates a path with type bridge', () => {
    const path = createBridgePath({ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 });
    assert.equal(path.type, 'bridge');
    assert.deepEqual(path.start, { x: 0, y: 0, z: 0 });
    assert.deepEqual(path.end, { x: 50, y: 0, z: 0 });
  });

  it('has sensible defaults', () => {
    const path = createBridgePath({ x: 0, y: 5, z: 0 }, { x: 50, y: 5, z: 0 });
    assert.ok(typeof path.maxWidth === 'number');
    assert.ok(typeof path.minWidth === 'number');
    assert.ok(typeof path.segments === 'number');
    assert.ok(path.maxWidth > path.minWidth);
  });
});

describe('createSteppingStonesPath', () => {
  it('creates a path with type stepping_stones', () => {
    const path = createSteppingStonesPath({ x: 0, y: 0, z: 0 }, { x: 80, y: 0, z: 0 }, 6);
    assert.equal(path.type, 'stepping_stones');
    assert.equal(path.count, 6);
  });

  it('generates correct number of stones', () => {
    const path = createSteppingStonesPath({ x: 0, y: 0, z: 0 }, { x: 80, y: 0, z: 0 }, 4);
    const points = generatePathPoints(path);
    assert.equal(points.length, 6);
  });
});
