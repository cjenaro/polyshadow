import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  CLIMB_CONFIG,
  createClimbingState,
  updateClimbing,
  isPlayerClimbing,
} from './climbing-integration.js';

function makePlayerState(overrides = {}) {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: 0,
    isGrounded: true,
    isSprinting: false,
    isJumping: false,
    ...overrides,
  };
}

function makeClimbingState(overrides = {}) {
  return { isClimbing: false, climbGrabTime: 0, ...overrides };
}

function makeInput(overrides = {}) {
  return {
    move: { x: 0, y: 0 },
    action: false,
    jump: false,
    sprint: false,
    ...overrides,
  };
}

function makeStaminaState(overrides = {}) {
  return {
    current: 100,
    isDepleted: false,
    depletedTimer: 0,
    isClimbing: false,
    ...overrides,
  };
}

function makeSurface(overrides = {}) {
  return {
    position: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 0, z: -1 },
    climbable: true,
    ...overrides,
  };
}

describe('CLIMB_CONFIG', () => {
  it('has correct default values', () => {
    assert.strictEqual(CLIMB_CONFIG.MAX_GRAB_DISTANCE, 5);
    assert.strictEqual(CLIMB_CONFIG.MAX_JUMP_DISTANCE, 8);
    assert.strictEqual(CLIMB_CONFIG.CLIMB_SPEED, 3);
  });
});

describe('createClimbingState', () => {
  it('returns initial state with isClimbing false and climbGrabTime 0', () => {
    const state = createClimbingState();
    assert.strictEqual(state.isClimbing, false);
    assert.strictEqual(state.climbGrabTime, 0);
  });
});

describe('isPlayerClimbing', () => {
  it('returns false when not climbing', () => {
    assert.strictEqual(isPlayerClimbing(createClimbingState()), false);
  });

  it('returns true when climbing', () => {
    assert.strictEqual(isPlayerClimbing(makeClimbingState({ isClimbing: true })), true);
  });
});

describe('updateClimbing', () => {
  it('returns both playerState and climbingState', () => {
    const result = updateClimbing(
      makePlayerState(), makeClimbingState(), makeInput(), makeStaminaState(), [], 0.1
    );
    assert.ok('playerState' in result);
    assert.ok('climbingState' in result);
  });

  it('does not start climbing when action is not pressed', () => {
    const result = updateClimbing(
      makePlayerState(),
      makeClimbingState(),
      makeInput({ action: false }),
      makeStaminaState(),
      [makeSurface({ position: { x: 0, y: 0, z: -2 } })],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, false);
  });

  it('does not start climbing when no surfaces in range', () => {
    const result = updateClimbing(
      makePlayerState(),
      makeClimbingState(),
      makeInput({ action: true }),
      makeStaminaState(),
      [makeSurface({ position: { x: 0, y: 0, z: -100 } })],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, false);
  });

  it('starts climbing when action pressed and surface in range', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const result = updateClimbing(
      makePlayerState(),
      makeClimbingState(),
      makeInput({ action: true }),
      makeStaminaState(),
      [surface],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, true);
    assert.strictEqual(result.climbingState.climbGrabTime, 0);
    assert.strictEqual(result.playerState.isClimbing, true);
    assert.strictEqual(result.playerState.climbSurface, surface);
  });

  it('increments climbGrabTime while climbing', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true, climbGrabTime: 0.5 }),
      makeInput({ action: true, move: { x: 0, y: 1 } }),
      makeStaminaState(),
      [surface],
      0.1
    );
    assert.strictEqual(result.climbingState.climbGrabTime, 0.6);
  });

  it('applies climbing movement while climbing with move input', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: true, move: { x: 0, y: 1 } }),
      makeStaminaState(),
      [surface],
      1
    );
    assert.ok(result.playerState.position.y > 0, 'should move upward');
    assert.strictEqual(result.climbingState.isClimbing, true);
  });

  it('attempts jump climb while climbing with jump input', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: oldSurface,
        climbNormal: oldSurface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: true, jump: true, move: { x: 0, y: 1 } }),
      makeStaminaState(),
      [oldSurface, newSurface],
      0.1
    );
    assert.strictEqual(result.playerState.climbSurface, newSurface);
    assert.strictEqual(result.climbingState.isClimbing, true);
  });

  it('releases grab when climbing with no move and no action', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: false, move: { x: 0, y: 0 } }),
      makeStaminaState(),
      [surface],
      0.1
    );
    assert.strictEqual(result.playerState.isClimbing, false);
    assert.strictEqual(result.playerState.climbSurface, null);
    assert.strictEqual(result.climbingState.isClimbing, false);
  });

  it('does not release when action is held but no move', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: true, move: { x: 0, y: 0 } }),
      makeStaminaState(),
      [surface],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, true);
  });

  it('does not release when move input is active but no action', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: false, move: { x: 1, y: 0 } }),
      makeStaminaState(),
      [surface],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, true);
  });

  it('forces release when stamina shouldTriggerFall', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: true, move: { x: 0, y: 1 } }),
      makeStaminaState({ isDepleted: true, isClimbing: true }),
      [surface],
      0.1
    );
    assert.strictEqual(result.playerState.isClimbing, false);
    assert.strictEqual(result.climbingState.isClimbing, false);
  });

  it('stamina fall takes priority over idle release', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const result = updateClimbing(
      makePlayerState({
        isClimbing: true,
        climbSurface: surface,
        climbNormal: surface.normal,
        position: { x: 0, y: 0, z: -2 },
      }),
      makeClimbingState({ isClimbing: true }),
      makeInput({ action: false, move: { x: 0, y: 0 } }),
      makeStaminaState({ isDepleted: true, isClimbing: true }),
      [surface],
      0.1
    );
    assert.strictEqual(result.playerState.isClimbing, false);
    assert.strictEqual(result.climbingState.isClimbing, false);
  });

  it('does not force fall when stamina depleted but not climbing', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const result = updateClimbing(
      makePlayerState(),
      makeClimbingState(),
      makeInput({ action: true }),
      makeStaminaState({ isDepleted: true, isClimbing: false }),
      [surface],
      0.1
    );
    assert.strictEqual(result.climbingState.isClimbing, true);
  });
});

