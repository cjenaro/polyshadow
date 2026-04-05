import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDeathIntegration,
  triggerDeathSequence,
  updateDeathIntegration,
  applyDeathToMesh,
} from "./death-integration.js";
import { DEATH_PHASES } from "./death.js";

describe("createDeathIntegration", () => {
  it("creates integration with death state and entity reference", () => {
    const entity = { id: "titan_1", health: 100 };
    const integration = createDeathIntegration(entity);
    assert.strictEqual(integration.entity, entity);
    assert.strictEqual(integration.deathState.phase, DEATH_PHASES.KNEEL);
    assert.strictEqual(integration.deathState.timer, 0);
    assert.strictEqual(integration.active, false);
  });

  it("creates fresh death state for each call", () => {
    const entity = { id: "titan_1" };
    const a = createDeathIntegration(entity);
    const b = createDeathIntegration(entity);
    assert.notStrictEqual(a.deathState, b.deathState);
  });
});

describe("triggerDeathSequence", () => {
  it("sets active to true", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    assert.strictEqual(integration.active, true);
  });

  it("returns the integration", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    const result = triggerDeathSequence(integration);
    assert.strictEqual(result, integration);
  });

  it("resets death state on trigger", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    integration.deathState = { phase: DEATH_PHASES.FALLEN, timer: 7 };
    triggerDeathSequence(integration);
    assert.strictEqual(integration.deathState.phase, DEATH_PHASES.KNEEL);
    assert.strictEqual(integration.deathState.timer, 0);
  });
});

describe("updateDeathIntegration", () => {
  it("does nothing when not active", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    const result = updateDeathIntegration(integration, 1.0);
    assert.strictEqual(result.integration, integration);
    assert.strictEqual(result.cameraShake, 0);
    assert.strictEqual(result.isComplete, false);
    assert.strictEqual(integration.deathState.timer, 0);
  });

  it("advances death animation when active", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    const result = updateDeathIntegration(integration, 1.0);
    assert.strictEqual(result.integration, integration);
    assert.ok(integration.deathState.timer > 0);
  });

  it("returns camera shake from death state", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 3.0);
    const result = updateDeathIntegration(integration, 0.1);
    assert.ok(result.cameraShake >= 0);
  });

  it("returns isComplete when death finishes", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 7.5);
    const result = updateDeathIntegration(integration, 0.1);
    assert.strictEqual(result.isComplete, true);
  });

  it("returns isComplete false before fallen", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    const result = updateDeathIntegration(integration, 1.0);
    assert.strictEqual(result.isComplete, false);
  });
});

describe("applyDeathToMesh", () => {
  it("applies transform to each mesh in meshByPart", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 1.5);

    const mesh1 = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1 },
    };
    const mesh2 = {
      position: { x: 10, y: 3, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1 },
    };

    const meshByPart = new Map([
      ["torso", mesh1],
      ["head", mesh2],
    ]);

    const meshGroup = { meshByPart };

    applyDeathToMesh(integration, meshGroup);

    assert.ok(mesh1.position.y < 5, "torso should move down during kneel");
    assert.ok(mesh2.position.y < 3, "head should move down during kneel");
  });

  it("sets transparent and opacity during dissolve", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 5.5);

    const mesh = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1 },
    };
    const meshByPart = new Map([["torso", mesh]]);
    const meshGroup = { meshByPart };

    applyDeathToMesh(integration, meshGroup);

    assert.strictEqual(mesh.material.transparent, true);
    assert.ok(mesh.material.opacity < 1);
    assert.ok(mesh.material.opacity > 0);
  });

  it("sets opacity to 0 when fully dissolved", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 7.5);

    const mesh = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1 },
    };
    const meshByPart = new Map([["torso", mesh]]);
    const meshGroup = { meshByPart };

    applyDeathToMesh(integration, meshGroup);

    assert.strictEqual(mesh.material.opacity, 0);
    assert.strictEqual(mesh.material.transparent, true);
  });

  it("does not set transparent when no dissolve", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 1.0);

    const mesh = {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1, transparent: false },
    };
    const meshByPart = new Map([["torso", mesh]]);
    const meshGroup = { meshByPart };

    applyDeathToMesh(integration, meshGroup);

    assert.strictEqual(mesh.material.transparent, false);
  });

  it("applies rotation changes from death transform", () => {
    const entity = { id: "titan_1" };
    const integration = createDeathIntegration(entity);
    triggerDeathSequence(integration);
    updateDeathIntegration(integration, 1.5);

    const mesh = {
      position: { x: 0, y: 12, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      material: { opacity: 1 },
    };
    const meshByPart = new Map([["head", mesh]]);
    const meshGroup = { meshByPart };

    applyDeathToMesh(integration, meshGroup);

    assert.ok(mesh.rotation.x > 0, "head should tilt forward");
  });
});
