import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  findNearestClimbableSurface,
  tryGrab,
  applyClimbingMovement,
  tryJumpClimb,
  releaseGrab,
  isGrabPressed,
} from './climbing.js';
import { createSentinelDefinition, generateSentinelSurfacePatches } from '../colossus/sentinel.js';

function makeState(overrides = {}) {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isGrounded: true,
    isSprinting: false,
    isJumping: false,
    isClimbing: false,
    climbSurface: null,
    climbNormal: null,
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

function makeInput(overrides = {}) {
  return {
    move: { x: 0, y: 0 },
    action: false,
    jump: false,
    sprint: false,
    ...overrides,
  };
}

describe('isGrabPressed', () => {
  it('returns true when input.action is true', () => {
    const input = makeInput({ action: true });
    assert.strictEqual(isGrabPressed(input), true);
  });

  it('returns false when input.action is false', () => {
    const input = makeInput({ action: false });
    assert.strictEqual(isGrabPressed(input), false);
  });
});

describe('findNearestClimbableSurface', () => {
  it('returns null when surfaces array is empty', () => {
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, [], 5);
    assert.strictEqual(result, null);
  });

  it('returns null when no surfaces are within range', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -100 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.strictEqual(result, null);
  });

  it('returns null when surface is not climbable', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -2 }, climbable: false }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.strictEqual(result, null);
  });

  it('returns the nearest climbable surface within range', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -3 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, -3);
  });

  it('picks the closest surface when multiple are in range', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -4 } }),
      makeSurface({ position: { x: 0, y: 0, z: -1 } }),
      makeSurface({ position: { x: 0, y: 0, z: -3 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, -1);
  });

  it('skips non-climbable surfaces and returns nearest climbable one', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -1 }, climbable: false }),
      makeSurface({ position: { x: 0, y: 0, z: -2 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, -2);
  });

  it('does not return surface exactly at maxGrabDistance', () => {
    const surfaces = [
      makeSurface({ position: { x: 5, y: 0, z: 0 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.strictEqual(result, null);
  });

  it('returns surface when just inside maxGrabDistance', () => {
    const surfaces = [
      makeSurface({ position: { x: 4.9, y: 0, z: 0 } }),
    ];
    const result = findNearestClimbableSurface({ x: 0, y: 0, z: 0 }, surfaces, 5);
    assert.ok(result !== null);
  });

  it('prefers surface in facing direction over equidistant surface behind', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: 3 } }),
      makeSurface({ position: { x: 0, y: 0, z: -3 } }),
    ];
    const result = findNearestClimbableSurface(
      { x: 0, y: 0, z: 0 }, surfaces, 5,
      { facingDir: { x: 0, y: 0, z: 1 } }
    );
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, 3);
  });

  it('penalizes behind surface so closer-behind loses to farther-front', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -2 } }),
      makeSurface({ position: { x: 0, y: 0, z: 3 } }),
    ];
    const result = findNearestClimbableSurface(
      { x: 0, y: 0, z: 0 }, surfaces, 5,
      { facingDir: { x: 0, y: 0, z: 1 } }
    );
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, 3);
  });

  it('still returns behind surface when no front surface exists', () => {
    const surfaces = [
      makeSurface({ position: { x: 0, y: 0, z: -1.5 } }),
    ];
    const result = findNearestClimbableSurface(
      { x: 0, y: 0, z: 0 }, surfaces, 5,
      { facingDir: { x: 0, y: 0, z: 1 } }
    );
    assert.ok(result !== null);
    assert.strictEqual(result.position.z, -1.5);
  });

  it('ignores skipSurface', () => {
    const skip = makeSurface({ position: { x: 0, y: 0, z: -1 } });
    const other = makeSurface({ position: { x: 0, y: 0, z: -3 } });
    const result = findNearestClimbableSurface(
      { x: 0, y: 0, z: 0 }, [skip, other], 5,
      { skipSurface: skip }
    );
    assert.ok(result !== null);
    assert.strictEqual(result, other);
  });
});

