import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createSentinelDefinition,
  generateSentinelSurfacePatches,
  getSentinelWeakPointPositions,
  buildCombatWeakPoints,
  setTHREE,
  createSentinelMesh,
  animateSentinel,
} from "./sentinel.js";
import { getBodyHeight, getWeakPoints } from "./base.js";

describe("createSentinelDefinition", () => {
  it("returns a valid body definition", () => {
    const def = createSentinelDefinition();
    assert.ok(def.parts && def.parts.length > 0);
  });

  it("head is not climbable and is a weak point", () => {
    const def = createSentinelDefinition();
    const head = def.parts.find((p) => p.id === "head");
    assert.equal(head.isClimbable, false);
    assert.equal(head.isWeakPoint, true);
  });

  it("has exactly 3 weak points", () => {
    const def = createSentinelDefinition();
    const body = def;
    const weak = getWeakPoints(body);
    assert.equal(weak.length, 3);
  });

  it("total height is approximately 20 units", () => {
    const def = createSentinelDefinition();
    const height = getBodyHeight(def);
    assert.ok(height > 18 && height < 22, `height was ${height}`);
  });

  it("non-weak-point parts are not marked as weak points", () => {
    const def = createSentinelDefinition();
    for (const part of def.parts) {
      if (part.id === "head") continue;
      if (part.name === "Back Rune Left" || part.name === "Back Rune Right") continue;
      assert.equal(part.isWeakPoint, false, `${part.id} should not be weak point`);
    }
  });
});

describe("generateSentinelSurfacePatches", () => {
  it("returns an array of surface patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    assert.ok(Array.isArray(patches));
    assert.ok(patches.length > 0);
  });

  it("has patches for climbable parts (torso, legs)", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const partIds = new Set(patches.map((p) => p.bodyPartId));
    assert.ok(partIds.has("torso"), "missing torso patches");
    assert.ok(
      partIds.has("front_left_upper") || partIds.has("front_left_lower"),
      "missing leg patches",
    );
  });

  it("has no patches for head (not climbable)", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const headPatches = patches.filter((p) => p.bodyPartId === "head");
    assert.equal(headPatches.length, 0);
  });

  it("surface patches have valid normals (unit vectors)", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    for (const patch of patches) {
      const len = Math.sqrt(patch.normal.x ** 2 + patch.normal.y ** 2 + patch.normal.z ** 2);
      assert.ok(Math.abs(len - 1) < 0.01, `normal length was ${len}`);
    }
  });
});

describe("getSentinelWeakPointPositions", () => {
  it("returns 3 positions", () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(positions.length, 3);
  });

  it("each position has x, y, z", () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    for (const pos of positions) {
      assert.ok(typeof pos.x === "number");
      assert.ok(typeof pos.y === "number");
      assert.ok(typeof pos.z === "number");
    }
  });

  it("head weak point is at approximately expected height", () => {
    const def = createSentinelDefinition();
    const positions = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const headPart = def.parts.find((p) => p.id === "head");
    const headWP = positions.find((p) => p.bodyPartId === "head");
    assert.ok(headWP !== undefined);
    assert.ok(Math.abs(headWP.y - headPart.position.y) < 2, `head y was ${headWP.y}`);
  });

  it("weak point positions rotate with the colossus", () => {
    const def = createSentinelDefinition();
    const at0 = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = getSentinelWeakPointPositions(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const backRuneLeft0 = at0.find((p) => p.bodyPartId === "back_rune_left");
    const backRuneLeftPI = atPI.find((p) => p.bodyPartId === "back_rune_left");
    assert.ok(backRuneLeft0 !== undefined);
    assert.ok(backRuneLeftPI !== undefined);
    assert.ok(Math.abs(backRuneLeft0.x + backRuneLeftPI.x) < 0.01);
    assert.ok(Math.abs(backRuneLeft0.z + backRuneLeftPI.z) < 0.01);
  });
});

