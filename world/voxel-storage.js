import { createChunk, CHUNK_SIZE, getBlock, setBlock } from './voxel-chunk.js';
import { BlockType } from './block-types.js';

export function createVoxelStorage() {
  const chunks = new Map();

  function chunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  return {
    chunks,

    getChunk(cx, cy, cz) {
      return chunks.get(chunkKey(cx, cy, cz)) || null;
    },

    getOrCreateChunk(cx, cy, cz) {
      const key = chunkKey(cx, cy, cz);
      let chunk = chunks.get(key);
      if (!chunk) {
        chunk = createChunk(cx, cy, cz);
        chunks.set(key, chunk);
      }
      return chunk;
    },

    removeChunk(cx, cy, cz) {
      const key = chunkKey(cx, cy, cz);
      const chunk = chunks.get(key);
      chunks.delete(key);
      return chunk;
    },

    getBlock(worldX, worldY, worldZ) {
      const cx = Math.floor(worldX / CHUNK_SIZE);
      const cy = Math.floor(worldY / CHUNK_SIZE);
      const cz = Math.floor(worldZ / CHUNK_SIZE);
      const chunk = chunks.get(chunkKey(cx, cy, cz));
      if (!chunk) return BlockType.AIR;

      const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

      return getBlock(chunk, lx, ly, lz);
    },

    setBlock(worldX, worldY, worldZ, blockType) {
      const cx = Math.floor(worldX / CHUNK_SIZE);
      const cy = Math.floor(worldY / CHUNK_SIZE);
      const cz = Math.floor(worldZ / CHUNK_SIZE);
      const chunk = this.getOrCreateChunk(cx, cy, cz);

      const lx = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const ly = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
      const lz = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

      setBlock(chunk, lx, ly, lz, blockType);

      if (lx === 0) {
        const neighbor = this.getChunk(cx - 1, cy, cz);
        if (neighbor) neighbor.dirty = true;
      }
      if (lx === CHUNK_SIZE - 1) {
        const neighbor = this.getChunk(cx + 1, cy, cz);
        if (neighbor) neighbor.dirty = true;
      }
      if (ly === 0) {
        const neighbor = this.getChunk(cx, cy - 1, cz);
        if (neighbor) neighbor.dirty = true;
      }
      if (ly === CHUNK_SIZE - 1) {
        const neighbor = this.getChunk(cx, cy + 1, cz);
        if (neighbor) neighbor.dirty = true;
      }
      if (lz === 0) {
        const neighbor = this.getChunk(cx, cy, cz - 1);
        if (neighbor) neighbor.dirty = true;
      }
      if (lz === CHUNK_SIZE - 1) {
        const neighbor = this.getChunk(cx, cy, cz + 1);
        if (neighbor) neighbor.dirty = true;
      }
    },

    getDirtyChunks() {
      const dirty = [];
      for (const chunk of chunks.values()) {
        if (chunk.dirty) dirty.push(chunk);
      }
      return dirty;
    },

    getChunkCount() {
      return chunks.size;
    },

    forEachChunk(callback) {
      for (const chunk of chunks.values()) {
        callback(chunk);
      }
    },
  };
}
