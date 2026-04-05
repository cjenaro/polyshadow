import { CHUNK_SIZE, isChunkEmpty, getChunkWorldPosition, forEachBlock } from "./voxel-chunk.js";
import { buildChunkMeshData } from "./voxel-mesher.js";
import { BlockType, getBlockColor, isBlockSolid } from "./block-types.js";

const LOD_THRESHOLDS = [50, 100];
const VIEW_DISTANCE = 128;

export function getVoxelLODLevel(distance) {
  if (distance < LOD_THRESHOLDS[0]) return 0;
  if (distance <= LOD_THRESHOLDS[1]) return 1;
  return 2;
}

export function getLODMergeFactor(level) {
  if (level <= 0) return 1;
  if (level === 1) return 2;
  return 4;
}

function chunkCenterDist(cx, cy, cz, playerPos) {
  const wx = (cx + 0.5) * CHUNK_SIZE;
  const wy = (cy + 0.5) * CHUNK_SIZE;
  const wz = (cz + 0.5) * CHUNK_SIZE;
  const dx = wx - playerPos.x;
  const dy = wy - playerPos.y;
  const dz = wz - playerPos.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function shouldRenderChunk(cx, cy, cz, playerPos, lodLevel) {
  const dist = chunkCenterDist(cx, cy, cz, playerPos);
  return dist <= VIEW_DISTANCE;
}

function computeBounds(chunk) {
  let minX = CHUNK_SIZE,
    minY = CHUNK_SIZE,
    minZ = CHUNK_SIZE;
  let maxX = -1,
    maxY = -1,
    maxZ = -1;

  forEachBlock(chunk, (x, y, z) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  });

  if (maxX < 0) return null;
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

function getMostCommonBlock(chunk) {
  const counts = new Map();
  forEachBlock(chunk, (x, y, z, bt) => {
    counts.set(bt, (counts.get(bt) || 0) + 1);
  });
  let best = BlockType.STONE;
  let bestCount = 0;
  for (const [bt, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = bt;
    }
  }
  return best;
}

function isSuperBlockSolid(chunk, x, y, z, size) {
  for (let dy = 0; dy < size; dy++) {
    for (let dz = 0; dz < size; dz++) {
      for (let dx = 0; dx < size; dx++) {
        if (x + dx < CHUNK_SIZE && y + dy < CHUNK_SIZE && z + dz < CHUNK_SIZE) {
          const bt =
            chunk.blocks[(y + dy) * CHUNK_SIZE * CHUNK_SIZE + (z + dz) * CHUNK_SIZE + (x + dx)];
          if (isBlockSolid(bt)) return true;
        }
      }
    }
  }
  return false;
}

function buildMergedMesh(chunk, mergeSize) {
  const origin = getChunkWorldPosition(chunk);
  const step = mergeSize;
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  const emissives = [];
  let vertexCount = 0;

  const superSize = mergeSize;
  const FACE_DIRS = [
    { dx: 1, dy: 0, dz: 0, nx: 1, ny: 0, nz: 0 },
    { dx: -1, dy: 0, dz: 0, nx: -1, ny: 0, nz: 0 },
    { dx: 0, dy: 1, dz: 0, nx: 0, ny: 1, nz: 0 },
    { dx: 0, dy: -1, dz: 0, nx: 0, ny: -1, nz: 0 },
    { dx: 0, dy: 0, dz: 1, nx: 0, ny: 0, nz: 1 },
    { dx: 0, dy: 0, dz: -1, nx: 0, ny: 0, nz: -1 },
  ];

  const FACE_VERTICES = {
    px: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    nx: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    py: [
      [0, 1, 0],
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
    ny: [
      [0, 0, 1],
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
    ],
    pz: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
    nz: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  };

  const FACE_INDICES = [0, 1, 2, 0, 2, 3];

  function faceKey(nx, ny, nz) {
    if (nx === 1) return "px";
    if (nx === -1) return "nx";
    if (ny === 1) return "py";
    if (ny === -1) return "ny";
    if (nz === 1) return "pz";
    return "nz";
  }

  for (let y = 0; y < CHUNK_SIZE; y += step) {
    for (let z = 0; z < CHUNK_SIZE; z += step) {
      for (let x = 0; x < CHUNK_SIZE; x += step) {
        if (!isSuperBlockSolid(chunk, x, y, z, step)) continue;

        const blockCounts = new Map();
        for (let dy = 0; dy < step && y + dy < CHUNK_SIZE; dy++) {
          for (let dz = 0; dz < step && z + dz < CHUNK_SIZE; dz++) {
            for (let dx = 0; dx < step && x + dx < CHUNK_SIZE; dx++) {
              const bt =
                chunk.blocks[(y + dy) * CHUNK_SIZE * CHUNK_SIZE + (z + dz) * CHUNK_SIZE + (x + dx)];
              if (bt !== BlockType.AIR) {
                blockCounts.set(bt, (blockCounts.get(bt) || 0) + 1);
              }
            }
          }
        }

        let repType = BlockType.STONE;
        let bestCount = 0;
        for (const [bt, count] of blockCounts) {
          if (count > bestCount) {
            bestCount = count;
            repType = bt;
          }
        }

        const baseColor = getBlockColor(repType) || [0.5, 0.5, 0.5];

        for (const face of FACE_DIRS) {
          const adjX = x + face.dx * step;
          const adjY = y + face.dy * step;
          const adjZ = z + face.dz * step;
          let neighborSolid = false;

          if (
            adjX >= 0 &&
            adjX < CHUNK_SIZE &&
            adjY >= 0 &&
            adjY < CHUNK_SIZE &&
            adjZ >= 0 &&
            adjZ < CHUNK_SIZE
          ) {
            neighborSolid = isSuperBlockSolid(chunk, adjX, adjY, adjZ, step);
          }

          if (neighborSolid) continue;

          const fk = faceKey(face.nx, face.ny, face.nz);
          const verts = FACE_VERTICES[fk];
          const s = step;

          for (let i = 0; i < 4; i++) {
            positions.push(
              origin.x + x + verts[i][0] * s,
              origin.y + y + verts[i][1] * s,
              origin.z + z + verts[i][2] * s,
            );
            normals.push(face.nx, face.ny, face.nz);
            colors.push(baseColor[0], baseColor[1], baseColor[2]);
            emissives.push(0, 0, 0);
          }

          for (const idx of FACE_INDICES) {
            indices.push(vertexCount + idx);
          }
          vertexCount += 4;
        }
      }
    }
  }

  if (vertexCount === 0) return null;

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    emissives: new Float32Array(emissives),
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: vertexCount / 4,
  };
}

export function createLODChunkMeshData(chunk, lodLevel, getNeighborBlock) {
  if (isChunkEmpty(chunk)) return null;

  if (lodLevel <= 0) {
    return buildChunkMeshData(chunk, getNeighborBlock);
  }

  if (lodLevel === 1) {
    return buildMergedMesh(chunk, 2);
  }

  const bounds = computeBounds(chunk);
  if (!bounds) return null;

  const origin = getChunkWorldPosition(chunk);
  const repType = getMostCommonBlock(chunk);
  const baseColor = getBlockColor(repType) || [0.5, 0.5, 0.5];

  const x0 = origin.x + bounds.minX;
  const y0 = origin.y + bounds.minY;
  const z0 = origin.z + bounds.minZ;
  const x1 = origin.x + bounds.maxX + 1;
  const y1 = origin.y + bounds.maxY + 1;
  const z1 = origin.z + bounds.maxZ + 1;

  const sides = [
    {
      verts: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1],
      ],
      norm: [0, 0, -1],
      quad: [0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1],
    },
    {
      verts: [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],
      norm: [0, 0, 1],
      quad: [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
    },
    {
      verts: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
      ],
      norm: [-1, 0, 0],
      quad: [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0],
    },
    {
      verts: [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],
      norm: [1, 0, 0],
      quad: [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1],
    },
    {
      verts: [
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0],
      ],
      norm: [0, -1, 0],
      quad: [0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0],
    },
    {
      verts: [
        [0, 1, 0],
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
      norm: [0, 1, 0],
      quad: [0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
    },
  ];

  const FACE_IDX = [0, 1, 2, 0, 2, 3];
  const pos = [];
  const norm = [];
  const col = [];
  const emi = [];
  let vertexCount = 0;

  for (const side of sides) {
    for (let i = 0; i < 4; i++) {
      pos.push(
        x0 + side.quad[i * 3] * (x1 - x0),
        y0 + side.quad[i * 3 + 1] * (y1 - y0),
        z0 + side.quad[i * 3 + 2] * (z1 - z0),
      );
      norm.push(side.norm[0], side.norm[1], side.norm[2]);
      col.push(baseColor[0], baseColor[1], baseColor[2]);
      emi.push(0, 0, 0);
    }
    vertexCount += 4;
  }

  const indices = new Uint32Array(
    Array.from({ length: 6 * sides.length }, (_, i) => {
      const faceIdx = Math.floor(i / 6);
      const localIdx = i % 6;
      return faceIdx * 4 + FACE_IDX[localIdx];
    }),
  );

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(norm),
    colors: new Float32Array(col),
    emissives: new Float32Array(emi),
    indices,
    vertexCount: sides.length * 4,
    faceCount: sides.length,
  };
}

