import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateVoxelSurfacePatches,
  findNearestVoxelGrabPoint,
  getVoxelClimbMovement,
  findVoxelJumpTarget,
  findVoxelRestSpots,
  updateVoxelClimbSurfaces,
} from "./voxel-climbing.js";
import { BlockType } from "../world/block-types.js";

function makeVoxel(x, y, z, blockType = BlockType.STONE) {
  return { x, y, z, blockType };
}

describe("generateVoxelSurfacePatches", () => {
  it("returns empty array for empty voxelParts", () => {
    const result = generateVoxelSurfacePatches({});
    assert.deepStrictEqual(result, []);
  });

  it("creates grab points from exposed voxel faces", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    assert.ok(patches.length > 0, "single exposed voxel should have 6 faces");
    assert.strictEqual(patches.length, 6);
  });

  it("grab points have axis-aligned normals", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const normals = new Set(patches.map((p) => `${p.normal.x},${p.normal.y},${p.normal.z}`));
    assert.ok(normals.has("1,0,0"));
    assert.ok(normals.has("-1,0,0"));
    assert.ok(normals.has("0,1,0"));
    assert.ok(normals.has("0,-1,0"));
    assert.ok(normals.has("0,0,1"));
    assert.ok(normals.has("0,0,-1"));
  });

  it("does not create faces between adjacent voxels", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0), makeVoxel(1, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const interiorFaceX1 = patches.find(
      (p) =>
        p.position.x === 1 && p.normal.x === -1 && p.position.y === 0.5 && p.position.z === 0.5,
    );
    assert.strictEqual(interiorFaceX1, undefined, "should not have face between adjacent voxels");
  });

  it("applies part offset to grab point positions", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 10, y: 20, z: 30 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    for (const p of patches) {
      assert.ok(p.position.x >= 10, `x=${p.position.x} should be >= 10`);
      assert.ok(p.position.y >= 20, `y=${p.position.y} should be >= 20`);
      assert.ok(p.position.z >= 30, `z=${p.position.z} should be >= 30`);
    }
  });

  it("groups faces by bodyPartId", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
      head: {
        voxels: [makeVoxel(5, 5, 5)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const torsoPatches = patches.filter((p) => p.bodyPartId === "torso");
    const headPatches = patches.filter((p) => p.bodyPartId === "head");
    assert.strictEqual(torsoPatches.length, 6);
    assert.strictEqual(headPatches.length, 6);
  });

  it("position is face center (offset by 0.5 in face normal direction)", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const topFace = patches.find((p) => p.normal.y === 1);
    assert.ok(topFace, "should have top face");
    assert.strictEqual(topFace.position.x, 0.5);
    assert.strictEqual(topFace.position.y, 1);
    assert.strictEqual(topFace.position.z, 0.5);
  });

  it("only includes climbable parts (skips non-climbable when specified)", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
        climbable: true,
      },
      weak_point: {
        voxels: [makeVoxel(5, 5, 5)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
        climbable: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const weakPatches = patches.filter((p) => p.bodyPartId === "weak_point");
    assert.strictEqual(weakPatches.length, 0);
  });

  it("includes weak points that are also climbable", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
        climbable: true,
      },
      rune: {
        voxels: [makeVoxel(5, 5, 5)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
        isWeakPoint: true,
        climbable: true,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    const runePatches = patches.filter((p) => p.bodyPartId === "rune");
    assert.strictEqual(runePatches.length, 6);
  });

  it("includes all parts when no climbable flag is set", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const patches = generateVoxelSurfacePatches(voxelParts);
    assert.strictEqual(patches.length, 6);
  });
});

