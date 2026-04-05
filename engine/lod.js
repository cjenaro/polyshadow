export const LOD_LEVELS = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export const LOD_THRESHOLDS = [30, 80];

export const SHADOW_SIZE_DESKTOP = 2048;

export const SHADOW_SIZE_MOBILE = 1024;

export const PARTICLE_COUNT_DESKTOP = 200;

export const PARTICLE_COUNT_MOBILE = 80;

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(navigator.userAgent)
    || window.innerWidth <= 768;
}

export function selectLODLevel(distance, thresholds = LOD_THRESHOLDS) {
  if (distance < thresholds[0]) return LOD_LEVELS.HIGH;
  if (distance < thresholds[1]) return LOD_LEVELS.MEDIUM;
  return LOD_LEVELS.LOW;
}

export function getShadowMapSize() {
  return isMobileDevice() ? SHADOW_SIZE_MOBILE : SHADOW_SIZE_DESKTOP;
}

export function getParticleCount() {
  return isMobileDevice() ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;
}
