import { describe, it } from "node:test";
import assert from "node:assert";
import { createVoxelStorage } from "../world/voxel-storage.js";
import { BlockType } from "../world/block-types.js";
import {
  generateVoxelIsland,
  generateVoxelSteppingStones,
  generateVoxelRuins,
} from "./voxel-island-generator.js";

function findTopBlock(storage, x, z, minY = 0, maxY = 50) {
  for (let y = maxY; y >= minY; y--) {
    if (storage.getBlock(x, y, z) !== BlockType.AIR) return y;
  }
  return -1;
}

function findBottomBlock(storage, x, z, minY = 0, maxY = 50) {
  for (let y = minY; y <= maxY; y++) {
    if (storage.getBlock(x, y, z) !== BlockType.AIR) return y;
  }
  return -1;
}

describe("generateVoxelIsland", () => {
  it("generates blocks within radius", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    let found = false;
    for (let x = -5; x <= 5 && !found; x += 2) {
      for (let z = -5; z <= 5 && !found; z += 2) {
        if (findTopBlock(storage, x, z) >= 0) found = true;
      }
    }
    assert.ok(found, "should have blocks within island radius");
  });

  it("generates no blocks far outside radius", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    for (let x = 15; x <= 20; x++) {
      for (let z = 15; z <= 20; z++) {
        assert.strictEqual(
          findTopBlock(storage, x, z),
          -1,
          `block at (${x},${z}) is outside radius`,
        );
      }
    }
  });

  it("top surface near center is GRASS", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    const topY = findTopBlock(storage, 0, 0);
    assert.ok(topY >= 0, "should have a solid block at center");
    assert.strictEqual(storage.getBlock(0, topY, 0), BlockType.GRASS);
  });

  it("blocks under surface are DIRT", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    const topY = findTopBlock(storage, 0, 0);
    assert.strictEqual(storage.getBlock(0, topY - 1, 0), BlockType.DIRT);
  });

  it("deep blocks are STONE", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 6,
      seed: 42,
      voxelStorage: storage,
    });
    const topY = findTopBlock(storage, 0, 0);
    assert.ok(topY - 4 >= 0, "island should be deep enough");
    assert.strictEqual(storage.getBlock(0, topY - 4, 0), BlockType.STONE);
  });

  it("underside blocks are MOSS_STONE", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    const botY = findBottomBlock(storage, 0, 0);
    assert.ok(botY >= 0, "should have blocks at center");
    assert.strictEqual(storage.getBlock(0, botY, 0), BlockType.MOSS_STONE);
  });

  it("edges have MOSS_STONE", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: storage,
    });
    let foundMoss = false;
    for (let dist = 6; dist <= 9 && !foundMoss; dist++) {
      for (let angle = 0; angle < Math.PI * 2 && !foundMoss; angle += 0.3) {
        const x = Math.round(Math.cos(angle) * dist);
        const z = Math.round(Math.sin(angle) * dist);
        const topY = findTopBlock(storage, x, z);
        if (topY >= 0 && storage.getBlock(x, topY, z) === BlockType.MOSS_STONE) {
          foundMoss = true;
        }
      }
    }
    assert.ok(foundMoss, "should have MOSS_STONE near island edge");
  });

  it("hub island generates with correct radius", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 60,
      maxHeight: 8,
      seed: 42,
      voxelStorage: storage,
      type: "hub",
    });
    assert.ok(findTopBlock(storage, 0, 0) >= 0, "hub should have blocks at center");
    assert.ok(findTopBlock(storage, 30, 0) >= 0, "hub should have blocks at radius/2");
    assert.strictEqual(findTopBlock(storage, 120, 0), -1, "hub should not have blocks at 2*radius");
  });

  it("arena island generates with correct radius", () => {
    const storage = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 40,
      maxHeight: 5,
      seed: 100,
      voxelStorage: storage,
      type: "arena",
    });
    assert.ok(findTopBlock(storage, 0, 0) >= 0, "arena should have blocks at center");
    assert.ok(findTopBlock(storage, 20, 0) >= 0, "arena should have blocks at radius/2");
  });

  it("is deterministic with same seed", () => {
    const s1 = createVoxelStorage();
    const s2 = createVoxelStorage();
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: s1,
    });
    generateVoxelIsland({
      centerX: 0,
      centerZ: 0,
      radius: 10,
      maxHeight: 4,
      seed: 42,
      voxelStorage: s2,
    });
    for (let x = -10; x <= 10; x += 3) {
      for (let z = -10; z <= 10; z += 3) {
        for (let y = 0; y <= 35; y++) {
          assert.strictEqual(
            s1.getBlock(x, y, z),
            s2.getBlock(x, y, z),
            `mismatch at (${x},${y},${z})`,
          );
        }
      }
    }
  });
});

