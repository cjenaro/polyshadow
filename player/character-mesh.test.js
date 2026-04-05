import { describe, it } from "node:test";
import assert from "node:assert";

describe("createCharacterMesh", () => {
  let createCharacterMesh;

  it("can be imported without errors", async () => {
    const mod = await import("./character-mesh.js");
    createCharacterMesh = mod.createCharacterMesh;
    assert.strictEqual(typeof createCharacterMesh, "function");
  });

  it("returns an object with impl property", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    assert.ok(mesh.impl);
    assert.ok(mesh.impl.isGroup);
  });

  it("has setPosition method", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    assert.strictEqual(typeof mesh.setPosition, "function");
  });

  it("setPosition updates group position", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    mesh.setPosition(3, 5, 7);
    assert.strictEqual(mesh.impl.position.x, 3);
    assert.strictEqual(mesh.impl.position.y, 5);
    assert.strictEqual(mesh.impl.position.z, 7);
  });

  it("has setRotationY method", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    assert.strictEqual(typeof mesh.setRotationY, "function");
  });

  it("setRotationY updates group rotation", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    mesh.setRotationY(1.57);
    assert.ok(Math.abs(mesh.impl.rotation.y - 1.57) < 0.01);
  });

  it("has cape reference", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    assert.ok(mesh.cape);
  });

  it("has sword reference", async () => {
    const mod = await import("./character-mesh.js");
    const mesh = mod.createCharacterMesh();
    assert.ok(mesh.sword);
  });
});
