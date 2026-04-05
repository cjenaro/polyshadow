import { describe, it } from "node:test";
import assert from "node:assert";
import { createVoxelStorage } from "../world/voxel-storage.js";
import { BlockType } from "../world/block-types.js";
import { CHUNK_SIZE } from "../world/voxel-chunk.js";

describe("voxel-storage", () => {
  it("returns AIR for unset blocks", () => {
    const storage = createVoxelStorage();
    assert.strictEqual(storage.getBlock(0, 0, 0), BlockType.AIR);
  });

  it("sets and gets world-space blocks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    assert.strictEqual(storage.getBlock(5, 5, 5), BlockType.STONE);
  });

  it("creates chunks on demand", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    assert.strictEqual(storage.getChunkCount(), 1);
  });

  it("handles negative coordinates", () => {
    const storage = createVoxelStorage();
    storage.setBlock(-3, -3, -3, BlockType.DIRT);
    assert.strictEqual(storage.getBlock(-3, -3, -3), BlockType.DIRT);
  });

  it("cross-chunk block access works", () => {
    const storage = createVoxelStorage();
    const edge = CHUNK_SIZE - 1;
    storage.setBlock(edge, 0, 0, BlockType.STONE);
    storage.setBlock(edge + 1, 0, 0, BlockType.GRASS);
    assert.strictEqual(storage.getBlock(edge, 0, 0), BlockType.STONE);
    assert.strictEqual(storage.getBlock(edge + 1, 0, 0), BlockType.GRASS);
    assert.strictEqual(storage.getChunkCount(), 2);
  });

  it("marks neighbor chunks dirty on boundary edit", () => {
    const storage = createVoxelStorage();
    const edge = CHUNK_SIZE - 1;
    storage.setBlock(edge, 0, 0, BlockType.STONE);
    const chunk0 = storage.getChunk(0, 0, 0);
    chunk0.dirty = false;
    storage.setBlock(edge + 1, 0, 0, BlockType.GRASS);
    assert.strictEqual(chunk0.dirty, true);
  });

  it("removes chunks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    assert.strictEqual(storage.getChunkCount(), 1);
    storage.removeChunk(0, 0, 0);
    assert.strictEqual(storage.getChunkCount(), 0);
  });

  it("returns dirty chunks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    const dirty = storage.getDirtyChunks();
    assert.ok(dirty.length > 0);
  });

  it("forEachChunk iterates all chunks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    storage.setBlock(CHUNK_SIZE + 5, 5, 5, BlockType.DIRT);
    let count = 0;
    storage.forEachChunk(() => count++);
    assert.strictEqual(count, 2);
  });
});
