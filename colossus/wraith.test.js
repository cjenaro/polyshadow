import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createWraithDefinition,
  generateWraithSurfacePatches,
  getWraithWeakPointPositions,
  buildWraithCombatWeakPoints,
  WRAITH_BEHAVIOR_CONFIG,
  WraithState,
  createWraithBehaviorState,
  updateWraithBehavior,
  triggerWraithStun,
  applyWraithDamage,
  WRAITH_STUN_DAMAGE_THRESHOLD,
  getWraithStunProgress,
  getWraithWindForce,
  isWraithClimbable,
  setTHREE,
  createWraithMesh,
  animateWraith,
} from "./wraith.js";
import { getBodyHeight, getWeakPoints } from "./base.js";

describe("createWraithDefinition", () => {
  it("returns a valid body definition", () => {
    const def = createWraithDefinition();
    assert.ok(def.parts && def.parts.length > 0);
  });

  it("head is not climbable and not a weak point", () => {
    const def = createWraithDefinition();
    const head = def.parts.find((p) => p.id === "head");
    assert.equal(head.isClimbable, false);
    assert.equal(head.isWeakPoint, false);
  });

  it("neck_rune is not climbable and is a weak point", () => {
    const def = createWraithDefinition();
    const rune = def.parts.find((p) => p.id === "neck_rune");
    assert.equal(rune.isClimbable, false);
    assert.equal(rune.isWeakPoint, true);
  });

  it("left_wing and right_wing are climbable and are weak points", () => {
    const def = createWraithDefinition();
    const lw = def.parts.find((p) => p.id === "left_wing");
    const rw = def.parts.find((p) => p.id === "right_wing");
    assert.equal(lw.isClimbable, true);
    assert.equal(lw.isWeakPoint, true);
    assert.equal(rw.isClimbable, true);
    assert.equal(rw.isWeakPoint, true);
  });

  it("has exactly 3 weak points", () => {
    const def = createWraithDefinition();
    const weak = getWeakPoints(def);
    assert.equal(weak.length, 3);
  });

  it("total size is approximately 30 units", () => {
    const def = createWraithDefinition();
    const height = getBodyHeight(def);
    assert.ok(height > 25 && height < 40, `height was ${height}`);
  });

  it("body segments (neck, chest, tail_*) are climbable and not weak points", () => {
    const def = createWraithDefinition();
    const segments = ["neck", "chest", "tail_base", "tail_mid", "tail_tip"];
    for (const id of segments) {
      const part = def.parts.find((p) => p.id === id);
      assert.ok(part !== undefined, `missing part ${id}`);
      assert.equal(part.isClimbable, true, `${id} should be climbable`);
      assert.equal(part.isWeakPoint, false, `${id} should not be weak point`);
    }
  });

  it("wing weak points have healthMultiplier 2.0", () => {
    const def = createWraithDefinition();
    const lw = def.parts.find((p) => p.id === "left_wing");
    const rw = def.parts.find((p) => p.id === "right_wing");
    assert.equal(lw.healthMultiplier, 2.0);
    assert.equal(rw.healthMultiplier, 2.0);
  });

  it("neck_rune has healthMultiplier 3.0", () => {
    const def = createWraithDefinition();
    const rune = def.parts.find((p) => p.id === "neck_rune");
    assert.equal(rune.healthMultiplier, 3.0);
  });

  it("part types are all valid", () => {
    const def = createWraithDefinition();
    const validTypes = new Set(["core", "limb_upper", "limb_lower", "head"]);
    for (const part of def.parts) {
      assert.ok(validTypes.has(part.type), `invalid type ${part.type} for ${part.id}`);
    }
  });
});

