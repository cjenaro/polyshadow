import { describe, it } from "node:test";
import assert from "node:assert";
import {
  BlockType,
  isBlockSolid,
  isBlockTransparent,
  getBlockColor,
  getBlockEmissive,
  BLOCK_PROPERTIES,
} from "../world/block-types.js";

describe("block-types", () => {
  it("AIR is not solid and transparent", () => {
    assert.strictEqual(isBlockSolid(BlockType.AIR), false);
    assert.strictEqual(isBlockTransparent(BlockType.AIR), true);
  });

  it("DIRT is solid and opaque", () => {
    assert.strictEqual(isBlockSolid(BlockType.DIRT), true);
    assert.strictEqual(isBlockTransparent(BlockType.DIRT), false);
  });

  it("GRASS is solid and opaque", () => {
    assert.strictEqual(isBlockSolid(BlockType.GRASS), true);
    assert.strictEqual(isBlockTransparent(BlockType.GRASS), false);
  });

  it("WATER is not solid and transparent", () => {
    assert.strictEqual(isBlockSolid(BlockType.WATER), false);
    assert.strictEqual(isBlockTransparent(BlockType.WATER), true);
  });

  it("RUNE_GLOW has emissive color", () => {
    const emissive = getBlockEmissive(BlockType.RUNE_GLOW);
    assert.ok(
      emissive[0] > 0 || emissive[1] > 0 || emissive[2] > 0,
      "rune glow should have emissive",
    );
  });

  it("all block types have defined properties", () => {
    for (const type of Object.values(BlockType)) {
      if (type === BlockType.AIR) continue;
      assert.ok(BLOCK_PROPERTIES[type], `block type ${type} should have properties`);
      assert.ok(getBlockColor(type), `block type ${type} should have color`);
    }
  });
});