describe('tryGrab', () => {
  it('does nothing when input.action is false', () => {
    const state = makeState();
    const input = makeInput({ action: false });
    const surfaces = [makeSurface({ position: { x: 0, y: 0, z: -2 } })];
    const newState = tryGrab(state, input, surfaces, 5);
    assert.strictEqual(newState.isClimbing, false);
    assert.strictEqual(newState.climbSurface, null);
  });

  it('does nothing when already climbing', () => {
    const state = makeState({ isClimbing: true, climbSurface: makeSurface() });
    const input = makeInput({ action: true });
    const surfaces = [makeSurface({ position: { x: 0, y: 0, z: -2 } })];
    const newState = tryGrab(state, input, surfaces, 5);
    assert.strictEqual(newState.isClimbing, true);
    assert.strictEqual(newState.climbSurface, state.climbSurface);
  });

  it('does nothing when no surfaces in range', () => {
    const state = makeState();
    const input = makeInput({ action: true });
    const surfaces = [makeSurface({ position: { x: 0, y: 0, z: -100 } })];
    const newState = tryGrab(state, input, surfaces, 5);
    assert.strictEqual(newState.isClimbing, false);
  });

  it('attaches to nearest surface when action pressed and surface in range', () => {
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const state = makeState();
    const input = makeInput({ action: true });
    const newState = tryGrab(state, input, [surface], 5);
    assert.strictEqual(newState.isClimbing, true);
    assert.strictEqual(newState.climbSurface, surface);
  });

  it('sets climbNormal to surface normal', () => {
    const surface = makeSurface({ normal: { x: 0.5, y: 0, z: -0.866 } });
    const state = makeState();
    const input = makeInput({ action: true });
    const newState = tryGrab(state, input, [surface], 5);
    assert.ok(newState.climbNormal !== null);
    assert.strictEqual(newState.climbNormal.x, surface.normal.x);
    assert.strictEqual(newState.climbNormal.y, surface.normal.y);
    assert.strictEqual(newState.climbNormal.z, surface.normal.z);
  });

  it('snaps player position to surface position', () => {
    const surface = makeSurface({ position: { x: 5, y: 10, z: 3 } });
    const state = makeState({ position: { x: 4.5, y: 9.5, z: 3.5 } });
    const input = makeInput({ action: true });
    const newState = tryGrab(state, input, [surface], 5);
    assert.strictEqual(newState.position.x, surface.position.x);
    assert.strictEqual(newState.position.y, surface.position.y);
    assert.strictEqual(newState.position.z, surface.position.z);
  });

  it('resets velocity when grabbing', () => {
    const state = makeState({ velocity: { x: 5, y: 10, z: -3 } });
    const input = makeInput({ action: true });
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const newState = tryGrab(state, input, [surface], 5);
    assert.strictEqual(newState.velocity.x, 0);
    assert.strictEqual(newState.velocity.y, 0);
    assert.strictEqual(newState.velocity.z, 0);
  });

  it('sets isGrounded to false when grabbing', () => {
    const state = makeState({ isGrounded: true });
    const input = makeInput({ action: true });
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 } });
    const newState = tryGrab(state, input, [surface], 5);
    assert.strictEqual(newState.isGrounded, false);
  });

  it('returns same state reference when nothing changes', () => {
    const state = makeState();
    const input = makeInput({ action: false });
    const surfaces = [];
    const newState = tryGrab(state, input, surfaces, 5);
    assert.strictEqual(newState, state);
  });
});