describe("generateSentinelSurfacePatches coverage", () => {
  it("every climbable body part has patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const climbableParts = def.parts.filter((p) => p.isClimbable);
    const patchPartIds = new Set(patches.map((p) => p.bodyPartId));
    for (const part of climbableParts) {
      assert.ok(patchPartIds.has(part.id), `climbable part ${part.id} has no patches`);
    }
  });

  it("no patches on non-climbable parts", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const nonClimbableIds = def.parts.filter((p) => !p.isClimbable).map((p) => p.id);
    for (const patch of patches) {
      assert.ok(
        !nonClimbableIds.includes(patch.bodyPartId),
        `patch on non-climbable ${patch.bodyPartId}`,
      );
    }
  });

  it("torso has significantly more patches than a single leg", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const torsoCount = patches.filter((p) => p.bodyPartId === "torso").length;
    const legCount = patches.filter((p) => p.bodyPartId === "front_left_lower").length;
    assert.ok(
      torsoCount > legCount * 2,
      `torso ${torsoCount} should be much more than leg ${legCount}`,
    );
  });

  it("patches cover all 6 faces of the torso", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const torsoPatches = patches.filter((p) => p.bodyPartId === "torso");
    const normals = new Set(torsoPatches.map((p) => `${p.normal.x},${p.normal.y},${p.normal.z}`));
    assert.ok(normals.has("0,1,0"), "missing top face");
    assert.ok(normals.has("0,0,1") || normals.has("0,0,-1"), "missing front/back face");
    assert.ok(normals.has("-1,0,0") || normals.has("1,0,0"), "missing left/right face");
  });

  it("upper and lower leg parts both have patches", () => {
    const def = createSentinelDefinition();
    const patches = generateSentinelSurfacePatches(def);
    const partIds = new Set(patches.map((p) => p.bodyPartId));
    assert.ok(partIds.has("front_left_upper"));
    assert.ok(partIds.has("front_left_lower"));
    assert.ok(partIds.has("back_right_upper"));
    assert.ok(partIds.has("back_right_lower"));
  });
});

describe("buildCombatWeakPoints", () => {
  it("returns 3 combat-ready weak points", () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    assert.equal(weakPoints.length, 3);
  });

  it("each weak point has id, position, health, maxHealth, isDestroyed, isActive", () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
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
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    for (const wp of weakPoints) {
      assert.strictEqual(wp.health, wp.maxHealth);
    }
  });

  it("head weak point has higher health (healthMultiplier 3.0)", () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const head = weakPoints.find((wp) => wp.id === "head");
    const back = weakPoints.find((wp) => wp.id === "back_rune_left");
    assert.ok(head !== undefined);
    assert.ok(back !== undefined);
    assert.ok(
      head.maxHealth > back.maxHealth,
      `head ${head.maxHealth} should be > back ${back.maxHealth}`,
    );
  });

  it("positions account for colossus world position", () => {
    const def = createSentinelDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const at10 = buildCombatWeakPoints(def, { x: 10, y: 0, z: 0 }, 0);
    for (let i = 0; i < at0.length; i++) {
      assert.ok(Math.abs(at10[i].position.x - at0[i].position.x - 10) < 0.01);
    }
  });

  it("positions account for colossus rotation", () => {
    const def = createSentinelDefinition();
    const at0 = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const atPI = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, Math.PI);
    const backRune0 = at0.find((wp) => wp.id === "back_rune_left");
    const backRunePI = atPI.find((wp) => wp.id === "back_rune_left");
    assert.ok(Math.abs(backRune0.position.x + backRunePI.position.x) < 0.01);
    assert.ok(Math.abs(backRune0.position.z + backRunePI.position.z) < 0.01);
  });

  it("back weak points exist (back_rune_left and back_rune_right)", () => {
    const def = createSentinelDefinition();
    const weakPoints = buildCombatWeakPoints(def, { x: 0, y: 0, z: 0 }, 0);
    const ids = weakPoints.map((wp) => wp.id);
    assert.ok(ids.includes("back_rune_left"));
    assert.ok(ids.includes("back_rune_right"));
    assert.ok(ids.includes("head"));
  });
});

function makeVec3(initX = 0, initY = 0, initZ = 0) {
  const v = { x: initX, y: initY, z: initZ };
  v.set = function (x, y, z) {
    v.x = x;
    v.y = y;
    v.z = z;
  };
  return v;
}

function createMockTHREE() {
  const createdMeshes = [];
  const createdGroups = [];
  const T = {
    Group: function () {
      const g = {
        children: [],
        add: function (c) {
          g.children.push(c);
        },
      };
      createdGroups.push(g);
      return g;
    },
    Mesh: function (geo, mat) {
      const m = {
        geometry: geo,
        material: mat,
        position: makeVec3(),
        rotation: makeVec3(),
        scale: makeVec3(1, 1, 1),
        castShadow: false,
        receiveShadow: false,
        userData: {},
        children: [],
        add: function (c) {
          m.children.push(c);
        },
      };
      createdMeshes.push(m);
      return m;
    },
    BoxGeometry: function (w, h, d) {
      return { type: "box", width: w, height: h, depth: d };
    },
    CylinderGeometry: function (rTop, rBottom, h, seg) {
      return { type: "cylinder", radiusTop: rTop, radiusBottom: rBottom, height: h, segments: seg };
    },
    MeshStandardMaterial: function (opts) {
      return { ...opts };
    },
    Color: function (val) {
      return { value: val };
    },
  };
  return { T, createdMeshes, createdGroups };
}

