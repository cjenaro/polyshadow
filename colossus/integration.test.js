import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createColossus,
  updateColossi,
  getColossusSurfaces,
  getColossusWeakPoints,
  damageColossus,
  getColossusByType,
} from "./integration.js";
import { setTHREE as setSentinelTHREE } from "./sentinel.js";
import { setTHREE as setWraithTHREE, WRAITH_STUN_DAMAGE_THRESHOLD } from "./wraith.js";
import { setTHREE as setTitanTHREE, TITAN_STUN_DAMAGE_THRESHOLD } from "./titan.js";
import { SENTINEL_STUN_DAMAGE_THRESHOLD } from "./behavior.js";

const mockMesh = { position: { x: 0, y: 0, z: 0 }, set() {}, add() {}, scale: { set() {} } };

const mockTHREE = {
  Group: class {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set() {} };
      this.rotation = { x: 0, y: 0, z: 0, set() {} };
    }
    add(child) {
      this.children.push(child);
    }
  },
  Mesh: class {
    constructor() {
      this.position = { x: 0, y: 0, z: 0, set() {} };
      this.rotation = { x: 0, y: 0, z: 0, set() {} };
      this.scale = { x: 1, y: 1, z: 1, set() {} };
      this.castShadow = false;
      this.receiveShadow = false;
      this.userData = {};
      this.material = { emissiveIntensity: 0.5 };
      this.add = () => {};
    }
  },
  BoxGeometry: class {
    constructor() {}
  },
  CylinderGeometry: class {
    constructor() {}
  },
  SphereGeometry: class {
    constructor() {}
    scale() {}
  },
  ConeGeometry: class {
    constructor() {}
  },
  BufferGeometry: class {
    constructor() {
      this.attributes = {};
      this.index = null;
    }
    setAttribute() {}
    setIndex() {}
    computeVertexNormals() {}
  },
  BufferAttribute: class {
    constructor() {}
  },
  MeshStandardMaterial: class {
    constructor(opts = {}) {
      Object.assign(this, opts);
    }
  },
  Color: class {
    constructor(c) {
      this.value = c;
    }
  },
  DoubleSide: 2,
};

beforeEach(() => {
  setSentinelTHREE(mockTHREE);
  setWraithTHREE(mockTHREE);
  setTitanTHREE(mockTHREE);
});

describe("createColossus", () => {
  it("creates a sentinel with correct type", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    assert.equal(c.type, "sentinel");
    assert.ok(c.aiState);
    assert.ok(c.weakPoints);
    assert.ok(c.mesh);
    assert.ok(c.surfacePatches);
    assert.ok(c.definition);
    assert.ok(c.behaviorConfig);
  });

  it("creates a sentinel at the given position", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    assert.equal(c.aiState.position.x, 120);
    assert.equal(c.aiState.position.z, 0);
  });

  it("creates a sentinel with correct behavior config", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    assert.equal(c.behaviorConfig.detectionRange, 40);
    assert.equal(c.behaviorConfig.maxHealth, 100);
  });

  it("creates a sentinel with weak points", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    assert.ok(c.weakPoints.length > 0);
    const wp = c.weakPoints[0];
    assert.ok(wp.id);
    assert.ok(wp.position);
    assert.ok(typeof wp.health === "number");
    assert.ok(typeof wp.maxHealth === "number");
    assert.equal(wp.isDestroyed, false);
    assert.equal(wp.isActive, true);
  });

  it("creates a sentinel with surface patches", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    assert.ok(c.surfacePatches.length > 0);
    const patch = c.surfacePatches[0];
    assert.ok(patch.position);
    assert.ok(patch.normal);
    assert.equal(patch.climbable, true);
    assert.ok(patch.bodyPartId);
  });

  it("creates a wraith with correct type and config", () => {
    const c = createColossus("wraith", { x: 50, y: 0, z: 50 });
    assert.equal(c.type, "wraith");
    assert.equal(c.behaviorConfig.detectionRange, 50);
    assert.equal(c.behaviorConfig.maxHealth, 120);
    assert.ok(c.aiState.altitude !== undefined);
  });

  it("creates a titan with correct type and config", () => {
    const c = createColossus("titan", { x: 0, y: 0, z: -100 });
    assert.equal(c.type, "titan");
    assert.equal(c.behaviorConfig.detectionRange, 45);
    assert.equal(c.behaviorConfig.maxHealth, 150);
    assert.equal(c.aiState.phase, 1);
  });

  it("throws for unknown colossus type", () => {
    assert.throws(() => createColossus("unknown", { x: 0, y: 0, z: 0 }), /unknown colossus type/i);
  });
});

