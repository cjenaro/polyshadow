const SHAPES = {
  sentinel: { type: "capsule", radius: 4, height: 14 },
  wraith: { type: "box", halfExtents: { x: 10, y: 3, z: 8 } },
  titan: { type: "sphere", radius: 15 },
};

export function createColossusBody(adapter, world, type, position) {
  const shape = SHAPES[type];
  const body = adapter.createBody(world, {
    type: "kinematic",
    position,
    shape,
    userData: { entity: "colossus", type },
  });
  body.userData = { entity: "colossus", type };
  adapter.addBody(world, body);
  return body;
}

export function syncColossusBody(adapter, world, colossusBody, aiPosition, rotation) {
  adapter.setPosition(world, colossusBody, aiPosition);
  adapter.setRotation(world, colossusBody, rotation);
}

export function setupColossusCollisionEvents(adapter, world, colossusBody, playerBody, callbacks) {
  adapter.onCollision(world, colossusBody, playerBody, callbacks.onPlayerHit);
  adapter.onCollision(world, playerBody, colossusBody, callbacks.onPlayerAttack);
}

export function performCombatRaycast(adapter, world, fromPosition, direction, maxDistance) {
  const to = {
    x: fromPosition.x + direction.x * maxDistance,
    y: fromPosition.y + direction.y * maxDistance,
    z: fromPosition.z + direction.z * maxDistance,
  };
  return adapter.raycast(world, fromPosition, to);
}

export function applyColossusForce(adapter, world, playerBody, force) {
  adapter.applyForce(world, playerBody, force);
}

export function applyKnockback(adapter, world, playerBody, direction, strength) {
  adapter.applyImpulse(world, playerBody, {
    x: direction.x * strength,
    y: direction.y * strength + 3,
    z: direction.z * strength,
  });
}
