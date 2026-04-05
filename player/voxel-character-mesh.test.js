import { describe, it } from "node:test";
import assert from "node:assert";
import { createPlayerVoxelTemplate, buildPlayerMeshData } from "./voxel-character-mesh.js";
import { BlockType } from "../world/block-types.js";

describe("createPlayerVoxelTemplate", () => {
  it("returns an array of voxels", () => {
    const template = createPlayerVoxelTemplate();
    assert.ok(Array.isArray(template));
    assert.ok(template.length > 0);
  });

  it("each voxel has x, y, z, and type properties", () => {
    const template = createPlayerVoxelTemplate();
    for (const v of template) {
      assert.ok(typeof v.x === "number", "x should be a number");
      assert.ok(typeof v.y === "number", "y should be a number");
      assert.ok(typeof v.z === "number", "z should be a number");
      assert.ok(typeof v.type === "number", "type should be a number");
    }
  });

  it("has correct height (3-5 blocks)", () => {
    const template = createPlayerVoxelTemplate();
    const ys = template.map((v) => v.y);
    const height = Math.max(...ys) - Math.min(...ys) + 1;
    assert.ok(height >= 3 && height <= 5, `height ${height} not in range 3-5`);
  });

  it("body width is 1-3 blocks (SAND and WOOD only)", () => {
    const template = createPlayerVoxelTemplate();
    const bodyVoxels = template.filter(
      (v) => v.type === BlockType.SAND || v.type === BlockType.WOOD,
    );
    const xs = bodyVoxels.map((v) => v.x);
    const width = Math.max(...xs) - Math.min(...xs) + 1;
    assert.ok(width >= 1 && width <= 3, `body width ${width} not in range 1-3`);
  });

  it("includes torso voxels (SAND)", () => {
    const template = createPlayerVoxelTemplate();
    const torso = template.filter((v) => v.type === BlockType.SAND && v.y >= 1 && v.y <= 2);
    assert.ok(torso.length >= 2, "should have at least 2 torso voxels");
  });

  it("includes head voxels (SAND, at highest y)", () => {
    const template = createPlayerVoxelTemplate();
    const maxY = Math.max(...template.map((v) => v.y));
    const head = template.filter((v) => v.y === maxY && v.type === BlockType.SAND);
    assert.ok(head.length >= 1, "should have at least 1 head voxel");
  });

  it("includes limb voxels (WOOD)", () => {
    const template = createPlayerVoxelTemplate();
    const limbs = template.filter((v) => v.type === BlockType.WOOD);
    assert.ok(limbs.length >= 2, `should have at least 2 limb voxels, got ${limbs.length}`);
  });

  it("limb voxels are at the bottom of the character", () => {
    const template = createPlayerVoxelTemplate();
    const minY = Math.min(...template.map((v) => v.y));
    const limbs = template.filter((v) => v.type === BlockType.WOOD);
    for (const limb of limbs) {
      assert.ok(limb.y <= minY + 1, `limb at y=${limb.y} should be near bottom (minY=${minY})`);
    }
  });

  it("includes sword voxels (STONE blade, CRACKED_STONE hilt)", () => {
    const template = createPlayerVoxelTemplate();
    const blade = template.filter((v) => v.type === BlockType.STONE);
    const hilt = template.filter((v) => v.type === BlockType.CRACKED_STONE);
    assert.ok(blade.length >= 1, "should have at least 1 sword blade voxel");
    assert.ok(hilt.length >= 1, "should have at least 1 sword hilt voxel");
  });

  it("includes cape voxels (MOSS_DIRT)", () => {
    const template = createPlayerVoxelTemplate();
    const cape = template.filter((v) => v.type === BlockType.MOSS_DIRT);
    assert.ok(cape.length >= 1, "should have at least 1 cape voxel");
  });

  it("cape voxels form vertical columns", () => {
    const template = createPlayerVoxelTemplate();
    const cape = template.filter((v) => v.type === BlockType.MOSS_DIRT);
    assert.ok(cape.length >= 2, "cape should have at least 2 voxels for a column");
    const capeZs = [...new Set(cape.map((v) => `${v.x},${v.z}`))];
    for (const col of capeZs) {
      const colVoxels = cape.filter((v) => `${v.x},${v.z}` === col);
      const ys = colVoxels.map((v) => v.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) {
        assert.strictEqual(ys[i], ys[i - 1] + 1, `cape column at ${col} should be contiguous`);
      }
    }
  });

  it("cape voxels are behind the body (negative z)", () => {
    const template = createPlayerVoxelTemplate();
    const bodyZs = template.filter((v) => v.type === BlockType.SAND).map((v) => v.z);
    const bodyMinZ = Math.min(...bodyZs);
    const cape = template.filter((v) => v.type === BlockType.MOSS_DIRT);
    for (const c of cape) {
      assert.ok(c.z <= bodyMinZ, `cape voxel at z=${c.z} should be behind body (minZ=${bodyMinZ})`);
    }
  });

  it("no duplicate voxel positions", () => {
    const template = createPlayerVoxelTemplate();
    const seen = new Set();
    for (const v of template) {
      const k = `${v.x},${v.y},${v.z}`;
      assert.ok(!seen.has(k), `duplicate voxel at ${k}`);
      seen.add(k);
    }
  });
});

