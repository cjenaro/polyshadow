import { normalize2D } from "../utils/math.js";

const DEFAULT_DISTANCE = 20;
const HEIGHT_OFFSET = 3;
const FADE_NEAR = 15;
const FADE_FAR = 20;

export function createVoxelArrowMesh() {
  const voxels = [];
  const STEM_LENGTH = 3;
  for (let z = 0; z < STEM_LENGTH; z++) {
    voxels.push({ x: 0, y: 0, z: -(z + 1), blockType: "indicator_stem" });
  }
  for (let x = -1; x <= 1; x++) {
    voxels.push({ x, y: 0, z: 0, blockType: "indicator_head" });
  }

  return {
    voxels,
    color: [1.0, 0.84, 0.0],
    glow: true,
  };
}

export function getIndicatorPosition(playerPos, colossusPos, distance = DEFAULT_DISTANCE) {
  const dx = colossusPos.x - playerPos.x;
  const dz = colossusPos.z - playerPos.z;
  const norm = normalize2D(dx, dz);
  return {
    x: playerPos.x + norm.x * distance,
    y: playerPos.y + HEIGHT_OFFSET,
    z: playerPos.z + norm.y * distance,
  };
}

export function updateIndicatorOpacity(indicators, colossi, playerPos) {
  return indicators.map((indicator, index) => {
    const colossus = colossi.find((c) => c.id === indicator.colossusId);
    if (!colossus || colossus.defeated) {
      return { indicatorIndex: index, opacity: 0 };
    }

    const dx = colossus.x - playerPos.x;
    const dz = colossus.z - playerPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= FADE_NEAR) {
      return { indicatorIndex: index, opacity: 0 };
    }

    if (dist >= FADE_FAR) {
      return { indicatorIndex: index, opacity: 1 };
    }

    const t = (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR);
    return { indicatorIndex: index, opacity: t };
  });
}
