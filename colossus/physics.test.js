import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createColossusBody, syncColossusBody, setupColossusCollisionEvents, performCombatRaycast, applyColossusForce, applyKnockback } from './physics.js';
import { createMockAdapter } from '../engine/physics-adapter.js';

function setup() {
  const adapter = createMockAdapter();
  const world = adapter.createPhysicsWorld();
  return { adapter, world };
}

describe('createColossusBody', () => {
  it('creates kinematic body with correct capsule shape for sentinel', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'sentinel', { x: 0, y: 10, z: 0 });
    assert.strictEqual(body.type, 'kinematic');
    assert.deepStrictEqual(body.shape, { type: 'capsule', radius: 4, height: 14 });
  });

  it('creates kinematic body with correct box shape for wraith', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'wraith', { x: 0, y: 10, z: 0 });
    assert.strictEqual(body.type, 'kinematic');
    assert.deepStrictEqual(body.shape, { type: 'box', halfExtents: { x: 10, y: 3, z: 8 } });
  });

  it('creates kinematic body with correct sphere shape for titan', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'titan', { x: 0, y: 10, z: 0 });
    assert.strictEqual(body.type, 'kinematic');
    assert.deepStrictEqual(body.shape, { type: 'sphere', radius: 15 });
  });

  it('sets userData with entity and type', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'sentinel', { x: 0, y: 10, z: 0 });
    assert.deepStrictEqual(body.userData, { entity: 'colossus', type: 'sentinel' });
  });

  it('adds body to world', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'titan', { x: 0, y: 10, z: 0 });
    const pos = adapter.getPosition(world, body);
    assert.ok(pos);
  });
});

describe('syncColossusBody', () => {
  it('sets position and rotation on the kinematic body', () => {
    const { adapter, world } = setup();
    const body = createColossusBody(adapter, world, 'sentinel', { x: 0, y: 0, z: 0 });
    syncColossusBody(adapter, world, body, { x: 10, y: 20, z: 30 }, Math.PI / 2);
    const pos = adapter.getPosition(world, body);
    assert.deepStrictEqual(pos, { x: 10, y: 20, z: 30 });
    const rot = adapter.getRotation(world, body);
    const expectedHalf = Math.PI / 4;
    assert.ok(Math.abs(rot.x - 0) < 0.001);
    assert.ok(Math.abs(rot.y - Math.sin(expectedHalf)) < 0.001);
    assert.ok(Math.abs(rot.z - 0) < 0.001);
    assert.ok(Math.abs(rot.w - Math.cos(expectedHalf)) < 0.001);
  });
});

describe('setupColossusCollisionEvents', () => {
  it('registers collision callbacks for colossus hitting player and player hitting colossus', () => {
    const { adapter, world } = setup();
    const colossusBody = adapter.createBody(world, { type: 'kinematic', position: { x: 0, y: 5, z: 0 }, shape: { type: 'sphere', radius: 2 } });
    adapter.addBody(world, colossusBody);
    const playerBody = adapter.createBody(world, { type: 'dynamic', mass: 1, position: { x: 0, y: 0, z: 0 }, shape: { type: 'sphere', radius: 1 } });
    adapter.addBody(world, playerBody);

    const hitEvents = [];
    const attackEvents = [];
    setupColossusCollisionEvents(adapter, world, colossusBody, playerBody, {
      onPlayerHit(event) { hitEvents.push(event); },
      onPlayerAttack(event) { attackEvents.push(event); },
    });

    adapter.setPosition(world, playerBody, { x: 0, y: 3, z: 0 });
    adapter.step(world, 1 / 60);

    assert.ok(hitEvents.length + attackEvents.length >= 1);
  });
});

describe('performCombatRaycast', () => {
  it('returns hit when ray intersects body', () => {
    const { adapter, world } = setup();
    const body = adapter.createBody(world, { type: 'static', position: { x: 0, y: 0, z: 20 }, shape: { type: 'sphere', radius: 2 } });
    adapter.addBody(world, body);
    const result = performCombatRaycast(adapter, world, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 50);
    assert.ok(result !== null);
    assert.strictEqual(result.body, body);
    assert.ok(result.distance > 0);
  });

  it('returns null when nothing hit', () => {
    const { adapter, world } = setup();
    const result = performCombatRaycast(adapter, world, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 50);
    assert.strictEqual(result, null);
  });
});

describe('applyColossusForce', () => {
  it('calls adapter.applyForce', () => {
    const { adapter, world } = setup();
    const body = adapter.createBody(world, { type: 'dynamic', mass: 1, position: { x: 0, y: 0, z: 0 } });
    adapter.addBody(world, body);
    const force = { x: 5, y: 0, z: -3 };
    applyColossusForce(adapter, world, body, force);
    adapter.step(world, 1 / 60);
    const vel = adapter.getVelocity(world, body);
    assert.ok(vel.x !== 0 || vel.y !== -9.81 * (1 / 60) || vel.z !== 0);
  });
});

describe('applyKnockback', () => {
  it('calls adapter.applyImpulse with correct values', () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld({ gravity: { x: 0, y: 0, z: 0 } });
    const body = adapter.createBody(world, { type: 'dynamic', mass: 1, position: { x: 0, y: 0, z: 0 } });
    adapter.addBody(world, body);
    applyKnockback(adapter, world, body, { x: 1, y: 0, z: 0 }, 10);
    adapter.step(world, 1 / 60);
    const vel = adapter.getVelocity(world, body);
    assert.ok(Math.abs(vel.x - 10) < 0.01);
    assert.ok(Math.abs(vel.y - 3) < 0.01);
  });
});
