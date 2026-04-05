export function createMockAdapter() {
  const worlds = new Map();

  function getInternal(world) {
    return worlds.get(world);
  }

  return {
    createPhysicsWorld(opts = {}) {
      const internal = {
        gravity: opts.gravity || { x: 0, y: -9.81, z: 0 },
        bodies: new Set(),
        collisionListeners: [],
        friction: opts.friction !== undefined ? opts.friction : 0.6,
        restitution: opts.restitution !== undefined ? opts.restitution : 0.1,
      };
      const handle = { impl: Symbol('world') };
      worlds.set(handle, internal);
      return handle;
    },

    createBody(world, opts) {
      const pos = opts.position || { x: 0, y: 0, z: 0 };
      const vel = { x: 0, y: 0, z: 0 };
      const forceAccum = { x: 0, y: 0, z: 0 };
      const impulseAccum = { x: 0, y: 0, z: 0 };
      const mass = opts.type === 'static' ? 0 : (opts.mass || 1);

      const body = {
        impl: Symbol('body'),
        type: opts.type || 'dynamic',
        mass,
        shape: opts.shape,
        _position: { x: pos.x, y: pos.y, z: pos.z },
        _velocity: { x: 0, y: 0, z: 0 },
        _force: { x: 0, y: 0, z: 0 },
        _impulse: { x: 0, y: 0, z: 0 },
        _rotation: opts.rotation || { x: 0, y: 0, z: 0, w: 1 },
        _angularVelocity: { x: 0, y: 0, z: 0 },
        userData: opts.userData || {},
        friction: opts.friction !== undefined ? opts.friction : null,
        restitution: opts.restitution !== undefined ? opts.restitution : null,
      };
      return body;
    },

    addBody(world, body) {
      const internal = getInternal(world);
      if (internal) internal.bodies.add(body);
    },

    removeBody(world, body) {
      const internal = getInternal(world);
      if (internal) internal.bodies.delete(body);
    },

    step(world, dt) {
      const clampedDt = Math.min(dt, 0.1);
      const internal = getInternal(world);
      if (!internal) return;

      const { gravity, bodies, collisionListeners } = internal;

      for (const body of bodies) {
        if (body.type !== 'dynamic') continue;

        const mass = body.mass || 1;

        if (body._impulse.x !== 0 || body._impulse.y !== 0 || body._impulse.z !== 0) {
          body._velocity.x += body._impulse.x / mass;
          body._velocity.y += body._impulse.y / mass;
          body._velocity.z += body._impulse.z / mass;
          body._impulse.x = 0;
          body._impulse.y = 0;
          body._impulse.z = 0;
        }

        body._velocity.x += (gravity.x + body._force.x / mass) * clampedDt;
        body._velocity.y += (gravity.y + body._force.y / mass) * clampedDt;
        body._velocity.z += (gravity.z + body._force.z / mass) * clampedDt;

        body._force.x = 0;
        body._force.y = 0;
        body._force.z = 0;

        body._position.x += body._velocity.x * clampedDt;
        body._position.y += body._velocity.y * clampedDt;
        body._position.z += body._velocity.z * clampedDt;
      }

      const dynamicBodies = [];
      const staticBodies = [];
      for (const b of bodies) {
        if (b.type === 'dynamic') dynamicBodies.push(b);
        else if (b.type === 'static' || b.type === 'kinematic') staticBodies.push(b);
      }

      for (const dyn of dynamicBodies) {
        for (const stat of staticBodies) {
          if (dyn === stat) continue;
          const penetration = detectAABBOverlap(dyn, stat);
          if (penetration) {
            resolvePenetration(dyn, stat, penetration);

            const n = penetration.normal;
            const velDotN = dyn._velocity.x * n.x + dyn._velocity.y * n.y + dyn._velocity.z * n.z;

            const friction = dyn.friction !== null && dyn.friction !== undefined ? dyn.friction : internal.friction;
            const restitution = dyn.restitution !== null && dyn.restitution !== undefined ? dyn.restitution : internal.restitution;

            if (velDotN < 0) {
              const bounce = -(1 + restitution) * velDotN;
              dyn._velocity.x += bounce * n.x;
              dyn._velocity.y += bounce * n.y;
              dyn._velocity.z += bounce * n.z;
            }

            const newVelDotN = dyn._velocity.x * n.x + dyn._velocity.y * n.y + dyn._velocity.z * n.z;
            const tanVelX = dyn._velocity.x - newVelDotN * n.x;
            const tanVelY = dyn._velocity.y - newVelDotN * n.y;
            const tanVelZ = dyn._velocity.z - newVelDotN * n.z;
            const frictionFactor = Math.max(0, 1 - friction * clampedDt * 10);

            dyn._velocity.x = newVelDotN * n.x + tanVelX * frictionFactor;
            dyn._velocity.y = newVelDotN * n.y + tanVelY * frictionFactor;
            dyn._velocity.z = newVelDotN * n.z + tanVelZ * frictionFactor;

            for (const listener of collisionListeners) {
              if (listener.bodyA === dyn && listener.bodyB === stat) {
                listener.callback({ bodyA: dyn, bodyB: stat, normal: penetration.normal });
              } else if (listener.bodyA === stat && listener.bodyB === dyn) {
                listener.callback({ bodyA: stat, bodyB: dyn, normal: penetration.normal });
              }
            }
          }
        }
      }
    },

    applyForce(world, body, force) {
      body._force.x += force.x;
      body._force.y += force.y;
      body._force.z += force.z;
    },

    applyImpulse(world, body, impulse) {
      body._impulse.x += impulse.x;
      body._impulse.y += impulse.y;
      body._impulse.z += impulse.z;
    },

    setVelocity(world, body, vel) {
      body._velocity.x = vel.x;
      body._velocity.y = vel.y;
      body._velocity.z = vel.z;
    },

    getVelocity(world, body) {
      return { x: body._velocity.x, y: body._velocity.y, z: body._velocity.z };
    },

    setPosition(world, body, pos) {
      body._position.x = pos.x;
      body._position.y = pos.y;
      body._position.z = pos.z;
    },

    getPosition(world, body) {
      return { x: body._position.x, y: body._position.y, z: body._position.z };
    },

    setRotation(world, body, rot) {
      if (rot.x !== undefined) {
        body._rotation.x = rot.x;
        body._rotation.y = rot.y;
        body._rotation.z = rot.z;
        body._rotation.w = rot.w;
      } else {
        const rad = rot;
        const half = rad / 2;
        body._rotation = { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
      }
    },

    getRotation(world, body) {
      return { x: body._rotation.x, y: body._rotation.y, z: body._rotation.z, w: body._rotation.w };
    },

    raycast(world, from, to) {
      const internal = getInternal(world);
      if (!internal) return null;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dz = to.z - from.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len === 0) return null;

      const dirX = dx / len;
      const dirY = dy / len;
      const dirZ = dz / len;

      let closestHit = null;
      let closestDist = Infinity;

      for (const body of internal.bodies) {
        const result = raycastAABB(from, dirX, dirY, dirZ, body);
        if (result && result.distance < closestDist && result.distance >= 0 && result.distance <= len) {
          closestDist = result.distance;
          closestHit = {
            body,
            distance: result.distance,
            point: result.point,
            normal: result.normal,
          };
        }
      }

      return closestHit;
    },

    onCollision(world, bodyA, bodyB, callback) {
      const internal = getInternal(world);
      if (internal) {
        internal.collisionListeners.push({ bodyA, bodyB, callback });
      }
    },

    createTrimeshCollider(world, opts) {
      const pos = opts.position || { x: 0, y: 0, z: 0 };
      const body = {
        impl: Symbol('trimesh'),
        type: 'static',
        mass: 0,
        shape: { type: 'trimesh', vertices: opts.vertices, indices: opts.indices },
        _position: { x: pos.x, y: pos.y, z: pos.z },
        _velocity: { x: 0, y: 0, z: 0 },
        _force: { x: 0, y: 0, z: 0 },
        _impulse: { x: 0, y: 0, z: 0 },
        _rotation: { x: 0, y: 0, z: 0, w: 1 },
        _angularVelocity: { x: 0, y: 0, z: 0 },
        userData: opts.userData || {},
        friction: opts.friction !== undefined ? opts.friction : null,
        restitution: opts.restitution !== undefined ? opts.restitution : null,
      };
      const internal = getInternal(world);
      if (internal) internal.bodies.add(body);
      return body;
    },
  };
}

