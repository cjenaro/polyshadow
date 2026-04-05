import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createChunk, getBlock, setBlock, fillChunk, isChunkEmpty, CHUNK_SIZE, getChunkWorldPosition, getExposedFaces } from '../world/voxel-chunk.js';
import { BlockType } from '../world/block-types.js';

describe('voxel-chunk', () => {
  it('creates a chunk with all AIR blocks', () => {
    const chunk = createChunk(0, 0, 0);
    assert.strictEqual(isChunkEmpty(chunk), true);
    assert.strictEqual(chunk.chunkX, 0);
    assert.strictEqual(chunk.chunkY, 0);
    assert.strictEqual(chunk.chunkZ, 0);
    assert.strictEqual(chunk.dirty, true);
  });

  it('sets and gets a block', () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 5, 5, 5, BlockType.STONE);
    assert.strictEqual(getBlock(chunk, 5, 5, 5), BlockType.STONE);
    assert.strictEqual(chunk.dirty, true);
  });

  it('returns AIR for out-of-bounds getBlock', () => {
    const chunk = createChunk(0, 0, 0);
    assert.strictEqual(getBlock(chunk, -1, 0, 0), BlockType.AIR);
    assert.strictEqual(getBlock(chunk, CHUNK_SIZE, 0, 0), BlockType.AIR);
    assert.strictEqual(getBlock(chunk, 0, -1, 0), BlockType.AIR);
  });

  it('fillChunk sets all blocks', () => {
    const chunk = createChunk(0, 0, 0);
    fillChunk(chunk, BlockType.STONE);
    assert.strictEqual(getBlock(chunk, 0, 0, 0), BlockType.STONE);
    assert.strictEqual(getBlock(chunk, CHUNK_SIZE - 1, CHUNK_SIZE - 1, CHUNK_SIZE - 1), BlockType.STONE);
    assert.strictEqual(isChunkEmpty(chunk), false);
  });

  it('out-of-bounds setBlock is no-op', () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, -1, 0, 0, BlockType.STONE);
    assert.strictEqual(getBlock(chunk, 0, 0, 0), BlockType.AIR);
  });

  it('getChunkWorldPosition returns correct position', () => {
    const chunk = createChunk(2, 3, 4);
    const pos = getChunkWorldPosition(chunk);
    assert.strictEqual(pos.x, 2 * CHUNK_SIZE);
    assert.strictEqual(pos.y, 3 * CHUNK_SIZE);
    assert.strictEqual(pos.z, 4 * CHUNK_SIZE);
  });

  it('getExposedFaces finds exposed faces', () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 5, 5, 5, BlockType.STONE);
    const faces = getExposedFaces(chunk);
    assert.strictEqual(faces.length, 6);
  });

  it('fully surrounded block has no exposed faces', () => {
    const chunk = createChunk(0, 0, 0);
    fillChunk(chunk, BlockType.STONE);
    setBlock(chunk, 5, 5, 5, BlockType.STONE);
    const getNeighbor = () => BlockType.STONE;
    const faces = getExposedFaces(chunk, getNeighbor);
    assert.strictEqual(faces.length, 0);
  });

  it('exposed face is adjacent to AIR', () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 5, 5, 5, BlockType.STONE);
    setBlock(chunk, 6, 5, 5, BlockType.AIR);
    const faces = getExposedFaces(chunk);
    const hasPX = faces.some(f => f.x === 5 && f.y === 5 && f.z === 5 && f.normal.x === 1);
    assert.ok(hasPX, 'should have +X exposed face');
  });
});