describe("findNearestVoxelGrabPoint", () => {
  const grabPoints = [
    { position: { x: 1, y: 1, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    { position: { x: 2, y: 1, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    { position: { x: 1, y: 3, z: 1 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
  ];

  it("returns closest grab point within maxDist", () => {
    const result = findNearestVoxelGrabPoint(grabPoints, { x: 0, y: 1, z: 1 }, null, 2.5);
    assert.ok(result !== null);
    assert.strictEqual(result.position.x, 1);
    assert.strictEqual(result.position.y, 1);
  });

  it("returns null when no grab points within maxDist", () => {
    const farPoints = [
      { position: { x: 10, y: 10, z: 10 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    ];
    const result = findNearestVoxelGrabPoint(farPoints, { x: 0, y: 0, z: 0 }, null, 2.5);
    assert.strictEqual(result, null);
  });

  it("returns null for empty grab points", () => {
    const result = findNearestVoxelGrabPoint([], { x: 0, y: 0, z: 0 }, null, 2.5);
    assert.strictEqual(result, null);
  });

  it("applies facing direction penalty (3x behind penalty)", () => {
    const facingDir = { x: 0, y: 0, z: 1 };
    const points = [
      { position: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
      { position: { x: 0, y: 0, z: -1 }, normal: { x: 0, y: 0, z: 1 }, bodyPartId: "torso" },
    ];
    const result = findNearestVoxelGrabPoint(points, { x: 0, y: 0, z: 0 }, facingDir, 2.5);
    assert.ok(result !== null);
    assert.strictEqual(
      result.position.z,
      1,
      "should prefer front-facing point even if equidistant",
    );
  });

  it("penalized behind point loses to farther front point", () => {
    const facingDir = { x: 0, y: 0, z: 1 };
    const points = [
      { position: { x: 0, y: 0, z: -1 }, normal: { x: 0, y: 0, z: 1 }, bodyPartId: "torso" },
      { position: { x: 0, y: 0, z: 2 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    ];
    const result = findNearestVoxelGrabPoint(points, { x: 0, y: 0, z: 0 }, facingDir, 2.5);
    assert.ok(result !== null);
    assert.strictEqual(
      result.position.z,
      2,
      "front point at distance 2 should beat behind point at effective distance 3",
    );
  });
});

describe("getVoxelClimbMovement", () => {
  it("projects upward input onto vertical face (+Z normal)", () => {
    const result = getVoxelClimbMovement({ x: 0, y: 1 }, { x: 0, y: 0, z: 1 });
    assert.ok(Math.abs(result.dy - 1) < 1e-6, "should move in Y direction");
    assert.ok(Math.abs(result.dx) < 1e-6, "should not move in X");
    assert.ok(Math.abs(result.dz) < 1e-6, "should not move in Z");
    assert.strictEqual(result.climbSpeed, 1);
  });

  it("projects rightward input onto vertical face (+Z normal)", () => {
    const result = getVoxelClimbMovement({ x: 1, y: 0 }, { x: 0, y: 0, z: 1 });
    assert.ok(Math.abs(result.dx - 1) < 1e-6, "should move in X direction");
    assert.ok(Math.abs(result.dy) < 1e-6, "should not move in Y");
    assert.ok(Math.abs(result.dz) < 1e-6, "should not move in Z");
  });

  it("projects input onto vertical face (+X normal)", () => {
    const result = getVoxelClimbMovement({ x: 0, y: 1 }, { x: 1, y: 0, z: 0 });
    assert.ok(Math.abs(result.dy - 1) < 1e-6, "should move in Y direction");
    assert.ok(Math.abs(result.dx) < 1e-6, "should not move in X");
    assert.ok(Math.abs(result.dz) < 1e-6, "should not move in Z");
  });

  it("projects input onto horizontal face (top, normal +Y)", () => {
    const result = getVoxelClimbMovement({ x: 1, y: 0 }, { x: 0, y: 1, z: 0 });
    assert.ok(Math.abs(result.dx - 1) < 1e-6, "should move in X direction");
    assert.ok(Math.abs(result.dy) < 1e-6, "should not move in Y");
  });

  it("projects input onto horizontal face (bottom, normal -Y)", () => {
    const result = getVoxelClimbMovement({ x: 1, y: 0 }, { x: 0, y: -1, z: 0 });
    assert.ok(Math.abs(result.dx - 1) < 1e-6, "should move in X direction");
    assert.ok(Math.abs(result.dy) < 1e-6, "should not move in Y");
  });

  it("diagonal input on vertical face is normalized", () => {
    const result = getVoxelClimbMovement({ x: 1, y: 1 }, { x: 0, y: 0, z: 1 });
    const len = Math.sqrt(result.dx * result.dx + result.dy * result.dy + result.dz * result.dz);
    assert.ok(Math.abs(len - 1) < 1e-6, `diagonal should be normalized, got ${len}`);
  });

  it("zero input returns zero movement", () => {
    const result = getVoxelClimbMovement({ x: 0, y: 0 }, { x: 0, y: 0, z: 1 });
    assert.strictEqual(result.dx, 0);
    assert.strictEqual(result.dy, 0);
    assert.strictEqual(result.dz, 0);
    assert.strictEqual(result.climbSpeed, 0);
  });

  it("movement never has component along face normal", () => {
    const normals = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ];
    const input = { x: 1, y: 1 };
    for (const n of normals) {
      const result = getVoxelClimbMovement(input, n);
      const dot = result.dx * n.x + result.dy * n.y + result.dz * n.z;
      assert.ok(
        Math.abs(dot) < 1e-6,
        `movement should be tangential for normal (${n.x},${n.y},${n.z}), got dot=${dot}`,
      );
    }
  });
});

describe("findVoxelJumpTarget", () => {
  const grabPoints = [
    { position: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    { position: { x: 0, y: 3, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    { position: { x: 2, y: 1, z: 0 }, normal: { x: -1, y: 0, z: 0 }, bodyPartId: "torso" },
    { position: { x: -2, y: 1, z: 0 }, normal: { x: 1, y: 0, z: 0 }, bodyPartId: "torso" },
  ];

  it("finds grab point on different face within jump distance", () => {
    const result = findVoxelJumpTarget(grabPoints, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, 3);
    assert.ok(result !== null);
    assert.ok(result.normal.x !== 0 || result.normal.z !== 0, "should be on a different face");
  });

  it("returns null when no reachable points on different face", () => {
    const singleFacePoints = [
      { position: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
      { position: { x: 0, y: 3, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
    ];
    const result = findVoxelJumpTarget(
      singleFacePoints,
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
      3,
    );
    assert.strictEqual(result, null);
  });

  it("returns null when jump distance too small", () => {
    const result = findVoxelJumpTarget(
      grabPoints,
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
      0.5,
    );
    assert.strictEqual(result, null);
  });

  it("prefers closer grab point when multiple are reachable", () => {
    const points = [
      { position: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: -1 }, bodyPartId: "torso" },
      { position: { x: 1, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, bodyPartId: "torso" },
      { position: { x: 5, y: 0, z: 0 }, normal: { x: -1, y: 0, z: 0 }, bodyPartId: "torso" },
    ];
    const result = findVoxelJumpTarget(points, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.position.x, 1, "should pick closer side face");
  });
});

describe("findVoxelRestSpots", () => {
  it("identifies top-face grab points as rest spots", () => {
    const grabPoints = [
      { position: { x: 0.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
      { position: { x: 1.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
      { position: { x: 0, y: 0.5, z: 1 }, normal: { x: 0, y: 0, z: 1 }, bodyPartId: "torso" },
    ];
    const restSpots = findVoxelRestSpots(grabPoints);
    assert.strictEqual(restSpots.length, 1, "should have one rest area");
    assert.strictEqual(restSpots[0].size, 2, "rest area should contain 2 top faces");
  });

  it("returns empty array when no top faces", () => {
    const grabPoints = [
      { position: { x: 0, y: 0.5, z: 1 }, normal: { x: 0, y: 0, z: 1 }, bodyPartId: "torso" },
    ];
    const restSpots = findVoxelRestSpots(grabPoints);
    assert.strictEqual(restSpots.length, 0);
  });

  it("groups adjacent top faces by bodyPartId", () => {
    const grabPoints = [
      { position: { x: 0.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
      { position: { x: 5.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "head" },
    ];
    const restSpots = findVoxelRestSpots(grabPoints);
    assert.strictEqual(restSpots.length, 2);
    assert.strictEqual(restSpots[0].size, 1);
    assert.strictEqual(restSpots[1].size, 1);
  });

  it("rest spot position is the center of the group", () => {
    const grabPoints = [
      { position: { x: 0.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
      { position: { x: 1.5, y: 1, z: 0.5 }, normal: { x: 0, y: 1, z: 0 }, bodyPartId: "torso" },
    ];
    const restSpots = findVoxelRestSpots(grabPoints);
    assert.strictEqual(restSpots[0].position.x, 1);
    assert.strictEqual(restSpots[0].position.y, 1);
  });
});

describe("updateVoxelClimbSurfaces", () => {
  it("removes grab points at destroyed voxel positions", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0), makeVoxel(1, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const destroyedVoxels = [{ x: 0, y: 0, z: 0, bodyPartId: "torso" }];
    const updated = updateVoxelClimbSurfaces(voxelParts, destroyedVoxels);
    const singleVoxelPatches = generateVoxelSurfacePatches({
      torso: {
        voxels: [makeVoxel(1, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    });
    assert.strictEqual(updated.length, singleVoxelPatches.length);
  });

  it("returns same patches when no voxels destroyed", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const original = generateVoxelSurfacePatches(voxelParts);
    const updated = updateVoxelClimbSurfaces(voxelParts, []);
    assert.strictEqual(updated.length, original.length);
  });

  it("exposes previously hidden faces when adjacent voxel is destroyed", () => {
    const voxelParts = {
      torso: {
        voxels: [makeVoxel(0, 0, 0), makeVoxel(1, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    };
    const destroyedVoxels = [{ x: 1, y: 0, z: 0, bodyPartId: "torso" }];
    const updated = updateVoxelClimbSurfaces(voxelParts, destroyedVoxels);
    const singleVoxelPatches = generateVoxelSurfacePatches({
      torso: {
        voxels: [makeVoxel(0, 0, 0)],
        offset: { x: 0, y: 0, z: 0 },
        transparent: false,
      },
    });
    assert.strictEqual(
      updated.length,
      singleVoxelPatches.length,
      "should have 6 exposed faces after removal",
    );
  });
});