describe("generateVoxelSteppingStones", () => {
  it("generates blocks between two points", () => {
    const storage = createVoxelStorage();
    generateVoxelSteppingStones({
      fromX: 0,
      fromZ: 0,
      toX: 50,
      toZ: 0,
      seed: 42,
      voxelStorage: storage,
      baseY: 20,
    });
    let found = false;
    for (let x = 10; x <= 40 && !found; x += 3) {
      for (let z = -4; z <= 4 && !found; z++) {
        for (let y = 18; y <= 22; y++) {
          if (storage.getBlock(x, y, z) !== BlockType.AIR) {
            found = true;
            break;
          }
        }
      }
    }
    assert.ok(found, "should have stepping stones between points");
  });

  it("uses STONE and MOSS_STONE", () => {
    const storage = createVoxelStorage();
    generateVoxelSteppingStones({
      fromX: 0,
      fromZ: 0,
      toX: 50,
      toZ: 0,
      seed: 42,
      voxelStorage: storage,
      baseY: 20,
    });
    let foundStone = false;
    outer: for (let x = 10; x <= 40; x++) {
      for (let y = 18; y <= 22; y++) {
        const b = storage.getBlock(x, y, 0);
        if (b === BlockType.STONE || b === BlockType.MOSS_STONE) {
          foundStone = true;
          break outer;
        }
      }
    }
    assert.ok(foundStone, "stepping stones should use STONE or MOSS_STONE");
  });
});

describe("generateVoxelRuins", () => {
  it("returns correct count of ruins", () => {
    const storage = createVoxelStorage();
    const ruins = generateVoxelRuins({
      centerX: 0,
      centerZ: 0,
      radius: 20,
      seed: 42,
      voxelStorage: storage,
      count: 5,
    });
    assert.strictEqual(ruins.length, 5);
  });

  it("ruins contain non-air blocks", () => {
    const storage = createVoxelStorage();
    const ruins = generateVoxelRuins({
      centerX: 0,
      centerZ: 0,
      radius: 20,
      seed: 42,
      voxelStorage: storage,
      count: 3,
      baseY: 20,
    });
    assert.ok(ruins.length > 0);
    let found = false;
    for (const ruin of ruins) {
      for (let dy = 0; dy < 6; dy++) {
        if (storage.getBlock(Math.round(ruin.x), 20 + dy, Math.round(ruin.z)) !== BlockType.AIR) {
          found = true;
          break;
        }
      }
    }
    assert.ok(found, "ruins should contain non-air blocks");
  });

  it("ruins use CRACKED_STONE or STONE", () => {
    const storage = createVoxelStorage();
    const ruins = generateVoxelRuins({
      centerX: 0,
      centerZ: 0,
      radius: 20,
      seed: 42,
      voxelStorage: storage,
      count: 3,
      baseY: 20,
    });
    let found = false;
    outer: for (const ruin of ruins) {
      for (let dy = 0; dy < 6; dy++) {
        const b = storage.getBlock(Math.round(ruin.x), 20 + dy, Math.round(ruin.z));
        if (b === BlockType.CRACKED_STONE || b === BlockType.STONE) {
          found = true;
          break outer;
        }
      }
    }
    assert.ok(found, "ruins should use CRACKED_STONE or STONE");
  });

  it("ruins are within radius", () => {
    const storage = createVoxelStorage();
    const ruins = generateVoxelRuins({
      centerX: 0,
      centerZ: 0,
      radius: 20,
      seed: 42,
      voxelStorage: storage,
      count: 5,
    });
    for (const ruin of ruins) {
      const dist = Math.sqrt(ruin.x ** 2 + ruin.z ** 2);
      assert.ok(dist <= 20, `ruin at dist ${dist} exceeds radius 20`);
    }
  });
});
