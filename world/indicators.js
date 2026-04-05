import { distance2D, normalize2D } from "../utils/math.js";

const FADE_NEAR = 15;
const FADE_FAR = 800;

export function createDirectionIndicator(colossusId, direction) {
  const norm = normalize2D(direction.x, direction.z);
  return {
    colossusId,
    direction: { x: norm.x, z: norm.y },
    visible: true,
    opacity: 1,
  };
}

export function getIndicatorDirection(indicator) {
  return { x: indicator.direction.x, z: indicator.direction.z };
}

export function isIndicatorVisible(indicator, _playerPos) {
  if (!indicator.visible) return false;
  return indicator.opacity > 0.05;
}

export function updateIndicators(indicators, playerPos, colossusPositions) {
  return indicators.map((indicator) => {
    const colossus = colossusPositions.find((c) => c.id === indicator.colossusId);
    if (!colossus || colossus.defeated) {
      return { ...indicator, visible: false, opacity: 0 };
    }

    const distToColossus = distance2D(playerPos.x, playerPos.z, colossus.x, colossus.z);

    if (distToColossus < FADE_NEAR) {
      return { ...indicator, visible: false, opacity: 0 };
    }

    let opacity = 1;
    if (distToColossus > FADE_FAR) {
      opacity = 1 - Math.min((distToColossus - FADE_FAR) / FADE_FAR, 1);
    }

    opacity = Math.max(0, Math.min(1, opacity));

    return { ...indicator, visible: true, opacity };
  });
}

export function createShrine(defeated = []) {
  return {
    defeated: [...defeated],
    markDefeated(colossusId) {
      if (this.defeated.includes(colossusId)) return this;
      return createShrine([...this.defeated, colossusId]);
    },
    isDefeated(colossusId) {
      return this.defeated.includes(colossusId);
    },
    remainingCount(total) {
      return total - this.defeated.length;
    },
  };
}
