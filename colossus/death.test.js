import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEATH_PHASES,
  createDeathState,
  updateDeathAnimation,
  getPartTransform,
  getDeathShakeIntensity,
  isDeathComplete,
} from './death.js';

describe('DEATH_PHASES', () => {
  it('has KNEEL, COLLAPSE, DISSOLVE, FALLEN', () => {
    assert.strictEqual(DEATH_PHASES.KNEEL, 'kneel');
    assert.strictEqual(DEATH_PHASES.COLLAPSE, 'collapse');
    assert.strictEqual(DEATH_PHASES.DISSOLVE, 'dissolve');
    assert.strictEqual(DEATH_PHASES.FALLEN, 'fallen');
  });
});

describe('createDeathState', () => {
  it('returns state with KNEEL phase and zero timer', () => {
    const state = createDeathState();
    assert.strictEqual(state.phase, DEATH_PHASES.KNEEL);
    assert.strictEqual(state.timer, 0);
    assert.strictEqual(state.dissolveProgress, 0);
    assert.strictEqual(state.shakeIntensity, 0);
  });

  it('has empty partOffsets', () => {
    const state = createDeathState();
    assert.deepStrictEqual(state.partOffsets, {});
  });

  it('accepts overrides', () => {
    const state = createDeathState({ timer: 5, phase: DEATH_PHASES.COLLAPSE });
    assert.strictEqual(state.timer, 5);
    assert.strictEqual(state.phase, DEATH_PHASES.COLLAPSE);
  });
});

describe('updateDeathAnimation', () => {
  it('stays in KNEEL phase before 2 seconds', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 0.9);
    assert.strictEqual(state.phase, DEATH_PHASES.KNEEL);
    state = updateDeathAnimation(state, 0.9);
    assert.strictEqual(state.phase, DEATH_PHASES.KNEEL);
  });

  it('transitions to COLLAPSE at 2 seconds', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 2.0);
    assert.strictEqual(state.phase, DEATH_PHASES.COLLAPSE);
  });

  it('stays in COLLAPSE from 2-4 seconds', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    assert.strictEqual(state.phase, DEATH_PHASES.COLLAPSE);
  });

  it('transitions to DISSOLVE at 4 seconds', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 4.0);
    assert.strictEqual(state.phase, DEATH_PHASES.DISSOLVE);
  });

  it('transitions to FALLEN at 7 seconds', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 7.0);
    assert.strictEqual(state.phase, DEATH_PHASES.FALLEN);
  });

  it('increments dissolveProgress during DISSOLVE phase', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 5.5);
    assert.ok(state.dissolveProgress > 0);
    assert.ok(state.dissolveProgress < 1);
  });

  it('dissolveProgress reaches 1 at FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 7.0);
    assert.strictEqual(state.dissolveProgress, 1);
  });

  it('accumulates timer across multiple updates', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 0.5);
    assert.strictEqual(state.timer, 0.5);
    state = updateDeathAnimation(state, 0.5);
    assert.strictEqual(state.timer, 1.0);
  });

  it('sets shakeIntensity during COLLAPSE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    assert.ok(state.shakeIntensity > 0);
  });

  it('reduces shakeIntensity to 0 in DISSOLVE and FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 5.0);
    assert.strictEqual(state.shakeIntensity, 0);
    state = updateDeathAnimation(state, 2.0);
    assert.strictEqual(state.shakeIntensity, 0);
  });

  it('does not advance timer after FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 8.0);
    const timer = state.timer;
    state = updateDeathAnimation(state, 1.0);
    assert.strictEqual(state.timer, timer);
  });
});

