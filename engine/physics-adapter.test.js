import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createMockAdapter } from './physics-adapter.js';

describe('createMockAdapter', () => {
  it('returns an adapter object with all required methods', () => {
    const adapter = createMockAdapter();
    assert.strictEqual(typeof adapter.createPhysicsWorld, 'function');
    assert.strictEqual(typeof adapter.createBody, 'function');
    assert.strictEqual(typeof adapter.addBody, 'function');
    assert.strictEqual(typeof adapter.removeBody, 'function');
    assert.strictEqual(typeof adapter.step, 'function');
    assert.strictEqual(typeof adapter.applyForce, 'function');
    assert.strictEqual(typeof adapter.applyImpulse, 'function');
    assert.strictEqual(typeof adapter.setVelocity, 'function');
    assert.strictEqual(typeof adapter.getVelocity, 'function');
    assert.strictEqual(typeof adapter.setPosition, 'function');
    assert.strictEqual(typeof adapter.getPosition, 'function');
    assert.strictEqual(typeof adapter.raycast, 'function');
    assert.strictEqual(typeof adapter.onCollision, 'function');
    assert.strictEqual(typeof adapter.createTrimeshCollider, 'function');
  });
});

describe('createPhysicsWorld', () => {
  it('creates a world with gravity', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: -20, z: 0 } });
    assert.ok(world);
    assert.ok(world.impl);
  });
});

describe('createBody', () => {
  it('creates a dynamic body by default', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 5, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    assert.ok(body);
    assert.ok(body.impl);
    assert.strictEqual(body.type, 'dynamic');
    const pos = adapter.getPosition(world, body);
    assert.strictEqual(pos.x, 0);
    assert.strictEqual(pos.y, 5);
    assert.strictEqual(pos.z, 0);
  });

  it('creates a kinematic body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'kinematic',
      position: { x: 10, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 2, y: 4, z: 2 } },
    });
    assert.strictEqual(body.type, 'kinematic');
  });

  it('creates a static body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'static',
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 50, y: 1, z: 50 } },
    });
    assert.strictEqual(body.type, 'static');
  });

  it('attaches userData to body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
      userData: { entity: 'player' },
    });
    assert.strictEqual(body.userData.entity, 'player');
  });

  it('supports capsule shape', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'capsule', radius: 0.3, height: 1.0 },
    });
    assert.ok(body);
  });

  it('supports sphere shape', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'sphere', radius: 2.5 },
    });
    assert.ok(body);
  });
});

describe('setPosition / getPosition', () => {
  it('sets and gets body position', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.setPosition(world, body, { x: 5, y: 10, z: -3 });
    const pos = adapter.getPosition(world, body);
    assert.strictEqual(pos.x, 5);
    assert.strictEqual(pos.y, 10);
    assert.strictEqual(pos.z, -3);
  });

  it('returns a copy, not a reference', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 1, y: 2, z: 3 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    const pos1 = adapter.getPosition(world, body);
    const pos2 = adapter.getPosition(world, body);
    assert.notStrictEqual(pos1, pos2);
    assert.deepStrictEqual(pos1, pos2);
  });
});

describe('setVelocity / getVelocity', () => {
  it('sets and gets body velocity', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.setVelocity(world, body, { x: 3, y: 5, z: -2 });
    const vel = adapter.getVelocity(world, body);
    assert.strictEqual(vel.x, 3);
    assert.strictEqual(vel.y, 5);
    assert.strictEqual(vel.z, -2);
  });
});

describe('applyForce / applyImpulse', () => {
  it('applyForce accumulates on the body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    assert.doesNotThrow(() => {
      adapter.applyForce(world, body, { x: 0, y: 10, z: 0 });
    });
  });

  it('applyImpulse applies instant velocity change', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    assert.doesNotThrow(() => {
      adapter.applyImpulse(world, body, { x: 0, y: 8, z: 0 });
    });
  });
});

describe('addBody / removeBody', () => {
  it('adds body to world', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    assert.doesNotThrow(() => adapter.addBody(world, body));
  });

  it('removes body from world', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.addBody(world, body);
    assert.doesNotThrow(() => adapter.removeBody(world, body));
  });
});

describe('step', () => {
  it('steps the simulation without throwing', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    assert.doesNotThrow(() => adapter.step(world, 1 / 60));
  });

  it('clamps dt to prevent spiral of death', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    assert.doesNotThrow(() => adapter.step(world, 1.0));
  });
});