function simulateFrame(playerState, climbing, input, stamina, surfaces, dt, prevClimbing) {
  const result = updateClimbing(playerState, climbing, input, stamina, surfaces, dt);
  climbing.isClimbing = result.climbingState.isClimbing;
  climbing.climbGrabTime = result.climbingState.climbGrabTime;
  const isClimbing = isPlayerClimbing(climbing);
  return {
    playerState: result.playerState,
    climbing,
    isClimbing,
    justStartedClimbing: isClimbing && !prevClimbing,
    justStoppedClimbing: !isClimbing && prevClimbing,
  };
}

describe('climbing state transition detection (frame pattern)', () => {
  it('detects justStartedClimbing on the grab frame', () => {
    const climbing = createClimbingState();
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const frame = simulateFrame(
      makePlayerState(), climbing, makeInput({ action: true }),
      makeStaminaState(), [surface], 0.1, false
    );
    assert.strictEqual(frame.isClimbing, true);
    assert.strictEqual(frame.justStartedClimbing, true);
    assert.strictEqual(frame.justStoppedClimbing, false);
  });

  it('does not detect justStartedClimbing on subsequent climbing frames', () => {
    const climbing = createClimbingState();
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const frame1 = simulateFrame(
      makePlayerState(), climbing, makeInput({ action: true }),
      makeStaminaState(), [surface], 0.1, false
    );
    const frame2 = simulateFrame(
      frame1.playerState, frame1.climbing,
      makeInput({ action: true, move: { x: 0, y: 1 } }),
      makeStaminaState(), [surface], 0.1, frame1.isClimbing
    );
    assert.strictEqual(frame2.isClimbing, true);
    assert.strictEqual(frame2.justStartedClimbing, false);
  });

  it('detects justStoppedClimbing on the release frame', () => {
    const climbing = createClimbingState();
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const frame1 = simulateFrame(
      makePlayerState(), climbing, makeInput({ action: true }),
      makeStaminaState(), [surface], 0.1, false
    );
    const frame2 = simulateFrame(
      frame1.playerState, frame1.climbing,
      makeInput({ action: false, move: { x: 0, y: 0 } }),
      makeStaminaState(), [surface], 0.1, frame1.isClimbing
    );
    assert.strictEqual(frame2.isClimbing, false);
    assert.strictEqual(frame2.justStoppedClimbing, true);
    assert.strictEqual(frame2.justStartedClimbing, false);
  });

  it('does not detect justStoppedClimbing when already on ground', () => {
    const climbing = createClimbingState();
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const frame = simulateFrame(
      makePlayerState(), climbing, makeInput({ action: false }),
      makeStaminaState(), [surface], 0.1, false
    );
    assert.strictEqual(frame.isClimbing, false);
    assert.strictEqual(frame.justStoppedClimbing, false);
    assert.strictEqual(frame.justStartedClimbing, false);
  });

  it('isClimbing is consistent throughout the frame after update', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const climbing = createClimbingState();
    const input = makeInput({ action: true });
    const result = updateClimbing(
      makePlayerState(), climbing, input, makeStaminaState(), [surface], 0.1
    );
    climbing.isClimbing = result.climbingState.isClimbing;

    const beforeUpdate = false;
    const afterUpdate = isPlayerClimbing(climbing);
    assert.strictEqual(beforeUpdate, false, 'was not climbing before');
    assert.strictEqual(afterUpdate, true, 'is climbing after');
    assert.notStrictEqual(beforeUpdate, afterUpdate, 'state changed - must use post-update value');
  });
});
