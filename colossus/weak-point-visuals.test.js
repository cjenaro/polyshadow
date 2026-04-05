import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createWeakPointVisuals, setTHREE } from "./weak-point-visuals.js";

function makeVec3(initX = 0, initY = 0, initZ = 0) {
  const v = { x: initX, y: initY, z: initZ };
  v.set = function (x, y, z) {
    v.x = x;
    v.y = y;
    v.z = z;
  };
  return v;
}

function makeMockColor(hex) {
  return {
    _hex: hex,
    set(h) {
      this._hex = h;
    },
    setRGB(r, g, b) {
      this._hex =
        ((Math.round(r * 255) & 0xff) << 16) |
        ((Math.round(g * 255) & 0xff) << 8) |
        (Math.round(b * 255) & 0xff);
    },
  };
}

function makeMockMaterial(opts) {
  const mat = {
    color: makeMockColor(opts.color),
    emissive: makeMockColor(opts.emissive || 0x000000),
    emissiveIntensity: opts.emissiveIntensity || 0,
    roughness: opts.roughness,
    metalness: opts.metalness,
    _disposed: false,
    dispose() {
      this._disposed = true;
    },
  };
  return mat;
}

function makeMockLight(color, intensity, distance) {
  return {
    color,
    intensity,
    distance,
    position: makeVec3(),
    _disposed: false,
    dispose() {
      this._disposed = true;
    },
  };
}

function createMockTHREE() {
  return {
    SphereGeometry: function (radius, ws, hs) {
      return { radius, widthSegments: ws, heightSegments: hs };
    },
    MeshStandardMaterial: function (opts) {
      return makeMockMaterial(opts);
    },
    PointLight: function (color, intensity, distance) {
      return makeMockLight(color, intensity, distance);
    },
    Mesh: function (geo, mat) {
      return {
        geometry: geo,
        material: mat,
        position: makeVec3(),
        rotation: makeVec3(),
        scale: makeVec3(1, 1, 1),
        userData: {},
      };
    },
  };
}

function createMockScene() {
  const children = [];
  return {
    impl: {
      add(obj) {
        children.push(obj);
      },
      remove(obj) {
        const i = children.indexOf(obj);
        if (i >= 0) children.splice(i, 1);
      },
    },
    _children: children,
  };
}

describe("createWeakPointVisuals", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("returns an object with expected methods", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.equal(typeof ctrl.addWeakPoint, "function");
    assert.equal(typeof ctrl.removeWeakPoint, "function");
    assert.equal(typeof ctrl.flashWeakPoint, "function");
    assert.equal(typeof ctrl.destroyWeakPoint, "function");
    assert.equal(typeof ctrl.update, "function");
    assert.equal(typeof ctrl.clearAll, "function");
    assert.equal(typeof ctrl.setPositionProvider, "function");
  });
});

describe("addWeakPoint", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("returns a truthy handle", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    const handle = ctrl.addWeakPoint({ x: 1, y: 2, z: 3 }, "wp_head");
    assert.ok(handle);
  });

  it("adds a mesh to the scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 5, z: 0 }, "wp_1");
    assert.ok(scene._children.length >= 1);
  });

  it("adds a point light to the scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 5, z: 0 }, "wp_1");
    const hasLight = scene._children.some((c) => c.intensity !== undefined);
    assert.ok(hasLight);
  });

  it("adds a mesh with position matching the weak point position", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 10, y: 20, z: 30 }, "wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.position.x, 10);
    assert.equal(mesh.position.y, 20);
    assert.equal(mesh.position.z, 30);
  });

  it("uses MeshStandardMaterial with amber/gold color", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.material.color._hex, 0xffaa00);
  });

  it("mesh has emissive glow set", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.ok(mesh.material.emissive._hex !== 0x000000);
  });
});

describe("removeWeakPoint", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    assert.doesNotThrow(() => ctrl.removeWeakPoint("wp_1"));
  });

  it("removes the mesh from the scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    const countBefore = scene._children.length;
    ctrl.removeWeakPoint("wp_1");
    assert.ok(scene._children.length < countBefore);
  });

  it("removes the light from the scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.removeWeakPoint("wp_1");
    const hasLight = scene._children.some((c) => c.intensity !== undefined);
    assert.ok(!hasLight);
  });

  it("does not throw when removing non-existent id", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.removeWeakPoint("nonexistent"));
  });
});

