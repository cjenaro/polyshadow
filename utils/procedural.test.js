import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateHeightMap, generateIslandShape, generateGrassPatches } from "./procedural.js";

describe("generateHeightMap", () => {
  it("returns correct size array", () => {
    const map = generateHeightMap(32, 16, 0.05, 42);
    assert.equal(map.length, 32 * 16);
    assert.ok(map instanceof Float32Array);
  });

  it("is deterministic (same seed = same output)", () => {
    const a = generateHeightMap(64, 64, 0.1, 123);
    const b = generateHeightMap(64, 64, 0.1, 123);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.equal(a[i], b[i], `mismatch at index ${i}: ${a[i]} vs ${b[i]}`);
    }
  });

  it("different seeds produce different maps", () => {
    const a = generateHeightMap(64, 64, 0.1, 1);
    const b = generateHeightMap(64, 64, 0.1, 2);
    let diff = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        diff = true;
        break;
      }
    }
    assert.ok(diff, "different seeds produced identical maps");
  });
});

describe("generateIslandShape", () => {
  it("returns correct structure", () => {
    const island = generateIslandShape(32, 10, 42);
    assert.ok(island.heights instanceof Float32Array);
    assert.ok(typeof island.size === "number");
    assert.ok(typeof island.radius === "number");
    assert.equal(island.size, island.heights.length);
    assert.equal(island.radius, 32);
  });

  it("center is higher than edges (radial falloff)", () => {
    const island = generateIslandShape(32, 10, 42);
    const side = Math.ceil(Math.sqrt(island.size));
    const center = island.heights[Math.floor(side / 2) * side + Math.floor(side / 2)];
    const corner = island.heights[0];
    assert.ok(center > corner, `center (${center}) should be higher than corner (${corner})`);
  });

  it("is deterministic", () => {
    const a = generateIslandShape(16, 5, 99);
    const b = generateIslandShape(16, 5, 99);
    assert.equal(a.heights.length, b.heights.length);
    for (let i = 0; i < a.heights.length; i++) {
      assert.equal(a.heights[i], b.heights[i]);
    }
    assert.equal(a.size, b.size);
    assert.equal(a.radius, b.radius);
  });
});

describe("generateGrassPatches", () => {
  it("returns array of grass objects with x, y, z, scale", () => {
    const island = generateIslandShape(32, 10, 42);
    const grass = generateGrassPatches(island, 200);
    assert.ok(Array.isArray(grass));
    for (const g of grass) {
      assert.ok(typeof g.x === "number");
      assert.ok(typeof g.y === "number");
      assert.ok(typeof g.z === "number");
      assert.ok(typeof g.scale === "number");
      assert.ok(g.scale > 0, `scale should be positive, got ${g.scale}`);
    }
  });

  it("grass positions are within island bounds", () => {
    const radius = 32;
    const island = generateIslandShape(radius, 10, 42);
    const side = island.side;
    const grass = generateGrassPatches(island, 500);
    for (const g of grass) {
      assert.ok(g.x >= 0 && g.x < side, `grass x=${g.x} outside island (side=${side})`);
      assert.ok(g.z >= 0 && g.z < side, `grass z=${g.z} outside island (side=${side})`);
    }
  });

  it("density parameter affects output count", () => {
    const island = generateIslandShape(32, 10, 42);
    const low = generateGrassPatches(island, 10);
    const high = generateGrassPatches(island, 500);
    assert.ok(high.length > low.length, `high=${high.length}, low=${low.length}`);
  });
});