describe("createSentinelMesh", () => {
  let T, createdMeshes;

  beforeEach(() => {
    ({ T, createdMeshes } = createMockTHREE());
    setTHREE(T);
  });

  it("returns an object with impl (group) and meshByPart map", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    assert.ok(result.impl !== undefined);
    assert.ok(result.meshByPart instanceof Map);
  });

  it("creates a mesh for every part in the definition", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    assert.equal(result.meshByPart.size, def.parts.length);
  });

  it("stores partId in each mesh userData", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    for (const [partId, mesh] of result.meshByPart) {
      assert.equal(mesh.userData.partId, partId);
    }
  });

  it("uses BoxGeometry for core parts and CylinderGeometry for limbs", () => {
    const def = createSentinelDefinition();
    createSentinelMesh(def);
    const torsoMesh = createdMeshes.find((m) => m.userData.partId === "torso");
    const legMesh = createdMeshes.find((m) => m.userData.partId === "front_left_upper");
    const lowerLegMesh = createdMeshes.find((m) => m.userData.partId === "back_right_lower");
    assert.equal(torsoMesh.geometry.type, "box");
    assert.equal(legMesh.geometry.type, "cylinder");
    assert.equal(lowerLegMesh.geometry.type, "cylinder");
  });

  it("adds root parts (no parent) to the group directly", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    const torso = result.meshByPart.get("torso");
    assert.ok(result.impl.children.includes(torso));
  });

  it("adds child parts to their parent mesh", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    const torso = result.meshByPart.get("torso");
    const hips = result.meshByPart.get("hips");
    const head = result.meshByPart.get("head");
    assert.ok(torso.children.includes(hips), "hips should be child of torso");
    assert.ok(torso.children.includes(head), "head should be child of torso");
  });

  it("nested children are added to correct parent", () => {
    const def = createSentinelDefinition();
    const result = createSentinelMesh(def);
    const upperLeg = result.meshByPart.get("front_left_upper");
    const lowerLeg = result.meshByPart.get("front_left_lower");
    assert.ok(upperLeg.children.includes(lowerLeg), "lower leg should be child of upper leg");
  });

  it("uses dark gray material with roughness 0.85 and flatShading for non-weak body parts", () => {
    const def = createSentinelDefinition();
    createSentinelMesh(def);
    const torsoMesh = createdMeshes.find((m) => m.userData.partId === "torso");
    assert.equal(torsoMesh.material.roughness, 0.85);
    assert.equal(torsoMesh.material.flatShading, true);
  });

  it("weak point parts get emissive material", () => {
    const def = createSentinelDefinition();
    createSentinelMesh(def);
    const headMesh = createdMeshes.find((m) => m.userData.partId === "head");
    assert.ok(headMesh.material.emissive !== undefined);
    assert.equal(headMesh.material.emissiveIntensity, 0.5);
  });
});

describe("animateSentinel", () => {
  let T;

  beforeEach(() => {
    ({ T } = createMockTHREE());
    setTHREE(T);
  });

  it("applies breathing pulse to torso scale", () => {
    const def = createSentinelDefinition();
    const meshData = createSentinelMesh(def);
    const torso = meshData.meshByPart.get("torso");

    animateSentinel(meshData, Math.PI / 3);
    assert.ok(Math.abs(torso.scale.x - 1.015) < 0.001);
    assert.equal(torso.scale.x, torso.scale.y);
    assert.equal(torso.scale.x, torso.scale.z);
  });

  it("breathing pulse oscillates symmetrically", () => {
    const def = createSentinelDefinition();
    const meshData = createSentinelMesh(def);
    const torso = meshData.meshByPart.get("torso");

    animateSentinel(meshData, Math.PI / 3);
    const maxScale = torso.scale.x;

    animateSentinel(meshData, Math.PI);
    const minScale = torso.scale.x;

    assert.ok(maxScale > 1, `max scale ${maxScale} should be > 1`);
    assert.ok(minScale < 1, `min scale ${minScale} should be < 1`);
    assert.ok(Math.abs(maxScale - 1.015) < 0.001);
    assert.ok(Math.abs(minScale - 0.985) < 0.001);
  });

  it("does not affect non-torso parts", () => {
    const def = createSentinelDefinition();
    const meshData = createSentinelMesh(def);
    const head = meshData.meshByPart.get("head");
    const leg = meshData.meshByPart.get("front_left_upper");

    animateSentinel(meshData, 1.5);
    assert.equal(head.scale.x, 1);
    assert.equal(leg.scale.x, 1);
  });
});