describe("generateWraithSurfacePatches", () => {
  it("returns an array of surface patches", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    assert.ok(Array.isArray(patches));
    assert.ok(patches.length > 0);
  });

  it("has patches for climbable parts", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    const partIds = new Set(patches.map((p) => p.bodyPartId));
    assert.ok(partIds.has("neck"), "missing neck patches");
    assert.ok(partIds.has("chest"), "missing chest patches");
    assert.ok(partIds.has("left_wing"), "missing left_wing patches");
  });

  it("has no patches for non-climbable parts", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    const nonClimbable = ["head", "neck_rune"];
    for (const id of nonClimbable) {
      const found = patches.filter((p) => p.bodyPartId === id);
      assert.equal(found.length, 0, `found patches on non-climbable ${id}`);
    }
  });

  it("surface patches have valid normals (unit vectors)", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    for (const patch of patches) {
      const len = Math.sqrt(patch.normal.x ** 2 + patch.normal.y ** 2 + patch.normal.z ** 2);
      assert.ok(Math.abs(len - 1) < 0.01, `normal length was ${len}`);
    }
  });

  it("every climbable body part has patches", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    const climbableParts = def.parts.filter((p) => p.isClimbable);
    const patchPartIds = new Set(patches.map((p) => p.bodyPartId));
    for (const part of climbableParts) {
      assert.ok(patchPartIds.has(part.id), `climbable part ${part.id} has no patches`);
    }
  });

  it("total patch count is reasonable", () => {
    const def = createWraithDefinition();
    const patches = generateWraithSurfacePatches(def);
    assert.ok(patches.length > 50, `only ${patches.length} patches`);
    assert.ok(patches.length < 3000, `${patches.length} patches, too many`);
  });
});

describe("getWraithWeakPointPositions", () => {
  it("returns 3 positions", () => {
    const def = createWraithDefinition();
    const positions = getWraithWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(positions.length, 3);
  });

  it("each position has x, y, z and bodyPartId", () => {
    const def = createWraithDefinition();
    const positions = getWraithWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    for (const pos of positions) {
      assert.ok(typeof pos.x === "number");
      assert.ok(typeof pos.y === "number");
      assert.ok(typeof pos.z === "number");
      assert.ok(typeof pos.bodyPartId === "string");
    }
  });

  it("weak point IDs include left_wing, right_wing, neck_rune", () => {
    const def = createWraithDefinition();
    const positions = getWraithWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const ids = positions.map((p) => p.bodyPartId);
    assert.ok(ids.includes("left_wing"));
    assert.ok(ids.includes("right_wing"));
    assert.ok(ids.includes("neck_rune"));
  });

  it("positions rotate with the colossus", () => {
    const def = createWraithDefinition();
    const at0 = getWraithWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = getWraithWeakPointPositions(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const lw0 = at0.find((p) => p.bodyPartId === "left_wing");
    const lwPI = atPI.find((p) => p.bodyPartId === "left_wing");
    assert.ok(lw0 !== undefined);
    assert.ok(lwPI !== undefined);
    assert.ok(Math.abs(lw0.x + lwPI.x) < 0.01, `x: ${lw0.x} vs ${lwPI.x}`);
    assert.ok(Math.abs(lw0.z + lwPI.z) < 0.01, `z: ${lw0.z} vs ${lwPI.z}`);
  });
});

describe("buildWraithCombatWeakPoints", () => {
  it("returns 3 combat-ready weak points", () => {
    const def = createWraithDefinition();
    const weakPoints = buildWraithCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(weakPoints.length, 3);
  });

  it("each weak point has id, position, health, maxHealth, isDestroyed, isActive", () => {
    const def = createWraithDefinition();
    const weakPoints = buildWraithCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.ok(typeof wp.id === "string");
      assert.ok(typeof wp.position.x === "number");
      assert.ok(typeof wp.position.y === "number");
      assert.ok(typeof wp.position.z === "number");
      assert.ok(typeof wp.health === "number");
      assert.ok(typeof wp.maxHealth === "number");
      assert.strictEqual(wp.isDestroyed, false);
      assert.strictEqual(wp.isActive, true);
    }
  });

  it("health equals maxHealth", () => {
    const def = createWraithDefinition();
    const weakPoints = buildWraithCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.strictEqual(wp.health, wp.maxHealth);
    }
  });

  it("neck_rune has highest health (healthMultiplier 3.0)", () => {
    const def = createWraithDefinition();
    const weakPoints = buildWraithCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const neckRune = weakPoints.find((wp) => wp.id === "neck_rune");
    const wing = weakPoints.find((wp) => wp.id === "left_wing");
    assert.ok(neckRune !== undefined);
    assert.ok(wing !== undefined);
    assert.ok(
      neckRune.maxHealth > wing.maxHealth,
      `neck ${neckRune.maxHealth} should be > wing ${wing.maxHealth}`,
    );
  });

  it("positions account for colossus world position", () => {
    const def = createWraithDefinition();
    const at0 = buildWraithCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const at10 = buildWraithCombatWeakPoints(def, { x: 10, y: 0, z: 0 }, 0);
    for (let i = 0; i < at0.length; i++) {
      assert.ok(Math.abs(at10[i].position.x - at0[i].position.x - 10) < 0.01);
    }
  });
});

