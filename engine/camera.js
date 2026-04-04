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
  };

  constructor(options = {}) {
    const cfg = { ...OrbitCamera.DEFAULTS, ...options };
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

    this._position = { x: 0, y: 0, z: 0 };
    this.currentTarget = { x: 0, y: 0, z: 0 };
  }

  update(dt, inputLook, targetPosition) {
    this.yaw += inputLook.x * this.lookSensitivity * dt;
    this.pitch += inputLook.y * this.lookSensitivity * dt;
    this.pitch = clampPitch(this.pitch, this.minPitch, this.maxPitch);

    const t = 1 - Math.exp(-this.lerpSpeed * dt);
    this.currentTarget.x += (targetPosition.x - this.currentTarget.x) * t;
    this.currentTarget.y += (targetPosition.y - this.currentTarget.y) * t;
    this.currentTarget.z += (targetPosition.z - this.currentTarget.z) * t;

    this._position = orbitCameraPosition(
      this.yaw,
      this.pitch,
      this.distance,
      this.currentTarget
    );

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
