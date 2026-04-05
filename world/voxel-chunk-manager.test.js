import { describe, it } from "node:test";
import assert from "node:assert";
import { createChunkManager } from "../world/voxel-chunk-manager.js";
import { createVoxelStorage } from "../world/voxel-storage.js";
import { BlockType } from "../world/block-types.js";

describe("voxel-chunk-manager", () => {
  it("creates chunk manager with defaults", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    assert.strictEqual(mgr.getMeshCount(), 0);
    assert.strictEqual(mgr.getDirtyQueueLength(), 0);
  });

  it("processes dirty chunks and builds mesh data", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    assert.strictEqual(mgr.getDirtyQueueLength(), 1);
    const processed = mgr.processDirtyChunks();
    assert.strictEqual(processed, 1);
    assert.strictEqual(mgr.getDirtyQueueLength(), 0);
    assert.strictEqual(mgr.getMeshCount(), 1);
    const mesh = mgr.getChunkMesh(0, 0, 0);
    assert.ok(mesh, "should have mesh data");
    assert.ok(mesh.faceCount > 0);
    assert.ok(mesh.vertexCount > 0);
  });

  it("returns null mesh for empty chunk", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.getOrCreateChunk(0, 0, 0);
    mgr.enqueueDirtyChunks();
    mgr.processDirtyChunks();
    assert.strictEqual(mgr.getMeshCount(), 0);
    assert.strictEqual(mgr.getChunkMesh(0, 0, 0), null);
  });

  it("buildMesh returns mesh data for chunk with blocks", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    mgr.processDirtyChunks();
    const meshData = mgr.getChunkMesh(0, 0, 0);
    assert.ok(meshData);
    assert.strictEqual(meshData.faceCount, 6);
    assert.strictEqual(meshData.vertexCount, 24);
  });

  it("enqueues and processes multiple dirty chunks", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage, { maxMeshUpdatesPerFrame: 2 });
    storage.setBlock(5, 5, 5, BlockType.STONE);
    storage.setBlock(20, 5, 5, BlockType.STONE);
    storage.setBlock(40, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    assert.strictEqual(mgr.getDirtyQueueLength(), 3);
    mgr.processDirtyChunks();
    assert.strictEqual(mgr.getDirtyQueueLength(), 1);
    assert.strictEqual(mgr.getMeshCount(), 2);
    mgr.processDirtyChunks();
    assert.strictEqual(mgr.getDirtyQueueLength(), 0);
    assert.strictEqual(mgr.getMeshCount(), 3);
  });

  it("getVisibleChunks filters by distance", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage, { viewDistance: 50 });
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    mgr.processDirtyChunks();
    const visible = mgr.getVisibleChunks(5, 5, 5);
    assert.strictEqual(visible.length, 1);
    const far = mgr.getVisibleChunks(1000, 1000, 1000);
    assert.strictEqual(far.length, 0);
  });

  it("getChunkMesh returns null for unknown chunk", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    assert.strictEqual(mgr.getChunkMesh(99, 99, 99), null);
  });

  it("dispose clears all meshes and queue", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    mgr.processDirtyChunks();
    assert.strictEqual(mgr.getMeshCount(), 1);
    mgr.dispose();
    assert.strictEqual(mgr.getMeshCount(), 0);
    assert.strictEqual(mgr.getDirtyQueueLength(), 0);
  });

  it("update enqueues and processes dirty chunks", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.update(0, 0, 0, 0.016);
    assert.strictEqual(mgr.getMeshCount(), 1);
    assert.strictEqual(mgr.getDirtyQueueLength(), 0);
  });

  it("does not enqueue duplicate dirty chunks", () => {
    const storage = createVoxelStorage();
    const mgr = createChunkManager(storage);
    storage.setBlock(5, 5, 5, BlockType.STONE);
    mgr.enqueueDirtyChunks();
    mgr.enqueueDirtyChunks();
    assert.strictEqual(mgr.getDirtyQueueLength(), 1);
  });
});
