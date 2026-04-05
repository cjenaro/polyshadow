export const TRANSITION_STATES = {
  IDLE: "idle",
  FADING_OUT: "fading_out",
  TELEPORTING: "teleporting",
  FADING_IN: "fading_in",
  IN_ARENA: "in_arena",
};

export function createArenaTransitionManager(options = {}) {
  return {
    state: TRANSITION_STATES.IDLE,
    progress: 0,
    currentArena: null,
    returningToHub: false,
    fadeDuration: options.fadeDuration || 1,
    teleportDelay: options.teleportDelay || 0.2,
  };
}

export function startTransitionToArena(mgr, arenaType, arenaConfigs, defeated = new Set()) {
  if (mgr.state !== TRANSITION_STATES.IDLE) return mgr;
  if (defeated.has(arenaType)) return mgr;

  const config = arenaConfigs.find((c) => c.type === arenaType);
  if (!config) return mgr;

  return {
    ...mgr,
    state: TRANSITION_STATES.FADING_OUT,
    currentArena: arenaType,
    arenaCenter: config.center,
    returningToHub: false,
    progress: 0,
  };
}

export function startTransitionToHub(mgr) {
  if (mgr.state !== TRANSITION_STATES.IN_ARENA) return mgr;

  return {
    ...mgr,
    state: TRANSITION_STATES.FADING_OUT,
    returningToHub: true,
    progress: 0,
  };
}

export function updateArenaTransition(mgr, dt) {
  if (mgr.state === TRANSITION_STATES.IDLE || mgr.state === TRANSITION_STATES.IN_ARENA) {
    return mgr;
  }

  const newProgress = mgr.progress + dt;

  if (mgr.state === TRANSITION_STATES.FADING_OUT) {
    if (newProgress >= mgr.fadeDuration) {
      return {
        ...mgr,
        state: TRANSITION_STATES.TELEPORTING,
        progress: 0,
      };
    }
    return { ...mgr, progress: newProgress };
  }

  if (mgr.state === TRANSITION_STATES.TELEPORTING) {
    if (newProgress >= mgr.teleportDelay) {
      return {
        ...mgr,
        state: TRANSITION_STATES.FADING_IN,
        progress: 0,
      };
    }
    return { ...mgr, progress: newProgress };
  }

  if (mgr.state === TRANSITION_STATES.FADING_IN) {
    if (newProgress >= mgr.fadeDuration) {
      if (mgr.returningToHub) {
        return {
          ...createArenaTransitionManager({
            fadeDuration: mgr.fadeDuration,
            teleportDelay: mgr.teleportDelay,
          }),
        };
      }
      return {
        ...mgr,
        state: TRANSITION_STATES.IN_ARENA,
        progress: 0,
      };
    }
    return { ...mgr, progress: newProgress };
  }

  return mgr;
}

export function getTransitionProgress(mgr) {
  if (mgr.state === TRANSITION_STATES.IDLE || mgr.state === TRANSITION_STATES.IN_ARENA) return 0;
  if (mgr.state === TRANSITION_STATES.TELEPORTING) return 1;

  const normalized = Math.min(mgr.progress / mgr.fadeDuration, 1);
  if (mgr.state === TRANSITION_STATES.FADING_IN) return 1 - normalized;
  return normalized;
}

export function isTransitioning(mgr) {
  return mgr.state !== TRANSITION_STATES.IDLE && mgr.state !== TRANSITION_STATES.IN_ARENA;
}

export function shouldTriggerArenaEntry(playerPos, arenaConfigs, defeated, triggerDistance = 15) {
  let closest = null;
  let closestDist = triggerDistance;

  for (const config of arenaConfigs) {
    if (defeated.has(config.type)) continue;

    const dx = playerPos.x - config.center.x;
    const dz = playerPos.z - config.center.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < closestDist) {
      closestDist = dist;
      closest = config.type;
    }
  }

  return closest;
}

export function shouldTriggerHubReturn(mgr, defeatedType, defeated) {
  if (mgr.state !== TRANSITION_STATES.IN_ARENA) return false;
  if (isTransitioning(mgr)) return false;
  return mgr.currentArena === defeatedType;
}

export function getArenaSpawnPoint(arenaCenter) {
  const angle = -Math.PI / 2;
  const r = 35;
  return {
    x: arenaCenter.x + Math.cos(angle) * r,
    y: 2,
    z: arenaCenter.z + Math.sin(angle) * r,
  };
}

export function getHubSpawnPoint() {
  return { x: 0, y: 2, z: 0 };
}
