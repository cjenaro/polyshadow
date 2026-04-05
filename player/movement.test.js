import { describe, it } from "node:test";
import assert from "node:assert";
import { PlayerCharacter } from "./character.js";
import { createMockAdapter } from "../engine/physics-adapter.js";
import {
  calculateMovementDirection,
  applyMovement,
  applyJump,
  applyGravity,
  updatePlayer,
} from "./movement.js";

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

describe("calculateMovementDirection", () => {
  it("forward input (z=-1) with camera yaw=0 returns direction (0, -1)", () => {
    const result = calculateMovementDirection({ x: 0, y: -1 }, 0);
    assert.ok(Math.abs(result.x) < 1e-6);
    assert.ok(Math.abs(result.z - -1) < 1e-6);
  });

  it("right input (x=1) with camera yaw=0 returns direction (1, 0)", () => {
    const result = calculateMovementDirection({ x: 1, y: 0 }, 0);
    assert.ok(Math.abs(result.x - 1) < 1e-6);
    assert.ok(Math.abs(result.z) < 1e-6);
  });

  it("forward input with camera yaw=PI/2 rotates direction 90 degrees", () => {
    const result = calculateMovementDirection({ x: 0, y: -1 }, Math.PI / 2);
    assert.ok(Math.abs(result.x - -1) < 1e-6);
    assert.ok(Math.abs(result.z) < 1e-6);
  });

  it("diagonal input is normalized", () => {
    const result = calculateMovementDirection({ x: 1, y: -1 }, 0);
    const len = Math.sqrt(result.x * result.x + result.z * result.z);
    assert.ok(Math.abs(len - 1) < 1e-6);
  });

  it("zero input returns zero direction", () => {
    const result = calculateMovementDirection({ x: 0, y: 0 }, 0);
    assert.strictEqual(result.x, 0);
    assert.strictEqual(result.z, 0);
  });
});

describe("applyMovement", () => {
  it("updates position based on input direction and speed", () => {
    const state = makeState();
    const newState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    assert.ok(newState.position.z < 0, "should have moved forward");
    assert.strictEqual(newState.velocity.x, 0);
  });

  it("sprint increases speed", () => {
    const state = makeState();
    const walkState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    const sprintState = applyMovement(state, { x: 0, y: -1 }, 0, 1, true, constants);
    assert.ok(
      Math.abs(sprintState.position.z) > Math.abs(walkState.position.z),
      "sprint should move farther than walk",
    );
  });

  it("no movement when input is zero", () => {
    const state = makeState();
    const newState = applyMovement(state, { x: 0, y: 0 }, 0, 1, false, constants);
    assert.strictEqual(newState.position.x, 0);
    assert.strictEqual(newState.position.y, 0);
    assert.strictEqual(newState.position.z, 0);
    assert.strictEqual(newState.velocity.x, 0);
    assert.strictEqual(newState.velocity.z, 0);
  });
});

describe("applyJump", () => {
  it("applies upward velocity when grounded", () => {
    const state = makeState({ isGrounded: true });
    const newState = applyJump(state, constants);
    assert.ok(newState.velocity.y > 0, "should have upward velocity");
    assert.strictEqual(newState.isGrounded, false);
    assert.strictEqual(newState.isJumping, true);
  });

  it("does NOT jump when not grounded", () => {
    const state = makeState({ isGrounded: false, velocity: { x: 0, y: -5, z: 0 } });
    const newState = applyJump(state, constants);
    assert.strictEqual(newState.velocity.y, -5);
    assert.strictEqual(newState.isJumping, false);
  });
});

describe("applyGravity", () => {
  it("pulls player down each frame", () => {
    const state = makeState({ position: { x: 0, y: 5, z: 0 }, isGrounded: false });
    const newState = applyGravity(state, 0.1, constants);
    assert.ok(newState.velocity.y < 0, "velocity should decrease");
    assert.ok(newState.position.y < 5, "position should decrease");
  });

  it("stops at ground level (y=0) and sets isGrounded=true", () => {
    const state = makeState({
      position: { x: 0, y: 0.5, z: 0 },
      velocity: { x: 0, y: -5, z: 0 },
      isGrounded: false,
    });
    const newState = applyGravity(state, 1, constants);
    assert.ok(newState.position.y >= constants.GROUND_Y - 1e-6, "should not go below ground");
    assert.strictEqual(newState.isGrounded, true);
    assert.strictEqual(newState.velocity.y, 0);
    assert.strictEqual(newState.isJumping, false);
  });
});

