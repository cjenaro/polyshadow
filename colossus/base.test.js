import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createColossusBody,
  getBodyPart,
  getChildParts,
  getAllClimbableParts,
  getWeakPoints,
  getBodyBounds,
  getBodyHeight,
  getBodyPartWorldPosition,
  findNearestWeakPoint,
  isNearWeakPoint,
} from './base.js';

const SIMPLE_BODY = {
  parts: [
    {
      id: 'torso', name: 'Torso', type: 'core',
      position: { x: 0, y: 5, z: 0 },
      dimensions: { width: 4, height: 6, depth: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: null, isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'head', name: 'Head', type: 'head',
      position: { x: 0, y: 9, z: 0 },
      dimensions: { width: 2, height: 2, depth: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: false, isWeakPoint: true, healthMultiplier: 2.0,
    },
    {
      id: 'left_arm', name: 'Left Arm', type: 'limb_upper',
      position: { x: -3, y: 6, z: 0 },
      dimensions: { width: 1, height: 4, depth: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'left_forearm', name: 'Left Forearm', type: 'limb_lower',
      position: { x: -3, y: 2, z: 0 },
      dimensions: { width: 1, height: 4, depth: 1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'left_arm', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
  ],
};

describe('createColossusBody', () => {
  it('returns a body with all parts indexed by id', () => {
    const body = createColossusBody(SIMPLE_BODY);
    assert.equal(body.parts.size, 4);
    assert.ok(body.parts.has('torso'));
    assert.ok(body.parts.has('head'));
    assert.ok(body.parts.has('left_arm'));
    assert.ok(body.parts.has('left_forearm'));
  });

  it('applies defaults for missing optional fields', () => {
    const input = {
      parts: [
        {
          id: 'p1', name: 'Part', type: 'core',
          position: { x: 0, y: 0, z: 0 },
          dimensions: { width: 1, height: 1, depth: 1 },
          rotation: { x: 0, y: 0, z: 0 },
          parent: null,
        },
      ],
    };
    const body = createColossusBody(input);
    const p = body.parts.get('p1');
    assert.equal(p.isClimbable, true);
    assert.equal(p.isWeakPoint, false);
    assert.equal(p.healthMultiplier, 1.0);
  });

  it('throws if parts array is empty', () => {
    assert.throws(() => createColossusBody({ parts: [] }));
  });
});

describe('getBodyPart', () => {
  it('returns the correct part by id', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const part = getBodyPart(body, 'head');
    assert.equal(part.id, 'head');
    assert.equal(part.name, 'Head');
  });

  it('returns null for non-existent part', () => {
    const body = createColossusBody(SIMPLE_BODY);
    assert.equal(getBodyPart(body, 'nonexistent'), null);
  });
});

describe('getChildParts', () => {
  it('returns direct children of a part', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const children = getChildParts(body, 'torso');
    assert.equal(children.length, 2);
    const ids = children.map(c => c.id);
    assert.ok(ids.includes('head'));
    assert.ok(ids.includes('left_arm'));
  });

  it('returns empty array for leaf parts', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const children = getChildParts(body, 'left_forearm');
    assert.equal(children.length, 0);
  });
});

describe('getAllClimbableParts', () => {
  it('returns only climbable parts', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const climbable = getAllClimbableParts(body);
    assert.equal(climbable.length, 3);
    const ids = climbable.map(p => p.id);
    assert.ok(ids.includes('torso'));
    assert.ok(ids.includes('left_arm'));
    assert.ok(ids.includes('left_forearm'));
    assert.ok(!ids.includes('head'));
  });
});

describe('getWeakPoints', () => {
  it('returns only weak point parts', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const weak = getWeakPoints(body);
    assert.equal(weak.length, 1);
    assert.equal(weak[0].id, 'head');
  });
});

describe('getBodyBounds', () => {
  it('computes overall bounding box', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const bounds = getBodyBounds(body);
    const eps = 0.001;
    assert.ok(bounds.min.x < -3.5 + eps && bounds.min.x > -3.5 - eps, `min.x was ${bounds.min.x}`);
    assert.ok(bounds.min.z < -1.5 + eps && bounds.min.z > -1.5 - eps, `min.z was ${bounds.min.z}`);
    assert.ok(bounds.max.x > 1.9 - eps && bounds.max.x < 2.1 + eps, `max.x was ${bounds.max.x}`);
    assert.ok(bounds.max.z > 1.4 - eps && bounds.max.z < 1.6 + eps, `max.z was ${bounds.max.z}`);
  });
});

describe('getBodyHeight', () => {
  it('returns total height from lowest to highest point', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const height = getBodyHeight(body);
    assert.ok(Math.abs(height - 10) < 0.001);
  });
});

