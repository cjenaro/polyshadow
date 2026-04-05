export const AO_CURVE = [0.45, 0.65, 0.8, 1.0];

const VOXEL_FOG_DENSITY_MULTIPLIER = 1.3;
const DEFAULT_SCENE_FOG_DENSITY = 0.005;
const VOXEL_FOG_MAX_DENSITY = 0.04;
const VOXEL_BLOOM_THRESHOLD = 0.15;
const VOXEL_BLOOM_INTENSITY_MULTIPLIER = 1.4;
const DEFAULT_BLOOM_THRESHOLD = 0.1;
const DEFAULT_BLOOM_INTENSITY = 0.5;
const VOXEL_BLOOM_INTENSITY_MAX = 3.0;
const VOXEL_BLOOM_THRESHOLD_MAX = 0.2;
const SHADOW_MAP_SIZE = 2048;
const SHADOW_BIAS = -0.002;
const SHADOW_NORMAL_BIAS = 0.02;

export function updateFogForVoxels(base = {}) {
  const baseDensity = base.sceneFogDensity ?? DEFAULT_SCENE_FOG_DENSITY;
  return {
    sceneFogDensity: Math.min(baseDensity * VOXEL_FOG_DENSITY_MULTIPLIER, VOXEL_FOG_MAX_DENSITY),
    sceneFogColor: base.sceneFogColor ?? 0xc9a84c,
    layerDensityMultiplier: VOXEL_FOG_DENSITY_MULTIPLIER,
  };
}

export function updateBloomForVoxels(base = {}) {
  const baseIntensity = base.bloomIntensity ?? DEFAULT_BLOOM_INTENSITY;
  const baseThreshold = base.bloomThreshold ?? DEFAULT_BLOOM_THRESHOLD;
  return {
    bloomThreshold: Math.min(
      Math.max(baseThreshold, VOXEL_BLOOM_THRESHOLD),
      VOXEL_BLOOM_THRESHOLD_MAX,
    ),
    bloomIntensity: Math.min(
      baseIntensity * VOXEL_BLOOM_INTENSITY_MULTIPLIER,
      VOXEL_BLOOM_INTENSITY_MAX,
    ),
  };
}

export function createVoxelShadowConfig() {
  return {
    shadowMapType: 3,
    shadowMapSize: SHADOW_MAP_SIZE,
    shadowBias: SHADOW_BIAS,
    shadowNormalBias: SHADOW_NORMAL_BIAS,
  };
}
