import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sphericalToCartesian,
  clampPitch,
  orbitCameraPosition,
  OrbitCamera
} from './camera.js';

const EPS = 1e-9;

function approx(a, b, eps = EPS) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (diff ${Math.abs(a - b)})`);
}

describe('sphericalToCartesian', () => {
  it('should return correct position for known yaw/pitch/distance', () => {
    const result = sphericalToCartesian(Math.PI, 0, 10);
    approx(result.x, 0);
    approx(result.y, 0);
    approx(result.z, -10);
  });

  it('should give (0, 0, distance) when pitch=0 and yaw=0', () => {
    const result = sphericalToCartesian(0, 0, 5);
    approx(result.x, 0);
    approx(result.y, 0);
    approx(result.z, 5);
  });

  it('should rotate 90° around Y axis when yaw=PI/2', () => {
    const result = sphericalToCartesian(Math.PI / 2, 0, 10);
    approx(result.x, 10);
    approx(result.y, 0);
    approx(result.z, 0);
  });

  it('should raise camera up when pitch=PI/4', () => {
    const result = sphericalToCartesian(0, Math.PI / 4, 10);
    approx(result.x, 0);
    approx(result.y, Math.sin(Math.PI / 4) * 10);
    approx(result.z, Math.cos(Math.PI / 4) * 10);
  });
});

describe('clampPitch', () => {
  it('should not clamp values within range', () => {
    assert.equal(clampPitch(0.5, -1.48, 1.48), 0.5);
  });

  it('should clamp values above max', () => {
    assert.equal(clampPitch(2.0, -1.48, 1.48), 1.48);
  });

  it('should clamp values below min', () => {
    assert.equal(clampPitch(-2.0, -1.48, 1.48), -1.48);
  });

  it('should handle edge cases exactly at limits', () => {
    assert.equal(clampPitch(1.48, -1.48, 1.48), 1.48);
    assert.equal(clampPitch(-1.48, -1.48, 1.48), -1.48);
  });
});

describe('orbitCameraPosition', () => {
  it('should offset from target correctly', () => {
    const target = { x: 10, y: 5, z: 0 };
    const result = orbitCameraPosition(0, 0, 5, target);
    approx(result.x, 10);
    approx(result.y, 5);
    approx(result.z, 5);
  });

  it('should orbit around target position', () => {
    const target = { x: 0, y: 0, z: 0 };
    const result = orbitCameraPosition(Math.PI / 2, 0, 10, target);
    approx(result.x, 10);
    approx(result.y, 0);
    approx(result.z, 0);
  });
});

describe('OrbitCamera', () => {
  it('constructor sets defaults', () => {
    const cam = new OrbitCamera();
    approx(cam.yaw, 0);
    approx(cam.pitch, 0.3);
    approx(cam.distance, 10);
    approx(cam.minDistance, 2);
    approx(cam.maxDistance, 30);
    approx(cam.lerpSpeed, 5);
  });

  it('constructor accepts custom options', () => {
    const cam = new OrbitCamera({ distance: 20, yaw: 1.5, pitch: 0.5, lerpSpeed: 3 });
    approx(cam.distance, 20);
    approx(cam.yaw, 1.5);
    approx(cam.pitch, 0.5);
    approx(cam.lerpSpeed, 3);
  });

  it('update() with look input changes yaw and pitch', () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0 });
    const result = cam.update(0.016, { x: 1, y: 0.5 }, { x: 0, y: 0, z: 0 });
    assert.ok(cam.yaw !== 0, 'yaw should change');
    assert.ok(cam.pitch !== 0, 'pitch should change');
  });

  it('pitch is clamped during update', () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, minPitch: -1.48, maxPitch: 1.48 });
    cam.update(0.016, { x: 0, y: 100 }, { x: 0, y: 0, z: 0 });
    assert.ok(cam.pitch <= 1.48, `pitch ${cam.pitch} should be <= 1.48`);
  });

  it('position is calculated correctly after update', () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 5, lerpSpeed: 1000 });
    const result = cam.update(1, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    approx(result.position.x, 0);
    approx(result.position.y, 0);
    approx(result.position.z, 5);
    approx(result.target.x, 0);
    approx(result.target.y, 0);
    approx(result.target.z, 0);
  });

  it('setDistance clamps to min/max', () => {
    const cam = new OrbitCamera({ minDistance: 2, maxDistance: 30 });
    cam.setDistance(0.5);
    approx(cam.distance, 2);
    cam.setDistance(50);
    approx(cam.distance, 30);
  });

  it('getPosition returns current position', () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 5, lerpSpeed: 1000 });
    cam.update(1, { x: 0, y: 0 }, { x: 0, y: 0, z: 0 });
    const pos = cam.getPosition();
    approx(pos.x, 0);
    approx(pos.y, 0);
    approx(pos.z, 5);
  });

  it('getTarget returns current target', () => {
    const cam = new OrbitCamera({ lerpSpeed: 1000 });
    cam.update(1, { x: 0, y: 0 }, { x: 3, y: 7, z: -2 });
    const target = cam.getTarget();
    approx(target.x, 3);
    approx(target.y, 7);
    approx(target.z, -2);
  });

  it('camera smoothly follows target with lerp', () => {
    const cam = new OrbitCamera({ yaw: 0, pitch: 0, distance: 10, lerpSpeed: 5 });
    const startPos = { x: 0, y: 0, z: 10 };
    cam.currentTarget = { x: 0, y: 0, z: 0 };
    cam.update(0.016, { x: 0, y: 0 }, { x: 0, y: 0, z: 100 });
    const target = cam.currentTarget;
    assert.ok(target.z < 100, `target.z ${target.z} should be less than 100 (lerped)`);
    assert.ok(target.z > 0, `target.z ${target.z} should be greater than 0`);
  });
});
