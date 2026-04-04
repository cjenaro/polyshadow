import { lerp, clamp, smoothstep, randomRange } from '../utils/math.js';

export const DEATH_PHASES = {
  KNEEL: 'kneel',
  COLLAPSE: 'collapse',
  DISSOLVE: 'dissolve',
  FALLEN: 'fallen',
};

const KNEEL_DURATION = 2;
const COLLAPSE_DURATION = 2;
const DISSOLVE_DURATION = 3;
const COLLAPSE_START = KNEEL_DURATION;
const DISSOLVE_START = COLLAPSE_START + COLLAPSE_DURATION;
const FALLEN_START = DISSOLVE_START + DISSOLVE_DURATION;

const LEG_PARTS = new Set([
  'front_left_upper', 'front_left_lower',
  'front_right_upper', 'front_right_lower',
  'back_left_upper', 'back_left_lower',
  'back_right_upper', 'back_right_lower',
]);

const HEAD_PARTS = new Set(['head']);

export function createDeathState(overrides = {}) {
  return {
    phase: DEATH_PHASES.KNEEL,
    timer: 0,
    partOffsets: {},
    dissolveProgress: 0,
    shakeIntensity: 0,
    ...overrides,
  };
}

export function updateDeathAnimation(state, dt) {
  if (state.phase === DEATH_PHASES.FALLEN) {
    return state;
  }

  let timer = state.timer + dt;
  let phase = state.phase;
  let dissolveProgress = state.dissolveProgress;
  let shakeIntensity = state.shakeIntensity;

  if (timer >= FALLEN_START) {
    phase = DEATH_PHASES.FALLEN;
    dissolveProgress = 1;
    shakeIntensity = 0;
    timer = FALLEN_START;
  } else if (timer >= DISSOLVE_START) {
    phase = DEATH_PHASES.DISSOLVE;
    const t = (timer - DISSOLVE_START) / DISSOLVE_DURATION;
    dissolveProgress = clamp(t, 0, 1);
    shakeIntensity = 0;
  } else if (timer >= COLLAPSE_START) {
    phase = DEATH_PHASES.COLLAPSE;
    const t = (timer - COLLAPSE_START) / COLLAPSE_DURATION;
    shakeIntensity = Math.sin(t * Math.PI) * 2.0;
  } else {
    phase = DEATH_PHASES.KNEEL;
    shakeIntensity = 0;
  }

  return {
    ...state,
    timer,
    phase,
    dissolveProgress,
    shakeIntensity,
  };
}

export function getPartTransform(partId, basePosition, baseRotation, state) {
  let posX = basePosition.x;
  let posY = basePosition.y;
  let posZ = basePosition.z;
  let rotX = baseRotation.x;
  let rotY = baseRotation.y;
  let rotZ = baseRotation.z;
  let opacity = 1;

  const isLeg = LEG_PARTS.has(partId);
  const isHead = HEAD_PARTS.has(partId);

  if (state.timer > 0) {
    if (state.phase === DEATH_PHASES.KNEEL) {
      const t = clamp(state.timer / KNEEL_DURATION, 0, 1);
      const eased = smoothstep(0, 1, t);

      if (isLeg) {
        posY -= eased * basePosition.y * 0.4;
        rotX = eased * 0.3;
      }

      if (isHead) {
        rotX = eased * 0.5;
        posY -= eased * 0.5;
      }

      if (!isLeg && !isHead) {
        posY -= eased * basePosition.y * 0.15;
      }
    }

    if (state.phase === DEATH_PHASES.COLLAPSE || state.phase === DEATH_PHASES.DISSOLVE || state.phase === DEATH_PHASES.FALLEN) {
      const collapseT = clamp((state.timer - COLLAPSE_START) / COLLAPSE_DURATION, 0, 1);
      const collapseEased = smoothstep(0, 1, collapseT);

      if (!isLeg && !isHead) {
        posY = lerp(posY, 1.0, collapseEased);
      } else if (isLeg) {
        posY = lerp(posY, 0.5, collapseEased);
      } else if (isHead) {
        posY = lerp(posY, 1.5, collapseEased);
        rotX = lerp(rotX, 1.2, collapseEased);
      }
    }
  }

  if (state.phase === DEATH_PHASES.DISSOLVE || state.phase === DEATH_PHASES.FALLEN) {
    opacity = 1 - state.dissolveProgress;
  }

  return {
    position: { x: posX, y: posY, z: posZ },
    rotation: { x: rotX, y: rotY, z: rotZ },
    opacity,
  };
}

export function getDeathShakeIntensity(state) {
  return state.shakeIntensity;
}

export function isDeathComplete(state) {
  return state.phase === DEATH_PHASES.FALLEN;
}
