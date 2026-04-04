import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PlayerCharacter } from './character.js';
import {
  calculateMovementDirection,
  applyMovement,
  applyJump,
  applyGravity,
  updatePlayer,
} from './movement.js';

function makeState(overrides = {}) {
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

const constants = new PlayerCharacter();

describe('calculateMovementDirection', () => {
  it('forward input (z=-1) with camera yaw=0 returns direction (0, -1)', () => {
    const result = calculateMovementDirection({ x: 0, y: -1 }, 0);
    assert.ok(Math.abs(result.x) < 1e-6);
    assert.ok(Math.abs(result.z - -1) < 1e-6);
  });

  it('right input (x=1) with camera yaw=0 returns direction (1, 0)', () => {
    const result = calculateMovementDirection({ x: 1, y: 0 }, 0);
    assert.ok(Math.abs(result.x - 1) < 1e-6);
    assert.ok(Math.abs(result.z) < 1e-6);
  });

  it('forward input with camera yaw=PI/2 rotates direction 90 degrees', () => {
    const result = calculateMovementDirection({ x: 0, y: -1 }, Math.PI / 2);
    assert.ok(Math.abs(result.x - -1) < 1e-6);
    assert.ok(Math.abs(result.z) < 1e-6);
  });

  it('diagonal input is normalized', () => {
    const result = calculateMovementDirection({ x: 1, y: -1 }, 0);
    const len = Math.sqrt(result.x * result.x + result.z * result.z);
    assert.ok(Math.abs(len - 1) < 1e-6);
  });

  it('zero input returns zero direction', () => {
    const result = calculateMovementDirection({ x: 0, y: 0 }, 0);
    assert.strictEqual(result.x, 0);
    assert.strictEqual(result.z, 0);
  });
});

describe('applyMovement', () => {
  it('updates position based on input direction and speed', () => {
    const state = makeState();
    const newState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    assert.ok(newState.position.z < 0, 'should have moved forward');
    assert.strictEqual(newState.velocity.x, 0);
  });

  it('sprint increases speed', () => {
    const state = makeState();
    const walkState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    const sprintState = applyMovement(state, { x: 0, y: -1 }, 0, 1, true, constants);
    assert.ok(
      Math.abs(sprintState.position.z) > Math.abs(walkState.position.z),
      'sprint should move farther than walk'
    );
  });

  it('no movement when input is zero', () => {
    const state = makeState();
    const newState = applyMovement(state, { x: 0, y: 0 }, 0, 1, false, constants);
    assert.strictEqual(newState.position.x, 0);
    assert.strictEqual(newState.position.y, 0);
    assert.strictEqual(newState.position.z, 0);
    assert.strictEqual(newState.velocity.x, 0);
    assert.strictEqual(newState.velocity.z, 0);
  });
});

describe('applyJump', () => {
  it('applies upward velocity when grounded', () => {
    const state = makeState({ isGrounded: true });
    const newState = applyJump(state, constants);
    assert.ok(newState.velocity.y > 0, 'should have upward velocity');
    assert.strictEqual(newState.isGrounded, false);
    assert.strictEqual(newState.isJumping, true);
  });

  it('does NOT jump when not grounded', () => {
    const state = makeState({ isGrounded: false, velocity: { x: 0, y: -5, z: 0 } });
    const newState = applyJump(state, constants);
    assert.strictEqual(newState.velocity.y, -5);
    assert.strictEqual(newState.isJumping, false);
  });
});

describe('applyGravity', () => {
  it('pulls player down each frame', () => {
    const state = makeState({ position: { x: 0, y: 5, z: 0 }, isGrounded: false });
    const newState = applyGravity(state, 0.1, constants);
    assert.ok(newState.velocity.y < 0, 'velocity should decrease');
    assert.ok(newState.position.y < 5, 'position should decrease');
  });

  it('stops at ground level (y=0) and sets isGrounded=true', () => {
    const state = makeState({ position: { x: 0, y: 0.5, z: 0 }, velocity: { x: 0, y: -5, z: 0 }, isGrounded: false });
    const newState = applyGravity(state, 1, constants);
    assert.ok(newState.position.y >= constants.GROUND_Y - 1e-6, 'should not go below ground');
    assert.strictEqual(newState.isGrounded, true);
    assert.strictEqual(newState.velocity.y, 0);
    assert.strictEqual(newState.isJumping, false);
  });
});

describe('updatePlayer', () => {
  it('full integration: move forward, jump, land', () => {
    let state = makeState();
    const input = { x: 0, y: -1, jump: true };
    const constants = new PlayerCharacter();

    state = updatePlayer(state, input, 0, 0.016, constants);

    assert.ok(state.position.z < 0, 'should have moved forward');
    assert.ok(state.velocity.y > 0, 'should be going up after jump');

    for (let i = 0; i < 60; i++) {
      state = updatePlayer(state, { x: 0, y: 0, jump: false }, 0, 0.016, constants);
    }

    assert.strictEqual(state.isGrounded, true, 'should have landed');
    assert.ok(Math.abs(state.position.y - constants.GROUND_Y) < 0.1, 'should be on ground');
  });

  it('walking state sets isSprinting=false and isJumping=false when appropriate', () => {
    let state = makeState({ isSprinting: true, isJumping: true, isGrounded: true });
    const input = { x: 0, y: -1, jump: false, sprint: false };

    state = updatePlayer(state, input, 0, 0.016, constants);

    assert.strictEqual(state.isSprinting, false);
    assert.strictEqual(state.isJumping, false);
  });
});
