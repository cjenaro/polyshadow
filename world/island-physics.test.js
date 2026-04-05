import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createMockAdapter } from '../engine/physics-adapter.js';
import {
  extractIslandColliderData,
  createIslandCollider,
  groundHeightRaycast,
} from './island-physics.js';

function makeMockIsland(opts = {}) {
  return {
    center: opts.center || { x: 0, z: 0 },
    radius: opts.radius || 10,
    type: opts.type || 'hub',
    heightData: opts.heightData || new Float32Array([0, 1, 2, 0, 1, 2, 0, 1, 2]),
    resolution: opts.resolution || 2,
    generated: true,
  };
}

describe('extractIslandColliderData', () => {
  it('produces correct number of vertices for a given resolution', () => {
    const island = makeMockIsland({ resolution: 2 });
    const { vertices } = extractIslandColliderData(island);
    const side = 2 + 1;
    assert.strictEqual(vertices.length / 3, side * side);
  });

  it('vertices are Float32Array with 3 components per vertex', () => {
    const island = makeMockIsland({ resolution: 2 });
    const { vertices } = extractIslandColliderData(island);
    assert.ok(vertices instanceof Float32Array);
    assert.strictEqual(vertices.length % 3, 0);
  });

  it('indices come in groups of 3 (triangles)', () => {
    const island = makeMockIsland({ resolution: 2 });
    const { indices } = extractIslandColliderData(island);
    assert.strictEqual(indices.length % 3, 0);
    assert.ok(indices.length > 0);
  });

  it('respects downsample factor via resolution parameter', () => {
    const island = makeMockIsland({ resolution: 4, heightData: new Float32Array(25) });
    const full = extractIslandColliderData(island);
    const downsampled = extractIslandColliderData(island, 2);
    assert.ok(downsampled.vertices.length < full.vertices.length);
    assert.ok(downsampled.indices.length < full.indices.length);
  });

  it('produces vertices at correct x/z positions relative to island center', () => {
    const island = makeMockIsland({ resolution: 2 });
    const { vertices } = extractIslandColliderData(island);
    const side = 3;
    const r = island.radius * 2;
    for (let iy = 0; iy < side; iy++) {
      for (let ix = 0; ix < side; ix++) {
        const idx = (iy * side + ix) * 3;
        const expectedX = (ix / 2 - 0.5) * r + island.center.x;
        const expectedZ = (iy / 2 - 0.5) * r + island.center.z;
        assert.ok(Math.abs(vertices[idx] - expectedX) < 1e-6, `x mismatch at ${ix},${iy}`);
        assert.ok(Math.abs(vertices[idx + 2] - expectedZ) < 1e-6, `z mismatch at ${ix},${iy}`);
      }
    }
  });
});

describe('createIslandCollider', () => {
  it('calls adapter.createTrimeshCollider with correct data', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const island = makeMockIsland();
    let capturedOpts = null;
    const origCreate = adapter.createTrimeshCollider.bind(adapter);
    adapter.createTrimeshCollider = (w, opts) => {
      capturedOpts = opts;
      return origCreate(w, opts);
    };
    createIslandCollider(adapter, world, island);
    assert.ok(capturedOpts !== null);
    assert.ok(capturedOpts.vertices instanceof Float32Array);
    assert.ok(Array.isArray(capturedOpts.indices));
    assert.deepStrictEqual(capturedOpts.position, { x: 0, y: 0, z: 0 });
  });

  it('sets userData with entity island', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const island = makeMockIsland({ type: 'bridge' });
    let capturedOpts = null;
    const origCreate = adapter.createTrimeshCollider.bind(adapter);
    adapter.createTrimeshCollider = (w, opts) => {
      capturedOpts = opts;
      return origCreate(w, opts);
    };
    const body = createIslandCollider(adapter, world, island);
    assert.strictEqual(capturedOpts.userData.entity, 'island');
    assert.strictEqual(capturedOpts.userData.type, 'bridge');
  });
});

describe('groundHeightRaycast', () => {
  it('returns Y when collider is hit', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const island = makeMockIsland({ resolution: 2 });
    createIslandCollider(adapter, world, island);
    const result = groundHeightRaycast(adapter, world, 0, 0, 100);
    assert.ok(result !== null);
    assert.ok(typeof result === 'number');
  });

  it('returns null when no collider', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const result = groundHeightRaycast(adapter, world, 0, 0, 100);
    assert.strictEqual(result, null);
  });
});