function getHalfExtents(body) {
  const s = body.shape;
  if (!s) return { x: 0.5, y: 0.5, z: 0.5 };
  if (s.type === 'box') return { x: s.halfExtents.x, y: s.halfExtents.y, z: s.halfExtents.z };
  if (s.type === 'capsule') {
    const r = s.radius || 0.3;
    const h = (s.height || 1.0) / 2 + r;
    return { x: r, y: h, z: r };
  }
  if (s.type === 'sphere') {
    const r = s.radius || 0.5;
    return { x: r, y: r, z: r };
  }
  if (s.type === 'trimesh') {
    const verts = s.vertices;
    if (!verts || verts.length === 0) return { x: 50, y: 0.5, z: 50 };
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < verts.length; i += 3) {
      const vx = verts[i] + body._position.x;
      const vy = verts[i + 1] + body._position.y;
      const vz = verts[i + 2] + body._position.z;
      if (vx < minX) minX = vx;
      if (vy < minY) minY = vy;
      if (vz < minZ) minZ = vz;
      if (vx > maxX) maxX = vx;
      if (vy > maxY) maxY = vy;
      if (vz > maxZ) maxZ = vz;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    return { x: (maxX - minX) / 2, y: (maxY - minY) / 2, z: (maxZ - minZ) / 2, cx, cy, cz };
  }
  return { x: 0.5, y: 0.5, z: 0.5 };
}

