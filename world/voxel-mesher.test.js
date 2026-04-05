import { describe, it } from "node:test";
import assert from "node:assert";
import { buildChunkMeshData } from "../world/voxel-mesher.js";
import { createChunk, setBlock, CHUNK_SIZE } from "../world/voxel-chunk.js";
import { BlockType } from "../world/block-types.js";

describe("voxel-mesher", () => {
  it("returns null for empty chunk", () => {
    const chunk = createChunk(0, 0, 0);
    assert.strictEqual(buildChunkMeshData(chunk), null);
  });

  it("generates mesh data for single block", () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 5, 5, 5, BlockType.STONE);
    const data = buildChunkMeshData(chunk);
    assert.ok(data, "should generate mesh data");
    assert.strictEqual(data.faceCount, 6);
    assert.strictEqual(data.vertexCount, 24);
    assert.strictEqual(data.positions.length, 72);
    assert.strictEqual(data.normals.length, 72);
    assert.strictEqual(data.colors.length, 72);
    assert.strictEqual(data.indices.length, 36);
  });

  it("mesh vertices are at correct world positions", () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 0, 0, 0, BlockType.STONE);
    const data = buildChunkMeshData(chunk);
    assert.ok(data);
    const minX = Math.min(...data.positions);
    const maxX = Math.max(...data.positions);
    assert.strictEqual(minX, 0);
    assert.strictEqual(maxX, 1);
  });

  it("generates no faces for fully surrounded block", () => {
    const chunk = createChunk(0, 0, 0);
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          setBlock(chunk, x, y, z, BlockType.STONE);
        }
      }
    }
    const getNeighbor = () => BlockType.STONE;
    const data = buildChunkMeshData(chunk, getNeighbor);
    assert.strictEqual(data, null);
  });

  it("correct color for block type", () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 5, 5, 5, BlockType.GRASS);
    const data = buildChunkMeshData(chunk);
    assert.ok(data);
    const hasGreen = [];
    const hasBrown = [];
    for (let i = 0; i < data.normals.length / 3; i++) {
      const ny = data.normals[i * 3 + 1];
      const r = data.colors[i * 3];
      const g = data.colors[i * 3 + 1];
      if (ny === 1) hasGreen.push(g > r);
      else hasBrown.push(r > g);
    }
    assert.ok(hasGreen.length > 0, "should have top faces");
    assert.ok(hasGreen.every(Boolean), "grass top face should be green dominant");
    assert.ok(hasBrown.length > 0, "should have non-top faces");
    assert.ok(hasBrown.every(Boolean), "grass side/bottom face should be brown dominant");
  });

  it("uses neighbor function for cross-chunk queries", () => {
    const chunk = createChunk(0, 0, 0);
    setBlock(chunk, 0, 5, 5, BlockType.STONE);
    const getNeighbor = (lx, _ly, _lz) => {
      if (lx === -1) return BlockType.STONE;
      return BlockType.AIR;
    };
    const data = buildChunkMeshData(chunk, getNeighbor);
    assert.ok(data);
    for (let i = 0; i < data.normals.length / 3; i++) {
      if (data.normals[i * 3] === -1) {
        assert.ok(false, "should not have -X face when neighbor is solid");
      }
    }
  });
});