describe("applyMovement air control", () => {
  it("reduces horizontal speed while airborne", () => {
    const state = makeState({ isGrounded: false, velocity: { x: 0, y: 5, z: 0 } });
    const groundState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    const groundedState = makeState({ isGrounded: true });
    const fullState = applyMovement(groundedState, { x: 0, y: -1 }, 0, 1, false, constants);

    assert.ok(
      Math.abs(groundState.velocity.z) < Math.abs(fullState.velocity.z),
      "airborne velocity should be less than grounded velocity",
    );
  });

  it("airborne player cannot instantly reverse 180 degrees", () => {
    const state = makeState({ isGrounded: false, velocity: { x: 0, y: 5, z: -4 } });
    const newState = applyMovement(state, { x: 0, y: 1 }, 0, 1, false, constants);

    assert.ok(newState.velocity.z < 0, "should still carry forward momentum, not fully reverse");
  });

  it("allows slight air correction in new direction", () => {
    const state = makeState({ isGrounded: false, velocity: { x: 4, y: 5, z: 0 } });
    const newState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);

    assert.ok(newState.velocity.z < 0, "should have some z component from air correction");
  });

  it("preserves full ground control when grounded", () => {
    const state = makeState({ isGrounded: true, velocity: { x: -4, y: 0, z: 0 } });
    const newState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);

    assert.ok(Math.abs(newState.velocity.x) < 0.1, "grounded player should fully respond to input");
    assert.ok(
      Math.abs(Math.abs(newState.velocity.z) - constants.WALK_SPEED) < 0.1,
      "grounded player should reach full walk speed",
    );
  });

  it("AIR_CONTROL_FACTOR defaults to 0.3", () => {
    const c = new PlayerCharacter();
    assert.strictEqual(c.AIR_CONTROL_FACTOR, 0.3);
  });
});

describe("applyMovement air control with adapter", () => {
  it("reduces horizontal speed via adapter when airborne", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 5, z: 0 },
    });
    adapter.addBody(world, playerBody);
    adapter.setPosition(world, playerBody, { x: 0, y: 5, z: 0 });
    adapter.setVelocity(world, playerBody, { x: 0, y: 3, z: 0 });

    const state = makeState({ isGrounded: false, velocity: { x: 0, y: 3, z: 0 } });
    applyMovement(
      state,
      { x: 0, y: -1 },
      0,
      0.016,
      false,
      constants,
      adapter,
      world,
      playerBody,
    );

    const vel = adapter.getVelocity(world, playerBody);
    assert.ok(
      Math.abs(vel.z) < constants.WALK_SPEED,
      "adapter airborne velocity should be reduced",
    );
    assert.strictEqual(vel.y, 3, "vertical velocity preserved");
  });
});

describe("updatePlayer", () => {
  it("full integration: move forward, jump, land", () => {
    let state = makeState();
    const input = { x: 0, y: -1, jump: true };
    const constants = new PlayerCharacter();

    state = updatePlayer(state, input, 0, 0.016, constants);

    assert.ok(state.position.z < 0, "should have moved forward");
    assert.ok(state.velocity.y > 0, "should be going up after jump");

    for (let i = 0; i < 60; i++) {
      state = updatePlayer(state, { x: 0, y: 0, jump: false }, 0, 0.016, constants);
    }

    assert.strictEqual(state.isGrounded, true, "should have landed");
    assert.ok(Math.abs(state.position.y - constants.GROUND_Y) < 0.1, "should be on ground");
  });

  it("passes physicsCtx through to sub-functions", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
    });
    adapter.addBody(world, playerBody);
    adapter.setPosition(world, playerBody, { x: 0, y: 0, z: 0 });

    const state = makeState({
      position: { x: 0, y: 5, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isGrounded: false,
    });
    const input = { x: 0, y: -1, jump: false, sprint: false };
    const physicsCtx = { adapter, world, playerBody };

    const newState = updatePlayer(state, input, 0, 0.016, constants, physicsCtx);

    assert.strictEqual(typeof newState.isGrounded, "boolean");
  });

  it("backward compatible: works without physicsCtx", () => {
    const state = makeState();
    const input = { x: 0, y: -1, jump: false, sprint: false };
    const newState = updatePlayer(state, input, 0, 0.016, constants);
    assert.ok(newState.position.z < 0);
  });

  it("walking state sets isSprinting=false and isJumping=false when appropriate", () => {
    let state = makeState({ isSprinting: true, isJumping: true, isGrounded: true });
    const input = { x: 0, y: -1, jump: false, sprint: false };

    state = updatePlayer(state, input, 0, 0.016, constants);

    assert.strictEqual(state.isSprinting, false);
    assert.strictEqual(state.isJumping, false);
  });
});