function detectAABBOverlap(bodyA, bodyB) {
  const heA = getHalfExtents(bodyA);
  const heB = getHalfExtents(bodyB);
  const pA = bodyA._position;
  const pB = bodyB._position;

  const cAx = heA.cx !== undefined ? heA.cx : pA.x;
  const cAy = heA.cy !== undefined ? heA.cy : pA.y;
  const cAz = heA.cz !== undefined ? heA.cz : pA.z;
  const cBx = heB.cx !== undefined ? heB.cx : pB.x;
  const cBy = heB.cy !== undefined ? heB.cy : pB.y;
  const cBz = heB.cz !== undefined ? heB.cz : pB.z;

  const dx = cBx - cAx;
  const dy = cBy - cAy;
  const dz = cBz - cAz;
  const overlapX = heA.x + heB.x - Math.abs(dx);
  const overlapY = heA.y + heB.y - Math.abs(dy);
  const overlapZ = heA.z + heB.z - Math.abs(dz);

  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return null;

  let normal, depth;
  if (overlapX < overlapY && overlapX < overlapZ) {
    depth = overlapX;
    normal = { x: dx > 0 ? -1 : 1, y: 0, z: 0 };
  } else if (overlapY < overlapZ) {
    depth = overlapY;
    normal = { x: 0, y: dy > 0 ? -1 : 1, z: 0 };
  } else {
    depth = overlapZ;
    normal = { x: 0, y: 0, z: dz > 0 ? -1 : 1 };
  }

  return { depth, normal };
}

function resolvePenetration(dynamicBody, otherBody, penetration) {
  dynamicBody._position.x += penetration.normal.x * penetration.depth;
  dynamicBody._position.y += penetration.normal.y * penetration.depth;
  dynamicBody._position.z += penetration.normal.z * penetration.depth;
}

function raycastAABB(origin, dirX, dirY, dirZ, body) {
  const he = getHalfExtents(body);
  const p = body._position;

  const cBx = he.cx !== undefined ? he.cx : p.x;
  const cBy = he.cy !== undefined ? he.cy : p.y;
  const cBz = he.cz !== undefined ? he.cz : p.z;

  const minX = cBx - he.x;
  const maxX = cBx + he.x;
  const minY = cBy - he.y;
  const maxY = cBy + he.y;
  const minZ = cBz - he.z;
  const maxZ = cBz + he.z;

  let tmin = -Infinity;
  let tmax = Infinity;
  let hitNormal = { x: 0, y: 0, z: 0 };

  if (Math.abs(dirX) > 1e-8) {
    let t1 = (minX - origin.x) / dirX;
    let t2 = (maxX - origin.x) / dirX;
    let nx1 = -1;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; nx1 = 1; }
    if (t1 > tmin) { tmin = t1; hitNormal = { x: nx1, y: 0, z: 0 }; }
    tmax = Math.min(tmax, t2);
  } else {
    if (origin.x < minX || origin.x > maxX) return null;
  }

  if (Math.abs(dirY) > 1e-8) {
    let t1 = (minY - origin.y) / dirY;
    let t2 = (maxY - origin.y) / dirY;
    let ny1 = -1;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; ny1 = 1; }
    if (t1 > tmin) { tmin = t1; hitNormal = { x: 0, y: ny1, z: 0 }; }
    tmax = Math.min(tmax, t2);
  } else {
    if (origin.y < minY || origin.y > maxY) return null;
  }

  if (Math.abs(dirZ) > 1e-8) {
    let t1 = (minZ - origin.z) / dirZ;
    let t2 = (maxZ - origin.z) / dirZ;
    let nz1 = -1;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; nz1 = 1; }
    if (t1 > tmin) { tmin = t1; hitNormal = { x: 0, y: 0, z: nz1 }; }
    tmax = Math.min(tmax, t2);
  } else {
    if (origin.z < minZ || origin.z > maxZ) return null;
  }

  if (tmax < 0 || tmin > tmax) return null;

  const t = tmin >= 0 ? tmin : tmax;
  if (t < 0) return null;

  return {
    distance: t,
    point: {
      x: origin.x + dirX * t,
      y: origin.y + dirY * t,
      z: origin.z + dirZ * t,
    },
    normal: tmin >= 0 ? hitNormal : { x: 0, y: 0, z: 0 },
  };
}