export function createVoxelImpostor(chunk) {
  const bounds = computeBounds(chunk);
  if (!bounds) return null;

  const repType = getMostCommonBlock(chunk);
  const color = getBlockColor(repType) || [0.5, 0.5, 0.5];

  return {
    type: "box",
    width: bounds.maxX - bounds.minX + 1,
    height: bounds.maxY - bounds.minY + 1,
    depth: bounds.maxZ - bounds.minZ + 1,
    color,
  };
}

export function getMeshBudgetInfo(chunkCount, lodLevel) {
  const avgFacesPerChunk = [800, 200, 12][lodLevel] || 800;
  const trianglesPerFace = 2;
  const estimatedTriangles = chunkCount * avgFacesPerChunk * trianglesPerFace;

  const maxUpdatesPerFrame = [4, 6, 8][lodLevel] || 4;

  const bytesPerVertex = 3 * 4 + 3 * 4 + 3 * 4 + 3 * 4;
  const verticesPerFace = 4;
  const indexBytesPerFace = 6 * 4;
  const memoryEstimate =
    chunkCount * avgFacesPerChunk * (bytesPerVertex * verticesPerFace + indexBytesPerFace);

  return {
    estimatedTriangles,
    maxUpdatesPerFrame,
    memoryEstimate,
  };
}
