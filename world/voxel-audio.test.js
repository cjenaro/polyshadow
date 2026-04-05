import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BlockType } from "./block-types.js";
import { getBlockFootstepSound, getBlockBreakSound, getBlockPlaceSound } from "./voxel-audio.js";

function assertValidParams(params) {
  assert.ok(typeof params.frequency === "number", "frequency must be a number");
  assert.ok(typeof params.duration === "number", "duration must be a number");
  assert.ok(typeof params.type === "string", "type must be a string");
  assert.ok(typeof params.volume === "number", "volume must be a number");
  assert.ok(params.frequency > 0, "frequency must be positive");
  assert.ok(params.duration > 0, "duration must be positive");
  assert.ok(params.volume > 0, "volume must be positive");
}

describe("getBlockFootstepSound", () => {
  it("returns valid sound params for GRASS", () => {
    const params = getBlockFootstepSound(BlockType.GRASS);
    assertValidParams(params);
    assert.equal(params.type, "sine");
  });

  it("returns valid sound params for STONE", () => {
    const params = getBlockFootstepSound(BlockType.STONE);
    assertValidParams(params);
    assert.equal(params.type, "square");
  });

  it("GRASS has lower frequency than STONE", () => {
    const grass = getBlockFootstepSound(BlockType.GRASS);
    const stone = getBlockFootstepSound(BlockType.STONE);
    assert.ok(grass.frequency < stone.frequency, "GRASS frequency should be lower than STONE");
  });

  it("returns STONE-like params for unknown block type", () => {
    const params = getBlockFootstepSound(999);
    assertValidParams(params);
    assert.equal(params.type, "square");
  });
});

describe("getBlockBreakSound", () => {
  it("returns short duration", () => {
    const params = getBlockBreakSound(BlockType.STONE);
    assert.ok(params.duration < 0.2, "break sound should be short");
    assertValidParams(params);
  });

  it("STONE has higher frequency than DIRT", () => {
    const stone = getBlockBreakSound(BlockType.STONE);
    const dirt = getBlockBreakSound(BlockType.DIRT);
    assert.ok(stone.frequency > dirt.frequency, "STONE break should be higher pitch than DIRT");
  });
});

describe("getBlockPlaceSound", () => {
  it("returns very short duration", () => {
    const params = getBlockPlaceSound(BlockType.STONE);
    assert.ok(params.duration < 0.1, "place sound should be very short");
    assertValidParams(params);
  });
});