describe("updateColossi", () => {
  it("returns events array", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    const events = updateColossi(colossi, { x: 100, y: 0, z: 100 }, 0.1);
    assert.ok(Array.isArray(events));
  });

  it("updates aiState for each colossus", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    const prevState = colossi[0].aiState.state;
    updateColossi(colossi, { x: 100, y: 0, z: 100 }, 0.1);
    assert.ok(colossi[0].aiState);
  });

  it("updates mesh position when AI position changes", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    colossi[0].aiState = {
      ...colossi[0].aiState,
      state: "patrol",
      patrolWaypoints: [{ x: 5, z: 5 }],
      currentWaypointIndex: 0,
      stateTimer: 0,
    };
    const initialX = colossi[0].mesh.impl.position.x;
    updateColossi(colossi, { x: 100, y: 0, z: 100 }, 0.1);
    assert.ok(typeof colossi[0].mesh.impl.position.x === "number");
  });

  it("generates attack events when colossus should attack", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.aiState = {
      ...c.aiState,
      state: "aggro",
      attackCooldown: 0,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      stateTimer: 0,
      shakeOffTimer: 0,
      lastShakeOffTime: 0,
      targetPosition: null,
    };
    const events = updateColossi([c], { x: 2, y: 0, z: 2 }, 0.1);
    const attackEvents = events.filter((e) => e.type === "attack");
    assert.ok(attackEvents.length > 0, "expected attack events but got: " + JSON.stringify(events));
    assert.equal(attackEvents[0].colossusType, "sentinel");
    assert.ok(attackEvents[0].direction);
  });

  it("returns empty events for empty colossi array", () => {
    const events = updateColossi([], { x: 0, y: 0, z: 0 }, 0.1);
    assert.equal(events.length, 0);
  });

  it("handles multiple colossi types", () => {
    const colossi = [
      createColossus("sentinel", { x: 0, y: 0, z: 0 }),
      createColossus("wraith", { x: 50, y: 0, z: 50 }),
      createColossus("titan", { x: -50, y: 0, z: 0 }),
    ];
    const events = updateColossi(colossi, { x: 100, y: 0, z: 100 }, 0.1);
    assert.ok(Array.isArray(events));
  });
});

