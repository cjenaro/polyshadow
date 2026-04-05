import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createMockAdapter } from '../engine/physics-adapter.js';
import { resolveCollisions } from './collision.js';

function makeWorldWithGround(adapter, surfaceY = 0) {
  const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
  const ground = adapter.createBody(world, {
    type: 'static',
    position: { x: 0, y: surfaceY - 0.5, z: 0 },
    shape: { type: 'box', halfExtents: { x: 50, y: 0.5, z: 50 } },
  });
  adapter.addBody(world, ground);
  return world;
}

function makeWorldWithWall(adapter, faceX = 5) {
  const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
  const wall = adapter.createBody(world, {
    type: 'static',
    position: { x: faceX + 1, y: 1.5, z: 0 },
    shape: { type: 'box', halfExtents: { x: 1, y: 3, z: 3 } },
  });
  adapter.addBody(world, wall);
  return world;
}

function makeWorldWithGroundAndWall(adapter, wallFaceX = 5) {
  const world = makeWorldWithGround(adapter, 0);
  const wall = adapter.createBody(world, {
    type: 'static',
    position: { x: wallFaceX + 1, y: 1.5, z: 0 },
    shape: { type: 'box', halfExtents: { x: 1, y: 3, z: 3 } },
  });
  adapter.addBody(world, wall);
  return world;
}

describe('resolveCollisions - ground detection', () => {
  it('detects ground surface below player via raycast', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithGround(adapter, 0);
    const pos = { x: 0, y: 0.3, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.groundY !== null, 'should detect ground');
    assert.ok(result.isGrounded, 'player close to ground should be grounded');
  });

  it('returns null groundY when no ground below', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
    const pos = { x: 0, y: 100, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.strictEqual(result.groundY, null);
    assert.strictEqual(result.isGrounded, false);
  });

  it('not grounded when player is high above ground', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithGround(adapter, 0);
    const pos = { x: 0, y: 50, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.strictEqual(result.isGrounded, false);
  });

  it('returns empty result when no adapter provided', () => {
    const pos = { x: 0, y: 1, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, null, null);

    assert.strictEqual(result.groundY, null);
    assert.strictEqual(result.isGrounded, false);
    assert.strictEqual(result.position, pos);
    assert.strictEqual(result.velocity, vel);
  });
});

describe('resolveCollisions - wall collision', () => {
  it('pushes player back when penetrating a wall', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithWall(adapter, 5);
    const pos = { x: 4.8, y: 1, z: 0 };
    const vel = { x: 4, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.position.x < pos.x, 'player should be pushed back from wall');
  });

  it('zeros velocity component into wall', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithWall(adapter, 5);
    const pos = { x: 4.8, y: 1, z: 0 };
    const vel = { x: 4, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.velocity.x < vel.x, 'velocity into wall should be reduced');
  });

  it('does not affect position when wall is beyond detection range', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithWall(adapter, 50);
    const pos = { x: 0, y: 1, z: 0 };
    const vel = { x: 4, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.strictEqual(result.position.x, pos.x);
    assert.strictEqual(result.velocity.x, vel.x);
  });

  it('surrounding check pushes stationary player out of wall', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithWall(adapter, 5);
    const pos = { x: 4.8, y: 1, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.position.x < pos.x, 'should push out of wall even when stationary');
  });
});

describe('resolveCollisions - surrounding collision', () => {
  it('pushes player out when wall face overlaps player position', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
    const wall = adapter.createBody(world, {
      type: 'kinematic',
      position: { x: 0.5, y: 1.5, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.2, y: 3, z: 3 } },
    });
    adapter.addBody(world, wall);

    const pos = { x: 0, y: 1, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.position.x !== pos.x, 'should be pushed away from wall');
  });

  it('handles kinematic wall overlapping stationary player', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
    const wall = adapter.createBody(world, {
      type: 'kinematic',
      position: { x: 0.4, y: 1.5, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.2, y: 3, z: 3 } },
    });
    adapter.addBody(world, wall);

    const pos = { x: 0, y: 1, z: 0 };
    const vel = { x: 0, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.position.x < pos.x, 'should be pushed away from wall');
  });
});

describe('resolveCollisions - combined ground and wall', () => {
  it('detects ground while not hitting distant wall', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithGroundAndWall(adapter, 50);

    const pos = { x: 0, y: 0.3, z: 0 };
    const vel = { x: 4, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.groundY !== null, 'should detect ground');
    assert.ok(result.isGrounded, 'should be grounded');
    assert.strictEqual(result.position.x, pos.x, 'no wall nearby so position unchanged');
  });

  it('pushes player back from nearby wall and detects ground', () => {
    const adapter = createMockAdapter();
    const world = makeWorldWithGroundAndWall(adapter, 5);

    const pos = { x: 4.8, y: 0.3, z: 0 };
    const vel = { x: 4, y: 0, z: 0 };

    const result = resolveCollisions(pos, vel, adapter, world);

    assert.ok(result.groundY !== null, 'should detect ground');
    assert.ok(result.position.x < pos.x, 'should push back from wall');
  });
});
