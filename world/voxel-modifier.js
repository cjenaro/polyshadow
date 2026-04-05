import { BlockType, isBlockSolid } from "./block-types.js";
import { CHUNK_SIZE } from "./voxel-chunk.js";

function getChunkCoords(worldX, worldY, worldZ) {
  return {
    cx: Math.floor(worldX / CHUNK_SIZE),
    cy: Math.floor(worldY / CHUNK_SIZE),
    cz: Math.floor(worldZ / CHUNK_SIZE),
  };
}

function chunkKey(cx, cy, cz) {
  return `${cx},${cy},${cz}`;
}

function addAffectedChunks(affectedChunks, worldX, worldY, worldZ) {
  const { cx, cy, cz } = getChunkCoords(worldX, worldY, worldZ);
  affectedChunks.add(chunkKey(cx, cy, cz));

  const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  if (lx === 0) affectedChunks.add(chunkKey(cx - 1, cy, cz));
  if (lx === CHUNK_SIZE - 1) affectedChunks.add(chunkKey(cx + 1, cy, cz));
  if (ly === 0) affectedChunks.add(chunkKey(cx, cy - 1, cz));
  if (ly === CHUNK_SIZE - 1) affectedChunks.add(chunkKey(cx, cy + 1, cz));
  if (lz === 0) affectedChunks.add(chunkKey(cx, cy, cz - 1));
  if (lz === CHUNK_SIZE - 1) affectedChunks.add(chunkKey(cx, cy, cz + 1));
}

export function destroyBlock(voxelStorage, worldX, worldY, worldZ) {
  const previousBlockType = voxelStorage.getBlock(worldX, worldY, worldZ);
  if (previousBlockType === BlockType.AIR) {
    return { success: false, previousBlockType: BlockType.AIR, affectedChunks: [] };
  }

  voxelStorage.setBlock(worldX, worldY, worldZ, BlockType.AIR);

  const { cx, cy, cz } = getChunkCoords(worldX, worldY, worldZ);
  const affectedChunks = [{ cx, cy, cz }];

  const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  if (lx === 0) affectedChunks.push({ cx: cx - 1, cy, cz });
  if (lx === CHUNK_SIZE - 1) affectedChunks.push({ cx: cx + 1, cy, cz });
  if (ly === 0) affectedChunks.push({ cx, cy: cy - 1, cz });
  if (ly === CHUNK_SIZE - 1) affectedChunks.push({ cx, cy: cy + 1, cz });
  if (lz === 0) affectedChunks.push({ cx, cy, cz: cz - 1 });
  if (lz === CHUNK_SIZE - 1) affectedChunks.push({ cx, cy, cz: cz + 1 });

  return { success: true, previousBlockType, affectedChunks };
}

export function placeBlock(voxelStorage, worldX, worldY, worldZ, blockType) {
  const current = voxelStorage.getBlock(worldX, worldY, worldZ);
  if (current !== BlockType.AIR) {
    return { success: false, affectedChunks: [] };
  }

  voxelStorage.setBlock(worldX, worldY, worldZ, blockType);

  const { cx, cy, cz } = getChunkCoords(worldX, worldY, worldZ);
  const affectedChunks = [{ cx, cy, cz }];

  const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
  const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

  if (lx === 0) affectedChunks.push({ cx: cx - 1, cy, cz });
  if (lx === CHUNK_SIZE - 1) affectedChunks.push({ cx: cx + 1, cy, cz });
  if (ly === 0) affectedChunks.push({ cx, cy: cy - 1, cz });
  if (ly === CHUNK_SIZE - 1) affectedChunks.push({ cx, cy: cy + 1, cz });
  if (lz === 0) affectedChunks.push({ cx, cy, cz: cz - 1 });
  if (lz === CHUNK_SIZE - 1) affectedChunks.push({ cx, cy, cz: cz + 1 });

  return { success: true, affectedChunks };
}

export function destroySphere(voxelStorage, centerX, centerY, centerZ, radius) {
  const r = Math.floor(radius);
  let destroyed = 0;
  const affectedChunks = new Set();

  for (let dy = -r; dy <= r; dy++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const distSq = dx * dx + dy * dy + dz * dz;
        const radiusSq = radius * radius;
        if (distSq > radiusSq) continue;

        const x = centerX + dx;
        const y = centerY + dy;
        const z = centerZ + dz;

        if (voxelStorage.getBlock(x, y, z) !== BlockType.AIR) {
          voxelStorage.setBlock(x, y, z, BlockType.AIR);
          destroyed++;
          addAffectedChunks(affectedChunks, x, y, z);
        }
      }
    }
  }

  return { destroyed, affectedChunks };
}

