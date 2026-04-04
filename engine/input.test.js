import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapKeysToInput, createEmptyState } from './input.js';

function keys(...codes) {
  return new Set(codes);
}

describe('createEmptyState', () => {
  it('returns all-zero state', () => {
    const s = createEmptyState();
    assert.equal(s.move.x, 0);
    assert.equal(s.move.y, 0);
    assert.equal(s.look.x, 0);
    assert.equal(s.look.y, 0);
    assert.equal(s.action, false);
    assert.equal(s.attack, false);
    assert.equal(s.jump, false);
    assert.equal(s.sprint, false);
    assert.equal(s.start, false);
  });
});

describe('mapKeysToInput', () => {
  it('returns empty state for no keys', () => {
    const state = mapKeysToInput(keys());
    assert.deepEqual(state.move, { x: 0, y: 0 });
    assert.equal(state.jump, false);
    assert.equal(state.sprint, false);
    assert.equal(state.attack, false);
    assert.equal(state.action, false);
    assert.equal(state.start, false);
  });

  it('W key produces move.y = 1', () => {
    const state = mapKeysToInput(keys('KeyW'));
    assert.equal(state.move.y, 1);
    assert.equal(state.move.x, 0);
  });

  it('S key produces move.y = -1', () => {
    const state = mapKeysToInput(keys('KeyS'));
    assert.equal(state.move.y, -1);
  });

  it('A key produces move.x = -1', () => {
    const state = mapKeysToInput(keys('KeyA'));
    assert.equal(state.move.x, -1);
    assert.equal(state.move.y, 0);
  });

  it('D key produces move.x = 1', () => {
    const state = mapKeysToInput(keys('KeyD'));
    assert.equal(state.move.x, 1);
    assert.equal(state.move.y, 0);
  });

  it('arrow keys produce correct move values', () => {
    const up = mapKeysToInput(keys('ArrowUp'));
    assert.equal(up.move.y, 1);
    assert.equal(up.move.x, 0);

    const down = mapKeysToInput(keys('ArrowDown'));
    assert.equal(down.move.y, -1);

    const left = mapKeysToInput(keys('ArrowLeft'));
    assert.equal(left.move.x, -1);
    assert.equal(left.move.y, 0);

    const right = mapKeysToInput(keys('ArrowRight'));
    assert.equal(right.move.x, 1);
  });

  it('diagonal movement is normalized to ~0.707', () => {
    const state = mapKeysToInput(keys('KeyW', 'KeyD'));
    assert.ok(Math.abs(state.move.x - 0.707) < 0.01, `expected ~0.707 got ${state.move.x}`);
    assert.ok(Math.abs(state.move.y - 0.707) < 0.01, `expected ~0.707 got ${state.move.y}`);
  });

  it('WD and ArrowUp+ArrowRight both normalize', () => {
    const wd = mapKeysToInput(keys('KeyW', 'KeyD'));
    const arrows = mapKeysToInput(keys('ArrowUp', 'ArrowRight'));
    assert.ok(Math.abs(wd.move.x - arrows.move.x) < 0.001);
    assert.ok(Math.abs(wd.move.y - arrows.move.y) < 0.001);
  });

  it('opposing keys cancel out', () => {
    const state = mapKeysToInput(keys('KeyW', 'KeyS'));
    assert.equal(state.move.y, 0);
  });

  it('space triggers jump', () => {
    const state = mapKeysToInput(keys('Space'));
    assert.equal(state.jump, true);
    assert.equal(state.sprint, false);
  });

  it('shift triggers sprint', () => {
    const state = mapKeysToInput(keys('ShiftLeft'));
    assert.equal(state.sprint, true);
    assert.equal(state.jump, false);
  });

  it('ShiftRight also triggers sprint', () => {
    const state = mapKeysToInput(keys('ShiftRight'));
    assert.equal(state.sprint, true);
  });

  it('mouse delta maps to look', () => {
    const state = mapKeysToInput(keys(), { x: 100, y: -50 });
    assert.equal(state.look.x, 100);
    assert.equal(state.look.y, -50);
  });

  it('mouse buttons activate action and attack', () => {
    const state = mapKeysToInput(keys(), { x: 0, y: 0 }, 1);
    assert.equal(state.attack, true);
    assert.equal(state.action, false);
  });

  it('mouse button 2 activates action', () => {
    const state = mapKeysToInput(keys(), { x: 0, y: 0 }, 2);
    assert.equal(state.action, true);
    assert.equal(state.attack, false);
  });

  it('E key activates action', () => {
    const state = mapKeysToInput(keys('KeyE'));
    assert.equal(state.action, true);
  });

  it('Escape triggers start', () => {
    const state = mapKeysToInput(keys('Escape'));
    assert.equal(state.start, true);
  });

  it('combined: WASD + Shift + Space + E', () => {
    const state = mapKeysToInput(keys('KeyW', 'KeyA', 'ShiftLeft', 'Space', 'KeyE'));
    assert.equal(state.sprint, true);
    assert.equal(state.jump, true);
    assert.equal(state.action, true);
    assert.ok(Math.abs(state.move.x - -0.707) < 0.01);
    assert.ok(Math.abs(state.move.y - 0.707) < 0.01);
  });
});
