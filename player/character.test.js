import { describe, it } from "node:test";
import assert from "node:assert";
import { PlayerCharacter } from "./character.js";

describe("PlayerCharacter", () => {
  it("constructor sets default state", () => {
    const player = new PlayerCharacter();
    assert.ok(player.state);
    assert.ok("position" in player.state);
    assert.ok("velocity" in player.state);
    assert.ok("rotation" in player.state);
    assert.ok("isGrounded" in player.state);
    assert.ok("isSprinting" in player.state);
    assert.ok("isJumping" in player.state);
  });

  it("default position is origin", () => {
    const player = new PlayerCharacter();
    assert.strictEqual(player.state.position.x, 0);
    assert.strictEqual(player.state.position.y, 0);
    assert.strictEqual(player.state.position.z, 0);
  });

  it("default velocity is zero", () => {
    const player = new PlayerCharacter();
    assert.strictEqual(player.state.velocity.x, 0);
    assert.strictEqual(player.state.velocity.y, 0);
    assert.strictEqual(player.state.velocity.z, 0);
  });

  it("player starts grounded", () => {
    const player = new PlayerCharacter();
    assert.strictEqual(player.state.isGrounded, true);
  });

  it("exposes movement constants", () => {
    const player = new PlayerCharacter();
    assert.strictEqual(player.WALK_SPEED, 4);
    assert.strictEqual(player.RUN_SPEED, 8);
    assert.strictEqual(player.JUMP_FORCE, 8);
    assert.strictEqual(player.GRAVITY, -20);
    assert.strictEqual(player.GROUND_Y, 0);
  });
});
