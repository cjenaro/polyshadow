import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyHealthOpacity } from "./health-visual.js";

describe("applyHealthOpacity", () => {
  function makeMockMesh() {
    const parts = new Map();
    const addPart = (id) => {
      parts.set(id, { material: { opacity: 1.0, transparent: false } });
    };
    addPart("torso");
    addPart("head");
    addPart("leg");
    return { meshByPart: parts };
  }

  it("returns opacity value for full health", () => {
    const mesh = makeMockMesh();
    const result = applyHealthOpacity(mesh, 1.0, 1.0);
    assert.strictEqual(result, 1.0);
  });

  it("returns lower opacity for damaged health", () => {
    const mesh = makeMockMesh();
    const result = applyHealthOpacity(mesh, 0.5, 1.0);
    assert.ok(result < 1.0, "opacity should be less than 1 at half health");
    assert.ok(result > 0, "opacity should be positive");
  });

  it("returns minimum opacity at zero health", () => {
    const mesh = makeMockMesh();
    const result = applyHealthOpacity(mesh, 0, 1.0);
    assert.strictEqual(result, 0.3);
  });

  it("applies opacity to all mesh parts", () => {
    const mesh = makeMockMesh();
    applyHealthOpacity(mesh, 0.5, 1.0);
    for (const [, part] of mesh.meshByPart) {
      assert.ok(part.material.transparent, "material should be transparent");
      assert.ok(part.material.opacity < 1.0);
    }
  });

  it("clamps health above max to 1.0 opacity", () => {
    const mesh = makeMockMesh();
    const result = applyHealthOpacity(mesh, 200, 100);
    assert.strictEqual(result, 1.0);
  });

  it("clamps negative health to minimum opacity", () => {
    const mesh = makeMockMesh();
    const result = applyHealthOpacity(mesh, -10, 100);
    assert.strictEqual(result, 0.3);
  });

  it("does not modify opacity when health is full", () => {
    const mesh = makeMockMesh();
    applyHealthOpacity(mesh, 1.0, 1.0);
    for (const [, part] of mesh.meshByPart) {
      assert.strictEqual(part.material.opacity, 1.0);
    }
  });

  it("sets transparent flag on material when opacity < 1", () => {
    const mesh = makeMockMesh();
    applyHealthOpacity(mesh, 0.1, 1.0);
    for (const [, part] of mesh.meshByPart) {
      assert.strictEqual(part.material.transparent, true);
    }
  });
});
