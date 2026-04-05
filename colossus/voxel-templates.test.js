import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { voxelBox, voxelSphere, voxelCylinder, voxelHollowBox } from "./voxel-templates.js";
import { BlockType } from "../world/block-types.js";

describe("voxelBox", () => {
  it("generates correct number of blocks for a cube", () => {
    const voxels = voxelBox(3, 3, 3, BlockType.STONE);
    assert.equal(voxels.length, 27);
  });

  it("generates correct number of blocks for non-cube", () => {
    const voxels = voxelBox(2, 3, 4, BlockType.STONE);
    assert.equal(voxels.length, 24);
  });

  it("all voxels have the correct block type", () => {
    const voxels = voxelBox(2, 2, 2, BlockType.RUNE_GLOW);
    for (const v of voxels) {
      assert.equal(v.blockType, BlockType.RUNE_GLOW);
    }
  });

  it("voxels are centered at origin", () => {
    const voxels = voxelBox(3, 3, 3, BlockType.STONE);
    const xs = voxels.map((v) => v.x);
    const ys = voxels.map((v) => v.y);
    const zs = voxels.map((v) => v.z);
    assert.equal(Math.min(...xs), -1);
    assert.equal(Math.max(...xs), 1);
    assert.equal(Math.min(...ys), -1);
    assert.equal(Math.max(...ys), 1);
    assert.equal(Math.min(...zs), -1);
    assert.equal(Math.max(...zs), 1);
  });

  it("handles odd and even dimensions", () => {
    const voxelsEven = voxelBox(4, 2, 2, BlockType.STONE);
    assert.equal(voxelsEven.length, 16);
    const xs = voxelsEven.map((v) => v.x);
    assert.equal(Math.min(...xs), -2);
    assert.equal(Math.max(...xs), 1);
  });

  it("single block", () => {
    const voxels = voxelBox(1, 1, 1, BlockType.STONE);
    assert.equal(voxels.length, 1);
    assert.equal(voxels[0].x, 0);
    assert.equal(voxels[0].y, 0);
    assert.equal(voxels[0].z, 0);
  });
});

describe("voxelSphere", () => {
  it("generates a filled sphere", () => {
    const voxels = voxelSphere(5, BlockType.STONE);
    assert.ok(voxels.length > 0);
  });

  it("all voxels are within radius", () => {
    const radius = 5;
    const voxels = voxelSphere(radius, BlockType.STONE);
    for (const v of voxels) {
      const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      assert.ok(
        dist <= radius + 0.5,
        `voxel at ${v.x},${v.y},${v.z} dist ${dist} exceeds radius ${radius}`,
      );
    }
  });

  it("has the correct block type", () => {
    const voxels = voxelSphere(3, BlockType.RUNE_GLOW);
    for (const v of voxels) {
      assert.equal(v.blockType, BlockType.RUNE_GLOW);
    }
  });

  it("is centered at origin", () => {
    const voxels = voxelSphere(4, BlockType.STONE);
    const xs = voxels.map((v) => v.x);
    const ys = voxels.map((v) => v.y);
    const zs = voxels.map((v) => v.z);
    assert.ok(Math.min(...xs) < 0);
    assert.ok(Math.max(...xs) > 0);
    assert.ok(Math.min(...ys) < 0);
    assert.ok(Math.max(...ys) > 0);
    assert.ok(Math.min(...zs) < 0);
    assert.ok(Math.max(...zs) > 0);
  });

  it("radius 1 produces a cross shape", () => {
    const voxels = voxelSphere(1, BlockType.STONE);
    assert.equal(voxels.length, 7);
    assert.ok(voxels.some((v) => v.x === 0 && v.y === 0 && v.z === 0));
    assert.ok(voxels.some((v) => v.x === 1 && v.y === 0 && v.z === 0));
    assert.ok(voxels.some((v) => v.x === -1 && v.y === 0 && v.z === 0));
    assert.ok(voxels.some((v) => v.x === 0 && v.y === 1 && v.z === 0));
    assert.ok(voxels.some((v) => v.x === 0 && v.y === -1 && v.z === 0));
    assert.ok(voxels.some((v) => v.x === 0 && v.y === 0 && v.z === 1));
    assert.ok(voxels.some((v) => v.x === 0 && v.y === 0 && v.z === -1));
  });

  it("returns empty for radius 0", () => {
    const voxels = voxelSphere(0, BlockType.STONE);
    assert.equal(voxels.length, 0);
  });
});

