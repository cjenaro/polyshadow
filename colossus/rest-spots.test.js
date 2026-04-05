import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createColossusBody } from './base.js';
import { isOnRestSpot } from './rest-spots.js';

const BODY_WITH_REST_SPOT = {
  parts: [
    {
      id: 'torso', name: 'Torso', type: 'core',
      position: { x: 0, y: 5, z: 0 },
      dimensions: { width: 4, height: 6, depth: 3 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: null, isClimbable: true,
    },
    {
      id: 'shoulder', name: 'Shoulder', type: 'limb_upper',
      position: { x: -3, y: 8, z: 0 },
      dimensions: { width: 2, height: 1, depth: 2 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: true, isRestSpot: true,
    },
  ],
};

describe('isOnRestSpot', () => {
  it('returns true when climb surface is on a rest spot part', () => {
    const body = createColossusBody(BODY_WITH_REST_SPOT);
    const surface = { bodyPartId: 'shoulder', position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    assert.strictEqual(isOnRestSpot(surface, body), true);
  });

  it('returns false when climb surface is on a non-rest-spot part', () => {
    const body = createColossusBody(BODY_WITH_REST_SPOT);
    const surface = { bodyPartId: 'torso', position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    assert.strictEqual(isOnRestSpot(surface, body), false);
  });

  it('returns false when no climb surface', () => {
    const body = createColossusBody(BODY_WITH_REST_SPOT);
    assert.strictEqual(isOnRestSpot(null, body), false);
  });

  it('returns false when no body', () => {
    const surface = { bodyPartId: 'shoulder', position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    assert.strictEqual(isOnRestSpot(surface, null), false);
  });

  it('returns false when body part id does not exist', () => {
    const body = createColossusBody(BODY_WITH_REST_SPOT);
    const surface = { bodyPartId: 'nonexistent', position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 } };
    assert.strictEqual(isOnRestSpot(surface, body), false);
  });
});