describe('applyClimbingMovement', () => {
  const constants = { CLIMB_SPEED: 2 };

  it('does nothing if not climbing', () => {
    const state = makeState({ isClimbing: false });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const newState = applyClimbingMovement(state, input, 0.1, constants);
    assert.strictEqual(newState.position.x, state.position.x);
    assert.strictEqual(newState.position.y, state.position.y);
    assert.strictEqual(newState.position.z, state.position.z);
  });

  it('returns same state reference if not climbing', () => {
    const state = makeState({ isClimbing: false });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const newState = applyClimbingMovement(state, input, 0.1, constants);
    assert.strictEqual(newState, state);
  });

  it('moves upward along vertical surface when input is up', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.ok(newState.position.y > 0, 'should move upward');
  });

  it('moves downward along vertical surface when input is down', () => {
    const surface = makeSurface({
      position: { x: 0, y: 5, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 5, z: -2 },
    });
    const input = makeInput({ move: { x: 0, y: -1 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.ok(newState.position.y < 5, 'should move downward');
  });

  it('moves sideways along surface when input is left/right', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 1, y: 0 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.ok(newState.position.x > 0, 'should move right');
    assert.strictEqual(newState.position.y, 0, 'should not change height');
  });

  it('does not move when input is zero', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 0, y: 0 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.strictEqual(newState.position.x, 0);
    assert.strictEqual(newState.position.y, 0);
    assert.strictEqual(newState.position.z, -2);
  });

  it('respects climb speed constant', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.ok(
      Math.abs(newState.position.y - constants.CLIMB_SPEED) < 1e-6,
      'should move exactly CLIMB_SPEED units'
    );
  });

  it('does not move in the normal direction', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 1, y: 1 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.strictEqual(newState.position.z, -2, 'should not move in normal direction');
  });

  it('diagonal input is normalized', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 1, y: 1 } });
    const newState = applyClimbingMovement(state, input, 1, constants);
    const dx = newState.position.x - state.position.x;
    const dy = newState.position.y - state.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert.ok(
      Math.abs(dist - constants.CLIMB_SPEED) < 1e-6,
      'diagonal movement should be normalized to CLIMB_SPEED'
    );
  });

  it('multiplies movement by delta time', () => {
    const surface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: surface,
      climbNormal: surface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const newState = applyClimbingMovement(state, input, 0.5, constants);
    assert.ok(
      Math.abs(newState.position.y - constants.CLIMB_SPEED * 0.5) < 1e-6,
      'should move CLIMB_SPEED * dt'
    );
  });
});