describe("applyMovement with adapter", () => {
  it("calls adapter.setVelocity when adapter is provided", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
    });
    adapter.addBody(world, playerBody);
    adapter.setPosition(world, playerBody, { x: 5, y: 10, z: 5 });
    adapter.setVelocity(world, playerBody, { x: 0, y: 3, z: 0 });

    const state = makeState({ velocity: { x: 0, y: 3, z: 0 } });
    const newState = applyMovement(
      state,
      { x: 0, y: -1 },
      0,
      0.016,
      false,
      constants,
      adapter,
      world,
      playerBody,
    );

    const vel = adapter.getVelocity(world, playerBody);
    assert.ok(vel.z !== 0, "adapter velocity z should be set");
    assert.strictEqual(vel.y, 3, "adapter should preserve currentVy");
    assert.strictEqual(newState.velocity.x, vel.x, "returned state velocity matches adapter");
    assert.strictEqual(newState.velocity.z, vel.z, "returned state velocity.z matches adapter");
  });

  it("backward compatible: works without adapter", () => {
    const state = makeState();
    const newState = applyMovement(state, { x: 0, y: -1 }, 0, 1, false, constants);
    assert.ok(newState.position.z < 0);
  });
});

describe("applyJump with adapter", () => {
  it("calls adapter.applyImpulse when adapter is provided", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
    });
    adapter.addBody(world, playerBody);
    adapter.setVelocity(world, playerBody, { x: 0, y: 0, z: 0 });

    const state = makeState({ isGrounded: true });
    const newState = applyJump(state, constants, adapter, world, playerBody);

    assert.strictEqual(newState.isGrounded, false);
    assert.strictEqual(newState.isJumping, true);

    adapter.step(world, 0.016);
    const vel = adapter.getVelocity(world, playerBody);
    assert.ok(vel.y > 0, "impulse should cause upward velocity");
  });

  it("does not call adapter.applyImpulse when not grounded", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 10, z: 0 },
    });
    adapter.addBody(world, playerBody);

    const state = makeState({ isGrounded: false });
    const newState = applyJump(state, constants, adapter, world, playerBody);

    assert.strictEqual(newState, state);
  });

  it("backward compatible: works without adapter", () => {
    const state = makeState({ isGrounded: true });
    const newState = applyJump(state, constants);
    assert.ok(newState.velocity.y > 0);
    assert.strictEqual(newState.isGrounded, false);
  });
});

describe("applyGravity with adapter", () => {
  it("skips manual gravity when adapter is provided", () => {
    const adapter = createMockAdapter();
    const world = adapter.createPhysicsWorld();
    const playerBody = adapter.createBody(world, {
      type: "dynamic",
      mass: 1,
      position: { x: 0, y: 0, z: 0 },
    });
    adapter.addBody(world, playerBody);
    adapter.setPosition(world, playerBody, { x: 0, y: 0, z: 0 });
    adapter.setVelocity(world, playerBody, { x: 0, y: 0, z: 0 });

    const state = makeState({
      position: { x: 0, y: 5, z: 0 },
      velocity: { x: 0, y: -10, z: 0 },
      isGrounded: false,
    });

    const newState = applyGravity(state, 0.016, constants, adapter, world, playerBody);

    assert.ok(
      newState.velocity.y !== state.velocity.y + constants.GRAVITY * 0.016,
      "should NOT do manual Euler integration",
    );
  });

  it("backward compatible: manual gravity without adapter", () => {
    const state = makeState({ position: { x: 0, y: 5, z: 0 }, isGrounded: false });
    const newState = applyGravity(state, 0.1, constants);
    assert.ok(newState.velocity.y < 0);
    assert.ok(newState.position.y < 5);
  });
});
