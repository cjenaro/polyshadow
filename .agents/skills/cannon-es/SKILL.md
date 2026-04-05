---
name: cannon-es
description: 'cannon-es physics engine integration for web-based 3D games. Use when implementing physics, collision detection, rigid body dynamics, or integrating cannon-es with Three.js. Covers world setup, bodies, shapes, stepping, collision events, materials, and common patterns for character controllers.'
---

# cannon-es Skill

Physics engine integration using cannon-es for 3D web games. This skill provides patterns for integrating cannon-es with Three.js, implementing character controllers, handling collisions, and managing physics simulation.

## When to Use This Skill

- Setting up a cannon-es physics world
- Creating rigid bodies (dynamic, static, kinematic)
- Integrating physics with Three.js rendering
- Implementing character controllers with ground detection
- Handling collision events and contact materials
- Working with trimesh colliders for complex geometry

## Core Concepts

### World Setup

Create a physics world with gravity:

```javascript
import * as CANNON from 'cannon-es';

const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
});
```

### Stepping the Simulation

**Preferred: `fixedStep()`** - Runs at consistent rate independent of framerate:

```javascript
function animate() {
  requestAnimationFrame(animate);
  world.fixedStep(); // defaults to 1/60s, max 10 substeps
  animate();
}
```

**Manual: `step(timeStep, dt)`** - For advanced control:

```javascript
const timeStep = 1 / 60;
let lastCallTime;

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() / 1000;
  if (!lastCallTime) {
    world.step(timeStep);
  } else {
    const dt = time - lastCallTime;
    world.step(timeStep, dt);
  }
  lastCallTime = time;
}
```

### Body Types

| Type | Mass | Behavior |
|------|------|----------|
| Dynamic | > 0 | Affected by forces and gravity |
| Static | 0 | Fixed, immovable |
| Kinematic | 0 | Moved programmatically, affects dynamics |

### Shapes

```javascript
// Box
const box = new CANNON.Box(new CANNON.Vec3(halfX, halfY, halfZ));

// Sphere
const sphere = new CANNON.Sphere(radius);

// Capsule (cylinder with hemispherical ends)
const capsule = new CANNON.Cylinder(radiusTop, radiusBottom, height, segments);

// Plane (infinite)
const plane = new CANNON.Plane();

// Trimesh (static terrain)
const trimesh = new CANNON.Trimesh(vertices, indices);
```

### Creating a Body

```javascript
const body = new CANNON.Body({
  mass: 5, // kg, 0 for static
  type: CANNON.Body.DYNAMIC, // or STATIC, KINEMATIC
  position: new CANNON.Vec3(0, 10, 0),
  shape: sphere,
});
body.userData = { id: 'player' };
world.addBody(body);
```

### Ground Plane

```javascript
const groundBody = new CANNON.Body({
  mass: 0,
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // face up
world.addBody(groundBody);
```

## Integration with Three.js

### Sync Pattern (Read Back After Step)

**CRITICAL**: After calling `world.fixedStep()`, you MUST read the position back:

```javascript
function animate() {
  requestAnimationFrame(animate);

  // 1. Set initial state into physics body
  playerBody.position.set(player.x, player.y, player.z);
  playerBody.velocity.set(vel.x, vel.y, vel.z);

  // 2. Step the physics
  world.fixedStep();

  // 3. READ BACK the result (this is the missing piece!)
  player.x = playerBody.position.x;
  player.y = playerBody.position.y;
  player.z = playerBody.position.z;
  player.vx = playerBody.velocity.x;
  player.vy = playerBody.velocity.y;
  player.vz = playerBody.velocity.z;

  // 4. Sync Three.js mesh
  mesh.position.copy(playerBody.position);
  mesh.quaternion.copy(playerBody.quaternion);
}
```

## Ground Detection

### Method 1: Collision Events (Recommended)

```javascript
let isGrounded = false;

playerBody.addEventListener('collide', (event) => {
  // Check if collision is with ground (normal points up)
  const contactNormal = event.contact.ni;
  if (contactNormal.y > 0.3) {
    isGrounded = true;
  }
});
```

### Method 2: Check World Contacts

```javascript
function checkGrounded(body, world) {
  for (const contact of world.contacts) {
    if (contact.bi === body || contact.bj === body) {
      const normal = contact.ni;
      if (normal.y > 0.3) return true;
    }
  }
  return false;
}
```

### Method 3: Raycast Down

```javascript
function raycastGround(world, position, maxDistance = 3) {
  const from = new CANNON.Vec3(position.x, position.y + 1, position.z);
  const to = new CANNON.Vec3(position.x, position.y - maxDistance, position.z);
  const ray = new CANNON.Ray(from, to);
  const result = new CANNON.RaycastResult();
  ray.intersectWorld(world, { result, skipBackfaces: true });
  if (result.hasHit) {
    return { hit: true, distance: result.distance, point: result.hitPointWorld };
  }
  return { hit: false };
}
```

## Character Controller Pattern

```javascript
const playerBody = new CANNON.Body({
  mass: 1,
  type: CANNON.Body.DYNAMIC,
  position: new CANNON.Vec3(0, 5, 0),
  shape: new CANNON.Sphere(0.5),
  linearDamping: 0.9, // prevents sliding forever
  fixedRotation: true,
});
playerBody.allowSleep = false;

// Movement
function updatePlayer(input, dt) {
  // Get camera-relative direction
  const dir = getCameraRelativeDirection(input, cameraYaw);

  // Set velocity directly (overwrites physics)
  playerBody.velocity.x = dir.x * speed;
  playerBody.velocity.z = dir.z * speed;
  // Leave velocity.y alone (gravity handles it)
}

// Jump with impulse
if (input.jump && isGrounded) {
  playerBody.applyImpulse(new CANNON.Vec3(0, jumpForce, 0));
}
```

## Materials and Contact

```javascript
const physicsMaterial = new CANNON.Material('physics');
const physics_physics = new CANNON.ContactMaterial(physicsMaterial, physicsMaterial, {
  friction: 0.3,
  restitution: 0.1,
  contactEquationStiffness: 1e8,
  contactEquationRelaxation: 3,
});
world.addContactMaterial(physics_physics);
```

## Trimesh Colliders (Static Terrain)

```javascript
// Extract from Three.js geometry
const vertices = Array.from(geometry.attributes.position.array);
const indices = Array.from(geometry.index.array);

const trimesh = new CANNON.Trimesh(vertices, indices);
const terrainBody = new CANNON.Body({
  mass: 0,
  type: CANNON.Body.STATIC,
  shape: trimesh,
});
terrainBody.position.set(0, 0, 0);
world.addBody(terrainBody);
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Character floats | Read position back after `fixedStep()` |
| No collision | Ensure ground body is added to world |
| Sliding forever | Add `linearDamping` to body |
| Tunneling | Use smaller timestep or CCD |
| Jumping in air | Use collision events for ground detection |

## Reference

- [Official Docs](https://pmndrs.github.io/cannon-es/)
- [Three.js + cannon-es Example](https://github.com/pmndrs/cannon-es/blob/master/examples/threejs.html)