describe('tryJumpClimb', () => {
  it('does nothing if not climbing', () => {
    const state = makeState({ isClimbing: false });
    const input = makeInput({ jump: true });
    const surfaces = [makeSurface({ position: { x: 0, y: 3, z: -2 } })];
    const newState = tryJumpClimb(state, input, surfaces, 5);
    assert.strictEqual(newState.isClimbing, false);
    assert.strictEqual(newState, state);
  });

  it('does nothing if input.jump is false', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
    });
    const input = makeInput({ jump: false });
    const surfaces = [makeSurface({ position: { x: 0, y: 3, z: -2 } })];
    const newState = tryJumpClimb(state, input, surfaces, 5);
    assert.strictEqual(newState, state);
  });

  it('does nothing if no surfaces in jump range', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });
    const surfaces = [makeSurface({ position: { x: 0, y: 100, z: -2 } })];
    const newState = tryJumpClimb(state, input, surfaces, 5);
    assert.strictEqual(newState.climbSurface, state.climbSurface);
  });

  it('jumps to nearest surface within jump range', () => {
    const oldSurface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const newSurface = makeSurface({
      position: { x: 0, y: 3, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });
    const newState = tryJumpClimb(state, input, [newSurface], 5);
    assert.strictEqual(newState.isClimbing, true);
    assert.strictEqual(newState.climbSurface, newSurface);
    assert.strictEqual(newState.climbNormal.x, newSurface.normal.x);
    assert.strictEqual(newState.climbNormal.y, newSurface.normal.y);
    assert.strictEqual(newState.climbNormal.z, newSurface.normal.z);
  });

  it('snaps position to new surface after jump-climb', () => {
    const oldSurface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const newSurface = makeSurface({
      position: { x: 5, y: 7, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });
    const newState = tryJumpClimb(state, input, [newSurface], 10);
    assert.strictEqual(newState.position.x, 5);
    assert.strictEqual(newState.position.y, 7);
    assert.strictEqual(newState.position.z, -2);
  });

  it('ignores current climb surface when finding jump target', () => {
    const currentSurface = makeSurface({
      position: { x: 0, y: 0, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const targetSurface = makeSurface({
      position: { x: 0, y: 3, z: -2 },
      normal: { x: 0, y: 0, z: 1 },
    });
    const state = makeState({
      isClimbing: true,
      climbSurface: currentSurface,
      climbNormal: currentSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });
    const newState = tryJumpClimb(state, input, [currentSurface, targetSurface], 5);
    assert.strictEqual(newState.climbSurface, targetSurface);
  });

  it('blocks jump-climb when within cooldown period', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const anotherSurface = makeSurface({ position: { x: 0, y: 6, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });

    const afterFirst = tryJumpClimb(state, input, [newSurface], 5, null, { now: 0 });
    assert.strictEqual(afterFirst.climbSurface, newSurface);

    const afterSecond = tryJumpClimb(afterFirst, input, [anotherSurface], 10, null, { now: 0.1 });
    assert.strictEqual(afterSecond, afterFirst);
  });

  it('allows jump-climb after cooldown period expires', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const anotherSurface = makeSurface({ position: { x: 0, y: 6, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });

    const afterFirst = tryJumpClimb(state, input, [newSurface], 5, null, { now: 0 });
    assert.strictEqual(afterFirst.climbSurface, newSurface);

    const afterSecond = tryJumpClimb(afterFirst, input, [anotherSurface], 10, null, { now: 0.4 });
    assert.strictEqual(afterSecond.climbSurface, anotherSurface);
  });

  it('sets lastJumpClimbTime on successful jump-climb', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });

    const result = tryJumpClimb(state, input, [newSurface], 5, null, { now: 1.5 });
    assert.strictEqual(result.lastJumpClimbTime, 1.5);
  });

  it('blocks jump-climb when stamina is 0', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });

    const result = tryJumpClimb(state, input, [newSurface], 5, null, { now: 0, stamina: 0 });
    assert.strictEqual(result, state);
  });

  it('allows jump-climb when stamina is above 0', () => {
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({
      isClimbing: true,
      climbSurface: oldSurface,
      climbNormal: oldSurface.normal,
      position: { x: 0, y: 0, z: -2 },
    });
    const input = makeInput({ jump: true });

    const result = tryJumpClimb(state, input, [newSurface], 5, null, { now: 0, stamina: 50 });
    assert.strictEqual(result.climbSurface, newSurface);
  });
});

describe('releaseGrab', () => {
  it('sets isClimbing to false', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
    });
    const newState = releaseGrab(state);
    assert.strictEqual(newState.isClimbing, false);
  });

  it('clears climbSurface', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
    });
    const newState = releaseGrab(state);
    assert.strictEqual(newState.climbSurface, null);
  });

  it('clears climbNormal', () => {
    const state = makeState({
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
    });
    const newState = releaseGrab(state);
    assert.strictEqual(newState.climbNormal, null);
  });

  it('does nothing if not already climbing', () => {
    const state = makeState({ isClimbing: false });
    const newState = releaseGrab(state);
    assert.strictEqual(newState, state);
  });

  it('preserves other state fields', () => {
    const state = makeState({
      position: { x: 1, y: 2, z: 3 },
      velocity: { x: 0, y: 0, z: 0 },
      isGrounded: false,
      isClimbing: true,
      climbSurface: makeSurface(),
      climbNormal: { x: 0, y: 0, z: 1 },
    });
    const newState = releaseGrab(state);
    assert.strictEqual(newState.position.x, 1);
    assert.strictEqual(newState.position.y, 2);
    assert.strictEqual(newState.position.z, 3);
    assert.strictEqual(newState.isGrounded, false);
  });
});