describe("createWraithBehaviorState", () => {
  it("returns default state with Idle and full health", () => {
    const state = createWraithBehaviorState();
    assert.strictEqual(state.state, WraithState.IDLE);
    assert.strictEqual(state.health, WRAITH_BEHAVIOR_CONFIG.maxHealth);
    assert.strictEqual(state.altitude, 0);
  });

  it("accepts overrides", () => {
    const state = createWraithBehaviorState({ health: 50, altitude: 20 });
    assert.strictEqual(state.health, 50);
    assert.strictEqual(state.altitude, 20);
  });
});

describe("Wraith AI: Idle to Circling", () => {
  it("transitions to Circling after idleDuration", () => {
    const state = createWraithBehaviorState();
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      WRAITH_BEHAVIOR_CONFIG.idleDuration,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    );
    assert.strictEqual(result.state, WraithState.CIRCLING);
  });

  it("does not transition before idleDuration", () => {
    const state = createWraithBehaviorState();
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      WRAITH_BEHAVIOR_CONFIG.idleDuration - 0.1,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    );
    assert.strictEqual(result.state, WraithState.IDLE);
  });

  it("sets altitude to patrolAltitude on transition", () => {
    const state = createWraithBehaviorState();
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      WRAITH_BEHAVIOR_CONFIG.idleDuration,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    );
    assert.strictEqual(result.altitude, WRAITH_BEHAVIOR_CONFIG.patrolAltitude);
  });
});

describe("Wraith AI: Circling", () => {
  it("moves in a circular pattern (position changes)", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const farPlayer = { x: -100, y: 0, z: -100 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 1.0, farPlayer, colossusPos);
    assert.ok(result.position.x !== 0 || result.position.z !== 0, "should move during circling");
  });

  it("maintains altitude", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const farPlayer = { x: -100, y: 0, z: -100 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 1.0, farPlayer, colossusPos);
    assert.strictEqual(result.altitude, WRAITH_BEHAVIOR_CONFIG.patrolAltitude);
  });

  it("transitions to Swooping when player in detection range", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 20, y: 0, z: 0 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 0.1, playerPos, colossusPos);
    assert.strictEqual(result.state, WraithState.SWOOPING);
  });

  it("does not attack while circling", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const farPlayer = { x: -100, y: 0, z: -100 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 0.1, farPlayer, colossusPos);
    assert.strictEqual(result.shouldAttack, false);
  });
});

describe("Wraith AI: Swooping", () => {
  it("moves toward player at swoopSpeed", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const playerPos = { x: 10, y: 0, z: 0 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 0.1, playerPos, colossusPos);
    assert.ok(result.position.x > 0, "should move toward player");
  });

  it("altitude decreases during swoop (diving)", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const playerPos = { x: 0, y: 0, z: 20 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 0.5, playerPos, colossusPos);
    assert.ok(
      result.altitude < WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      `altitude was ${result.altitude}`,
    );
  });

  it("pulls up before hitting ground (swoopPullUpDistance)", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude, z: 0 },
    });
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.swoopPullUpDistance + 1, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    assert.strictEqual(result.state, WraithState.CLIMBING_BACK);
  });

  it("sets attackCooldown after swooping finishes", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      altitude: WRAITH_BEHAVIOR_CONFIG.swoopPullUpDistance + 1,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.swoopPullUpDistance + 1, z: 0 },
      attackCooldown: 0,
    });
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.swoopPullUpDistance + 1, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    assert.strictEqual(result.state, WraithState.CLIMBING_BACK);
    assert.ok(result.attackCooldown > 0, "should set cooldown");
  });
});