describe('getPartTransform', () => {
  const basePos = { x: 0, y: 5, z: 0 };
  const baseRot = { x: 0, y: 0, z: 0 };

  it('returns identity transform at timer 0', () => {
    const state = createDeathState();
    const transform = getPartTransform('torso', basePos, baseRot, state);
    assert.strictEqual(transform.position.x, 0);
    assert.strictEqual(transform.position.y, 5);
    assert.strictEqual(transform.position.z, 0);
    assert.strictEqual(transform.rotation.x, 0);
    assert.strictEqual(transform.rotation.y, 0);
    assert.strictEqual(transform.rotation.z, 0);
  });

  it('tilts head forward during KNEEL', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 1.5);
    const transform = getPartTransform('head', { x: 0, y: 12, z: 0 }, baseRot, state);
    assert.ok(transform.rotation.x > 0, 'head should tilt forward (positive x rotation)');
  });

  it('lowers body parts during COLLAPSE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    const transform = getPartTransform('torso', basePos, baseRot, state);
    assert.ok(transform.position.y < 5, 'torso should move down');
  });

  it('sets opacity to 0 for fully dissolved state', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 7.0);
    const transform = getPartTransform('torso', basePos, baseRot, state);
    assert.strictEqual(transform.opacity, 0);
  });

  it('returns opacity 1 before DISSOLVE phase', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    const transform = getPartTransform('torso', basePos, baseRot, state);
    assert.strictEqual(transform.opacity, 1);
  });

  it('returns partial opacity during DISSOLVE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 5.5);
    const transform = getPartTransform('torso', basePos, baseRot, state);
    assert.ok(transform.opacity > 0);
    assert.ok(transform.opacity < 1);
  });

  it('moves parts to ground level at FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 7.0);
    const transform = getPartTransform('torso', { x: 0, y: 5, z: 0 }, baseRot, state);
    assert.ok(transform.position.y < 2, 'should be near ground');
  });

  it('buckles legs more than torso during KNEEL', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 1.5);
    const legTransform = getPartTransform('front_left_lower', { x: 0, y: 3, z: 0 }, baseRot, state);
    const torsoTransform = getPartTransform('torso', { x: 0, y: 5, z: 0 }, baseRot, state);
    assert.ok(
      Math.abs(legTransform.position.y - 3) >= Math.abs(torsoTransform.position.y - 5),
      'legs should move more than torso during kneel'
    );
  });
});

describe('getDeathShakeIntensity', () => {
  it('returns 0 at timer 0', () => {
    const state = createDeathState();
    assert.strictEqual(getDeathShakeIntensity(state), 0);
  });

  it('returns 0 during KNEEL', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 1.0);
    assert.strictEqual(getDeathShakeIntensity(state), 0);
  });

  it('returns positive intensity during COLLAPSE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    assert.ok(getDeathShakeIntensity(state) > 0);
  });

  it('returns 0 during DISSOLVE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 5.0);
    assert.strictEqual(getDeathShakeIntensity(state), 0);
  });

  it('returns 0 during FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 8.0);
    assert.strictEqual(getDeathShakeIntensity(state), 0);
  });

  it('peaks in the middle of COLLAPSE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    const midShake = getDeathShakeIntensity(state);

    state = updateDeathAnimation(state, 0.5);
    const lateShake = getDeathShakeIntensity(state);

    assert.ok(midShake > lateShake, 'shake should decrease toward end of collapse');
  });
});

describe('isDeathComplete', () => {
  it('returns false at timer 0', () => {
    const state = createDeathState();
    assert.strictEqual(isDeathComplete(state), false);
  });

  it('returns false during KNEEL', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 1.0);
    assert.strictEqual(isDeathComplete(state), false);
  });

  it('returns false during COLLAPSE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 3.0);
    assert.strictEqual(isDeathComplete(state), false);
  });

  it('returns false during DISSOLVE', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 5.0);
    assert.strictEqual(isDeathComplete(state), false);
  });

  it('returns true during FALLEN', () => {
    let state = createDeathState();
    state = updateDeathAnimation(state, 7.0);
    assert.strictEqual(isDeathComplete(state), true);
  });
});