describe('getBodyPartWorldPosition', () => {
  it('returns world position at origin with no rotation', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const pos = getBodyPartWorldPosition(body, 'torso', { x: 0, y: 0, z: 0 }, 0);
    assert.equal(pos.x, 0);
    assert.equal(pos.y, 5);
    assert.equal(pos.z, 0);
  });

  it('returns offset world position', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const pos = getBodyPartWorldPosition(body, 'torso', { x: 10, y: 0, z: 10 }, 0);
    assert.equal(pos.x, 10);
    assert.equal(pos.y, 5);
    assert.equal(pos.z, 10);
  });

  it('rotates part position around Y axis', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const pos = getBodyPartWorldPosition(body, 'torso', { x: 0, y: 0, z: 0 }, Math.PI);
    assert.ok(Math.abs(pos.x) < 0.001);
    assert.equal(pos.y, 5);
    assert.ok(Math.abs(pos.z) < 0.001);
  });

  it('rotates offset part position correctly', () => {
    const body = createColossusBody(SIMPLE_BODY);
    const pos = getBodyPartWorldPosition(body, 'left_arm', { x: 0, y: 0, z: 0 }, 0);
    assert.ok(Math.abs(pos.x - (-3)) < 0.001);
    assert.equal(pos.y, 6);
    assert.ok(Math.abs(pos.z) < 0.001);
  });
});

describe('findNearestWeakPoint', () => {
  function makeWP(overrides = {}) {
    return {
      id: 'wp1',
      position: { x: 0, y: 10, z: -3 },
      isDestroyed: false,
      isActive: true,
      ...overrides,
    };
  }

  it('returns null when weak points array is empty', () => {
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, [], 5);
    assert.strictEqual(result, null);
  });

  it('returns nearest active weak point within range', () => {
    const weakPoints = [
      makeWP({ id: 'far', position: { x: 0, y: 10, z: -10 } }),
      makeWP({ id: 'near', position: { x: 0, y: 10, z: -2 } }),
    ];
    const result = findNearestWeakPoint({ x: 0, y: 10, z: 0 }, weakPoints, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.id, 'near');
  });

  it('returns null when no weak points within range', () => {
    const weakPoints = [makeWP({ position: { x: 100, y: 100, z: 100 } })];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result, null);
  });

  it('skips destroyed weak points', () => {
    const weakPoints = [
      makeWP({ id: 'destroyed', position: { x: 0, y: 0, z: -1 }, isDestroyed: true, isActive: false }),
    ];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result, null);
  });

  it('skips inactive weak points', () => {
    const weakPoints = [
      makeWP({ id: 'inactive', position: { x: 0, y: 0, z: -1 }, isActive: false }),
    ];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result, null);
  });

  it('does not return weak point exactly at maxDistance', () => {
    const weakPoints = [makeWP({ position: { x: 5, y: 0, z: 0 } })];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result, null);
  });

  it('returns weak point just inside maxDistance', () => {
    const weakPoints = [makeWP({ position: { x: 4.9, y: 0, z: 0 } })];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.ok(result !== null);
    assert.strictEqual(result.id, 'wp1');
  });

  it('considers all three axes for distance', () => {
    const weakPoints = [
      makeWP({ position: { x: 1, y: 1, z: 1 } }),
    ];
    const result = findNearestWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 2);
    const expectedDist = Math.sqrt(3);
    assert.ok(result !== null);
    assert.ok(expectedDist < 2);
  });
});

describe('isNearWeakPoint', () => {
  function makeWP(overrides = {}) {
    return {
      id: 'wp1',
      position: { x: 0, y: 10, z: -3 },
      isDestroyed: false,
      isActive: true,
      ...overrides,
    };
  }

  it('returns false when no weak points', () => {
    const result = isNearWeakPoint({ x: 0, y: 0, z: 0 }, [], 5);
    assert.strictEqual(result.near, false);
    assert.strictEqual(result.weakPointId, null);
  });

  it('returns true and weak point id when within radius', () => {
    const weakPoints = [makeWP({ id: 'head', position: { x: 0, y: 0, z: -2 } })];
    const result = isNearWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 3);
    assert.strictEqual(result.near, true);
    assert.strictEqual(result.weakPointId, 'head');
  });

  it('returns false when outside radius', () => {
    const weakPoints = [makeWP({ id: 'head', position: { x: 0, y: 0, z: -10 } })];
    const result = isNearWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 3);
    assert.strictEqual(result.near, false);
    assert.strictEqual(result.weakPointId, null);
  });

  it('returns false for destroyed weak points', () => {
    const weakPoints = [
      makeWP({ id: 'head', position: { x: 0, y: 0, z: -2 }, isDestroyed: true, isActive: false }),
    ];
    const result = isNearWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 3);
    assert.strictEqual(result.near, false);
    assert.strictEqual(result.weakPointId, null);
  });

  it('returns nearest when multiple within radius', () => {
    const weakPoints = [
      makeWP({ id: 'back_1', position: { x: 0, y: 0, z: -4 } }),
      makeWP({ id: 'back_2', position: { x: 0, y: 0, z: -1 } }),
    ];
    const result = isNearWeakPoint({ x: 0, y: 0, z: 0 }, weakPoints, 5);
    assert.strictEqual(result.near, true);
    assert.strictEqual(result.weakPointId, 'back_2');
  });
});
