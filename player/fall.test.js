import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  FALL_CONSTANTS,
  enterFall,
  updateFall,
  isFallThresholdBreached,
  findNearestRespawnPoint,
  respawn,
  getFreefallCameraData,
  checkFall,
} from './fall.js';
import { createStaminaState, shouldTriggerFall } from './stamina.js';

function makeState(overrides = {}) {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    isFalling: false,
    fallTime: 0,
    isClimbing: false,
    ...overrides,
  };
}

describe('FALL_CONSTANTS', () => {
  it('FREEFALL_THRESHOLD is a negative number', () => {
    assert.ok(FALL_CONSTANTS.FREEFALL_THRESHOLD < 0);
  });

  it('FALL_GRAVITY_MULTIPLIER is greater than 1', () => {
    assert.ok(FALL_CONSTANTS.FALL_GRAVITY_MULTIPLIER > 1);
  });

  it('MAX_FALL_TIME is a positive number', () => {
    assert.ok(FALL_CONSTANTS.MAX_FALL_TIME > 0);
  });

  it('FREEFALL_CAMERA_ZOOM is greater than 1', () => {
    assert.ok(FALL_CONSTANTS.FREEFALL_CAMERA_ZOOM > 1);
  });

  it('FREEFALL_CAMERA_OFFSET is a positive number', () => {
    assert.ok(FALL_CONSTANTS.FREEFALL_CAMERA_OFFSET > 0);
  });
});

describe('enterFall', () => {
  it('sets isFalling to true', () => {
    const state = makeState();
    const result = enterFall(state);
    assert.strictEqual(result.isFalling, true);
  });

  it('sets isGrounded to false', () => {
    const state = makeState({ isGrounded: true });
    const result = enterFall(state);
    assert.strictEqual(result.isGrounded, false);
  });

  it('sets isClimbing to false', () => {
    const state = makeState({ isClimbing: true });
    const result = enterFall(state);
    assert.strictEqual(result.isClimbing, false);
  });

  it('initializes fallTime to 0', () => {
    const state = makeState();
    const result = enterFall(state);
    assert.strictEqual(result.fallTime, 0);
  });

  it('preserves position', () => {
    const state = makeState({ position: { x: 5, y: 10, z: -3 } });
    const result = enterFall(state);
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.y, 10);
    assert.strictEqual(result.position.z, -3);
  });

  it('preserves horizontal velocity but sets vy to 0', () => {
    const state = makeState({ velocity: { x: 2, y: 5, z: -1 } });
    const result = enterFall(state);
    assert.strictEqual(result.velocity.x, 2);
    assert.strictEqual(result.velocity.y, 0);
    assert.strictEqual(result.velocity.z, -1);
  });

  it('does not mutate the original state', () => {
    const state = makeState();
    enterFall(state);
    assert.strictEqual(state.isFalling, false);
  });

  it('clears climbSurface and climbNormal if present', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: { id: 'rock' },
      climbNormal: { x: 0, y: 1, z: 0 },
    });
    const result = enterFall(state);
    assert.strictEqual(result.climbSurface, null);
    assert.strictEqual(result.climbNormal, null);
  });
});

