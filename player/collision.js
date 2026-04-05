const PLAYER_RADIUS = 0.35;
const WALL_RAY_DIST = 1.0;
const SURROUND_DIST = 0.5;
const GROUND_RAY_DOWN = 3;
const GROUND_RAY_UP = 2;
const WALL_HEIGHTS = [0.1, 0.7, 1.3];
const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function resolveCollisions(pos, vel, adapter, world) {
  if (!adapter || !world) {
    return { position: pos, velocity: vel, groundY: null, isGrounded: false };
  }

  const p = { x: pos.x, y: pos.y, z: pos.z };
  const v = { x: vel.x, y: vel.y, z: vel.z };

  const groundResult = detectGround(p, adapter, world);
  resolveWalls(p, v, adapter, world);
  resolveSurrounding(p, adapter, world);

  return {
    position: p,
    velocity: v,
    groundY: groundResult.groundY,
    isGrounded: groundResult.isGrounded,
  };
}

function detectGround(p, adapter, world) {
  const hit = adapter.raycast(
    world,
    { x: p.x, y: p.y + GROUND_RAY_UP, z: p.z },
    { x: p.x, y: p.y - GROUND_RAY_DOWN, z: p.z },
  );

  if (!hit || hit.normal.y < 0.3 || hit.distance > GROUND_RAY_DOWN + GROUND_RAY_UP) {
    return { groundY: null, isGrounded: false };
  }

  const groundY = hit.point.y;
  const distToGround = p.y - groundY;
  const isGrounded = distToGround < 0.5 && distToGround >= -0.5;

  return { groundY, isGrounded };
}

function resolveWalls(p, v, adapter, world) {
  const hSpeed = Math.sqrt(v.x * v.x + v.z * v.z);
  if (hSpeed < 0.01) return;

  const dx = v.x / hSpeed;
  const dz = v.z / hSpeed;

  for (const h of WALL_HEIGHTS) {
    const hit = adapter.raycast(
      world,
      { x: p.x, y: p.y + h, z: p.z },
      { x: p.x + dx * WALL_RAY_DIST, y: p.y + h, z: p.z + dz * WALL_RAY_DIST },
    );

    if (hit && hit.distance < PLAYER_RADIUS) {
      const pushback = PLAYER_RADIUS - hit.distance;
      p.x -= dx * pushback;
      p.z -= dz * pushback;

      const dot = v.x * hit.normal.x + v.z * hit.normal.z;
      if (dot < 0) {
        v.x -= hit.normal.x * dot;
        v.z -= hit.normal.z * dot;
      }
      break;
    }
  }
}

function resolveSurrounding(p, adapter, world) {
  for (const [dx, dz] of CARDINALS) {
    const hit = adapter.raycast(
      world,
      { x: p.x, y: p.y + 0.7, z: p.z },
      { x: p.x + dx * SURROUND_DIST, y: p.y + 0.7, z: p.z + dz * SURROUND_DIST },
    );

    if (hit && hit.distance < PLAYER_RADIUS) {
      const pushback = PLAYER_RADIUS - hit.distance;
      p.x += hit.normal.x * pushback;
      p.z += hit.normal.z * pushback;
    }
  }
}