describe("Wraith AI: ClimbingBack", () => {
  it("altitude increases during climb back", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CLIMBING_BACK,
      altitude: 5,
      position: { x: 0, y: 5, z: 0 },
    });
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 5, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 1.0, playerPos, colossusPos);
    assert.ok(result.altitude > 5, `altitude was ${result.altitude}`);
  });

  it("transitions to Circling when reaching patrolAltitude", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CLIMBING_BACK,
      altitude: WRAITH_BEHAVIOR_CONFIG.patrolAltitude - 1,
      position: { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude - 1, z: 0 },
    });
    const playerPos = { x: -100, y: 0, z: -100 };
    const colossusPos = { x: 0, y: WRAITH_BEHAVIOR_CONFIG.patrolAltitude - 1, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 2.0, playerPos, colossusPos);
    assert.strictEqual(result.state, WraithState.CIRCLING);
  });

  it("does not attack during climb back", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CLIMBING_BACK,
      altitude: 5,
      position: { x: 0, y: 5, z: 0 },
    });
    const playerPos = { x: 0, y: 0, z: 0 };
    const colossusPos = { x: 0, y: 5, z: 0 };
    const result = updateWraithBehavior(state, WRAITH_BEHAVIOR_CONFIG, 0.5, playerPos, colossusPos);
    assert.strictEqual(result.shouldAttack, false);
  });
});

describe("Wraith AI: Stunned", () => {
  it("prevents movement", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      position: { x: 5, y: 20, z: 5 },
      altitude: 20,
      stunTimer: 1,
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      0.5,
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 20, z: 5 },
    );
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it("decrements stunTimer", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunTimer: 1.5,
      altitude: 20,
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      0.5,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 20, z: 0 },
    );
    assert.strictEqual(result.stunTimer, 1.0);
  });

  it("transitions to Circling when stunTimer expires", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunTimer: 0.1,
      altitude: 20,
      position: { x: 0, y: 20, z: 0 },
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      0.2,
      { x: 50, y: 0, z: 0 },
      { x: 0, y: 20, z: 0 },
    );
    assert.strictEqual(result.state, WraithState.CIRCLING);
  });

  it("does not attack while stunned", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunTimer: 1,
      altitude: 20,
      position: { x: 0, y: 20, z: 0 },
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      0.1,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 20, z: 0 },
    );
    assert.strictEqual(result.shouldAttack, false);
  });
});

describe("Wraith AI: Dying", () => {
  it("prevents all movement", () => {
    const state = createWraithBehaviorState({
      state: WraithState.DYING,
      position: { x: 5, y: 20, z: 5 },
      altitude: 20,
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      1.0,
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 20, z: 5 },
    );
    assert.strictEqual(result.position.x, 5);
    assert.strictEqual(result.position.z, 5);
  });

  it("prevents attacks", () => {
    const state = createWraithBehaviorState({
      state: WraithState.DYING,
      position: { x: 0, y: 20, z: 0 },
      altitude: 20,
      attackCooldown: 0,
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      0.1,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 20, z: 0 },
    );
    assert.strictEqual(result.shouldAttack, false);
  });

  it("does not transition to any other state", () => {
    const state = createWraithBehaviorState({
      state: WraithState.DYING,
      position: { x: 0, y: 20, z: 0 },
      altitude: 20,
    });
    const result = updateWraithBehavior(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      5.0,
      { x: 100, y: 0, z: 0 },
      { x: 0, y: 20, z: 0 },
    );
    assert.strictEqual(result.state, WraithState.DYING);
  });
});