export function destroyColumn(voxelStorage, worldX, worldZ, fromY, toY) {
  let destroyed = 0;
  const affectedChunks = new Set();

  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);

  for (let y = minY; y <= maxY; y++) {
    if (voxelStorage.getBlock(worldX, y, worldZ) !== BlockType.AIR) {
      voxelStorage.setBlock(worldX, y, worldZ, BlockType.AIR);
      destroyed++;
      addAffectedChunks(affectedChunks, worldX, y, worldZ);
    }
  }

  return { destroyed, affectedChunks };
}

export function replaceBlockType(voxelStorage, worldX, worldY, worldZ, newType) {
  const previousType = voxelStorage.getBlock(worldX, worldY, worldZ);
  if (previousType === BlockType.AIR) {
    return { success: false, previousType: BlockType.AIR };
  }

  voxelStorage.setBlock(worldX, worldY, worldZ, newType);

  return { success: true, previousType };
}

export function batchModify(voxelStorage, modifications) {
  const affectedChunks = new Set();
  let totalAffected = 0;

  for (const mod of modifications) {
    const { type, x, y, z } = mod;

    if (type === "destroy") {
      const current = voxelStorage.getBlock(x, y, z);
      if (current !== BlockType.AIR) {
        voxelStorage.setBlock(x, y, z, BlockType.AIR);
        totalAffected++;
        addAffectedChunks(affectedChunks, x, y, z);
      }
    } else if (type === "place") {
      const current = voxelStorage.getBlock(x, y, z);
      if (current === BlockType.AIR) {
        voxelStorage.setBlock(x, y, z, mod.blockType);
        totalAffected++;
        addAffectedChunks(affectedChunks, x, y, z);
      }
    } else if (type === "replace") {
      const current = voxelStorage.getBlock(x, y, z);
      if (current !== BlockType.AIR) {
        voxelStorage.setBlock(x, y, z, mod.blockType);
        totalAffected++;
        addAffectedChunks(affectedChunks, x, y, z);
      }
    }
  }

  return { totalAffected, affectedChunks };
}

export function raycastBlock(voxelStorage, fromX, fromY, fromZ, dirX, dirY, dirZ, maxDist) {
  let x = Math.floor(fromX);
  let y = Math.floor(fromY);
  let z = Math.floor(fromZ);

  const stepX = dirX > 0 ? 1 : dirX < 0 ? -1 : 0;
  const stepY = dirY > 0 ? 1 : dirY < 0 ? -1 : 0;
  const stepZ = dirZ > 0 ? 1 : dirZ < 0 ? -1 : 0;

  const tDeltaX = dirX !== 0 ? Math.abs(1 / dirX) : Infinity;
  const tDeltaY = dirY !== 0 ? Math.abs(1 / dirY) : Infinity;
  const tDeltaZ = dirZ !== 0 ? Math.abs(1 / dirZ) : Infinity;

  let tMaxX = dirX > 0 ? (x + 1 - fromX) / dirX : dirX < 0 ? (fromX - x) / -dirX : Infinity;
  let tMaxY = dirY > 0 ? (y + 1 - fromY) / dirY : dirY < 0 ? (fromY - y) / -dirY : Infinity;
  let tMaxZ = dirZ > 0 ? (z + 1 - fromZ) / dirZ : dirZ < 0 ? (fromZ - z) / -dirZ : Infinity;

  let normalX = 0,
    normalY = 0,
    normalZ = 0;
  let distance = 0;

  for (let i = 0; i < maxDist * 3 + 3; i++) {
    if (voxelStorage.getBlock(x, y, z) !== BlockType.AIR) {
      return {
        hit: true,
        position: { x, y, z },
        blockType: voxelStorage.getBlock(x, y, z),
        normal: { x: normalX, y: normalY, z: normalZ },
        distance,
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        distance = tMaxX;
        if (distance > maxDist) break;
        x += stepX;
        tMaxX += tDeltaX;
        normalX = -stepX;
        normalY = 0;
        normalZ = 0;
      } else {
        distance = tMaxZ;
        if (distance > maxDist) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
        normalX = 0;
        normalY = 0;
        normalZ = -stepZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        distance = tMaxY;
        if (distance > maxDist) break;
        y += stepY;
        tMaxY += tDeltaY;
        normalX = 0;
        normalY = -stepY;
        normalZ = 0;
      } else {
        distance = tMaxZ;
        if (distance > maxDist) break;
        z += stepZ;
        tMaxZ += tDeltaZ;
        normalX = 0;
        normalY = 0;
        normalZ = -stepZ;
      }
    }
  }

  return { hit: false };
}
