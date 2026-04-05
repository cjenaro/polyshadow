export function sphericalToCartesian(yaw, pitch, distance) {
  const x = Math.sin(yaw) * Math.cos(pitch) * distance;
  const y = Math.sin(pitch) * distance;
  const z = Math.cos(yaw) * Math.cos(pitch) * distance;
  return { x, y, z };
}

export function clampPitch(pitch, min, max) {
  return Math.max(min, Math.min(max, pitch));
}

export function orbitCameraPosition(yaw, pitch, distance, target) {
  const offset = sphericalToCartesian(yaw, pitch, distance);
  return {
    x: target.x + offset.x,
    y: target.y + offset.y,
    z: target.z + offset.z,
  };
}

export function computeCollisionDistance(
  desiredDistance,
  hitDistance,
  offset = 0.2,
  minDistance = 0,
) {
  if (hitDistance == null || hitDistance >= desiredDistance) {
    return desiredDistance;
  }
  return Math.max(minDistance, hitDistance - offset);
}

export function getContextDistance(context, distanceMap, defaultDistance = 0) {
  if (context in distanceMap) return distanceMap[context];
  return defaultDistance;
}

export function resolveCameraDistance(
  currentDistance,
  targetDistance,
  lerpFactor,
  minDistance,
  maxDistance,
) {
  const next = currentDistance + (targetDistance - currentDistance) * lerpFactor;
  return Math.max(minDistance, Math.min(maxDistance, next));
}

export class OrbitCamera {
  static DEFAULTS = {
    distance: 10,
    minDistance: 2,
    maxDistance: 30,
    yaw: 0,
    pitch: 0.3,
    minPitch: -1.4835,
    maxPitch: 1.4835,
    lerpSpeed: 5,
    collisionLayers: [],
    lookSensitivity: 2.0,
    distanceLerpSpeed: 5,
    collisionOffset: 0.2,
    contextDistances: {
      exploration: 12,
      climbing: 5,
      combat: 8,
    },
  };

  constructor(options = {}) {
    const cfg = { ...OrbitCamera.DEFAULTS, ...options };
    if (options.contextDistances) {
      cfg.contextDistances = {
        ...OrbitCamera.DEFAULTS.contextDistances,
        ...options.contextDistances,
      };
    }
    this.distance = cfg.distance;
    this.minDistance = cfg.minDistance;
    this.maxDistance = cfg.maxDistance;
    this.yaw = cfg.yaw;
    this.pitch = cfg.pitch;
    this.minPitch = cfg.minPitch;
    this.maxPitch = cfg.maxPitch;
    this.lerpSpeed = cfg.lerpSpeed;
    this.lookSensitivity = cfg.lookSensitivity;
    this.collisionLayers = cfg.collisionLayers;
    this.distanceLerpSpeed = cfg.distanceLerpSpeed;
    this.collisionOffset = cfg.collisionOffset;
    this.contextDistances = cfg.contextDistances;

    this._position = { x: 0, y: 0, z: 0 };
    this.currentTarget = { x: 0, y: 0, z: 0 };
    this.targetDistance = cfg.distance;
    this.context = "exploration";
  }

  setContext(newContext) {
    this.context = newContext;
    this.targetDistance = getContextDistance(newContext, this.contextDistances, this.distance);
    return this.targetDistance;
  }

  snapToTarget(position) {
    this.currentTarget = { x: position.x, y: position.y, z: position.z };
    this._position = orbitCameraPosition(this.yaw, this.pitch, this.distance, this.currentTarget);
  }

  update(dt, inputLook, targetPosition, options) {
    this.yaw += inputLook.x * this.lookSensitivity * dt;
    this.pitch += inputLook.y * this.lookSensitivity * dt;
    this.pitch = clampPitch(this.pitch, this.minPitch, this.maxPitch);

    const t = 1 - Math.exp(-this.lerpSpeed * dt);
    this.currentTarget.x += (targetPosition.x - this.currentTarget.x) * t;
    this.currentTarget.y += (targetPosition.y - this.currentTarget.y) * t;
    this.currentTarget.z += (targetPosition.z - this.currentTarget.z) * t;

    const distFactor = 1 - Math.exp(-this.distanceLerpSpeed * dt);
    let effectiveDistance = this.distance;

    if (this.targetDistance !== this.distance) {
      effectiveDistance = resolveCameraDistance(
        this.distance,
        this.targetDistance,
        distFactor,
        this.minDistance,
        this.maxDistance,
      );
    }

    if (options?.raycastFn) {
      const desiredPos = orbitCameraPosition(
        this.yaw,
        this.pitch,
        effectiveDistance,
        this.currentTarget,
      );
      const dir = {
        x: desiredPos.x - this.currentTarget.x,
        y: desiredPos.y - this.currentTarget.y,
        z: desiredPos.z - this.currentTarget.z,
      };
      const hit = options.raycastFn(this.currentTarget, dir);
      effectiveDistance = computeCollisionDistance(
        effectiveDistance,
        hit?.distance ?? null,
        this.collisionOffset,
        this.minDistance,
      );
    }

    this.distance = effectiveDistance;

    this._position = orbitCameraPosition(this.yaw, this.pitch, this.distance, this.currentTarget);

    return {
      position: { x: this._position.x, y: this._position.y, z: this._position.z },
      target: { x: this.currentTarget.x, y: this.currentTarget.y, z: this.currentTarget.z },
    };
  }

  setDistance(distance) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
  }

  getPosition() {
    return { x: this._position.x, y: this._position.y, z: this._position.z };
  }

  getTarget() {
    return { x: this.currentTarget.x, y: this.currentTarget.y, z: this.currentTarget.z };
  }
}
