import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createWeakPointVisuals, setTHREE } from './weak-point-visuals.js';

function makeVec3(initX = 0, initY = 0, initZ = 0) {
  const v = { x: initX, y: initY, z: initZ };
  v.set = function(x, y, z) { v.x = x; v.y = y; v.z = z; };
  return v;
}

function createMockTHREE() {
  return {
    SphereGeometry: function(radius, ws, hs) { return { radius, widthSegments: ws, heightSegments: hs }; },
    MeshBasicMaterial: function(opts) { return { color: opts.color }; },
    Mesh: function(geo, mat) {
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
      add(obj) { children.push(obj); },
      remove(obj) { const i = children.indexOf(obj); if (i >= 0) children.splice(i, 1); },
    },
    _children: children,
  };
}

describe('createWeakPointVisuals', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('returns an object with expected methods', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.equal(typeof ctrl.addWeakPoint, 'function');
    assert.equal(typeof ctrl.removeWeakPoint, 'function');
    assert.equal(typeof ctrl.flashWeakPoint, 'function');
    assert.equal(typeof ctrl.destroyWeakPoint, 'function');
    assert.equal(typeof ctrl.update, 'function');
    assert.equal(typeof ctrl.clearAll, 'function');
  });
});

describe('addWeakPoint', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('returns a truthy handle', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    const handle = ctrl.addWeakPoint({ x: 1, y: 2, z: 3 }, 'wp_head');
    assert.ok(handle);
  });

  it('adds a mesh to the scene', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 5, z: 0 }, 'wp_1');
    assert.equal(scene._children.length, 1);
  });

  it('adds a mesh with position matching the weak point position', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 10, y: 20, z: 30 }, 'wp_1');
    const mesh = scene._children[0];
    assert.equal(mesh.position.x, 10);
    assert.equal(mesh.position.y, 20);
    assert.equal(mesh.position.z, 30);
  });

  it('mesh uses MeshBasicMaterial with red color', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    const mesh = scene._children[0];
    assert.equal(mesh.material.color, 0xff4444);
  });
});

describe('removeWeakPoint', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('does not throw', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    assert.doesNotThrow(() => ctrl.removeWeakPoint('wp_1'));
  });

  it('removes the mesh from the scene', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    assert.equal(scene._children.length, 1);
    ctrl.removeWeakPoint('wp_1');
    assert.equal(scene._children.length, 0);
  });

  it('does not throw when removing non-existent id', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.removeWeakPoint('nonexistent'));
  });
});

describe('flashWeakPoint', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('does not throw', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    assert.doesNotThrow(() => ctrl.flashWeakPoint('wp_1'));
  });

  it('changes material color to white (flash start)', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.flashWeakPoint('wp_1');
    const mesh = scene._children[0];
    assert.equal(mesh.material.color, 0xffffff);
  });

  it('fades color back toward base after update', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.flashWeakPoint('wp_1');
    ctrl.update(0.2);
    const mesh = scene._children[0];
    assert.ok(mesh.material.color !== 0xffffff);
  });

  it('color returns to base after flash duration', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.flashWeakPoint('wp_1');
    ctrl.update(0.5);
    const mesh = scene._children[0];
    assert.equal(mesh.material.color, 0xff4444);
  });

  it('does not throw when flashing non-existent id', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.flashWeakPoint('nonexistent'));
  });
});

describe('destroyWeakPoint', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('does not throw', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    assert.doesNotThrow(() => ctrl.destroyWeakPoint('wp_1'));
  });

  it('changes material color to dark gray', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.destroyWeakPoint('wp_1');
    const mesh = scene._children[0];
    assert.equal(mesh.material.color, 0x333333);
  });

  it('stops pulsing (update does not change scale)', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.destroyWeakPoint('wp_1');
    const mesh = scene._children[0];
    const scaleBefore = mesh.scale.x;
    ctrl.update(1.0);
    assert.equal(mesh.scale.x, scaleBefore);
  });

  it('reduces scale', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.destroyWeakPoint('wp_1');
    const mesh = scene._children[0];
    assert.ok(mesh.scale.x < 1, `scale was ${mesh.scale.x}`);
  });
});

describe('update', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('does not throw with valid dt', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    assert.doesNotThrow(() => ctrl.update(0.016));
  });

  it('does not throw with no weak points', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.update(0.016));
  });

  it('advances pulsing glow (scale oscillates)', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.update(0.016);
    const mesh = scene._children[0];
    const s1 = mesh.scale.x;
    ctrl.update(0.5);
    const s2 = mesh.scale.x;
    assert.notEqual(s1, s2);
  });
});

describe('clearAll', () => {
  beforeEach(() => { setTHREE(createMockTHREE()); });

  it('does not throw', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    assert.doesNotThrow(() => ctrl.clearAll());
  });

  it('removes all weak point meshes from the scene', () => {
    const scene = createMockScene();
    const ctrl = createWeakPointVisuals(scene);
    ctrl.addWeakPoint({ x: 0, y: 0, z: 0 }, 'wp_1');
    ctrl.addWeakPoint({ x: 1, y: 2, z: 3 }, 'wp_2');
    assert.equal(scene._children.length, 2);
    ctrl.clearAll();
    assert.equal(scene._children.length, 0);
  });
});