describe("getColossusSurfaces", () => {
  it("returns surface patches for a sentinel", () => {
    const colossi = [createColossus("sentinel", { x: 120, y: 0, z: 0 })];
    const surfaces = getColossusSurfaces(colossi);
    assert.ok(surfaces.length > 0);
  });

  it("returns patches offset by colossus position", () => {
    const c = createColossus("sentinel", { x: 120, y: 0, z: 0 });
    const surfaces = getColossusSurfaces([c]);
    const hasOffset = surfaces.some((p) => p.position.x !== 0 || p.position.z !== 0);
    assert.ok(hasOffset, "surface patches should be offset from origin");
  });

  it("each surface has required fields", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    const surfaces = getColossusSurfaces(colossi);
    for (const s of surfaces) {
      assert.ok(s.position, "missing position");
      assert.ok(s.normal, "missing normal");
      assert.ok(typeof s.climbable === "boolean", "missing climbable");
      assert.ok(s.bodyPartId, "missing bodyPartId");
      assert.ok(s.parentPartId, "missing parentPartId");
    }
  });

  it("returns empty for empty colossi", () => {
    assert.equal(getColossusSurfaces([]).length, 0);
  });

  it("rotates surface patches by colossus rotation", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.rotation = Math.PI / 2;
    const surfaces = getColossusSurfaces([c]);
    const torsoSurfs = surfaces.filter((s) => s.bodyPartId === "torso");
    const frontFace = torsoSurfs.find((s) => s.normal.y === 0 && Math.abs(s.normal.z - 1) < 1e-10);
    assert.ok(
      frontFace,
      "should have a torso patch now facing +z (was right face before rotation)",
    );
    assert.ok(
      Math.abs(frontFace.position.x) > 0.1,
      "patch x should be non-zero after 90-degree rotation",
    );
    const backFace = torsoSurfs.find((s) => s.normal.y === 0 && Math.abs(s.normal.z + 1) < 1e-10);
    assert.ok(backFace, "should have a torso patch now facing -z (was left face before rotation)");
    assert.ok(
      Math.abs(backFace.position.x) > 0.1,
      "patch x should be non-zero after 90-degree rotation",
    );
  });

  it("rotates normals correctly for colossus rotation", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.rotation = Math.PI / 2;
    const surfaces = getColossusSurfaces([c]);
    const wasRightFace = surfaces.find(
      (s) =>
        s.bodyPartId === "torso" &&
        s.normal.y === 0 &&
        Math.abs(s.normal.z - 1) < 1e-10 &&
        Math.abs(s.normal.x) < 1e-10,
    );
    assert.ok(
      wasRightFace,
      "a patch originally on the right face (normal x=1) should now face +z after 90-degree rotation",
    );
  });

  it("does not modify y position or y normal when rotating", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.rotation = Math.PI / 2;
    const surfaces = getColossusSurfaces([c]);
    const topPatch = surfaces.find(
      (s) => s.bodyPartId === "torso" && Math.abs(s.normal.y - 1) < 1e-10,
    );
    assert.ok(topPatch, "should have a top-facing torso patch");
    assert.ok(Math.abs(topPatch.normal.x) < 1e-10);
    assert.ok(Math.abs(topPatch.normal.y - 1) < 1e-10);
    assert.ok(Math.abs(topPatch.normal.z) < 1e-10);
  });

  it("propagates isRestSpot to surfaces from rest spot body parts", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const surfaces = getColossusSurfaces([c]);
    const torsoSurfaces = surfaces.filter((s) => s.bodyPartId === "torso");
    assert.ok(torsoSurfaces.length > 0, "sentinel should have torso surfaces");
    for (const s of torsoSurfaces) {
      assert.strictEqual(s.isRestSpot, true, `torso surface should be rest spot`);
    }
  });

  it("sets isRestSpot false for non-rest-spot body parts", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const surfaces = getColossusSurfaces([c]);
    const legSurfaces = surfaces.filter((s) => s.bodyPartId.startsWith("front_left_upper"));
    assert.ok(legSurfaces.length > 0, "sentinel should have leg surfaces");
    for (const s of legSurfaces) {
      assert.strictEqual(s.isRestSpot, false, `${s.bodyPartId} should not be rest spot`);
    }
  });

  it("each surface has isRestSpot field", () => {
    const colossi = [
      createColossus("sentinel", { x: 0, y: 0, z: 0 }),
      createColossus("wraith", { x: 50, y: 0, z: 50 }),
      createColossus("titan", { x: -50, y: 0, z: 0 }),
    ];
    const surfaces = getColossusSurfaces(colossi);
    assert.ok(surfaces.length > 0);
    for (const s of surfaces) {
      assert.ok(typeof s.isRestSpot === "boolean", `${s.bodyPartId} missing boolean isRestSpot`);
    }
  });

  it("wraith has rest spot surfaces on chest and neck", () => {
    const c = createColossus("wraith", { x: 0, y: 0, z: 0 });
    const surfaces = getColossusSurfaces([c]);
    const chestSurfaces = surfaces.filter((s) => s.bodyPartId === "chest");
    const neckSurfaces = surfaces.filter((s) => s.bodyPartId === "neck");
    assert.ok(chestSurfaces.length > 0, "wraith should have chest surfaces");
    assert.ok(neckSurfaces.length > 0, "wraith should have neck surfaces");
    for (const s of chestSurfaces) {
      assert.strictEqual(s.isRestSpot, true);
    }
    for (const s of neckSurfaces) {
      assert.strictEqual(s.isRestSpot, true);
    }
  });

  it("titan has rest spot surfaces on shell parts", () => {
    const c = createColossus("titan", { x: 0, y: 0, z: 0 });
    const surfaces = getColossusSurfaces([c]);
    for (const partId of ["shell_main", "shell_front", "shell_rear"]) {
      const partSurfaces = surfaces.filter((s) => s.bodyPartId === partId);
      assert.ok(partSurfaces.length > 0, `titan should have ${partId} surfaces`);
      for (const s of partSurfaces) {
        assert.strictEqual(s.isRestSpot, true, `${partId} should be rest spot`);
      }
    }
  });
});

describe("getColossusWeakPoints", () => {
  it("returns all active weak points", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    const wps = getColossusWeakPoints(colossi);
    assert.ok(wps.length > 0);
    for (const wp of wps) {
      assert.equal(wp.isDestroyed, false);
      assert.equal(wp.isActive, true);
    }
  });

  it("excludes destroyed weak points", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.weakPoints[0].isDestroyed = true;
    c.weakPoints[0].isActive = false;
    const wps = getColossusWeakPoints([c]);
    const destroyed = wps.filter((wp) => wp.id === c.weakPoints[0].id);
    assert.equal(destroyed.length, 0);
  });

  it("returns empty for empty colossi", () => {
    assert.equal(getColossusWeakPoints([]).length, 0);
  });
});

