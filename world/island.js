import { normalize2D, distance2D } from '../utils/math.js';
import { generateIslandShape } from '../utils/procedural.js';

const RESOLUTION_MULTIPLIER = 2;

export function createIsland(params) {
  return {
    center: { x: params.center.x, z: params.center.z },
    radius: params.radius,
    maxHeight: params.maxHeight,
    seed: params.seed,
    type: params.type,
    generated: false,
    safeZone: params.type === 'hub'
  };
}

export function generateIslandGeometry(island) {
  const resolution = island.radius * RESOLUTION_MULTIPLIER;
  const heightData = generateIslandShape(island.radius, island.maxHeight, island.seed);

  return {
    ...island,
    generated: true,
    resolution: heightData.side,
    heightData: heightData.heights,
    radius: heightData.radius
  };
}

export function getIslandSurfaceHeight(island, x, z) {
  if (!island.generated) return 0;

  const dx = x - island.center.x;
  const dz = z - island.center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist >= island.radius) return 0;

  const normalizedDist = dist / island.radius;
  const noiseScale = 0.05;
  const offsetX = island.seed * 0.137 + 0.5;
  const offsetY = island.seed * 0.259 + 0.5;

  const ix = Math.floor((x - island.center.x + island.radius) * noiseScale * 20 + offsetX);
  const iz = Math.floor((z - island.center.z + island.radius) * noiseScale * 20 + offsetY);

  const hash = ((ix * 374761393 + iz * 668265263) & 0x7fffffff) / 0x7fffffff;
  const noiseVal = (hash * 2 - 1) * 0.3 + 0.7;

  let falloff = 1 - normalizedDist;
  falloff = falloff * falloff;

  return noiseVal * falloff * island.maxHeight;
}

export function isOnIsland(island, x, z) {
  const dx = x - island.center.x;
  const dz = z - island.center.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return dist < island.radius;
}

export function findSpawnPoint(island) {
  if (island.type === 'arena') {
    const angle = island.seed * 0.7;
    const spawnDist = island.radius * 0.7;
    return {
      x: island.center.x + Math.cos(angle) * spawnDist,
      y: 0,
      z: island.center.z + Math.sin(angle) * spawnDist
    };
  }

  const offset = island.radius * 0.1;
  return {
    x: island.center.x + offset * 0.5,
    y: 0,
    z: island.center.z + offset * 0.3
  };
}

export function createHubIsland() {
  return {
    center: { x: 0, z: 0 },
    radius: 60,
    maxHeight: 8,
    seed: 42,
    type: 'hub',
    generated: false,
    safeZone: true,
    shrine: { x: 0, z: 0 }
  };
}

export function createArenaIsland(colossusType) {
  return {
    center: { x: 0, z: 0 },
    radius: 40,
    maxHeight: 5,
    seed: colossusType.charCodeAt(0) * 137 + (colossusType.charCodeAt(1) || 0) * 53,
    type: 'arena',
    generated: false,
    safeZone: false,
    colossusType: colossusType
  };
}
