import { generateIslandShape } from "../utils/procedural.js";
import { fbm2D } from "../utils/noise.js";

export function createIsland(params) {
  return {
    center: { x: params.center.x, z: params.center.z },
    radius: params.radius,
    maxHeight: params.maxHeight,
    seed: params.seed,
    type: params.type,
    generated: false,
    safeZone: params.type === "hub",
  };
}

export function generateIslandGeometry(island) {
  const heightData = generateIslandShape(island.radius, island.maxHeight, island.seed);

  return {
    ...island,
    generated: true,
    resolution: heightData.side,
    heightData: heightData.heights,
    radius: heightData.radius,
  };
}

export function getIslandSurfaceHeight(island, x, z) {
  if (!island.generated) return 0;

  const dx = x - island.center.x;
  const dz = z - island.center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist >= island.radius) return 0;

  const { heightData, resolution, radius } = island;
  const side = resolution;
  const step = (radius * 2) / resolution;

  const gx = (x - island.center.x + radius) / step;
  const gz = (z - island.center.z + radius) / step;

  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = gx - ix;
  const fz = gz - iz;

  const ix0 = Math.max(0, Math.min(resolution, ix));
  const ix1 = Math.max(0, Math.min(resolution, ix + 1));
  const iz0 = Math.max(0, Math.min(resolution, iz));
  const iz1 = Math.max(0, Math.min(resolution, iz + 1));

  const h00 = heightData[iz0 * side + ix0] || 0;
  const h10 = heightData[iz0 * side + ix1] || 0;
  const h01 = heightData[iz1 * side + ix0] || 0;
  const h11 = heightData[iz1 * side + ix1] || 0;

  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;

  return h0 * (1 - fz) + h1 * fz;
}

export function isOnIsland(island, x, z) {
  const dx = x - island.center.x;
  const dz = z - island.center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < island.radius;
}

export function findSpawnPoint(island) {
  if (island.type === "arena") {
    const angle = island.seed * 0.7;
    const spawnDist = island.radius * 0.7;
    return {
      x: island.center.x + Math.cos(angle) * spawnDist,
      y: 0,
      z: island.center.z + Math.sin(angle) * spawnDist,
    };
  }

  const offset = island.radius * 0.1;
  return {
    x: island.center.x + offset * 0.5,
    y: 0,
    z: island.center.z + offset * 0.3,
  };
}

export function createHubIsland() {
  return {
    center: { x: 0, z: 0 },
    radius: 60,
    maxHeight: 8,
    seed: 42,
    type: "hub",
    generated: false,
    safeZone: true,
    shrine: { x: 0, z: 0 },
  };
}

export function createArenaIsland(colossusType) {
  return {
    center: { x: 0, z: 0 },
    radius: 40,
    maxHeight: 5,
    seed: colossusType.charCodeAt(0) * 137 + (colossusType.charCodeAt(1) || 0) * 53,
    type: "arena",
    generated: false,
    safeZone: false,
    colossusType: colossusType,
  };
}

function seededRandom(seed) {
  let s = seed | 0 || 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateArenaTerrain(arena, resolution = 128) {
  const res = resolution;
  const heights = new Float32Array(res * res);
  const offsetX = arena.seed * 0.137 + 10;
  const offsetZ = arena.seed * 0.259 + 10;

  for (let z = 0; z < res; z++) {
    for (let x = 0; x < res; x++) {
      const nx = x / res;
      const nz = z / res;
      const dx = nx - 0.5;
      const dz = nz - 0.5;
      const dist = Math.sqrt(dx * dx + dz * dz) * 2;

      let falloff = 1 - dist;
      falloff = falloff * falloff;
      if (dist > 1) falloff = 0;

      const noiseVal = fbm2D(x * 0.05 + offsetX, z * 0.05 + offsetZ, 5, 2, 0.5);

      const h = (noiseVal * 0.5 + 0.5) * falloff * arena.maxHeight;
      heights[z * res + x] = h;
    }
  }

  return { arena, heights, resolution: res };
}

export function generateRuinPositions(arena, count) {
  const ruins = [];
  const rng = seededRandom(arena.seed + 1000);
  const minDist = 8;
  const innerRadius = arena.radius * 0.15;
  const outerRadius = arena.radius * 0.85;
  const types = ["pillar", "wall", "arch", "rubble"];

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = rng() * Math.PI * 2;
      const r = innerRadius + rng() * (outerRadius - innerRadius);
      const x = arena.center.x + Math.cos(angle) * r;
      const z = arena.center.z + Math.sin(angle) * r;

      let valid = true;
      for (const existing of ruins) {
        const dx = x - existing.x;
        const dz = z - existing.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) {
          valid = false;
          break;
        }
      }

      if (valid) {
        ruins.push({
          x,
          z,
          scale: 0.5 + rng() * 2,
          type: types[Math.floor(rng() * types.length)],
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const angle = rng() * Math.PI * 2;
      const r = innerRadius + rng() * (outerRadius - innerRadius);
      ruins.push({
        x: arena.center.x + Math.cos(angle) * r,
        z: arena.center.z + Math.sin(angle) * r,
        scale: 0.5 + rng() * 2,
        type: types[Math.floor(rng() * types.length)],
      });
    }
  }

  return ruins;
}

export function getArenaSpawnPoint(arena) {
  const angle = -Math.PI / 2;
  const r = arena.radius * 0.9;
  return {
    x: arena.center.x + Math.cos(angle) * r,
    y: 0,
    z: arena.center.z + Math.sin(angle) * r,
  };
}

export function getColossusSpawnPoint(arena) {
  const angle = Math.PI / 2;
  const r = arena.radius * 0.2;
  return {
    x: arena.center.x + Math.cos(angle) * r,
    y: 0,
    z: arena.center.z + Math.sin(angle) * r,
  };
}

export function getArenaBounds(arena) {
  return {
    min: { x: arena.center.x - arena.radius, y: 0, z: arena.center.z - arena.radius },
    max: {
      x: arena.center.x + arena.radius,
      y: arena.maxHeight * 2,
      z: arena.center.z + arena.radius,
    },
  };
}