describe("getWraithWindForce", () => {
  it("returns a force vector with x, y, z", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      position: { x: 0, y: 10, z: 0 },
      altitude: 10,
    });
    const force = getWraithWindForce(state, WRAITH_BEHAVIOR_CONFIG, { x: 5, y: 0, z: 0 });
    assert.ok(typeof force.x === "number");
    assert.ok(typeof force.y === "number");
    assert.ok(typeof force.z === "number");
  });

  it("force direction is away from the wraith", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      position: { x: 0, y: 10, z: 0 },
      altitude: 10,
    });
    const targetPos = { x: 5, y: 0, z: 0 };
    const force = getWraithWindForce(state, WRAITH_BEHAVIOR_CONFIG, targetPos);
    assert.ok(force.x > 0, "wind should push target away from wraith (positive x)");
  });

  it("returns zero force when target is far away", () => {
    const state = createWraithBehaviorState({
      state: WraithState.SWOOPING,
      position: { x: 0, y: 10, z: 0 },
      altitude: 10,
    });
    const farTarget = { x: 100, y: 0, z: 0 };
    const force = getWraithWindForce(state, WRAITH_BEHAVIOR_CONFIG, farTarget);
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
    assert.strictEqual(force.z, 0);
  });

  it("returns zero force when not in swooping state", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      position: { x: 0, y: 10, z: 0 },
      altitude: 10,
    });
    const targetPos = { x: 5, y: 0, z: 0 };
    const force = getWraithWindForce(state, WRAITH_BEHAVIOR_CONFIG, targetPos);
    assert.strictEqual(force.x, 0);
    assert.strictEqual(force.y, 0);
    assert.strictEqual(force.z, 0);
  });
});

describe("isWraithClimbable", () => {
  it("returns false for Idle", () => {
    const state = createWraithBehaviorState({ state: WraithState.IDLE });
    assert.strictEqual(isWraithClimbable(state), false);
  });

  it("returns true for Circling", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING });
    assert.strictEqual(isWraithClimbable(state), true);
  });

  it("returns true for Swooping (primary climbing opportunity per GDD)", () => {
    const state = createWraithBehaviorState({ state: WraithState.SWOOPING });
    assert.strictEqual(isWraithClimbable(state), true);
  });

  it("returns true for ClimbingBack (climbable/attackable window)", () => {
    const state = createWraithBehaviorState({ state: WraithState.CLIMBING_BACK });
    assert.strictEqual(isWraithClimbable(state), true);
  });

  it("returns true for Stunned", () => {
    const state = createWraithBehaviorState({ state: WraithState.STUNNED });
    assert.strictEqual(isWraithClimbable(state), true);
  });

  it("returns false for Dying", () => {
    const state = createWraithBehaviorState({ state: WraithState.DYING });
    assert.strictEqual(isWraithClimbable(state), false);
  });
});

function createMockTHREE() {
  class Group {
    constructor() {
      this.children = [];
      this.isGroup = true;
    }
    add(child) {
      this.children.push(child);
    }
  }
  class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.position = { x: 0, y: 0, z: 0 };
      this.position.set = (x, y, z) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
      };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.rotation.set = (x, y, z) => {
        this.rotation.x = x;
        this.rotation.y = y;
        this.rotation.z = z;
      };
      this.scale = { x: 1, y: 1, z: 1 };
      this.castShadow = false;
      this.receiveShadow = false;
    }
  }
  class SphereGeometry {
    constructor(...args) {
      this.type = "sphere";
      this.args = args;
    }
    scale() {}
  }
  class ConeGeometry {
    constructor(...args) {
      this.type = "cone";
      this.args = args;
    }
  }
  class BufferGeometry {
    constructor() {
      this.type = "buffer";
      this.attributes = {};
    }
    setAttribute(name, attr) {
      this.attributes[name] = attr;
    }
    setIndex() {}
    computeVertexNormals() {}
  }
  class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
    }
  }
  class MeshStandardMaterial {
    constructor(opts = {}) {
      Object.assign(this, opts);
    }
  }
  class Color {
    constructor(value) {
      this.value = value;
    }
  }
  return {
    Group,
    Mesh,
    SphereGeometry,
    ConeGeometry,
    BufferGeometry,
    BufferAttribute,
    MeshStandardMaterial,
    Color,
    DoubleSide: 2,
  };
}