describe("flashWeakPoint", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    assert.doesNotThrow(() => ctrl.flashWeakPoint("wp_1"));
  });

  it("boosts emissive color to white (flash start)", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.flashWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.material.emissive._hex, 0xffffff);
  });

  it("boosts light intensity on flash", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.flashWeakPoint("wp_1");
    const light = scene._children.find((c) => c.intensity !== undefined);
    assert.ok(light.intensity > 2, `expected > 2, got ${light.intensity}`);
  });

  it("emissive intensity fades back after update", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.flashWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    const intensityAtFlash = mesh.material.emissiveIntensity;
    ctrl.update(0.2);
    assert.ok(mesh.material.emissiveIntensity < intensityAtFlash);
  });

  it("emissive returns to base after flash duration", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.flashWeakPoint("wp_1");
    ctrl.update(0.5);
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.material.emissive._hex, 0xff8800);
  });

  it("does not throw when flashing non-existent id", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.flashWeakPoint("nonexistent"));
  });
});

describe("destroyWeakPoint", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    assert.doesNotThrow(() => ctrl.destroyWeakPoint("wp_1"));
  });

  it("changes material color to dark gray", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.destroyWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.material.color._hex, 0x333333);
  });

  it("removes emissive glow", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.destroyWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.material.emissive._hex, 0x000000);
    assert.equal(mesh.material.emissiveIntensity, 0);
  });

  it("removes point light from scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.destroyWeakPoint("wp_1");
    const hasLight = scene._children.some((c) => c.intensity !== undefined);
    assert.ok(!hasLight);
  });

  it("stops pulsing (update does not change scale)", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.destroyWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    const scaleBefore = mesh.scale.x;
    ctrl.update(1.0);
    assert.equal(mesh.scale.x, scaleBefore);
  });

  it("reduces scale", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.destroyWeakPoint("wp_1");
    const mesh = scene._children.find((c) => c.geometry);
    assert.ok(mesh.scale.x < 1, `scale was ${mesh.scale.x}`);
  });
});

describe("update", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw with valid dt", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    assert.doesNotThrow(() => ctrl.update(0.016));
  });

  it("does not throw with no weak points", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.update(0.016));
  });

  it("advances pulsing glow (scale oscillates)", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    const s1 = mesh.scale.x;
    ctrl.update(0.5);
    const s2 = mesh.scale.x;
    assert.notEqual(s1, s2);
  });

  it("oscillates emissive intensity", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    const e1 = mesh.material.emissiveIntensity;
    ctrl.update(0.5);
    const e2 = mesh.material.emissiveIntensity;
    assert.notEqual(e1, e2);
  });

  it("oscillates light intensity", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.update(0.016);
    const light = scene._children.find((c) => c.intensity !== undefined);
    const i1 = light.intensity;
    ctrl.update(0.5);
    const i2 = light.intensity;
    assert.notEqual(i1, i2);
  });
});

describe("setPositionProvider", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.setPositionProvider(() => null));
  });

  it("updates mesh position each frame from provider", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "head");
    ctrl.setPositionProvider((bodyPartId) => ({ x: 10, y: 20, z: 30 }));
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.position.x, 10);
    assert.equal(mesh.position.y, 20);
    assert.equal(mesh.position.z, 30);
  });

  it("updates light position along with mesh", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "head");
    ctrl.setPositionProvider((bodyPartId) => ({ x: 10, y: 20, z: 30 }));
    ctrl.update(0.016);
    const light = scene._children.find((c) => c.intensity !== undefined);
    assert.equal(light.position.x, 10);
    assert.equal(light.position.y, 20);
    assert.equal(light.position.z, 30);
  });

  it("tracks position changes across frames", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "head");
    let pos = { x: 1, y: 2, z: 3 };
    ctrl.setPositionProvider(() => pos);
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.position.x, 1);
    pos = { x: 100, y: 200, z: 300 };
    ctrl.update(0.016);
    assert.equal(mesh.position.x, 100);
  });

  it("ignores null return from provider", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 5, y: 10, z: 15 }, "head");
    ctrl.setPositionProvider(() => null);
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.position.x, 5);
  });

  it("without provider, positions remain at initial values", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 5, y: 10, z: 15 }, "head");
    ctrl.update(0.016);
    const mesh = scene._children.find((c) => c.geometry);
    assert.equal(mesh.position.x, 5);
    assert.equal(mesh.position.y, 10);
    assert.equal(mesh.position.z, 15);
  });
});

describe("clearAll", () => {
  beforeEach(() => {
    setTHREE(createMockTHREE());
  });

  it("does not throw", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.clearAll());
  });

  it("removes all weak point meshes from the scene", () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, "wp_1");
    ctrl.addWeakPoint({ x: 1, y: 2, z: 3 }, "wp_2");
    const countBefore = scene._children.length;
    ctrl.clearAll();
    assert.ok(scene._children.length < countBefore);
  });
});
