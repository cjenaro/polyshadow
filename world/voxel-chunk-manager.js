import { CHUNK_SIZE } from "./voxel-chunk.js";
import { buildChunkMeshData } from "./voxel-mesher.js";
import { isChunkEmpty } from "./voxel-chunk.js";

export function createChunkManager(voxelStorage, opts = {}) {
  const viewDistance = opts.viewDistance ?? 128;
  const maxMeshUpdatesPerFrame = opts.maxMeshUpdatesPerFrame ?? 4;
  const chunkMeshes = new Map();
  const dirtyQueue = [];
  let meshGroup = opts.meshGroup ?? null;

  function chunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  function getNeighborBlock(chunk, lx, ly, lz) {
    const worldX = chunk.chunkX * CHUNK_SIZE + lx;
    const worldY = chunk.chunkY * CHUNK_SIZE + ly;
    const worldZ = chunk.chunkZ * CHUNK_SIZE + lz;
    return voxelStorage.getBlock(worldX, worldY, worldZ);
  }

  function buildMesh(chunk) {
    if (isChunkEmpty(chunk)) return null;
    return buildChunkMeshData(chunk, (lx, ly, lz) => getNeighborBlock(chunk, lx, ly, lz));
  }

  function enqueueDirtyChunks() {
    const dirty = voxelStorage.getDirtyChunks();
    for (const chunk of dirty) {
      const key = chunkKey(chunk.chunkX, chunk.chunkY, chunk.chunkZ);
      if (!dirtyQueue.includes(key)) {
        dirtyQueue.push(key);
      }
    }
  }

  function processDirtyChunks(limit) {
    const count = limit ?? maxMeshUpdatesPerFrame;
    let processed = 0;

    while (dirtyQueue.length > 0 && processed < count) {
      const key = dirtyQueue.shift();
      const [cx, cy, cz] = key.split(",").map(Number);
      const chunk = voxelStorage.getChunk(cx, cy, cz);
      if (!chunk) continue;

      const oldMesh = chunkMeshes.get(key);
      if (oldMesh && meshGroup) {
        meshGroup.remove(oldMesh);
      }

      const meshData = buildMesh(chunk);
      if (meshData) {
        chunk.dirty = false;
        if (meshGroup && meshGroup._createMesh) {
          const mesh = meshGroup._createMesh(meshData, cx, cy, cz);
          chunkMeshes.set(key, mesh);
          meshGroup.add(mesh);
        } else {
          chunk.dirty = false;
          chunkMeshes.set(key, meshData);
        }
      } else {
        chunk.dirty = false;
        chunkMeshes.delete(key);
      }
      processed++;
    }

    return processed;
  }

  function update(centerX, centerY, centerZ, dt) {
    enqueueDirtyChunks();
    processDirtyChunks();
  }

  function getVisibleChunks(centerX, centerY, centerZ) {
    const visible = [];
    for (const chunk of chunkMeshes.keys()) {
      const [cx, cy, cz] = chunk.split(",").map(Number);
      const wx = (cx + 0.5) * CHUNK_SIZE;
      const wy = (cy + 0.5) * CHUNK_SIZE;
      const wz = (cz + 0.5) * CHUNK_SIZE;
      const dx = wx - centerX;
      const dy = wy - centerY;
      const dz = wz - centerZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist <= viewDistance) {
        visible.push({ cx, cy, cz, distance: dist });
      }
    }
    return visible;
  }

  function getChunkMesh(cx, cy, cz) {
    return chunkMeshes.get(chunkKey(cx, cy, cz)) ?? null;
  }

  function getDirtyQueueLength() {
    return dirtyQueue.length;
  }

  function getMeshCount() {
    return chunkMeshes.size;
  }

  function setMeshGroup(group) {
    meshGroup = group;
  }

  function dispose() {
    if (meshGroup) {
      for (const mesh of chunkMeshes.values()) {
        if (mesh.geometry) meshGroup.remove(mesh);
      }
    }
    chunkMeshes.clear();
    dirtyQueue.length = 0;
  }

  return {
    update,
    processDirtyChunks,
    getVisibleChunks,
    getChunkMesh,
    getDirtyQueueLength,
    getMeshCount,
    setMeshGroup,
    dispose,
    buildMesh,
    enqueueDirtyChunks,
  };
}