describe("createWraithMesh", () => {
  let mockTHREE;
  beforeEach(() => {
    mockTHREE = createMockTHREE();
    setTHREE(mockTHREE);
  });

  it("returns an object with impl (Group), children, meshByPart, and originalPositions", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.ok(mesh.impl !== undefined);
    assert.ok(mesh.impl.isGroup);
    assert.ok(Array.isArray(mesh.children));
    assert.ok(mesh.children.length > 0);
    assert.ok(mesh.meshByPart instanceof Map);
    assert.ok(mesh.originalPositions instanceof Map);
  });

  it("has body segment meshes for neck, chest, tail_base, tail_mid, tail_tip", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    const ids = [...mesh.meshByPart.keys()];
    for (const id of ["neck", "chest", "tail_base", "tail_mid", "tail_tip"]) {
      assert.ok(ids.includes(id), `missing ${id}`);
    }
  });

  it("has wing meshes for left_wing and right_wing", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.ok(mesh.meshByPart.has("left_wing"));
    assert.ok(mesh.meshByPart.has("right_wing"));
  });

  it("has head mesh", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.ok(mesh.meshByPart.has("head"));
  });

  it("has horn meshes (left_horn, right_horn) with ConeGeometry", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.ok(mesh.meshByPart.has("left_horn"));
    assert.ok(mesh.meshByPart.has("right_horn"));
    assert.strictEqual(mesh.meshByPart.get("left_horn").geometry.type, "cone");
    assert.strictEqual(mesh.meshByPart.get("right_horn").geometry.type, "cone");
  });

  it("materials are transparent", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    for (const child of mesh.children) {
      if (!child.material) continue;
      assert.strictEqual(child.material.transparent, true, `${child.partId} should be transparent`);
    }
  });

  it("body material has opacity approximately 0.75", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    const body = mesh.children.find((c) => c.partId === "chest");
    assert.ok(body !== undefined);
    assert.ok(
      Math.abs(body.material.opacity - 0.75) < 0.01,
      `opacity was ${body.material.opacity}`,
    );
  });

  it("all material opacities are within valid range", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    for (const child of mesh.children) {
      if (!child.material) continue;
      assert.ok(
        child.material.opacity >= 0.5 && child.material.opacity <= 1.0,
        `${child.partId} opacity ${child.material.opacity} out of range`,
      );
    }
  });

  it("wing meshes use BufferGeometry", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.strictEqual(mesh.meshByPart.get("left_wing").geometry.type, "buffer");
    assert.strictEqual(mesh.meshByPart.get("right_wing").geometry.type, "buffer");
  });

  it("body segments use SphereGeometry", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.strictEqual(mesh.meshByPart.get("neck").geometry.type, "sphere");
    assert.strictEqual(mesh.meshByPart.get("chest").geometry.type, "sphere");
    assert.strictEqual(mesh.meshByPart.get("tail_tip").geometry.type, "sphere");
  });

  it("left_wing is mirrored (scale.x = -1)", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.strictEqual(mesh.meshByPart.get("left_wing").scale.x, -1);
  });

  it("group has all parts as children (at least 11)", () => {
    const def = createWraithDefinition();
    const mesh = createWraithMesh(def);
    assert.ok(mesh.impl.children.length >= 11, `got ${mesh.impl.children.length} children`);
  });
});

