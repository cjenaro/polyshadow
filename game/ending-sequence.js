const PHASE_ACTIVE = 0;
const PHASE_SKY_OPENING = 1;
const PHASE_ISLANDS_CONVERGING = 4;
const PHASE_CREDITS = 8;
const PHASE_COMPLETE = 18;
const CREDITS_FADE_DURATION = 3;

export function createEndingState() {
  return { phase: "active", elapsed: 0 };
}

export function updateEndingState(state, dt, defeatedColossiPositions, hubPosition) {
  const next = { ...state, elapsed: state.elapsed + dt };

  if (next.elapsed >= PHASE_COMPLETE) {
    next.phase = "complete";
  } else if (next.elapsed >= PHASE_CREDITS) {
    next.phase = "credits";
  } else if (next.elapsed >= PHASE_ISLANDS_CONVERGING) {
    next.phase = "islandsConverging";
  } else if (next.elapsed >= PHASE_SKY_OPENING) {
    next.phase = "skyOpening";
  } else {
    next.phase = "active";
  }

  return next;
}

export function getSkyConfig(state) {
  const t = state.elapsed;

  let fogDensity = 1;
  let cosmicTint = 0;
  let goldenTint = 0;
  let starBrightness = 0;

  if (t >= PHASE_SKY_OPENING && t < PHASE_ISLANDS_CONVERGING) {
    const p = (t - PHASE_SKY_OPENING) / (PHASE_ISLANDS_CONVERGING - PHASE_SKY_OPENING);
    cosmicTint = p;
    fogDensity = 1 - p * 0.8;
  } else if (t >= PHASE_ISLANDS_CONVERGING && t < PHASE_CREDITS) {
    const p = (t - PHASE_ISLANDS_CONVERGING) / (PHASE_CREDITS - PHASE_ISLANDS_CONVERGING);
    cosmicTint = 1;
    fogDensity = 0.2 - p * 0.2;
    goldenTint = p * 0.3;
    starBrightness = p * 0.5;
  } else if (t >= PHASE_CREDITS) {
    cosmicTint = 1;
    fogDensity = 0;
    goldenTint = 0.3;
    starBrightness = 0.5 + Math.min((t - PHASE_CREDITS) / 5, 1) * 0.5;
  }

  return { fogDensity, cosmicTint, goldenTint, starBrightness };
}

export function getIslandPositions(state, originalPositions, hubPosition) {
  const t = state.elapsed;

  if (t < PHASE_ISLANDS_CONVERGING) {
    return originalPositions.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  }

  let progress;
  if (t < PHASE_CREDITS) {
    progress = (t - PHASE_ISLANDS_CONVERGING) / (PHASE_CREDITS - PHASE_ISLANDS_CONVERGING);
  } else {
    progress = 1;
  }

  const eased = easeInOutCubic(progress);

  return originalPositions.map((p) => ({
    x: p.x + (hubPosition.x - p.x) * eased,
    y: p.y,
    z: p.z + (hubPosition.z - p.z) * eased,
  }));
}

export function getCreditsAlpha(state) {
  if (state.phase !== "credits" && state.phase !== "complete") return 0;

  const fadeElapsed = state.elapsed - PHASE_CREDITS;
  return Math.min(1, fadeElapsed / CREDITS_FADE_DURATION);
}

export function shouldShowCredits(state) {
  return state.phase === "credits" || state.phase === "complete";
}

export function isEndingComplete(state) {
  return state.phase === "complete";
}

export function skipEnding(state) {
  if (state.phase === "credits" || state.phase === "complete") {
    return { ...state };
  }
  return updateEndingState({ ...state, elapsed: 0 }, PHASE_CREDITS, [], { x: 0, y: 0, z: 0 });
}

export function shouldShowSkipHint(state) {
  return (
    state.phase === "active" || state.phase === "skyOpening" || state.phase === "islandsConverging"
  );
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