describe('updateFall', () => {
  it('increments fallTime by dt', () => {
    const state = makeState({ isFalling: true, fallTime: 0 });
    const result = updateFall(state, 0.5, FALL_CONSTANTS);
    assert.strictEqual(result.fallTime, 0.5);
  });

  it('applies gravity scaled by FALL_GRAVITY_MULTIPLIER to velocity', () => {
    const baseGravity = -20;
    const state = makeState({
      isFalling: true,
      fallTime: 0,
      velocity: { x: 0, y: 0, z: 0 },
    });
    const result = updateFall(state, 0.1, FALL_CONSTANTS);
    assert.ok(result.velocity.y < 0, 'velocity should decrease');
    const expectedVy = baseGravity * FALL_CONSTANTS.FALL_GRAVITY_MULTIPLIER * 0.1;
    assert.ok(Math.abs(result.velocity.y - expectedVy) < 1e-6);
  });

  it('updates position based on velocity', () => {
    const state = makeState({
      isFalling: true,
      fallTime: 0,
      position: { x: 0, y: 10, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    });
    const result = updateFall(state, 1, FALL_CONSTANTS);
    assert.ok(result.position.x > 0, 'should have moved horizontally');
    assert.ok(result.position.y < 10, 'should have fallen');
  });

  it('returns unchanged state if not falling', () => {
    const state = makeState({ isFalling: false });
    const result = updateFall(state, 0.1, FALL_CONSTANTS);
    assert.strictEqual(result, state);
  });

  it('does not mutate the original state', () => {
    const state = makeState({
      isFalling: true,
      fallTime: 0,
      velocity: { x: 0, y: 0, z: 0 },
      position: { x: 0, y: 10, z: 0 },
    });
    updateFall(state, 1, FALL_CONSTANTS);
    assert.strictEqual(state.fallTime, 0);
    assert.strictEqual(state.velocity.y, 0);
    assert.strictEqual(state.position.y, 10);
  });
});

describe('isFallThresholdBreached', () => {
  it('returns false when above threshold', () => {
    const pos = { x: 0, y: 0, z: 0 };
    assert.strictEqual(isFallThresholdBreached(pos, -50), false);
  });

  it('returns true when below threshold', () => {
    const pos = { x: 0, y: -60, z: 0 };
    assert.strictEqual(isFallThresholdBreached(pos, -50), true);
  });

  it('returns false when exactly at threshold', () => {
    const pos = { x: 0, y: -50, z: 0 };
    assert.strictEqual(isFallThresholdBreached(pos, -50), false);
  });

  it('uses FREEFALL_THRESHOLD when no threshold provided', () => {
    const pos = { x: 0, y: FALL_CONSTANTS.FREEFALL_THRESHOLD - 1, z: 0 };
    assert.strictEqual(isFallThresholdBreached(pos), true);
  });
});

describe('findNearestRespawnPoint', () => {
  const respawnPoints = [
    { position: { x: 0, y: 5, z: 0 } },
    { position: { x: 10, y: 5, z: 0 } },
    { position: { x: -5, y: 5, z: 0 } },
  ];

  it('returns the nearest respawn point', () => {
    const pos = { x: 8, y: 0, z: 0 };
    const result = findNearestRespawnPoint(pos, respawnPoints);
    assert.strictEqual(result.position.x, 10);
    assert.strictEqual(result.position.z, 0);
  });

  it('returns nearest when player is between two points', () => {
    const pos = { x: 2, y: -100, z: 0 };
    const result = findNearestRespawnPoint(pos, respawnPoints);
    assert.strictEqual(result.position.x, 0);
  });

  it('returns null when respawnPoints is empty', () => {
    const pos = { x: 0, y: 0, z: 0 };
    const result = findNearestRespawnPoint(pos, []);
    assert.strictEqual(result, null);
  });

  it('considers all three axes for distance', () => {
    const points = [
      { position: { x: 0, y: 0, z: 0 } },
      { position: { x: 0, y: 100, z: 0 } },
    ];
    const pos = { x: 0, y: 95, z: 0 };
    const result = findNearestRespawnPoint(pos, points);
    assert.strictEqual(result.position.y, 100);
  });
});

describe('respawn', () => {
  const respawnPoints = [
    { position: { x: 0, y: 5, z: 0 } },
    { position: { x: 10, y: 5, z: 0 } },
  ];

  it('teleports player to nearest respawn point', () => {
    const state = makeState({ position: { x: 8, y: -100, z: 0 } });
    const result = respawn(state, respawnPoints);
    assert.strictEqual(result.position.x, 10);
    assert.strictEqual(result.position.y, 5);
    assert.strictEqual(result.position.z, 0);
  });

  it('resets velocity to zero', () => {
    const state = makeState({
      position: { x: 8, y: -100, z: 0 },
      velocity: { x: 5, y: -20, z: 3 },
    });
    const result = respawn(state, respawnPoints);
    assert.strictEqual(result.velocity.x, 0);
    assert.strictEqual(result.velocity.y, 0);
    assert.strictEqual(result.velocity.z, 0);
  });

  it('sets isFalling to false', () => {
    const state = makeState({
      position: { x: 8, y: -100, z: 0 },
      isFalling: true,
    });
    const result = respawn(state, respawnPoints);
    assert.strictEqual(result.isFalling, false);
  });

  it('sets isGrounded to true', () => {
    const state = makeState({
      position: { x: 8, y: -100, z: 0 },
      isGrounded: false,
    });
    const result = respawn(state, respawnPoints);
    assert.strictEqual(result.isGrounded, true);
  });

  it('resets fallTime to 0', () => {
    const state = makeState({
      position: { x: 8, y: -100, z: 0 },
      fallTime: 3.5,
    });
    const result = respawn(state, respawnPoints);
    assert.strictEqual(result.fallTime, 0);
  });

  it('returns original state if no respawn points', () => {
    const state = makeState({ position: { x: 0, y: -100, z: 0 } });
    const result = respawn(state, []);
    assert.strictEqual(result, state);
  });

  it('does not mutate the original state', () => {
    const state = makeState({ position: { x: 8, y: -100, z: 0 }, velocity: { x: 5, y: -20, z: 3 } });
    respawn(state, respawnPoints);
    assert.strictEqual(state.position.x, 8);
    assert.strictEqual(state.velocity.y, -20);
  });
});

describe('getFreefallCameraData', () => {
  it('returns zoom factor from constants', () => {
    const state = makeState({ isFalling: true, fallTime: 0 });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    assert.strictEqual(data.zoom, FALL_CONSTANTS.FREEFALL_CAMERA_ZOOM);
  });

  it('returns vertical camera offset from constants', () => {
    const state = makeState({ isFalling: true, fallTime: 1 });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    const progress = Math.min(1 / FALL_CONSTANTS.MAX_FALL_TIME, 1);
    assert.ok(Math.abs(data.offsetY - FALL_CONSTANTS.FREEFALL_CAMERA_OFFSET * progress) < 1e-6);
  });

  it('increases zoom as fallTime increases toward MAX_FALL_TIME', () => {
    const state1 = makeState({ isFalling: true, fallTime: 0 });
    const state2 = makeState({ isFalling: true, fallTime: FALL_CONSTANTS.MAX_FALL_TIME * 0.5 });
    const data1 = getFreefallCameraData(state1, FALL_CONSTANTS);
    const data2 = getFreefallCameraData(state2, FALL_CONSTANTS);
    assert.ok(data2.zoom > data1.zoom, 'zoom should increase with fall time');
  });

  it('caps zoom progress at 1 when fallTime >= MAX_FALL_TIME', () => {
    const state = makeState({ isFalling: true, fallTime: FALL_CONSTANTS.MAX_FALL_TIME + 1 });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    const maxZoom = FALL_CONSTANTS.FREEFALL_CAMERA_ZOOM * 1.5;
    assert.ok(data.zoom <= maxZoom, 'zoom should be capped');
  });

  it('returns neutral data when not falling', () => {
    const state = makeState({ isFalling: false });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    assert.strictEqual(data.zoom, 1);
    assert.strictEqual(data.offsetY, 0);
  });

  it('has lookUp property set to true when falling', () => {
    const state = makeState({ isFalling: true, fallTime: 1 });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    assert.strictEqual(data.lookUp, true);
  });

  it('has lookUp property set to false when not falling', () => {
    const state = makeState({ isFalling: false });
    const data = getFreefallCameraData(state, FALL_CONSTANTS);
    assert.strictEqual(data.lookUp, false);
  });
});

describe('checkFall', () => {
  it('returns true when stamina says shouldTriggerFall while climbing', () => {
    const state = makeState({ isClimbing: true });
    const staminaState = createStaminaState({ isDepleted: true, isClimbing: true });
    assert.strictEqual(shouldTriggerFall(staminaState), true);
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldFall, true);
  });

  it('returns true when player is below fall threshold', () => {
    const state = makeState({ position: { x: 0, y: -100, z: 0 } });
    const staminaState = createStaminaState();
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldFall, true);
  });

  it('returns false when player is grounded and above threshold and stamina is fine', () => {
    const state = makeState({ isGrounded: true });
    const staminaState = createStaminaState();
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldFall, false);
  });

  it('returns false when climbing but stamina is not depleted', () => {
    const state = makeState({ isClimbing: true });
    const staminaState = createStaminaState({ isDepleted: false, isClimbing: true });
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldFall, false);
  });

  it('returns shouldRespawn true when below threshold and already falling', () => {
    const state = makeState({
      position: { x: 0, y: -100, z: 0 },
      isFalling: true,
    });
    const staminaState = createStaminaState();
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldRespawn, true);
  });

  it('returns shouldRespawn false when not below threshold', () => {
    const state = makeState({ position: { x: 0, y: 0, z: 0 } });
    const staminaState = createStaminaState();
    const result = checkFall(state, staminaState, FALL_CONSTANTS.FREEFALL_THRESHOLD);
    assert.strictEqual(result.shouldRespawn, false);
  });
});