describe("animateWraith", () => {
  let mockTHREE, wraithMesh;
  beforeEach(() => {
    mockTHREE = createMockTHREE();
    setTHREE(mockTHREE);
    wraithMesh = createWraithMesh(createWraithDefinition());
  });

  it("left_wing rotation.z changes with time", () => {
    const lw = wraithMesh.meshByPart.get("left_wing");
    animateWraith(wraithMesh, 0);
    const r0 = lw.rotation.z;
    animateWraith(wraithMesh, 1.0);
    const r1 = lw.rotation.z;
    assert.notStrictEqual(r0, r1);
  });

  it("right_wing rotation.z is opposite sign of left_wing", () => {
    animateWraith(wraithMesh, 0.5);
    const lw = wraithMesh.meshByPart.get("left_wing");
    const rw = wraithMesh.meshByPart.get("right_wing");
    assert.ok(
      Math.abs(lw.rotation.z + rw.rotation.z) < 0.001,
      `left ${lw.rotation.z} should oppose right ${rw.rotation.z}`,
    );
  });

  it("wing rotation is zero at time=0 (sin(0)=0)", () => {
    animateWraith(wraithMesh, 0);
    const lw = wraithMesh.meshByPart.get("left_wing");
    assert.ok(Math.abs(lw.rotation.z) < 0.001, `expected ~0, got ${lw.rotation.z}`);
  });

  it("body segments undulate with phase offset", () => {
    animateWraith(wraithMesh, 1.0);
    const neck = wraithMesh.meshByPart.get("neck");
    const chest = wraithMesh.meshByPart.get("chest");
    const origNeck = wraithMesh.originalPositions.get("neck");
    const origChest = wraithMesh.originalPositions.get("chest");
    const neckOff = neck.position.x - origNeck.x;
    const chestOff = chest.position.x - origChest.x;
    assert.ok(
      Math.abs(neckOff - chestOff) > 0.001,
      `neck offset ${neckOff} should differ from chest offset ${chestOff}`,
    );
  });

  it("body positions match expected wave formula at time=0", () => {
    const time = 0;
    animateWraith(wraithMesh, time);
    const chest = wraithMesh.meshByPart.get("chest");
    const orig = wraithMesh.originalPositions.get("chest");
    const phase = time * 1.5 + 1 * 0.8;
    const expected = orig.x + Math.sin(phase) * 0.5;
    assert.ok(
      Math.abs(chest.position.x - expected) < 0.001,
      `expected x=${expected}, got ${chest.position.x}`,
    );
  });

  it("calling animateWraith twice with same time is idempotent", () => {
    animateWraith(wraithMesh, 2.0);
    const px1 = wraithMesh.meshByPart.get("neck").position.x;
    animateWraith(wraithMesh, 2.0);
    const px2 = wraithMesh.meshByPart.get("neck").position.x;
    assert.strictEqual(px1, px2);
  });
});

describe("triggerWraithStun", () => {
  it("transitions any non-dying state to STUNNED", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: 20,
      position: { x: 5, y: 20, z: 5 },
    });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.state, WraithState.STUNNED);
  });

  it("sets stunTimer to config stunDuration", () => {
    const state = createWraithBehaviorState({ state: WraithState.SWOOPING });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.stunTimer, WRAITH_BEHAVIOR_CONFIG.stunDuration);
  });

  it("resets stateTimer", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING, stateTimer: 5 });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.stateTimer, 0);
  });

  it("resets stunDamageAccumulator", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      stunDamageAccumulator: 50,
    });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.stunDamageAccumulator, 0);
  });

  it("does not stun if already dying", () => {
    const state = createWraithBehaviorState({ state: WraithState.DYING });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.state, WraithState.DYING);
  });

  it("does not stun if already stunned", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunTimer: 1.5,
    });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.state, WraithState.STUNNED);
    assert.strictEqual(result.stunTimer, 1.5);
  });

  it("preserves position and altitude", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CLIMBING_BACK,
      position: { x: 10, y: 15, z: -5 },
      altitude: 15,
    });
    const result = triggerWraithStun(state, WRAITH_BEHAVIOR_CONFIG);
    assert.strictEqual(result.position.x, 10);
    assert.strictEqual(result.position.z, -5);
    assert.strictEqual(result.altitude, 15);
  });
});