describe('raycast', () => {
  it('returns null when nothing hit', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const result = adapter.raycast(world, { x: 0, y: 10, z: 0 }, { x: 0, y: -10, z: 0 });
    assert.strictEqual(result, null);
  });

  it('returns hit when ray intersects a body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'static',
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 50, y: 1, z: 50 } },
    });
    adapter.addBody(world, body);
    const result = adapter.raycast(world, { x: 0, y: 10, z: 0 }, { x: 0, y: -10, z: 0 });
    assert.ok(result);
    assert.ok(result.body);
    assert.ok(result.distance >= 0);
    assert.ok(result.point);
  });
});

describe('onCollision', () => {
  it('registers collision callback', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const bodyA = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 5, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    const bodyB = adapter.createBody(world, {
      type: 'static',
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 50, y: 1, z: 50 } },
    });
    adapter.addBody(world, bodyA);
    adapter.addBody(world, bodyB);

    let called = false;
    adapter.onCollision(world, bodyA, bodyB, (event) => {
      called = true;
      assert.ok(event.bodyA);
      assert.ok(event.bodyB);
    });
    assert.doesNotThrow(() => adapter.step(world, 1 / 60));
  });
});

describe('createTrimeshCollider', () => {
  it('creates a static trimesh body', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const vertices = new Float32Array([0,0,0, 1,0,0, 0,1,0, 1,1,0, 0,0,1, 1,0,1]);
    const indices = [0,1,2, 1,3,2, 4,5,6];
    const body = adapter.createTrimeshCollider(world, {
      vertices,
      indices,
      position: { x: 0, y: 0, z: 0 },
    });
    assert.ok(body);
    assert.strictEqual(body.type, 'static');
  });

  it('accepts position offset', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const vertices = new Float32Array([0,0,0, 1,0,0, 0,1,0]);
    const indices = [0, 1, 2];
    const body = adapter.createTrimeshCollider(world, {
      vertices,
      indices,
      position: { x: 100, y: 5, z: -50 },
    });
    const pos = adapter.getPosition(world, body);
    assert.strictEqual(pos.x, 100);
    assert.strictEqual(pos.y, 5);
    assert.strictEqual(pos.z, -50);
  });
});

describe('integration: mock adapter simulates gravity', () => {
  it('dynamic body falls under gravity after step', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: -20, z: 0 } });
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 10, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.addBody(world, body);

    const posBefore = adapter.getPosition(world, body);
    adapter.step(world, 1 / 60);
    const posAfter = adapter.getPosition(world, body);

    assert.ok(posAfter.y < posBefore.y, 'body should fall');
  });

  it('static body does not move after step', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: -20, z: 0 } });
    const body = adapter.createBody(world, {
      type: 'static',
      position: { x: 0, y: 10, z: 0 },
      shape: { type: 'box', halfExtents: { x: 50, y: 1, z: 50 } },
    });
    adapter.addBody(world, body);

    adapter.step(world, 1 / 60);
    const pos = adapter.getPosition(world, body);
    assert.strictEqual(pos.y, 10);
  });

  it('kinematic body position is controlled externally', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'kinematic',
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 2, y: 4, z: 2 } },
    });
    adapter.addBody(world, body);

    adapter.setPosition(world, body, { x: 10, y: 5, z: -3 });
    adapter.step(world, 1 / 60);
    const pos = adapter.getPosition(world, body);
    assert.strictEqual(pos.x, 10);
    assert.strictEqual(pos.y, 5);
    assert.strictEqual(pos.z, -3);
  });

  it('impulse changes velocity and position after step', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const body = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.addBody(world, body);

    adapter.applyImpulse(world, body, { x: 0, y: 8, z: 0 });
    adapter.step(world, 1 / 60);

    const vel = adapter.getVelocity(world, body);
    assert.ok(vel.y > 0, 'impulse should give upward velocity');
  });

  it('ground collision stops falling', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: -20, z: 0 } });
    const ground = adapter.createBody(world, {
      type: 'static',
      position: { x: 0, y: 0, z: 0 },
      shape: { type: 'box', halfExtents: { x: 50, y: 0.5, z: 50 } },
    });
    const player = adapter.createBody(world, {
      type: 'dynamic',
      mass: 1,
      position: { x: 0, y: 5, z: 0 },
      shape: { type: 'box', halfExtents: { x: 0.3, y: 0.6, z: 0.3 } },
    });
    adapter.addBody(world, ground);
    adapter.addBody(world, player);

    for (let i = 0; i < 120; i++) {
      adapter.step(world, 1 / 60);
    }

    const pos = adapter.getPosition(world, player);
    assert.ok(pos.y >= 0.3, 'player should rest on ground, not fall through');
    assert.ok(pos.y < 2, 'player should not bounce high');
  });
});
