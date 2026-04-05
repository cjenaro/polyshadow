import { BlockType, isBlockSolid, isBlockTransparent } from "./block-types.js";

export const CHUNK_SIZE = 16;

export function createChunk(chunkX, chunkY, chunkZ) {
  const size = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
  return {
    chunkX,
    chunkY,
    chunkZ,
    blocks: new Uint8Array(size),
    dirty: true,
    mesh: null,
  };
}

function index(x, y, z) {
  return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
}

export function getBlock(chunk, lx, ly, lz) {
  if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE) {
    return BlockType.AIR;
  }
  return chunk.blocks[index(lx, ly, lz)];
}

export function setBlock(chunk, lx, ly, lz, blockType) {
  if (lx < 0 || lx >= CHUNK_SIZE || ly < 0 || ly >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE)
    return;
  chunk.blocks[index(lx, ly, lz)] = blockType;
  chunk.dirty = true;
}

export function fillChunk(chunk, blockType) {
  chunk.blocks.fill(blockType);
  chunk.dirty = true;
}

export function isChunkEmpty(chunk) {
  for (let i = 0; i < chunk.blocks.length; i++) {
    if (chunk.blocks[i] !== BlockType.AIR) return false;
  }
  return true;
}

export function forEachBlock(chunk, callback) {
  for (let y = 0; y < CHUNK_SIZE; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = chunk.blocks[index(x, y, z)];
        if (blockType !== BlockType.AIR) {
          callback(x, y, z, blockType);
        }
      }
    }
  }
}

export function isBlockExposed(chunk, lx, ly, lz, getNeighborBlock) {
  const type = getBlock(chunk, lx, ly, lz);
  if (type === BlockType.AIR) return false;

  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (const [dx, dy, dz] of dirs) {
    const nx = lx + dx;
    const ny = ly + dy;
    const nz = lz + dz;

    let neighbor;
    if (getNeighborBlock) {
      neighbor = getNeighborBlock(nx, ny, nz);
    } else {
      if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
        neighbor = BlockType.AIR;
      } else {
        neighbor = chunk.blocks[index(nx, ny, nz)];
      }
    }

    if (!isBlockSolid(neighbor) || isBlockTransparent(neighbor)) {
      return true;
    }
  }

  return false;
}

export function getChunkWorldPosition(chunk) {
  return {
    x: chunk.chunkX * CHUNK_SIZE,
    y: chunk.chunkY * CHUNK_SIZE,
    z: chunk.chunkZ * CHUNK_SIZE,
  };
}

export function getExposedFaces(chunk, getNeighborBlock) {
  const faces = [];

  const FACE_DIRS = [
    { dx: 1, dy: 0, dz: 0, nx: 1, ny: 0, nz: 0 },
    { dx: -1, dy: 0, dz: 0, nx: -1, ny: 0, nz: 0 },
    { dx: 0, dy: 1, dz: 0, nx: 0, ny: 1, nz: 0 },
    { dx: 0, dy: -1, dz: 0, nx: 0, ny: -1, nz: 0 },
    { dx: 0, dy: 0, dz: 1, nx: 0, ny: 0, nz: 1 },
    { dx: 0, dy: 0, dz: -1, nx: 0, ny: 0, nz: -1 },
  ];

  for (let y = 0; y < CHUNK_SIZE; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const blockType = chunk.blocks[index(x, y, z)];
        if (blockType === BlockType.AIR) continue;

        for (const face of FACE_DIRS) {
          const nx = x + face.dx;
          const ny = y + face.dy;
          const nz = z + face.dz;

          let neighbor;
          if (getNeighborBlock) {
            neighbor = getNeighborBlock(nx, ny, nz);
          } else {
            if (
              nx < 0 ||
              nx >= CHUNK_SIZE ||
              ny < 0 ||
              ny >= CHUNK_SIZE ||
              nz < 0 ||
              nz >= CHUNK_SIZE
            ) {
              neighbor = BlockType.AIR;
            } else {
              neighbor = chunk.blocks[index(nx, ny, nz)];
            }
          }

          if (!isBlockSolid(neighbor) || isBlockTransparent(neighbor)) {
            faces.push({
              x,
              y,
              z,
              blockType,
              normal: { x: face.nx, y: face.ny, z: face.nz },
            });
          }
        }
      }
    }
  }

  return faces;
}