describe("buildPlayerMeshData", () => {
  it("returns mesh data with correct structure", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.ok(data.positions instanceof Float32Array);
    assert.ok(data.normals instanceof Float32Array);
    assert.ok(data.colors instanceof Float32Array);
    assert.ok(data.indices instanceof Uint32Array);
    assert.ok(typeof data.vertexCount === "number");
  });

  it("has positive vertex count", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.ok(data.vertexCount > 0, `vertexCount should be > 0, got ${data.vertexCount}`);
  });

  it("vertex count is a multiple of 4 (quads)", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.strictEqual(data.vertexCount % 4, 0, "vertexCount should be multiple of 4");
  });

  it("positions array length is vertexCount * 3", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.strictEqual(data.positions.length, data.vertexCount * 3);
  });

  it("normals array length is vertexCount * 3", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.strictEqual(data.normals.length, data.vertexCount * 3);
  });

  it("colors array length is vertexCount * 3", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.strictEqual(data.colors.length, data.vertexCount * 3);
  });

  it("indices array length is vertexCount * 1.5 (6 indices per quad)", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    assert.strictEqual(data.indices.length, data.vertexCount * 1.5);
  });

  it("all indices are within valid range", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    for (let i = 0; i < data.indices.length; i++) {
      assert.ok(
        data.indices[i] >= 0 && data.indices[i] < data.vertexCount,
        `index ${data.indices[i]} at position ${i} out of range [0, ${data.vertexCount})`,
      );
    }
  });

  it("uses provided origin offset", () => {
    const template = createPlayerVoxelTemplate();
    const origin = { x: 10, y: 20, z: 30 };
    const data = buildPlayerMeshData(template, origin);
    const templateMinX = Math.min(...template.map((v) => v.x));
    const templateMinY = Math.min(...template.map((v) => v.y));
    const templateMinZ = Math.min(...template.map((v) => v.z));
    const minX = Math.min(...Array.from(data.positions).filter((_, i) => i % 3 === 0));
    const minY = Math.min(...Array.from(data.positions).filter((_, i) => i % 3 === 1));
    const minZ = Math.min(...Array.from(data.positions).filter((_, i) => i % 3 === 2));
    assert.strictEqual(minX, origin.x + templateMinX);
    assert.strictEqual(minY, origin.y + templateMinY);
    assert.strictEqual(minZ, origin.z + templateMinZ);
  });

  it("hidden faces between adjacent voxels are culled", () => {
    const template = createPlayerVoxelTemplate();
    const data = buildPlayerMeshData(template);
    const maxFaces = template.length * 6;
    const quadCount = data.vertexCount / 4;
    assert.ok(
      quadCount < maxFaces,
      `${quadCount} faces should be less than ${maxFaces} (all faces exposed)`,
    );
  });
});
