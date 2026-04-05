import { describe, it } from "node:test";
import assert from "node:assert";
import { createVoxelStorage } from "../world/voxel-storage.js";
import { BlockType } from "../world/block-types.js";
import { CHUNK_SIZE } from "../world/voxel-chunk.js";
import {
  destroyBlock,
  placeBlock,
  destroySphere,
  destroyColumn,
  replaceBlockType,
  batchModify,
  raycastBlock,
} from "../world/voxel-modifier.js";

describe("destroyBlock", () => {
  it("removes a block and returns previous type", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    const result = destroyBlock(storage, 5, 5, 5);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.previousBlockType, BlockType.STONE);
    assert.strictEqual(storage.getBlock(5, 5, 5), BlockType.AIR);
  });

  it("returns success false for AIR block", () => {
    const storage = createVoxelStorage();
    const result = destroyBlock(storage, 0, 0, 0);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.previousBlockType, BlockType.AIR);
  });

  it("marks neighbor chunks dirty at boundaries", () => {
    const storage = createVoxelStorage();
    storage.setBlock(CHUNK_SIZE - 1, 5, 5, BlockType.STONE);
    storage.getOrCreateChunk(1, 0, 0).dirty = false;
    storage.getOrCreateChunk(0, 0, 0).dirty = false;

    destroyBlock(storage, CHUNK_SIZE - 1, 5, 5);

    assert.strictEqual(storage.getChunk(0, 0, 0).dirty, true);
    assert.strictEqual(storage.getChunk(1, 0, 0).dirty, true);
  });

  it("returns affected chunks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    const result = destroyBlock(storage, 5, 5, 5);
    assert.ok(result.affectedChunks.length >= 1);
    assert.deepStrictEqual(result.affectedChunks[0], { cx: 0, cy: 0, cz: 0 });
  });
});

describe("placeBlock", () => {
  it("places a block in AIR", () => {
    const storage = createVoxelStorage();
    const result = placeBlock(storage, 3, 3, 3, BlockType.DIRT);
    assert.strictEqual(result.success, true);
    assert.strictEqual(storage.getBlock(3, 3, 3), BlockType.DIRT);
  });

  it("fails when target is solid", () => {
    const storage = createVoxelStorage();
    storage.setBlock(2, 2, 2, BlockType.STONE);
    const result = placeBlock(storage, 2, 2, 2, BlockType.DIRT);
    assert.strictEqual(result.success, false);
    assert.strictEqual(storage.getBlock(2, 2, 2), BlockType.STONE);
  });

  it("returns affected chunks", () => {
    const storage = createVoxelStorage();
    const result = placeBlock(storage, 3, 3, 3, BlockType.DIRT);
    assert.ok(result.affectedChunks.length >= 1);
    assert.deepStrictEqual(result.affectedChunks[0], { cx: 0, cy: 0, cz: 0 });
  });
});

describe("destroySphere", () => {
  it("destroys all blocks within a sphere", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    storage.setBlock(5, 6, 5, BlockType.STONE);
    storage.setBlock(5, 7, 5, BlockType.STONE);
    storage.setBlock(5, 8, 5, BlockType.STONE);

    const result = destroySphere(storage, 5, 6, 5, 1);

    assert.strictEqual(result.destroyed, 3);
    assert.strictEqual(storage.getBlock(5, 6, 5), BlockType.AIR);
    assert.strictEqual(storage.getBlock(5, 5, 5), BlockType.AIR);
    assert.strictEqual(storage.getBlock(5, 7, 5), BlockType.AIR);
    assert.strictEqual(storage.getBlock(5, 8, 5), BlockType.STONE);
  });

  it("returns affected chunks as a Set", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);
    const result = destroySphere(storage, 5, 5, 5, 1);
    assert.ok(result.affectedChunks instanceof Set);
    assert.ok(result.affectedChunks.size >= 1);
  });
});

describe("destroyColumn", () => {
  it("destroys blocks in a column range", () => {
    const storage = createVoxelStorage();
    storage.setBlock(3, 0, 3, BlockType.STONE);
    storage.setBlock(3, 1, 3, BlockType.STONE);
    storage.setBlock(3, 2, 3, BlockType.STONE);
    storage.setBlock(3, 3, 3, BlockType.STONE);
    storage.setBlock(3, 4, 3, BlockType.STONE);

    const result = destroyColumn(storage, 3, 3, 1, 3);

    assert.strictEqual(result.destroyed, 3);
    assert.strictEqual(storage.getBlock(3, 0, 3), BlockType.STONE);
    assert.strictEqual(storage.getBlock(3, 1, 3), BlockType.AIR);
    assert.strictEqual(storage.getBlock(3, 2, 3), BlockType.AIR);
    assert.strictEqual(storage.getBlock(3, 3, 3), BlockType.AIR);
    assert.strictEqual(storage.getBlock(3, 4, 3), BlockType.STONE);
  });

  it("returns affected chunks as a Set", () => {
    const storage = createVoxelStorage();
    storage.setBlock(0, 0, 0, BlockType.STONE);
    const result = destroyColumn(storage, 0, 0, 0, 0);
    assert.ok(result.affectedChunks instanceof Set);
  });
});

