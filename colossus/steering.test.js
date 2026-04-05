import { describe, it } from 'node:test';
import assert from 'node:assert';
import { moveToward2D, moveToward3D } from './steering.js';

describe('moveToward2D', () => {
  it('moves position toward target on XZ plane', () => {
    const body = { x: 0, y: 5, z: 0 };
    const target = { x: 10, z: 0 };
    const result = moveToward2D(body, target, 2, 1.0);
    assert.strictEqual(result.x, 2);
    assert.strictEqual(result.y, 5);
    assert.strictEqual(result.z, 0);
  });

  it('computes correct direction vector for diagonal movement', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, z: 10 };
    const result = moveToward2D(body, target, 10, 1.0);
    const dist = Math.sqrt(result.x ** 2 + result.z ** 2);
    assert.ok(Math.abs(dist - 10) < 0.001, `expected distance 10, got ${dist}`);
    assert.ok(Math.abs(result.x - result.z) < 0.001, 'should move equally in x and z');
    assert.strictEqual(result.y, 0);
  });

  it('respects speed limit with clamped step', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 100, z: 0 };
    const result = moveToward2D(body, target, 5, 1.0);
    assert.strictEqual(result.x, 5);
    assert.strictEqual(result.z, 0);
  });

  it('never overshoots target', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 3, z: 0 };
    const result = moveToward2D(body, target, 10, 1.0);
    assert.strictEqual(result.x, 3);
    assert.strictEqual(result.z, 0);
  });

  it('returns same position when at zero distance', () => {
    const body = { x: 5, y: 10, z: 5 };
    const target = { x: 5, z: 5 };
    const result = moveToward2D(body, target, 10, 1.0);
    assert.strictEqual(result, body);
  });

  it('returns same position when very close (below threshold)', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 0.005, z: 0 };
    const result = moveToward2D(body, target, 10, 1.0);
    assert.strictEqual(result, body);
  });

  it('keeps Y coordinate unchanged', () => {
    const body = { x: 0, y: 42, z: 0 };
    const target = { x: 10, z: 0 };
    const result = moveToward2D(body, target, 5, 1.0);
    assert.strictEqual(result.y, 42);
  });

  it('scales movement by dt', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, z: 0 };
    const result1 = moveToward2D(body, target, 5, 0.5);
    assert.strictEqual(result1.x, 2.5);
    const result2 = moveToward2D(body, target, 5, 2.0);
    assert.strictEqual(result2.x, 10);
  });

  it('returns a new object (does not mutate input)', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, z: 0 };
    const result = moveToward2D(body, target, 5, 1.0);
    assert.ok(result !== body);
    assert.strictEqual(body.x, 0);
  });
});

describe('moveToward3D', () => {
  it('moves position toward target in all three axes', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 20, z: 30 };
    const result = moveToward3D(body, target, 20, 1.0);
    const dist = Math.sqrt((result.x) ** 2 + (result.y) ** 2 + (result.z) ** 2);
    assert.ok(Math.abs(dist - 20) < 0.001, `expected distance 20, got ${dist}`);
  });

  it('moves in correct direction', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const result = moveToward3D(body, target, 5, 1.0);
    assert.ok(result.x > 0);
    assert.ok(Math.abs(result.y) < 0.001);
    assert.ok(Math.abs(result.z) < 0.001);
  });

  it('respects speed limit with clamped step', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 100, y: 100, z: 100 };
    const result = moveToward3D(body, target, 5, 1.0);
    const dist = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);
    assert.ok(Math.abs(dist - 5) < 0.001, `expected distance 5, got ${dist}`);
  });

  it('never overshoots target', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 1, y: 1, z: 1 };
    const distToTarget = Math.sqrt(3);
    const result = moveToward3D(body, target, 100, 1.0);
    const dist = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);
    assert.ok(Math.abs(dist - distToTarget) < 0.001, `should not overshoot: ${dist} vs ${distToTarget}`);
  });

  it('returns same position when at zero distance', () => {
    const body = { x: 5, y: 10, z: 15 };
    const target = { x: 5, y: 10, z: 15 };
    const result = moveToward3D(body, target, 10, 1.0);
    assert.strictEqual(result, body);
  });

  it('returns same position when very close (below threshold)', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 0.003, y: 0.004, z: 0 };
    const result = moveToward3D(body, target, 10, 1.0);
    assert.strictEqual(result, body);
  });

  it('scales movement by dt', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 0, z: 0 };
    const result1 = moveToward3D(body, target, 5, 0.5);
    assert.strictEqual(result1.x, 2.5);
    const result2 = moveToward3D(body, target, 5, 2.0);
    assert.strictEqual(result2.x, 10);
  });

  it('returns a new object (does not mutate input)', () => {
    const body = { x: 0, y: 0, z: 0 };
    const target = { x: 10, y: 10, z: 10 };
    const result = moveToward3D(body, target, 5, 1.0);
    assert.ok(result !== body);
    assert.strictEqual(body.x, 0);
    assert.strictEqual(body.y, 0);
    assert.strictEqual(body.z, 0);
  });

  it('handles vertical-only movement', () => {
    const body = { x: 5, y: 0, z: 5 };
    const target = { x: 5, y: -10, z: 5 };
    const result = moveToward3D(body, target, 10, 1.0);
    assert.ok(Math.abs(result.x - 5) < 0.001);
    assert.strictEqual(result.y, -10);
    assert.ok(Math.abs(result.z - 5) < 0.001);
  });
});