describe("damageColossus", () => {
  it("reduces weak point health", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const wpId = c.weakPoints[0].id;
    const prevHealth = c.weakPoints[0].health;
    const result = damageColossus([c], "sentinel", wpId, 10);
    assert.ok(result.damaged);
    assert.equal(c.weakPoints[0].health, prevHealth - 10);
  });

  it("returns damaged false for unknown colossus type", () => {
    const result = damageColossus([], "unknown", "wp1", 10);
    assert.equal(result.damaged, false);
  });

  it("returns damaged false for unknown weak point id", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const result = damageColossus([c], "sentinel", "nonexistent", 10);
    assert.equal(result.damaged, false);
  });

  it("destroys weak point when health reaches zero", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const wpId = c.weakPoints[0].id;
    damageColossus([c], "sentinel", wpId, c.weakPoints[0].health);
    assert.equal(c.weakPoints[0].isDestroyed, true);
    assert.equal(c.weakPoints[0].isActive, false);
  });

  it("does not damage destroyed weak point", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    const wpId = c.weakPoints[0].id;
    damageColossus([c], "sentinel", wpId, c.weakPoints[0].health);
    const result = damageColossus([c], "sentinel", wpId, 10);
    assert.equal(result.damaged, false);
  });

  it("returns allDestroyed true when all weak points are destroyed", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    let lastResult;
    for (const wp of c.weakPoints) {
      lastResult = damageColossus([c], "sentinel", wp.id, wp.health);
    }
    assert.equal(lastResult.allDestroyed, true);
  });

  it("triggers death when all weak points are destroyed", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    for (const wp of c.weakPoints) {
      damageColossus([c], "sentinel", wp.id, wp.health);
    }
    assert.equal(c.aiState.state, "dying");
  });

  it("stuns sentinel when enough damage is dealt", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.aiState = { ...c.aiState, state: "aggro" };
    const wpId = c.weakPoints[0].id;
    const result = damageColossus([c], "sentinel", wpId, SENTINEL_STUN_DAMAGE_THRESHOLD);
    assert.equal(result.stunned, true);
    assert.equal(c.aiState.state, "stunned");
  });

  it("stuns titan when enough damage is dealt", () => {
    const c = createColossus("titan", { x: 0, y: 0, z: 0 });
    c.aiState = { ...c.aiState, state: "aggro" };
    const wpId = c.weakPoints[0].id;
    const result = damageColossus([c], "titan", wpId, TITAN_STUN_DAMAGE_THRESHOLD);
    assert.equal(result.stunned, true);
    assert.equal(c.aiState.state, "stunned");
  });

  it("stuns wraith when enough damage is dealt", () => {
    const c = createColossus("wraith", { x: 0, y: 0, z: 0 });
    c.aiState = { ...c.aiState, state: "circling", altitude: 25 };
    const wpId = c.weakPoints[0].id;
    const result = damageColossus([c], "wraith", wpId, WRAITH_STUN_DAMAGE_THRESHOLD);
    assert.equal(result.stunned, true);
    assert.equal(c.aiState.state, "stunned");
  });

  it("does not stun if damage is below threshold", () => {
    const c = createColossus("sentinel", { x: 0, y: 0, z: 0 });
    c.aiState = { ...c.aiState, state: "aggro" };
    const wpId = c.weakPoints[0].id;
    const result = damageColossus([c], "sentinel", wpId, 5);
    assert.equal(result.stunned, false);
    assert.equal(c.aiState.state, "aggro");
  });
});

describe("getColossusByType", () => {
  it("finds correct colossus by type", () => {
    const colossi = [
      createColossus("sentinel", { x: 0, y: 0, z: 0 }),
      createColossus("wraith", { x: 50, y: 0, z: 50 }),
    ];
    const found = getColossusByType(colossi, "wraith");
    assert.ok(found);
    assert.equal(found.type, "wraith");
  });

  it("returns null when not found", () => {
    const colossi = [createColossus("sentinel", { x: 0, y: 0, z: 0 })];
    assert.equal(getColossusByType(colossi, "titan"), null);
  });

  it("returns null for empty array", () => {
    assert.equal(getColossusByType([], "sentinel"), null);
  });
});
