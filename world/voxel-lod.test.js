import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getVoxelLODLevel,
  getLODMergeFactor,
  shouldRenderChunk,
  createLODChunkMeshData,
  getMeshBudgetInfo,
  createVoxelImpostor,
} from '../world/voxel-lod.js';
import { createChunk, setBlock, CHUNK_SIZE, getBlock } from '../world/voxel-chunk.js';
import { BlockType } from '../world/block-types.js';

describe('voxel-lod', () => {
  describe('getVoxelLODLevel', () => {
    it('returns 0 for close distance (< 50)', () => {
      assert.strictEqual(getVoxelLODLevel(0), 0);
      assert.strictEqual(getVoxelLODLevel(25), 0);
      assert.strictEqual(getVoxelLODLevel(49), 0);
    });

    it('returns 1 for medium distance (50-100)', () => {
      assert.strictEqual(getVoxelLODLevel(50), 1);
      assert.strictEqual(getVoxelLODLevel(75), 1);
      assert.strictEqual(getVoxelLODLevel(100), 1);
    });

    it('returns 2 for far distance (> 100)', () => {
      assert.strictEqual(getVoxelLODLevel(101), 2);
      assert.strictEqual(getVoxelLODLevel(200), 2);
    });
  });

  describe('getLODMergeFactor', () => {
    it('returns 1 for level 0 (no merging)', () => {
      assert.strictEqual(getLODMergeFactor(0), 1);
    });

    it('returns 2 for level 1', () => {
      assert.strictEqual(getLODMergeFactor(1), 2);
    });

    it('returns 4 for level 2', () => {
      assert.strictEqual(getLODMergeFactor(2), 4);
    });
  });

  describe('shouldRenderChunk', () => {
    it('returns true for chunk within LOD range', () => {
      const playerPos = { x: 8, y: 8, z: 8 };
      assert.strictEqual(shouldRenderChunk(0, 0, 0, playerPos, 0), true);
    });

    it('returns false for chunk beyond view distance', () => {
      const playerPos = { x: 0, y: 0, z: 0 };
      const farChunkX = 20;
      assert.strictEqual(shouldRenderChunk(farChunkX, 0, 0, playerPos, 0), false);
    });

    it('returns true for chunk at edge of range', () => {
      const playerPos = { x: 0, y: 0, z: 0 };
      const nearChunkX = 3;
      assert.strictEqual(shouldRenderChunk(nearChunkX, 0, 0, playerPos, 0), true);
    });
  });

  describe('createLODChunkMeshData', () => {
    it('returns null for empty chunk at any LOD', () => {
      const chunk = createChunk(0, 0, 0);
      assert.strictEqual(createLODChunkMeshData(chunk, 0), null);
      assert.strictEqual(createLODChunkMeshData(chunk, 1), null);
      assert.strictEqual(createLODChunkMeshData(chunk, 2), null);
    });

    it('at LOD 0 returns same mesh as normal mesher', () => {
      const chunk = createChunk(0, 0, 0);
      setBlock(chunk, 5, 5, 5, BlockType.STONE);
      const data = createLODChunkMeshData(chunk, 0);
      assert.ok(data);
      assert.strictEqual(data.faceCount, 6);
      assert.strictEqual(data.vertexCount, 24);
    });

    it('at LOD 1 has fewer faces than LOD 0', () => {
      const chunk = createChunk(0, 0, 0);
      for (let y = 4; y < 8; y++) {
        for (let z = 4; z < 8; z++) {
          for (let x = 4; x < 8; x++) {
            setBlock(chunk, x, y, z, BlockType.STONE);
          }
        }
      }
      const lod0 = createLODChunkMeshData(chunk, 0);
      const lod1 = createLODChunkMeshData(chunk, 1);
      assert.ok(lod0);
      assert.ok(lod1);
      assert.ok(lod1.faceCount < lod0.faceCount, 'LOD 1 should have fewer faces than LOD 0');
      assert.ok(lod1.vertexCount < lod0.vertexCount, 'LOD 1 should have fewer vertices than LOD 0');
    });

    it('at LOD 2 returns impostor-style minimal mesh', () => {
      const chunk = createChunk(0, 0, 0);
      for (let y = 0; y < 8; y++) {
        for (let z = 0; z < 8; z++) {
          for (let x = 0; x < 8; x++) {
            setBlock(chunk, x, y, z, BlockType.STONE);
          }
        }
      }
      const lod2 = createLODChunkMeshData(chunk, 2);
      assert.ok(lod2);
      assert.ok(lod2.faceCount > 0);
    });
  });

  describe('createVoxelImpostor', () => {
    it('returns box config with correct properties', () => {
      const chunk = createChunk(0, 0, 0);
      setBlock(chunk, 2, 3, 4, BlockType.STONE);
      const impostor = createVoxelImpostor(chunk);
      assert.ok(impostor);
      assert.strictEqual(impostor.type, 'box');
      assert.ok(impostor.width > 0);
      assert.ok(impostor.height > 0);
      assert.ok(impostor.depth > 0);
      assert.ok(Array.isArray(impostor.color));
    });

    it('returns null for empty chunk', () => {
      const chunk = createChunk(0, 0, 0);
      assert.strictEqual(createVoxelImpostor(chunk), null);
    });
  });

  describe('getMeshBudgetInfo', () => {
    it('returns triangle count estimate', () => {
      const info = getMeshBudgetInfo(10, 0);
      assert.ok(typeof info.estimatedTriangles === 'number');
      assert.ok(info.estimatedTriangles > 0);
    });

    it('higher LOD levels produce fewer estimated triangles', () => {
      const lod0 = getMeshBudgetInfo(10, 0);
      const lod2 = getMeshBudgetInfo(10, 2);
      assert.ok(lod2.estimatedTriangles < lod0.estimatedTriangles);
    });

    it('returns recommended max updates per frame', () => {
      const info = getMeshBudgetInfo(10, 0);
      assert.ok(typeof info.maxUpdatesPerFrame === 'number');
      assert.ok(info.maxUpdatesPerFrame > 0);
    });

    it('returns memory usage estimate in bytes', () => {
      const info = getMeshBudgetInfo(10, 0);
      assert.ok(typeof info.memoryEstimate === 'number');
      assert.ok(info.memoryEstimate > 0);
    });
  });
});