describe('tryGrab with physics adapter', () => {
  it('calls adapter.setPosition and setVelocity when physicsCtx provided', () => {
    const adapter = {
      setPosition: (w, b, p) => { adapter._posCall = { world: w, body: b, pos: p }; },
      setVelocity: (w, b, v) => { adapter._velCall = { world: w, body: b, vel: v }; },
    };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const surface = makeSurface({ position: { x: 5, y: 10, z: 3 } });
    const state = makeState({ position: { x: 4.5, y: 9.5, z: 3.5 } });
    const input = makeInput({ action: true });
    tryGrab(state, input, [surface], 5, { adapter, world, playerBody });
    assert.strictEqual(adapter._posCall.pos.x, 5);
    assert.strictEqual(adapter._posCall.pos.y, 10);
    assert.strictEqual(adapter._posCall.pos.z, 3);
    assert.strictEqual(adapter._velCall.vel.x, 0);
    assert.strictEqual(adapter._velCall.vel.y, 0);
    assert.strictEqual(adapter._velCall.vel.z, 0);
  });

  it('does not call adapter when grab fails (no action)', () => {
    let called = false;
    const adapter = { setPosition: () => { called = true; }, setVelocity: () => { called = true; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const state = makeState();
    const input = makeInput({ action: false });
    tryGrab(state, input, [], 5, { adapter, world, playerBody });
    assert.strictEqual(called, false);
  });
});

describe('applyClimbingMovement with physics adapter', () => {
  const constants = { CLIMB_SPEED: 2 };

  it('calls adapter.setPosition when physicsCtx provided', () => {
    const adapter = { setPosition: (w, b, p) => { adapter._posCall = { world: w, body: b, pos: p }; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const surface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({ isClimbing: true, climbSurface: surface, climbNormal: surface.normal, position: { x: 0, y: 0, z: -2 } });
    const input = makeInput({ move: { x: 0, y: 1 } });
    applyClimbingMovement(state, input, 1, constants, { adapter, world, playerBody });
    assert.ok(adapter._posCall.pos.y > 0, 'should have moved upward');
  });

  it('does not call adapter when not climbing', () => {
    let called = false;
    const adapter = { setPosition: () => { called = true; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const state = makeState({ isClimbing: false });
    const input = makeInput({ move: { x: 0, y: 1 } });
    applyClimbingMovement(state, input, 0.1, constants, { adapter, world, playerBody });
    assert.strictEqual(called, false);
  });
});

describe('tryJumpClimb with physics adapter', () => {
  it('calls adapter.setPosition when physicsCtx provided', () => {
    const adapter = { setPosition: (w, b, p) => { adapter._posCall = { world: w, body: b, pos: p }; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const oldSurface = makeSurface({ position: { x: 0, y: 0, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const newSurface = makeSurface({ position: { x: 0, y: 3, z: -2 }, normal: { x: 0, y: 0, z: 1 } });
    const state = makeState({ isClimbing: true, climbSurface: oldSurface, climbNormal: oldSurface.normal, position: { x: 0, y: 0, z: -2 } });
    const input = makeInput({ jump: true });
    tryJumpClimb(state, input, [newSurface], 5, { adapter, world, playerBody });
    assert.strictEqual(adapter._posCall.pos.x, 0);
    assert.strictEqual(adapter._posCall.pos.y, 3);
    assert.strictEqual(adapter._posCall.pos.z, -2);
  });

  it('does not call adapter when not climbing', () => {
    let called = false;
    const adapter = { setPosition: () => { called = true; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const state = makeState({ isClimbing: false });
    const input = makeInput({ jump: true });
    tryJumpClimb(state, input, [], 5, { adapter, world, playerBody });
    assert.strictEqual(called, false);
  });

  it('does not call adapter when no surfaces in range', () => {
    let called = false;
    const adapter = { setPosition: () => { called = true; } };
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const state = makeState({ isClimbing: true, climbSurface: makeSurface(), climbNormal: { x: 0, y: 0, z: 1 }, position: { x: 0, y: 0, z: -2 } });
    const input = makeInput({ jump: true });
    tryJumpClimb(state, input, [makeSurface({ position: { x: 0, y: 100, z: -2 } })], 5, { adapter, world, playerBody });
    assert.strictEqual(called, false);
  });
});

describe('releaseGrab with physics adapter', () => {
  it('still works when physicsCtx provided', () => {
    const adapter = {};
    const world = Symbol('world');
    const playerBody = Symbol('body');
    const state = makeState({ isClimbing: true, climbSurface: makeSurface(), climbNormal: { x: 0, y: 0, z: 1 } });
    const result = releaseGrab(state, { adapter, world, playerBody });
    assert.strictEqual(result.isClimbing, false);
    assert.strictEqual(result.climbSurface, null);
    assert.strictEqual(result.climbNormal, null);
  });
});

describe('climbing + sentinel surface patches integration', () => {
  it('sentinel patches are valid input for findNearestClimbableSurface', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const firstPatch = patches[0];
    const playerPos = {
      x: firstPatch.position.x,
      y: firstPatch.position.y,
      z: firstPatch.position.z + 3,
    };
    const result = findNearestClimbableSurface(playerPos, patches, 5);
    assert.ok(result !== null, 'should find a patch');
    assert.strictEqual(result.bodyPartId, firstPatch.bodyPartId);
  });

  it('tryGrab works with sentinel patches', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const firstPatch = patches[0];
    const state = makeState({
      position: {
        x: firstPatch.position.x,
        y: firstPatch.position.y,
        z: firstPatch.position.z + 2,
      },
    });
    const input = makeInput({ action: true });
    const newState = tryGrab(state, input, patches, 5);
    assert.strictEqual(newState.isClimbing, true);
    assert.ok(newState.climbSurface !== null);
    assert.ok(newState.climbNormal !== null);
    assert.strictEqual(newState.climbNormal.x, newState.climbSurface.normal.x);
    assert.strictEqual(newState.climbNormal.y, newState.climbSurface.normal.y);
    assert.strictEqual(newState.climbNormal.z, newState.climbSurface.normal.z);
  });

  it('tryJumpClimb works between sentinel patches', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const torsoPatches = patches.filter(p => p.bodyPartId === 'torso');
    assert.ok(torsoPatches.length >= 2);
    const bottom = torsoPatches[0];
    const top = torsoPatches.find(p => p.position.y > bottom.position.y + 3);
    if (!top) return;
    const state = makeState({
      isClimbing: true,
      climbSurface: bottom,
      climbNormal: bottom.normal,
      position: { x: bottom.position.x, y: bottom.position.y, z: bottom.position.z },
    });
    const input = makeInput({ jump: true });
    const newState = tryJumpClimb(state, input, patches, 5);
    assert.strictEqual(newState.isClimbing, true);
    assert.ok(newState.climbSurface !== bottom);
  });

  it('all sentinel patches are climbable (findNearestClimbableSurface compatible)', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    for (const patch of patches) {
      assert.strictEqual(patch.climbable, true, `patch on ${patch.bodyPartId} not climbable`);
      assert.ok(typeof patch.position.x === 'number');
      assert.ok(typeof patch.normal.x === 'number');
    }
  });

  it('climbing movement works with sentinel patch normals', () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const frontPatch = patches.find(p => p.normal.z === 1);
    if (!frontPatch) return;
    const state = makeState({
      isClimbing: true,
      climbSurface: frontPatch,
      climbNormal: frontPatch.normal,
      position: { x: frontPatch.position.x, y: frontPatch.position.y, z: frontPatch.position.z },
    });
    const input = makeInput({ move: { x: 0, y: 1 } });
    const constants = { CLIMB_SPEED: 2 };
    const newState = applyClimbingMovement(state, input, 1, constants);
    assert.ok(newState.position.y > state.position.y, 'should move upward on front face');
  });
});
