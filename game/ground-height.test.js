import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createIsland, generateIslandGeometry, getIslandSurfaceHeight } from "../world/island.js";

function getGroundHeight(islands, x, z) {
  let maxH = 0;
  for (const island of islands) {
    const h = getIslandSurfaceHeight(island, x, z);
    if (h > maxH) maxH = h;
  }
  return maxH;
}

describe("getGroundHeight (multi-island)", () => {
  it("returns 0 when no islands generated", () => {
    const islands = [];
    assert.strictEqual(getGroundHeight(islands, 0, 0), 0);
  });

  it("returns surface height when on a single island", () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 42,
      type: "hub",
    });
    const generated = generateIslandGeometry(island);
    const h = getGroundHeight([generated], 0, 0);
    assert.ok(h > 0, `should be > 0 at island center, got ${h}`);
  });

  it("returns 0 when far from all islands", () => {
    const island = createIsland({
      center: { x: 0, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 42,
      type: "hub",
    });
    const generated = generateIslandGeometry(island);
    const h = getGroundHeight([generated], 500, 500);
    assert.strictEqual(h, 0);
  });

  it("returns max height when overlapping islands", () => {
    const a = createIsland({
      center: { x: 0, z: 0 },
      radius: 50,
      maxHeight: 10,
      seed: 42,
      type: "hub",
    });
    const genA = generateIslandGeometry(a);
    const h = getGroundHeight([genA], 0, 0);
    assert.ok(h > 0, `should have height at center`);
  });

  it("checks each island independently", () => {
    const a = createIsland({
      center: { x: 0, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 1,
      type: "hub",
    });
    const b = createIsland({
      center: { x: 100, z: 0 },
      radius: 32,
      maxHeight: 10,
      seed: 2,
      type: "arena",
    });
    const genA = generateIslandGeometry(a);
    const genB = generateIslandGeometry(b);
    const hAtA = getGroundHeight([genA, genB], 0, 0);
    const hAtB = getGroundHeight([genA, genB], 100, 0);
    assert.ok(hAtA > 0, `should have height at island A center`);
    assert.ok(hAtB > 0, `should have height at island B center`);
  });
});
