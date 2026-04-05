import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createVoxelStorage } from './voxel-storage.js';
import { BlockType } from './block-types.js';
import { CHUNK_SIZE } from './voxel-chunk.js';
import {
  voxelGroundHeight,
  voxelRaycast,
  createVoxelCollisionHeightfield,
  isOnVoxelGround,
  getVoxelSurfaceNormal,
} from './voxel-physics.js';

describe('voxel-physics', () => {
  describe('voxelGroundHeight', () => {
    it('returns highest solid block Y in a column', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      s.setBlock(5, 11, 5, BlockType.STONE);
      s.setBlock(5, 12, 5, BlockType.GRASS);
      assert.strictEqual(voxelGroundHeight(s, 5, 5), 12);
    });

    it('returns -Infinity for empty column', () => {
      const s = createVoxelStorage();
      assert.strictEqual(voxelGroundHeight(s, 3, 3), -Infinity);
    });

    it('ignores non-solid blocks', () => {
      const s = createVoxelStorage();
      s.setBlock(7, 10, 7, BlockType.WATER);
      s.setBlock(7, 8, 7, BlockType.STONE);
      assert.strictEqual(voxelGroundHeight(s, 7, 7), 8);
    });

    it('returns -Infinity for storage with no chunks', () => {
      const s = createVoxelStorage();
      assert.strictEqual(voxelGroundHeight(s, 0, 0), -Infinity);
    });
  });

  describe('voxelRaycast', () => {
    it('hits a solid block with correct normal pointing down', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      const result = voxelRaycast(s, 5.5, 20, 5.5, 0, -1, 0, 30);
      assert.strictEqual(result.hit, true);
      assert.strictEqual(result.position.x, 5);
      assert.strictEqual(result.position.y, 10);
      assert.strictEqual(result.position.z, 5);
      assert.strictEqual(result.normal.x, 0);
      assert.strictEqual(result.normal.y, 1);
      assert.strictEqual(result.normal.z, 0);
      assert.ok(result.distance >= 9 && result.distance <= 10);
    });

    it('returns correct block type on hit', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.GRASS);
      const result = voxelRaycast(s, 5.5, 20, 5.5, 0, -1, 0, 30);
      assert.strictEqual(result.blockType, BlockType.GRASS);
    });

    it('misses when no blocks in path', () => {
      const s = createVoxelStorage();
      s.setBlock(0, 0, 0, BlockType.STONE);
      const result = voxelRaycast(s, 10.5, 20, 10.5, 0, -1, 0, 30);
      assert.strictEqual(result.hit, false);
    });

    it('hits side face with correct normal', () => {
      const s = createVoxelStorage();
      s.setBlock(10, 5, 5, BlockType.STONE);
      const result = voxelRaycast(s, 8, 5.5, 5.5, 1, 0, 0, 20);
      assert.strictEqual(result.hit, true);
      assert.strictEqual(result.position.x, 10);
      assert.strictEqual(result.position.y, 5);
      assert.strictEqual(result.position.z, 5);
      assert.strictEqual(result.normal.x, -1);
      assert.strictEqual(result.normal.y, 0);
      assert.strictEqual(result.normal.z, 0);
    });

    it('respects maxDist', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 5, 5, BlockType.STONE);
      const result = voxelRaycast(s, 5.5, 20, 5.5, 0, -1, 0, 5);
      assert.strictEqual(result.hit, false);
    });

    it('returns miss for zero direction', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 5, 5, BlockType.STONE);
      const result = voxelRaycast(s, 5.5, 10, 5.5, 0, 0, 0, 20);
      assert.strictEqual(result.hit, false);
    });

    it('hits front/back face with correct Z normal', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 5, 10, BlockType.STONE);
      const result = voxelRaycast(s, 5.5, 5.5, 5, 0, 0, 1, 20);
      assert.strictEqual(result.hit, true);
      assert.strictEqual(result.normal.x, 0);
      assert.strictEqual(result.normal.y, 0);
      assert.strictEqual(result.normal.z, -1);
    });
  });

  describe('createVoxelCollisionHeightfield', () => {
    it('produces correct height array for a flat surface', () => {
      const s = createVoxelStorage();
      for (let x = 0; x <= CHUNK_SIZE; x++) {
        for (let z = 0; z <= CHUNK_SIZE; z++) {
          s.setBlock(x, 10, z, BlockType.STONE);
        }
      }
      const result = createVoxelCollisionHeightfield(s, 0, 0, 20);
      assert.strictEqual(result.data.length, CHUNK_SIZE + 1);
      assert.strictEqual(result.data[0].length, CHUNK_SIZE + 1);
      assert.strictEqual(result.elementSize, 1);
      for (let z = 0; z <= CHUNK_SIZE; z++) {
        for (let x = 0; x <= CHUNK_SIZE; x++) {
          assert.strictEqual(result.data[z][x], 11);
        }
      }
    });

    it('returns 0 for empty columns', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      const result = createVoxelCollisionHeightfield(s, 0, 0, 20);
      assert.strictEqual(result.data[0][0], 0);
      assert.strictEqual(result.data[5][5], 11);
    });

    it('handles varying heights', () => {
      const s = createVoxelStorage();
      s.setBlock(0, 5, 0, BlockType.STONE);
      s.setBlock(0, 8, 0, BlockType.STONE);
      s.setBlock(1, 3, 0, BlockType.STONE);
      const result = createVoxelCollisionHeightfield(s, 0, 0, 20);
      assert.strictEqual(result.data[0][0], 9);
      assert.strictEqual(result.data[0][1], 4);
    });
  });

  describe('isOnVoxelGround', () => {
    it('returns true when standing directly on a block', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      assert.strictEqual(isOnVoxelGround(s, 5.5, 11, 5.5), true);
    });

    it('returns true when within 1 unit above a block', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      assert.strictEqual(isOnVoxelGround(s, 5.5, 11.5, 5.5), true);
    });

    it('returns false when more than 1 unit above a block', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      assert.strictEqual(isOnVoxelGround(s, 5.5, 12.5, 5.5), false);
    });

    it('returns false when no block below', () => {
      const s = createVoxelStorage();
      assert.strictEqual(isOnVoxelGround(s, 5.5, 10, 5.5), false);
    });

    it('returns true when inside a solid block', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      assert.strictEqual(isOnVoxelGround(s, 5.5, 10.5, 5.5), true);
    });

    it('ignores non-solid blocks', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.WATER);
      assert.strictEqual(isOnVoxelGround(s, 5.5, 11, 5.5), false);
    });
  });

  describe('getVoxelSurfaceNormal', () => {
    it('returns (0,1,0) for top face of block below', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      const n = getVoxelSurfaceNormal(s, 5.5, 11, 5.5);
      assert.strictEqual(n.x, 0);
      assert.strictEqual(n.y, 1);
      assert.strictEqual(n.z, 0);
    });

    it('returns default (0,1,0) when no blocks nearby', () => {
      const s = createVoxelStorage();
      const n = getVoxelSurfaceNormal(s, 5.5, 10, 5.5);
      assert.strictEqual(n.x, 0);
      assert.strictEqual(n.y, 1);
      assert.strictEqual(n.z, 0);
    });

    it('returns side normal when next to a wall', () => {
      const s = createVoxelStorage();
      s.setBlock(6, 10, 5, BlockType.STONE);
      const n = getVoxelSurfaceNormal(s, 5.5, 10.5, 5.5);
      assert.strictEqual(n.x, -1);
      assert.strictEqual(n.y, 0);
      assert.strictEqual(n.z, 0);
    });

    it('returns (0,1,0) when inside a solid block', () => {
      const s = createVoxelStorage();
      s.setBlock(5, 10, 5, BlockType.STONE);
      const n = getVoxelSurfaceNormal(s, 5.5, 10.5, 5.5);
      assert.strictEqual(n.x, 0);
      assert.strictEqual(n.y, 1);
      assert.strictEqual(n.z, 0);
    });
  });
});