describe("replaceBlockType", () => {
  it("changes block type correctly", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.RUNE_GLOW);
    const result = replaceBlockType(storage, 5, 5, 5, BlockType.CRACKED_STONE);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.previousType, BlockType.RUNE_GLOW);
    assert.strictEqual(storage.getBlock(5, 5, 5), BlockType.CRACKED_STONE);
  });

  it("returns failure for AIR block", () => {
    const storage = createVoxelStorage();
    const result = replaceBlockType(storage, 0, 0, 0, BlockType.STONE);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.previousType, BlockType.AIR);
  });
});

describe("batchModify", () => {
  it("processes multiple destroy operations", () => {
    const storage = createVoxelStorage();
    storage.setBlock(0, 0, 0, BlockType.STONE);
    storage.setBlock(1, 0, 0, BlockType.STONE);
    storage.setBlock(2, 0, 0, BlockType.STONE);

    const result = batchModify(storage, [
      { type: "destroy", x: 0, y: 0, z: 0 },
      { type: "destroy", x: 1, y: 0, z: 0 },
      { type: "destroy", x: 2, y: 0, z: 0 },
    ]);

    assert.strictEqual(result.totalAffected, 3);
    assert.strictEqual(storage.getBlock(0, 0, 0), BlockType.AIR);
    assert.strictEqual(storage.getBlock(1, 0, 0), BlockType.AIR);
    assert.strictEqual(storage.getBlock(2, 0, 0), BlockType.AIR);
  });

  it("processes place operations", () => {
    const storage = createVoxelStorage();
    const result = batchModify(storage, [
      { type: "place", x: 0, y: 0, z: 0, blockType: BlockType.DIRT },
      { type: "place", x: 1, y: 0, z: 0, blockType: BlockType.GRASS },
    ]);

    assert.strictEqual(result.totalAffected, 2);
    assert.strictEqual(storage.getBlock(0, 0, 0), BlockType.DIRT);
    assert.strictEqual(storage.getBlock(1, 0, 0), BlockType.GRASS);
  });

  it("processes replace operations", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.RUNE_GLOW);
    const result = batchModify(storage, [
      { type: "replace", x: 5, y: 5, z: 5, blockType: BlockType.CRACKED_STONE },
    ]);

    assert.strictEqual(result.totalAffected, 1);
    assert.strictEqual(storage.getBlock(5, 5, 5), BlockType.CRACKED_STONE);
  });

  it("deduplicates affected chunks", () => {
    const storage = createVoxelStorage();
    storage.setBlock(0, 0, 0, BlockType.STONE);
    storage.setBlock(1, 0, 0, BlockType.STONE);

    const result = batchModify(storage, [
      { type: "destroy", x: 0, y: 0, z: 0 },
      { type: "destroy", x: 1, y: 0, z: 0 },
    ]);

    assert.ok(result.affectedChunks instanceof Set);
    assert.strictEqual(result.totalAffected, 2);
  });
});

describe("raycastBlock", () => {
  it("hits a solid block and returns position", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);

    const result = raycastBlock(storage, 0, 5, 5, 1, 0, 0, 10);

    assert.strictEqual(result.hit, true);
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.y, 5);
    assert.strictEqual(result.position.z, 5);
    assert.strictEqual(result.blockType, BlockType.STONE);
    assert.ok(result.distance > 0);
  });

  it("misses when no blocks present", () => {
    const storage = createVoxelStorage();
    const result = raycastBlock(storage, 0, 0, 0, 1, 0, 0, 10);
    assert.strictEqual(result.hit, false);
  });

  it("returns correct normal", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);

    const result = raycastBlock(storage, 0, 5, 5, 1, 0, 0, 10);

    assert.strictEqual(result.normal.x, -1);
    assert.strictEqual(result.normal.y, 0);
    assert.strictEqual(result.normal.z, 0);
  });

  it("returns correct normal for Y axis", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);

    const result = raycastBlock(storage, 5, 0, 5, 0, 1, 0, 10);

    assert.strictEqual(result.normal.x, 0);
    assert.strictEqual(result.normal.y, -1);
    assert.strictEqual(result.normal.z, 0);
  });

  it("returns correct normal for Z axis", () => {
    const storage = createVoxelStorage();
    storage.setBlock(5, 5, 5, BlockType.STONE);

    const result = raycastBlock(storage, 5, 5, 0, 0, 0, 1, 10);

    assert.strictEqual(result.normal.x, 0);
    assert.strictEqual(result.normal.y, 0);
    assert.strictEqual(result.normal.z, -1);
  });
});
