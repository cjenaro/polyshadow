import * as CANNON from 'cannon-es';

export function createCannonAdapter() {
  const worlds = new Map();

  function getInternal(world) {
    return worlds.get(world);
  }

  return {
    createPhysicsWorld(opts = {}) {
      const gravity = opts.gravity || { x: 0, y: -9.81, z: 0 };
      const cannonWorld = new CANNON.World();
      cannonWorld.gravity.set(gravity.x, gravity.y, gravity.z);
      const handle = { impl: cannonWorld };
      worlds.set(handle, {
        cannonWorld,
        bodyToWrapper: new Map(),
      });
      return handle;
    },

    createBody(world, opts) {
      const pos = opts.position || { x: 0, y: 0, z: 0 };
      const mass = opts.type === 'static' ? 0 : (opts.mass || 1);
      const shapeOpts = opts.shape;

      let shape;
      if (shapeOpts) {
        switch (shapeOpts.type) {
          case 'box':
            shape = new CANNON.Box(new CANNON.Vec3(
              shapeOpts.halfExtents.x,
              shapeOpts.halfExtents.y,
              shapeOpts.halfExtents.z,
            ));
            break;
          case 'sphere':
            shape = new CANNON.Sphere(shapeOpts.radius || 0.5);
            break;
          case 'capsule':
            shape = new CANNON.Cylinder(shapeOpts.radius || 0.3, shapeOpts.radius || 0.3, shapeOpts.height || 1.0, 8);
            break;
        }
      }

      const bodyType = opts.type === 'static' ? CANNON.Body.STATIC
        : opts.type === 'kinematic' ? CANNON.Body.KINEMATIC
        : CANNON.Body.DYNAMIC;

      const cannonBody = new CANNON.Body({
        mass,
        type: bodyType,
        position: new CANNON.Vec3(pos.x, pos.y, pos.z),
      });

      if (shape) {
        cannonBody.addShape(shape);
      }

      cannonBody.userData = opts.userData || {};

      return {
        impl: cannonBody,
        type: opts.type || 'dynamic',
        mass,
        shape: opts.shape,
        userData: cannonBody.userData,
      };
    },

    addBody(world, body) {
      const internal = getInternal(world);
      if (internal) {
        internal.cannonWorld.addBody(body.impl);
        internal.bodyToWrapper.set(body.impl, body);
      }
    },

    removeBody(world, body) {
      const internal = getInternal(world);
      if (internal) {
        internal.cannonWorld.removeBody(body.impl);
        internal.bodyToWrapper.delete(body.impl);
      }
    },

    step(world, dt) {
      const clampedDt = Math.min(dt, 0.1);
      const internal = getInternal(world);
      if (!internal) return;
      internal.cannonWorld.step(clampedDt, undefined, 3);
    },

    applyForce(world, body, force) {
      body.impl.applyForce(new CANNON.Vec3(force.x, force.y, force.z));
    },

    applyImpulse(world, body, impulse) {
      body.impl.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z));
    },

    setVelocity(world, body, vel) {
      body.impl.velocity.set(vel.x, vel.y, vel.z);
    },

    getVelocity(world, body) {
      const v = body.impl.velocity;
      return { x: v.x, y: v.y, z: v.z };
    },

    setPosition(world, body, pos) {
      body.impl.position.set(pos.x, pos.y, pos.z);
    },

    getPosition(world, body) {
      const p = body.impl.position;
      return { x: p.x, y: p.y, z: p.z };
    },

    setRotation(world, body, rot) {
      if (rot.x !== undefined) {
        body.impl.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      } else {
        const half = rot / 2;
        body.impl.quaternion.set(0, Math.sin(half), 0, Math.cos(half));
      }
    },

    getRotation(world, body) {
      const q = body.impl.quaternion;
      return { x: q.x, y: q.y, z: q.z, w: q.w };
    },

    raycast(world, from, to) {
      const internal = getInternal(world);
      if (!internal) return null;

      const fromVec = new CANNON.Vec3(from.x, from.y, from.z);
      const toVec = new CANNON.Vec3(to.x, to.y, to.z);
      const direction = new CANNON.Vec3();
      toVec.vsub(fromVec, direction);
      const length = direction.length();
      if (length === 0) return null;
      direction.normalize();

      const ray = new CANNON.Ray(fromVec, direction);
      const result = new CANNON.RaycastResult();
      ray.intersectWorld(internal.cannonWorld, {
        result,
        skipBackfaces: true,
        near: 0,
        far: length,
      });

      if (result.hasHit) {
        const bodyWrapper = internal.bodyToWrapper.get(result.body);
        return {
          body: bodyWrapper || null,
          distance: result.distance,
          point: {
            x: result.hitPointWorld.x,
            y: result.hitPointWorld.y,
            z: result.hitPointWorld.z,
          },
          normal: {
            x: result.hitNormalWorld.x,
            y: result.hitNormalWorld.y,
            z: result.hitNormalWorld.z,
          },
        };
      }

      return null;
    },

    onCollision(world, bodyA, bodyB, callback) {
      const internal = getInternal(world);
      if (!internal) return;

      bodyA.impl.addEventListener('collide', (event) => {
        if (event.body === bodyB.impl) {
          const ni = event.contact?.ni;
          const normal = ni
            ? { x: ni.x, y: ni.y, z: ni.z }
            : { x: 0, y: 1, z: 0 };
          callback({ bodyA, bodyB, normal });
        }
      });
    },

    createTrimeshCollider(world, opts) {
      const pos = opts.position || { x: 0, y: 0, z: 0 };
      const vertices = opts.vertices;
      const indices = opts.indices;

      const trimesh = new CANNON.Trimesh(
        Array.from(vertices),
        Array.from(indices),
      );

      const cannonBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.STATIC,
        position: new CANNON.Vec3(pos.x, pos.y, pos.z),
      });
      cannonBody.addShape(trimesh);
      cannonBody.userData = opts.userData || {};

      const wrapper = {
        impl: cannonBody,
        type: 'static',
        mass: 0,
        shape: { type: 'trimesh', vertices, indices },
        userData: cannonBody.userData,
      };

      const internal = getInternal(world);
      if (internal) {
        internal.cannonWorld.addBody(cannonBody);
        internal.bodyToWrapper.set(cannonBody, wrapper);
      }

      return wrapper;
    },
  };
}
