const BEHIND_PENALTY = 3;

function buildVoxelSet(voxels) {
  const set = new Set();
  for (const v of voxels) {
    set.add(`${v.x},${v.y},${v.z}`);
  }
  return set;
}

function getExposedFacesForPart(voxels) {
  const set = buildVoxelSet(voxels);
  const dirs = [
    { dx: 1, dy: 0, dz: 0 },
    { dx: -1, dy: 0, dz: 0 },
    { dx: 0, dy: 1, dz: 0 },
    { dx: 0, dy: -1, dz: 0 },
    { dx: 0, dy: 0, dz: 1 },
    { dx: 0, dy: 0, dz: -1 },
  ];
  const faces = [];
  for (const v of voxels) {
    for (const d of dirs) {
      if (!set.has(`${v.x + d.dx},${v.y + d.dy},${v.z + d.dz}`)) {
        faces.push({
          vx: v.x,
          vy: v.y,
          vz: v.z,
          nx: d.dx,
          ny: d.dy,
          nz: d.dz,
        });
      }
    }
  }
  return faces;
}

export function generateVoxelSurfacePatches(voxelParts) {
  const patches = [];
  for (const [partId, part] of Object.entries(voxelParts)) {
    if (part.climbable === false) continue;
    const faces = getExposedFacesForPart(part.voxels);
    const ox = part.offset.x;
    const oy = part.offset.y;
    const oz = part.offset.z;
    for (const f of faces) {
      patches.push({
        position: {
          x: ox + f.vx + 0.5 + f.nx * 0.5,
          y: oy + f.vy + 0.5 + f.ny * 0.5,
          z: oz + f.vz + 0.5 + f.nz * 0.5,
        },
        normal: { x: f.nx, y: f.ny, z: f.nz },
        bodyPartId: partId,
      });
    }
  }
  return patches;
}

export function findNearestVoxelGrabPoint(grabPoints, playerPos, playerFacing, maxDist) {
  let nearest = null;
  let nearestDist = maxDist;

  for (const gp of grabPoints) {
    const dx = gp.position.x - playerPos.x;
    const dy = gp.position.y - playerPos.y;
    const dz = gp.position.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

    let effectiveDist = d;
    if (playerFacing && d > 0) {
      const dot = (dx / d) * playerFacing.x + (dy / d) * playerFacing.y + (dz / d) * playerFacing.z;
      if (dot < 0) {
        effectiveDist = d * BEHIND_PENALTY;
      }
    }

    if (effectiveDist < nearestDist) {
      nearestDist = effectiveDist;
      nearest = gp;
    }
  }

  return nearest;
}

export function getVoxelClimbMovement(input, normal) {
  const mx = input.x;
  const my = input.y;
  const len = Math.sqrt(mx * mx + my * my);
  if (len < 1e-10) return { dx: 0, dy: 0, dz: 0, climbSpeed: 0 };

  const nx = mx / len;
  const ny = my / len;

  let tangentX, tangentY, tangentZ;
  let binormalX, binormalY, binormalZ;

  if (Math.abs(normal.y) < 0.999) {
    tangentX = normal.z;
    tangentY = 0;
    tangentZ = -normal.x;
    const tLen = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ);
    tangentX /= tLen;
    tangentY = 0;
    tangentZ /= tLen;
    binormalX = normal.y * tangentZ - normal.z * tangentY;
    binormalY = normal.z * tangentX - normal.x * tangentZ;
    binormalZ = normal.x * tangentY - normal.y * tangentX;
  } else {
    tangentX = 1;
    tangentY = 0;
    tangentZ = 0;
    binormalX = 0;
    binormalY = 0;
    binormalZ = normal.y > 0 ? 1 : -1;
  }

  const dirX = nx * tangentX + ny * binormalX;
  const dirY = nx * tangentY + ny * binormalY;
  const dirZ = nx * tangentZ + ny * binormalZ;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  const invLen = dirLen > 1e-10 ? 1 / dirLen : 0;

  return {
    dx: dirX * invLen,
    dy: dirY * invLen,
    dz: dirZ * invLen,
    climbSpeed: len,
  };
}

export function findVoxelJumpTarget(grabPoints, playerPos, climbNormal, jumpDist) {
  let nearest = null;
  let nearestDist = jumpDist;

  for (const gp of grabPoints) {
    if (
      gp.normal.x === climbNormal.x &&
      gp.normal.y === climbNormal.y &&
      gp.normal.z === climbNormal.z
    )
      continue;

    const dx = gp.position.x - playerPos.x;
    const dy = gp.position.y - playerPos.y;
    const dz = gp.position.z - playerPos.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (d < nearestDist) {
      nearestDist = d;
      nearest = gp;
    }
  }

  return nearest;
}

export function findVoxelRestSpots(grabPoints) {
  const topFaces = grabPoints.filter((p) => p.normal.y === 1);
  if (topFaces.length === 0) return [];

  const byPart = new Map();
  for (const f of topFaces) {
    if (!byPart.has(f.bodyPartId)) byPart.set(f.bodyPartId, []);
    byPart.get(f.bodyPartId).push(f);
  }

  const spots = [];
  for (const [partId, faces] of byPart) {
    let cx = 0,
      cy = 0,
      cz = 0;
    for (const f of faces) {
      cx += f.position.x;
      cy += f.position.y;
      cz += f.position.z;
    }
    spots.push({
      position: { x: cx / faces.length, y: cy / faces.length, z: cz / faces.length },
      size: faces.length,
      bodyPartId: partId,
    });
  }

  return spots;
}

export function updateVoxelClimbSurfaces(voxelParts, destroyedVoxels) {
  const filteredParts = {};
  for (const [partId, part] of Object.entries(voxelParts)) {
    const destroyedForPart = destroyedVoxels.filter((v) => v.bodyPartId === partId);
    if (destroyedForPart.length === 0) {
      filteredParts[partId] = part;
      continue;
    }
    const destroyedSet = new Set(destroyedForPart.map((v) => `${v.x},${v.y},${v.z}`));
    const remaining = part.voxels.filter((v) => !destroyedSet.has(`${v.x},${v.y},${v.z}`));
    filteredParts[partId] = { ...part, voxels: remaining };
  }
  return generateVoxelSurfacePatches(filteredParts);
}
