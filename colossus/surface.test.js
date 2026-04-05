import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSentinelDefinition, generateSentinelSurfacePatches } from "./sentinel.js";
import { getPatchesPerPart, getPatchCoverageStats, validateSurfacePatches } from "./surface.js";

describe("getPatchesPerPart", () => {
  it("groups patches by bodyPartId", () => {
    const patches = [
      { bodyPartId: "torso", position: { x: 0, y: 1, z: 0 } },
      { bodyPartId: "torso", position: { x: 1, y: 1, z: 0 } },
      { bodyPartId: "hips", position: { x: 0, y: 0, z: 0 } },
    ];
    const grouped = getPatchesPerPart(patches);
    assert.strictEqual(grouped.get("torso").length, 2);
    assert.strictEqual(grouped.get("hips").length, 1);
    assert.strictEqual(grouped.has("head"), false);
  });

  it("returns empty map for empty patches", () => {
    const grouped = getPatchesPerPart([]);
    assert.strictEqual(grouped.size, 0);
  });

  it("does not modify original patches", () => {
    const patches = [{ bodyPartId: "torso", position: { x: 0, y: 0, z: 0 } }];
    getPatchesPerPart(patches);
    assert.strictEqual(patches.length, 1);
  });
});

describe("getPatchCoverageStats", () => {
  it("returns total patch count", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    assert.strictEqual(stats.totalPatches, patches.length);
    assert.ok(stats.totalPatches > 0);
  });

  it("returns number of parts with patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    assert.strictEqual(stats.partsWithPatches, stats.patchesPerPart.size);
    assert.ok(stats.partsWithPatches > 0);
  });

  it("returns patchesPerPart as a Map", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    assert.ok(stats.patchesPerPart instanceof Map);
  });

  it("returns min and max patches per part", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    assert.ok(typeof stats.minPatchesPerPart === "number");
    assert.ok(typeof stats.maxPatchesPerPart === "number");
    assert.ok(stats.minPatchesPerPart <= stats.maxPatchesPerPart);
  });

  it("returns climbablePartsMissingPatches list", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    assert.ok(Array.isArray(stats.climbablePartsMissingPatches));
  });
});

describe("validateSurfacePatches", () => {
  it("returns valid true for well-formed sentinel patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const result = validateSurfacePatches(patches, def);
    assert.strictEqual(result.valid, true);
  });

  it("returns valid false when climbable parts have no patches", () => {
    const def = createSentinelDefinition();
    const result = validateSurfacePatches([], def);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missingParts.length > 0);
  });

  it("missingParts contains ids of parts without patches", () => {
    const def = createSentinelDefinition();
    const result = validateSurfacePatches([], def);
    const climbableIds = def.parts.filter((p) => p.isClimbable).map((p) => p.id);
    for (const id of result.missingParts) {
      assert.ok(climbableIds.includes(id), `${id} not climbable`);
    }
  });

  it("every climbable part has at least one patch for sentinel", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const result = validateSurfacePatches(patches, def);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.missingParts.length, 0);
  });

  it("parts with larger surface area have more patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const stats = getPatchCoverageStats(patches, def);
    const torsoPatches = stats.patchesPerPart.get("torso")?.length || 0;
    const legPatches = stats.patchesPerPart.get("front_left_lower")?.length || 0;
    assert.ok(
      torsoPatches > legPatches,
      `torso ${torsoPatches} should have more patches than leg ${legPatches}`,
    );
  });

  it("returns all patch IDs in the result", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const result = validateSurfacePatches(patches, def);
    assert.ok(Array.isArray(result.patchPartIds));
  });

  it("patches have no duplicates (same position and normal on same part)", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const seen = new Set();
    for (const p of patches) {
      const key = `${p.bodyPartId}:${p.position.x.toFixed(4)},${p.position.y.toFixed(4)},${p.position.z.toFixed(4)}:${p.normal.x},${p.normal.y},${p.normal.z}`;
      assert.ok(!seen.has(key), `duplicate patch at ${key}`);
      seen.add(key);
    }
  });

  it("all patches are on the surface of their body part", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    for (const patch of patches) {
      const part = def.parts.find((p) => p.id === patch.bodyPartId);
      if (!part) continue;
      const { position: pos, dimensions: dim } = part;
      const hw = dim.width / 2;
      const hh = dim.height / 2;
      const hd = dim.depth / 2;

      const onTop = Math.abs(patch.position.y - (pos.y + hh)) < 0.01 && patch.normal.y === 1;
      const onBottom = Math.abs(patch.position.y - (pos.y - hh)) < 0.01 && patch.normal.y === -1;
      const onFront = Math.abs(patch.position.z - (pos.z + hd)) < 0.01 && patch.normal.z === 1;
      const onBack = Math.abs(patch.position.z - (pos.z - hd)) < 0.01 && patch.normal.z === -1;
      const onLeft = Math.abs(patch.position.x - (pos.x - hw)) < 0.01 && patch.normal.x === -1;
      const onRight = Math.abs(patch.position.x - (pos.x + hw)) < 0.01 && patch.normal.x === 1;

      const onSurface = onTop || onBottom || onFront || onBack || onLeft || onRight;
      assert.ok(onSurface, `patch on ${patch.bodyPartId} not on any surface face`);
    }
  });
});
