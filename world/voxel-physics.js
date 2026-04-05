import { isBlockSolid } from "./block-types.js";
import { CHUNK_SIZE } from "./voxel-chunk.js";

export function voxelGroundHeight(voxelStorage, worldX, worldZ) {
  const bx = Math.floor(worldX);
  const bz = Math.floor(worldZ);

  let maxCY = -1;
  for (const key of voxelStorage.chunks.keys()) {
    const cy = +key.split(",")[1];
    if (cy > maxCY) maxCY = cy;
  }

  if (maxCY < 0) return -Infinity;

  const topY = (maxCY + 1) * CHUNK_SIZE - 1;

  for (let y = topY; y >= 0; y--) {
    if (isBlockSolid(voxelStorage.getBlock(bx, y, bz))) {
      return y;
    }
  }

  return -Infinity;
}

export function voxelRaycast(voxelStorage, fromX, fromY, fromZ, dirX, dirY, dirZ, maxDist) {
  const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
  if (len < 1e-10) return { hit: false };

  const dx = dirX / len;
  const dy = dirY / len;
  const dz = dirZ / len;

  let ix = Math.floor(fromX);
  let iy = Math.floor(fromY);
  let iz = Math.floor(fromZ);

  const stepX = dx >= 0 ? 1 : -1;
  const stepY = dy >= 0 ? 1 : -1;
  const stepZ = dz >= 0 ? 1 : -1;

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : 1e30;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : 1e30;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : 1e30;

  let tMaxX = dx !== 0 ? ((dx > 0 ? ix + 1 : ix) - fromX) / dx : 1e30;
  let tMaxY = dy !== 0 ? ((dy > 0 ? iy + 1 : iy) - fromY) / dy : 1e30;
  let tMaxZ = dz !== 0 ? ((dz > 0 ? iz + 1 : iz) - fromZ) / dz : 1e30;

  let t = 0;
  let face = -1;

  for (let i = 0; i < 1000; i++) {
    const block = voxelStorage.getBlock(ix, iy, iz);
    if (isBlockSolid(block)) {
      const normals = [
        { x: -stepX, y: 0, z: 0 },
        { x: 0, y: -stepY, z: 0 },
        { x: 0, y: 0, z: -stepZ },
      ];
      return {
        hit: true,
        position: { x: ix, y: iy, z: iz },
        normal: face >= 0 ? normals[face] : { x: 0, y: 1, z: 0 },
        blockType: block,
        distance: t,
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        t = tMaxX;
        if (t > maxDist) break;
        ix += stepX;
        tMaxX += tDeltaX;
        face = 0;
      } else {
        t = tMaxZ;
        if (t > maxDist) break;
        iz += stepZ;
        tMaxZ += tDeltaZ;
        face = 2;
      }
    } else {
      if (tMaxY < tMaxZ) {
        t = tMaxY;
        if (t > maxDist) break;
        iy += stepY;
        tMaxY += tDeltaY;
        face = 1;
      } else {
        t = tMaxZ;
        if (t > maxDist) break;
        iz += stepZ;
        tMaxZ += tDeltaZ;
        face = 2;
      }
    }
  }

  return { hit: false };
}

export function createVoxelCollisionHeightfield(voxelStorage, cx, cz, chunkHeight) {
  const size = CHUNK_SIZE;
  const worldBaseX = cx * size;
  const worldBaseZ = cz * size;
  const maxScanY = chunkHeight != null ? chunkHeight : 256;

  const data = [];
  for (let dz = 0; dz <= size; dz++) {
    const row = [];
    for (let dx = 0; dx <= size; dx++) {
      const wx = worldBaseX + dx;
      const wz = worldBaseZ + dz;
      let height = 0;
      for (let y = maxScanY; y >= 0; y--) {
        if (isBlockSolid(voxelStorage.getBlock(wx, y, wz))) {
          height = y + 1;
          break;
        }
      }
      row.push(height);
    }
    data.push(row);
  }

  return { data, elementSize: 1 };
}

export function isOnVoxelGround(voxelStorage, worldX, worldY, worldZ) {
  const bx = Math.floor(worldX);
  const bz = Math.floor(worldZ);
  const bottom = worldY - 1;
  const startBy = Math.floor(worldY);
  const endBy = Math.floor(bottom);

  for (let y = startBy; y >= endBy; y--) {
    if (isBlockSolid(voxelStorage.getBlock(bx, y, bz))) {
      return true;
    }
  }

  return false;
}

export function getVoxelSurfaceNormal(voxelStorage, worldX, worldY, worldZ) {
  const bx = Math.floor(worldX);
  const by = Math.floor(worldY);
  const bz = Math.floor(worldZ);

  const block = voxelStorage.getBlock(bx, by, bz);

  if (isBlockSolid(block)) {
    return { x: 0, y: 1, z: 0 };
  }

  const dirs = [
    { dx: 0, dy: -1, dz: 0, nx: 0, ny: 1, nz: 0 },
    { dx: 0, dy: 1, dz: 0, nx: 0, ny: -1, nz: 0 },
    { dx: 1, dy: 0, dz: 0, nx: -1, ny: 0, nz: 0 },
    { dx: -1, dy: 0, dz: 0, nx: 1, ny: 0, nz: 0 },
    { dx: 0, dy: 0, dz: 1, nx: 0, ny: 0, nz: -1 },
    { dx: 0, dy: 0, dz: -1, nx: 0, ny: 0, nz: 1 },
  ];

  for (const { dx, dy, dz, nx, ny, nz } of dirs) {
    if (isBlockSolid(voxelStorage.getBlock(bx + dx, by + dy, bz + dz))) {
      return { x: nx, y: ny, z: nz };
    }
  }

  return { x: 0, y: 1, z: 0 };
}
