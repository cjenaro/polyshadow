import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateNormalMapData } from "./normal-map.js";

describe("generateNormalMapData", () => {
  it("returns correct size array", () => {
    const result = generateNormalMapData(64, 64, 0.05, 42);
    assert.equal(result.data.length, 64 * 64 * 4);
    assert.equal(result.width, 64);
    assert.equal(result.height, 64);
    assert.ok(result.data instanceof Uint8ClampedArray);
  });

  it("is deterministic (same seed = same output)", () => {
    const a = generateNormalMapData(32, 32, 0.1, 123);
    const b = generateNormalMapData(32, 32, 0.1, 123);
    assert.equal(a.data.length, b.data.length);
    for (let i = 0; i < a.data.length; i++) {
      assert.equal(a.data[i], b.data[i], `mismatch at index ${i}: ${a.data[i]} vs ${b.data[i]}`);
    }
  });

  it("different seeds produce different maps", () => {
    const a = generateNormalMapData(32, 32, 0.1, 1);
    const b = generateNormalMapData(32, 32, 0.1, 2);
    let diff = false;
    for (let i = 0; i < a.data.length; i++) {
      if (a.data[i] !== b.data[i]) {
        diff = true;
        break;
      }
    }
    assert.ok(diff, "different seeds produced identical maps");
  });

  it("all alpha values are 255", () => {
    const result = generateNormalMapData(32, 32, 0.1, 42);
    for (let i = 3; i < result.data.length; i += 4) {
      assert.equal(result.data[i], 255, `alpha at index ${i} should be 255`);
    }
  });

  it("flat surface has blue-dominant normal (bump facing up)", () => {
    const result = generateNormalMapData(4, 4, 0.001, 42);
    let totalR = 0,
      totalG = 0,
      totalB = 0;
    const n = 4 * 4;
    for (let i = 0; i < n; i++) {
      totalR += result.data[i * 4];
      totalG += result.data[i * 4 + 1];
      totalB += result.data[i * 4 + 2];
    }
    const avgB = totalB / n;
    assert.ok(avgB > 200, `blue channel should be high for flat surface, got ${avgB}`);
    assert.ok(avgB > totalR / n, `blue should be > red for flat surface`);
    assert.ok(avgB > totalG / n, `blue should be > green for flat surface`);
  });

  it("higher scale produces more bump variation", () => {
    const low = generateNormalMapData(32, 32, 0.01, 42);
    const high = generateNormalMapData(32, 32, 0.5, 42);
    let lowDeviation = 0;
    let highDeviation = 0;
    const n = 32 * 32;
    for (let i = 0; i < n; i++) {
      lowDeviation += Math.abs(low.data[i * 4 + 2] - 255);
      highDeviation += Math.abs(high.data[i * 4 + 2] - 255);
    }
    assert.ok(
      highDeviation > lowDeviation,
      `higher scale should produce more bump variation: high=${highDeviation}, low=${lowDeviation}`,
    );
  });

  it("non-square textures work correctly", () => {
    const result = generateNormalMapData(16, 32, 0.1, 42);
    assert.equal(result.width, 16);
    assert.equal(result.height, 32);
    assert.equal(result.data.length, 16 * 32 * 4);
  });

  it("1x1 texture produces flat normal", () => {
    const result = generateNormalMapData(1, 1, 0.1, 42);
    assert.equal(result.data.length, 4);
    assert.equal(result.data[0], 128, "R should be 128 for flat normal");
    assert.equal(result.data[1], 128, "G should be 128 for flat normal");
    assert.equal(result.data[2], 255, "B should be 255 for flat normal");
    assert.equal(result.data[3], 255, "A should be 255");
  });
});
