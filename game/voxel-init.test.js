import { describe, it } from "node:test";
import assert from "node:assert";
import {
  initVoxelSystems,
  generateVoxelWorld,
  createVoxelColossi,
  getVoxelGroundHeightFn,
  updateVoxelFrame,
  getVoxelSurfacePatchesFn,
} from "./voxel-init.js";
import { BlockType } from "../world/block-types.js";

describe("voxel-init", () => {
  describe("initVoxelSystems", () => {
    it("returns context with storage and chunkManager", () => {
      const ctx = initVoxelSystems();
      assert.ok(ctx.storage, "should have storage");
      assert.ok(ctx.chunkManager, "should have chunkManager");
      assert.strictEqual(ctx.storage.getChunkCount(), 0);
    });

    it("chunkManager processes dirty chunks", () => {
      const ctx = initVoxelSystems();
      ctx.storage.setBlock(5, 5, 5, BlockType.STONE);
      ctx.chunkManager.enqueueDirtyChunks();
      assert.strictEqual(ctx.chunkManager.getDirtyQueueLength(), 1);
      ctx.chunkManager.processDirtyChunks();
      assert.strictEqual(ctx.chunkManager.getDirtyQueueLength(), 0);
      assert.strictEqual(ctx.chunkManager.getMeshCount(), 1);
    });

    it("returns callable update function", () => {
      const ctx = initVoxelSystems();
      ctx.storage.setBlock(5, 5, 5, BlockType.STONE);
      const result = updateVoxelFrame(ctx, { x: 5, y: 5, z: 5 }, 0.016);
      assert.strictEqual(ctx.chunkManager.getDirtyQueueLength(), 0);
      assert.strictEqual(ctx.chunkManager.getMeshCount(), 1);
    });

    it("update does not throw with empty storage", () => {
      const ctx = initVoxelSystems();
      assert.doesNotThrow(() => {
        updateVoxelFrame(ctx, { x: 0, y: 0, z: 0 }, 0.016);
      });
    });
  });

  describe("generateVoxelWorld", () => {
    it("populates storage with blocks from hub island", () => {
      const ctx = initVoxelSystems();
      generateVoxelWorld(ctx);
      assert.ok(ctx.storage.getChunkCount() > 0, "should create chunks");
      const block = ctx.storage.getBlock(0, 20, 0);
      assert.ok(block !== BlockType.AIR, "hub center should have solid blocks");
    });

    it("returns island metadata array", () => {
      const ctx = initVoxelSystems();
      const islands = generateVoxelWorld(ctx);
      assert.ok(Array.isArray(islands));
      assert.strictEqual(islands.length, 4);
      assert.strictEqual(islands[0].type, "hub");
    });

    it("arena islands are at correct positions", () => {
      const ctx = initVoxelSystems();
      const islands = generateVoxelWorld(ctx);
      const arenaTypes = islands.filter((i) => i.type !== "hub").map((i) => i.type);
      assert.ok(arenaTypes.includes("sentinel"));
      assert.ok(arenaTypes.includes("titan"));
      assert.ok(arenaTypes.includes("wraith"));
    });

    it("stepping stone paths create blocks between hub and arenas", () => {
      const ctx = initVoxelSystems();
      generateVoxelWorld(ctx);
      let pathBlocks = 0;
      ctx.storage.forEachChunk((chunk) => {
        for (let i = 0; i < chunk.blocks.length; i++) {
          if (chunk.blocks[i] === BlockType.STONE || chunk.blocks[i] === BlockType.MOSS_STONE) {
            pathBlocks++;
          }
        }
      });
      assert.ok(pathBlocks > 0, "should have stone blocks from paths");
    });

    it("ruins are generated on hub island", () => {
      const ctx = initVoxelSystems();
      const islands = generateVoxelWorld(ctx);
      const hub = islands.find((i) => i.type === "hub");
      assert.ok(hub.ruins, "hub should have ruins");
      assert.ok(hub.ruins.length > 0, "hub ruins should not be empty");
    });

    it("generates ruins on arena islands", () => {
      const ctx = initVoxelSystems();
      const islands = generateVoxelWorld(ctx);
      for (const island of islands) {
        if (island.type === "hub") continue;
        assert.ok(island.ruins, `${island.type} should have ruins`);
      }
    });
  });

  describe("getVoxelGroundHeightFn", () => {
    it("returns a function", () => {
      const ctx = initVoxelSystems();
      const fn = getVoxelGroundHeightFn(ctx);
      assert.strictEqual(typeof fn, "function");
    });

    it("returns valid height for generated world", () => {
      const ctx = initVoxelSystems();
      generateVoxelWorld(ctx);
      updateVoxelFrame(ctx, { x: 0, y: 5, z: 0 }, 0.016);
      const fn = getVoxelGroundHeightFn(ctx);
      const h = fn(0, 0);
      assert.ok(Number.isFinite(h), `height should be finite, got ${h}`);
    });

    it("returns fallback for positions with no voxels", () => {
      const ctx = initVoxelSystems();
      const fn = getVoxelGroundHeightFn(ctx);
      const h = fn(500, 500);
      assert.strictEqual(h, 0);
    });
  });

  describe("createVoxelColossi", () => {
    it("creates voxel data for sentinel colossus", () => {
      const colossi = createVoxelColossi(["sentinel"]);
      assert.strictEqual(colossi.length, 1);
      assert.strictEqual(colossi[0].type, "sentinel");
      assert.ok(colossi[0].parts, "should have parts");
      assert.ok(Object.keys(colossi[0].parts).length > 0, "parts should not be empty");
    });

    it("creates voxel data for all three colossus types", () => {
      const types = ["sentinel", "titan", "wraith"];
      const colossi = createVoxelColossi(types);
      assert.strictEqual(colossi.length, 3);
      for (const c of colossi) {
        assert.ok(types.includes(c.type));
        assert.ok(c.parts);
        assert.ok(Object.keys(c.parts).length > 0);
      }
    });

    it("each part has voxels and offset", () => {
      const colossi = createVoxelColossi(["sentinel"]);
      for (const [partId, part] of Object.entries(colossi[0].parts)) {
        assert.ok(Array.isArray(part.voxels), `${partId} should have voxels array`);
        assert.ok(part.offset, `${partId} should have offset`);
        assert.ok(typeof part.offset.x === "number", `${partId} offset.x should be number`);
        assert.ok(typeof part.offset.y === "number", `${partId} offset.y should be number`);
        assert.ok(typeof part.offset.z === "number", `${partId} offset.z should be number`);
      }
    });

    it("throw on unknown colossus type", () => {
      assert.throws(() => createVoxelColossi(["unknown"]));
    });
  });

  describe("getVoxelSurfacePatchesFn", () => {
    it("returns a function", () => {
      const fn = getVoxelSurfacePatchesFn("sentinel");
      assert.strictEqual(typeof fn, "function");
    });

    it("returned function produces surface patches for sentinel", () => {
      const fn = getVoxelSurfacePatchesFn("sentinel");
      const patches = fn();
      assert.ok(Array.isArray(patches));
      assert.ok(patches.length > 0, "sentinel should have surface patches");
      for (const p of patches) {
        assert.ok(p.position, "patch should have position");
        assert.ok(p.normal, "patch should have normal");
        assert.ok(p.bodyPartId, "patch should have bodyPartId");
      }
    });

    it("returns function that produces patches for each colossus type", () => {
      for (const type of ["sentinel", "titan", "wraith"]) {
        const fn = getVoxelSurfacePatchesFn(type);
        const patches = fn();
        assert.ok(patches.length > 0, `${type} should have surface patches`);
      }
    });
  });

  describe("updateVoxelFrame", () => {
    it("processes dirty chunks on update", () => {
      const ctx = initVoxelSystems();
      ctx.storage.setBlock(3, 3, 3, BlockType.STONE);
      ctx.storage.setBlock(20, 3, 3, BlockType.STONE);
      updateVoxelFrame(ctx, { x: 3, y: 3, z: 3 }, 0.016);
      assert.strictEqual(ctx.chunkManager.getDirtyQueueLength(), 0);
      assert.ok(ctx.chunkManager.getMeshCount() >= 1);
    });

    it("returns processed chunk count", () => {
      const ctx = initVoxelSystems();
      ctx.storage.setBlock(5, 5, 5, BlockType.STONE);
      const result = updateVoxelFrame(ctx, { x: 5, y: 5, z: 5 }, 0.016);
      assert.ok(typeof result === "number");
      assert.ok(result >= 0);
    });
  });
});
