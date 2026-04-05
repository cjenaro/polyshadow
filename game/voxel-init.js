import { createVoxelStorage } from "../world/voxel-storage.js";
import { createChunkManager } from "../world/voxel-chunk-manager.js";
import {
  generateVoxelIsland,
  generateVoxelSteppingStones,
  generateVoxelRuins,
} from "../world/voxel-island-generator.js";
import { voxelGroundHeight } from "../world/voxel-physics.js";
import { getVoxelLODLevel, shouldRenderChunk } from "../world/voxel-lod.js";
import { buildColossusVoxels } from "../colossus/voxel-builder.js";
import { generateVoxelSurfacePatches } from "../colossus/voxel-climbing.js";

const HUB_CENTER = { x: 0, z: 0 };
const HUB_RADIUS = 60;
const HUB_SEED = 42;
const ARENA_RADIUS = 40;

const ARENA_CONFIGS = [
  { type: "sentinel", centerX: 120, centerZ: 0 },
  { type: "titan", centerX: -100, centerZ: 80 },
  { type: "wraith", centerX: -60, centerZ: -110 },
];

export function initVoxelSystems() {
  const storage = createVoxelStorage();
  const chunkManager = createChunkManager(storage);

  return {
    storage,
    chunkManager,
  };
}

export function generateVoxelWorld(voxelCtx) {
  const { storage } = voxelCtx;
  const islands = [];

  generateVoxelIsland({
    centerX: HUB_CENTER.x,
    centerZ: HUB_CENTER.z,
    radius: HUB_RADIUS,
    maxHeight: 30,
    seed: HUB_SEED,
    voxelStorage: storage,
  });

  const hubRuins = generateVoxelRuins({
    centerX: HUB_CENTER.x,
    centerZ: HUB_CENTER.z,
    seed: HUB_SEED + 100,
    voxelStorage: storage,
    count: 5,
    radius: HUB_RADIUS * 0.7,
  });

  islands.push({
    type: "hub",
    centerX: HUB_CENTER.x,
    centerZ: HUB_CENTER.z,
    radius: HUB_RADIUS,
    ruins: hubRuins,
  });

  for (const arena of ARENA_CONFIGS) {
    const seed = HUB_SEED + arena.centerX * 7 + arena.centerZ * 13;

    generateVoxelIsland({
      centerX: arena.centerX,
      centerZ: arena.centerZ,
      radius: ARENA_RADIUS,
      maxHeight: 25,
      seed,
      voxelStorage: storage,
    });

    const ruins = generateVoxelRuins({
      centerX: arena.centerX,
      centerZ: arena.centerZ,
      seed: seed + 200,
      voxelStorage: storage,
      count: 3,
      radius: ARENA_RADIUS * 0.6,
    });

    islands.push({
      type: arena.type,
      centerX: arena.centerX,
      centerZ: arena.centerZ,
      radius: ARENA_RADIUS,
      ruins,
    });
  }

  for (const arena of ARENA_CONFIGS) {
    const pathSeed = HUB_SEED + arena.centerX + arena.centerZ;
    generateVoxelSteppingStones({
      fromX: HUB_CENTER.x,
      fromZ: HUB_CENTER.z,
      toX: arena.centerX,
      toZ: arena.centerZ,
      seed: pathSeed,
      voxelStorage: storage,
    });
  }

  return islands;
}

export function createVoxelColossi(colossusTypes) {
  const result = [];
  for (const type of colossusTypes) {
    const parts = buildColossusVoxels(type);
    result.push({ type, parts });
  }
  return result;
}

export function getVoxelGroundHeightFn(voxelCtx) {
  const { storage } = voxelCtx;

  return function groundHeight(x, z) {
    const h = voxelGroundHeight(storage, x, z);
    if (Number.isFinite(h) && h > 0) return h;
    return 0;
  };
}

export function updateVoxelFrame(voxelCtx, playerPos, dt) {
  const { chunkManager } = voxelCtx;
  chunkManager.enqueueDirtyChunks();
  const processed = chunkManager.processDirtyChunks();
  return processed;
}

export function getVoxelSurfacePatchesFn(colossusType) {
  const parts = buildColossusVoxels(colossusType);

  return function surfacePatches() {
    return generateVoxelSurfacePatches(parts);
  };
}