describe("applyWraithDamage", () => {
  it("returns updated state with damage accumulated", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING });
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 20);
    assert.strictEqual(result.stunDamageAccumulator, 20);
  });

  it("accumulates damage across multiple hits", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING });
    let result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 20);
    result = applyWraithDamage(result, WRAITH_BEHAVIOR_CONFIG, 15);
    assert.strictEqual(result.stunDamageAccumulator, 35);
  });

  it("auto-stuns when accumulated damage reaches threshold", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      altitude: 20,
      position: { x: 0, y: 20, z: 0 },
    });
    const damage = WRAITH_STUN_DAMAGE_THRESHOLD;
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, damage);
    assert.strictEqual(result.state, WraithState.STUNNED);
    assert.strictEqual(result.stunTimer, WRAITH_BEHAVIOR_CONFIG.stunDuration);
  });

  it("resets accumulator after triggering stun", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      stunDamageAccumulator: WRAITH_STUN_DAMAGE_THRESHOLD - 1,
      altitude: 20,
      position: { x: 0, y: 20, z: 0 },
    });
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 2);
    assert.strictEqual(result.stunDamageAccumulator, 0);
  });

  it("does not accumulate damage while already stunned", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunTimer: 1.0,
      stunDamageAccumulator: 0,
    });
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 50);
    assert.strictEqual(result.stunDamageAccumulator, 0);
    assert.strictEqual(result.stunTimer, 1.0);
  });

  it("does not accumulate damage while dying", () => {
    const state = createWraithBehaviorState({
      state: WraithState.DYING,
      stunDamageAccumulator: 0,
    });
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 50);
    assert.strictEqual(result.stunDamageAccumulator, 0);
  });

  it("does not stun if damage does not reach threshold", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING });
    const result = applyWraithDamage(
      state,
      WRAITH_BEHAVIOR_CONFIG,
      WRAITH_STUN_DAMAGE_THRESHOLD - 1,
    );
    assert.strictEqual(result.state, WraithState.CIRCLING);
    assert.strictEqual(result.stunDamageAccumulator, WRAITH_STUN_DAMAGE_THRESHOLD - 1);
  });

  it("works during CLIMBING_BACK state", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CLIMBING_BACK,
      altitude: 10,
      position: { x: 0, y: 10, z: 0 },
    });
    const result = applyWraithDamage(state, WRAITH_BEHAVIOR_CONFIG, 20);
    assert.strictEqual(result.stunDamageAccumulator, 20);
    assert.strictEqual(result.state, WraithState.CLIMBING_BACK);
  });
});

describe("getWraithStunProgress", () => {
  it("returns 0 when no damage accumulated", () => {
    const state = createWraithBehaviorState({ state: WraithState.CIRCLING });
    const progress = getWraithStunProgress(state);
    assert.strictEqual(progress, 0);
  });

  it("returns 0.5 when half the threshold is accumulated", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      stunDamageAccumulator: WRAITH_STUN_DAMAGE_THRESHOLD / 2,
    });
    const progress = getWraithStunProgress(state);
    assert.ok(Math.abs(progress - 0.5) < 0.001, `expected 0.5, got ${progress}`);
  });

  it("returns 1.0 when at threshold", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      stunDamageAccumulator: WRAITH_STUN_DAMAGE_THRESHOLD,
    });
    const progress = getWraithStunProgress(state);
    assert.strictEqual(progress, 1.0);
  });

  it("clamps to 1.0 when over threshold", () => {
    const state = createWraithBehaviorState({
      state: WraithState.CIRCLING,
      stunDamageAccumulator: WRAITH_STUN_DAMAGE_THRESHOLD + 50,
    });
    const progress = getWraithStunProgress(state);
    assert.strictEqual(progress, 1.0);
  });

  it("returns 0 when stunned (accumulator was reset)", () => {
    const state = createWraithBehaviorState({
      state: WraithState.STUNNED,
      stunDamageAccumulator: 0,
    });
    const progress = getWraithStunProgress(state);
    assert.strictEqual(progress, 0);
  });
});

describe("WRAITH_STUN_DAMAGE_THRESHOLD", () => {
  it("is a positive number", () => {
    assert.ok(typeof WRAITH_STUN_DAMAGE_THRESHOLD === "number");
    assert.ok(WRAITH_STUN_DAMAGE_THRESHOLD > 0);
  });

  it("is less than maxHealth (stun should be achievable before kill)", () => {
    assert.ok(WRAITH_STUN_DAMAGE_THRESHOLD < WRAITH_BEHAVIOR_CONFIG.maxHealth);
  });
});

describe("createWraithBehaviorState stun fields", () => {
  it("initializes stunDamageAccumulator to 0", () => {
    const state = createWraithBehaviorState();
    assert.strictEqual(state.stunDamageAccumulator, 0);
  });
});
