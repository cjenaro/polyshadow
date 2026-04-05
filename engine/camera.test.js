import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sphericalToCartesian,
  clampPitch,
  orbitCameraPosition,
  OrbitCamera,
  computeCollisionDistance,
  getContextDistance,
  resolveCameraDistance,
} from "./camera.js";

const EPS = 1e-9;

function approx(a, b, eps = EPS) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (diff ${Math.abs(a - b)})`);
}

describe("sphericalToCartesian", () => {
  it("should return correct position for known yaw/pitch/distance", () => {
    const result = sphericalToCartesian(Math.PI, 0, 10);
    approx(result.x, 0);
    approx(result.y, 0);
    approx(result.z, -10);
  });

  it("should give (0, 0, distance) when pitch=0 and yaw=0", () => {
    const result = sphericalToCartesian(0, 0, 5);
    approx(result.x, 0);
    approx(result.y, 0);
    approx(result.z, 5);
  });

  it("should rotate 90° around Y axis when yaw=PI/2", () => {
    const result = sphericalToCartesian(Math.PI / 2, 0, 10);
    approx(result.x, 10);
    approx(result.y, 0);
    approx(result.z, 0);
  });

  it("should raise camera up when pitch=PI/4", () => {
    const result = sphericalToCartesian(0, Math.PI / 4, 10);
    approx(result.x, 0);
    approx(result.y, Math.sin(Math.PI / 4) * 10);
    approx(result.z, Math.cos(Math.PI / 4) * 10);
  });
});

describe("clampPitch", () => {
  it("should not clamp values within range", () => {
    assert.equal(clampPitch(0.5, -1.48, 1.48), 0.5);
  });

  it("should clamp values above max", () => {
    assert.equal(clampPitch(2.0, -1.48, 1.48), 1.48);
  });

  it("should clamp values below min", () => {
    assert.equal(clampPitch(-2.0, -1.48, 1.48), -1.48);
  });

  it("should handle edge cases exactly at limits", () => {
    assert.equal(clampPitch(1.48, -1.48, 1.48), 1.48);
    assert.equal(clampPitch(-1.48, -1.48, 1.48), -1.48);
  });
});

describe("orbitCameraPosition", () => {
  it("should offset from target correctly", () => {
    const target = { x: 10, y: 5, z: 0 };
    const result = orbitCameraPosition(0, 0, 5, target);
    approx(result.x, 10);
    approx(result.y, 5);
    approx(result.z, 5);
  });

  it("should orbit around target position", () => {
    const target = { x: 0, y: 0, z: 0 };
    const result = orbitCameraPosition(Math.PI / 2, 0, 10, target);
    approx(result.x, 10);
    approx(result.y, 0);
    approx(result.z, 0);
  });
});

describe("OrbitCamera", () => {
  it("constructor sets defaults", () => {
    const cam = new OrbitCamera();
    approx(cam.yaw, 0);
    approx(cam.pitch, 0.3);
    approx(cam.distance, 10);
    approx(cam.minDistance, 2);
    approx(cam.maxDistance, 30);
    approx(cam.lerpSpeed, 5);
  });

  it("constructor accepts custom options", () => {
    const cam = new OrbitCamera({ distance: 20, yaw: 1.5, pitch: 0.5, lerpSpeed: 3 });
    approx(cam.distance, 20);
    approx(cam.yaw, 1.5);
    approx(cam.pitch, 0.5);
    approx(cam.lerpSpeed, 3);
  });

  it("update() with look input changes yaw and pitch", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0 });
    const result = cam.update(0.016, { x: 1, y: 0.5 }, { x: 0, y: 0, z: 0 });
    assert.ok(cam.yaw !== 0, "yaw should change");
    assert.ok(cam.pitch !== 0, "pitch should change");
  });

  it("pitch is clamped during update", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, minPitch: -1.48, maxPitch: 1.48 });
    cam.update(0.016, { x: 0, y: 100 }, { x: 0, y: 0, z: 0 });
    assert.ok(cam.pitch <= 1.48, `pitch ${cam.pitch} should be <= 1.48`);
  });

  it("position is calculated correctly after update", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 5, lerpSpeed: 1000 });
    const result = cam.update(1, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    approx(result.position.x, 0);
    approx(result.position.y, 0);
    approx(result.position.z, 5);
    approx(result.target.x, 0);
    approx(result.target.y, 0);
    approx(result.target.z, 0);
  });

  it("setDistance clamps to min/max", () => {
    const cam = new OrbitCamera({ minDistance: 2, maxDistance: 30 });
    cam.setDistance(0.5);
    approx(cam.distance, 2);
    cam.setDistance(50);
    approx(cam.distance, 30);
  });

  it("getPosition returns current position", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 5, lerpSpeed: 1000 });
    cam.update(1, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    const pos = cam.getPosition();
    approx(pos.x, 0);
    approx(pos.y, 0);
    approx(pos.z, 5);
  });

  it("getTarget returns current target", () => {
    const cam = new OrbitCamera({ lerpSpeed: 1000 });
    cam.update(1, { x: 0, y: 0 }, { x: 3, y: 7, z: -2 });
    const target = cam.getTarget();
    approx(target.x, 3);
    approx(target.y, 7);
    approx(target.z, -2);
  });

  it("camera smoothly follows target with lerp", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 10, lerpSpeed: 5 });
    const startPos = { x: 0, y: 0, z: 10 };
    cam.currentTarget = { x: 0, y: 0, z: 0 };
    cam.update(0.016, { x: 0, y: 0 }, { x: 0, y: 0, z: 100 });
    const target = cam.currentTarget;
    assert.ok(target.z < 100, `target.z ${target.z} should be less than 100 (lerped)`);
    assert.ok(target.z > 0, `target.z ${target.z} should be greater than 0`);
  });

  it("snapToTarget instantly moves target without lerp", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 5, lerpSpeed: 1 });
    cam.snapToTarget({ x: 10, y: 20, z: 30 });
    const target = cam.getTarget();
    approx(target.x, 10);
    approx(target.y, 20);
    approx(target.z, 30);
    const pos = cam.getPosition();
    approx(pos.x, 10);
    approx(pos.y, 20);
    approx(pos.z, 35);
  });

  it("snapToTarget updates internal position to correct orbit position", () => {
    const cam = new OrbitCamera({ yaw: Math.PI / 2, pitch: 0, distance: 5 });
    cam.snapToTarget({ x: 0, y: 0, z: 0 });
    const pos = cam.getPosition();
    approx(pos.x, 5);
    approx(pos.y, 0);
    approx(pos.z, 0);
  });

  it("setContext changes context and returns new distance", () => {
    const cam = new OrbitCamera({ distance: 10 });
    const result = cam.setContext("climbing");
    assert.equal(cam.context, "climbing");
    assert.ok(result < 10, `climbing distance ${result} should be less than 10`);
  });

  it("update uses raycastFn for collision avoidance", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 15, lerpSpeed: 1000 });
    cam.update(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0, z: 0 },
      {
        raycastFn: (origin, direction) => ({ distance: 5 }),
      },
    );
    const pos = cam.getPosition();
    assert.ok(pos.z < 15, `position.z ${pos.z} should be less than 15 due to collision`);
    assert.ok(pos.z > 0, `position.z ${pos.z} should be positive`);
  });

  it("update passes through when no collision", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 15, lerpSpeed: 1000 });
    cam.update(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0, z: 0 },
      {
        raycastFn: () => null,
      },
    );
    const pos = cam.getPosition();
    approx(pos.z, 15);
  });

  it("collision avoidance respects minDistance", () => {
    const cam = new OrbitCamera({
      yaw: 0,
      pitch: 0,
      distance: 15,
      minDistance: 3,
      lerpSpeed: 1000,
    });
    cam.update(
      1,
      { x: 0, y: 0 },
      { x: 0, y: 0, z: 0 },
      {
        raycastFn: (origin, direction) => ({ distance: 0.5 }),
      },
    );
    const pos = cam.getPosition();
    assert.ok(pos.z >= 3, `position.z ${pos.z} should be >= minDistance 3`);
  });

  it("update without options still works (backward compat)", () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 10, lerpSpeed: 1000 });
    const result = cam.update(1, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    approx(result.position.z, 10);
  });

  it("setContext with custom distances option", () => {
    const cam = new OrbitCamera({
      distance: 10,
      contextDistances: {
        exploration: 15,
        climbing: 4,
      },
    });
    cam.setContext("exploration");
    approx(cam.targetDistance, 15);
  });

  it("setContext with unknown context returns current distance", () => {
    const cam = new OrbitCamera({ distance: 10 });
    const result = cam.setContext("unknown");
    approx(result, 10);
  });

  it("distance lerps toward targetDistance over time", () => {
    const cam = new OrbitCamera({ distance: 15, contextDistances: { exploration: 5 } });
    cam.setContext("exploration");
    cam.update(0.016, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    assert.ok(cam.distance < 15, `distance ${cam.distance} should move toward 5`);
    assert.ok(cam.distance > 5, `distance ${cam.distance} should not reach 5 instantly`);
  });
});

describe("computeCollisionDistance", () => {
  it("returns desiredDistance when no hit", () => {
    assert.equal(computeCollisionDistance(10, null, 0.2), 10);
  });

  it("returns hit distance minus offset when hit is before desired", () => {
    assert.equal(computeCollisionDistance(10, 6, 0.5), 5.5);
  });

  it("returns desiredDistance when hit is beyond desired", () => {
    assert.equal(computeCollisionDistance(5, 8, 0.2), 5);
  });

  it("respects minDistance", () => {
    assert.equal(computeCollisionDistance(10, 1, 0.2, 3), 3);
  });

  it("handles hit at exactly offset distance", () => {
    assert.equal(computeCollisionDistance(10, 1, 1, 0), 0);
  });

  it("default offset is 0.2", () => {
    assert.equal(computeCollisionDistance(10, 6, undefined, 0), 5.8);
  });
});

describe("getContextDistance", () => {
  it("returns climbing distance for climbing context", () => {
    const d = getContextDistance("climbing", { exploration: 12, climbing: 5, combat: 8 });
    approx(d, 5);
  });

  it("returns exploration distance for exploration context", () => {
    const d = getContextDistance("exploration", { exploration: 12, climbing: 5 });
    approx(d, 12);
  });

  it("returns combat distance for combat context", () => {
    const d = getContextDistance("combat", { exploration: 12, climbing: 5, combat: 8 });
    approx(d, 8);
  });

  it("returns defaultDistance for unknown context", () => {
    const d = getContextDistance("swimming", { exploration: 12, climbing: 5 }, 10);
    approx(d, 10);
  });

  it("returns 0 when no default and unknown context", () => {
    const d = getContextDistance("flying", { exploration: 12 });
    approx(d, 0);
  });
});

describe("resolveCameraDistance", () => {
  it("lerps toward target distance", () => {
    const result = resolveCameraDistance(10, 5, 0.5, 2, 30);
    assert.ok(result < 10, `${result} should be < 10`);
    assert.ok(result > 5, `${result} should be > 5`);
  });

  it("clamps to minDistance", () => {
    const result = resolveCameraDistance(10, 1, 0.5, 3, 30);
    assert.ok(result >= 3, `${result} should be >= 3`);
  });

  it("clamps to maxDistance", () => {
    const result = resolveCameraDistance(10, 50, 0.5, 2, 30);
    assert.ok(result <= 30, `${result} should be <= 30`);
  });

  it("returns current when already at target", () => {
    const result = resolveCameraDistance(5, 5, 0.5, 2, 30);
    approx(result, 5);
  });
});