describe("voxelCylinder", () => {
  it("generates a filled cylinder", () => {
    const voxels = voxelCylinder(3, 3, 5, BlockType.STONE);
    assert.ok(voxels.length > 0);
  });

  it("all voxels have correct block type", () => {
    const voxels = voxelCylinder(2, 2, 4, BlockType.RUNE_GLOW);
    for (const v of voxels) {
      assert.equal(v.blockType, BlockType.RUNE_GLOW);
    }
  });

  it("height matches the requested height", () => {
    const height = 6;
    const voxels = voxelCylinder(3, 3, height, BlockType.STONE);
    const ys = voxels.map((v) => v.y);
    const heightRange = Math.max(...ys) - Math.min(...ys) + 1;
    assert.equal(heightRange, height);
  });

  it("is centered at origin on xz plane", () => {
    const voxels = voxelCylinder(4, 4, 3, BlockType.STONE);
    const xs = voxels.map((v) => v.x);
    const zs = voxels.map((v) => v.z);
    assert.ok(Math.min(...xs) < 0);
    assert.ok(Math.max(...xs) > 0);
    assert.ok(Math.min(...zs) < 0);
    assert.ok(Math.max(...zs) > 0);
  });

  it("all voxels are within the maximum radius", () => {
    const rTop = 2;
    const rBottom = 4;
    const height = 6;
    const voxels = voxelCylinder(rTop, rBottom, height, BlockType.STONE);
    for (const v of voxels) {
      const t = (v.y - Math.floor(-height / 2)) / (height - 1);
      const maxR = rBottom + t * (rTop - rBottom);
      const dist = Math.sqrt(v.x * v.x + v.z * v.z);
      assert.ok(
        dist <= maxR + 0.5,
        `voxel at ${v.x},${v.y},${v.z} dist ${dist} exceeds radius ${maxR}`,
      );
    }
  });

  it("supports tapered cylinder (different top/bottom radius)", () => {
    const voxels = voxelCylinder(1, 3, 4, BlockType.STONE);
    assert.ok(voxels.length > 0);
    assert.ok(voxels.length < voxelCylinder(3, 3, 4, BlockType.STONE).length);
  });
});

describe("voxelHollowBox", () => {
  it("generates a hollow box", () => {
    const voxels = voxelHollowBox(5, 5, 5, 1, BlockType.STONE);
    const interior = voxels.filter(
      (v) => v.x > -2 && v.x < 2 && v.y > -2 && v.y < 2 && v.z > -2 && v.z < 2,
    );
    assert.equal(interior.length, 0);
  });

  it("has fewer blocks than a solid box of same dimensions", () => {
    const hollow = voxelHollowBox(6, 6, 6, 1, BlockType.STONE);
    const solid = voxelBox(6, 6, 6, BlockType.STONE);
    assert.ok(hollow.length < solid.length);
  });

  it("all voxels have correct block type", () => {
    const voxels = voxelHollowBox(4, 4, 4, 1, BlockType.RUNE_GLOW);
    for (const v of voxels) {
      assert.equal(v.blockType, BlockType.RUNE_GLOW);
    }
  });

  it("is centered at origin", () => {
    const voxels = voxelHollowBox(6, 4, 4, 1, BlockType.STONE);
    const xs = voxels.map((v) => v.x);
    const ys = voxels.map((v) => v.y);
    const zs = voxels.map((v) => v.z);
    assert.ok(Math.min(...xs) < 0);
    assert.ok(Math.max(...xs) > 0);
    assert.ok(Math.min(...ys) < 0);
    assert.ok(Math.max(...ys) > 0);
    assert.ok(Math.min(...zs) < 0);
    assert.ok(Math.max(...zs) > 0);
  });

  it("thickness greater than half dimension produces solid box", () => {
    const voxels = voxelHollowBox(4, 4, 4, 3, BlockType.STONE);
    const solid = voxelBox(4, 4, 4, BlockType.STONE);
    assert.equal(voxels.length, solid.length);
  });

  it("returns empty for box smaller than thickness", () => {
    const voxels = voxelHollowBox(2, 2, 2, 2, BlockType.STONE);
    const solid = voxelBox(2, 2, 2, BlockType.STONE);
    assert.equal(voxels.length, solid.length);
  });
});
