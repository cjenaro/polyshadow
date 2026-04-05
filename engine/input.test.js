import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapKeysToInput,
  createEmptyState,
  classifyTouchZone,
  calculateJoystickVector,
  normalizeStick,
  DEFAULT_GAMEPAD_MAP,
  mapGamepadButtons,
  mapGamepadToInput,
  isTouchInButtonRegion,
} from './input.js';

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

describe('classifyTouchZone', () => {
  it('returns "left" for touch in left 40%', () => {
    assert.equal(classifyTouchZone(0, 1000), 'left');
    assert.equal(classifyTouchZone(399, 1000), 'left');
  });

  it('returns "right" for touch at exactly 40%', () => {
    assert.equal(classifyTouchZone(400, 1000), 'right');
  });

  it('returns "right" for touch on right side', () => {
    assert.equal(classifyTouchZone(800, 1000), 'right');
  });

  it('returns "right" for zero-width screen', () => {
    assert.equal(classifyTouchZone(0, 0), 'right');
  });
});

describe('calculateJoystickVector', () => {
  const maxRadius = 50;
  const deadZone = 0.15;

  it('returns zero at start position', () => {
    const v = calculateJoystickVector(200, 400, 200, 400, maxRadius, deadZone);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
    assert.equal(v.active, true);
  });

  it('returns x=1 at max distance right', () => {
    const v = calculateJoystickVector(250, 400, 200, 400, maxRadius, deadZone);
    assert.ok(Math.abs(v.x - 1) < 0.001);
    assert.equal(v.y, 0);
    assert.equal(v.active, true);
  });

  it('clamps beyond max radius', () => {
    const v = calculateJoystickVector(300, 400, 200, 400, maxRadius, deadZone);
    assert.ok(Math.abs(v.x - 1) < 0.001);
    assert.equal(v.y, 0);
  });

  it('returns zero within dead zone', () => {
    const v = calculateJoystickVector(205, 400, 200, 400, maxRadius, deadZone);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
    assert.equal(v.active, true);
  });

  it('rescales just outside dead zone', () => {
    const v = calculateJoystickVector(209, 400, 200, 400, maxRadius, deadZone);
    assert.ok(v.x > 0, 'should be non-zero outside dead zone');
    assert.ok(v.x < 0.05, 'should be small just outside dead zone');
  });

  it('returns normalized diagonal vector', () => {
    const v = calculateJoystickVector(235.35, 364.65, 200, 400, maxRadius, deadZone);
    assert.ok(Math.abs(v.x - 0.707) < 0.02, `expected ~0.707 got ${v.x}`);
    assert.ok(Math.abs(v.y - 0.707) < 0.02, `expected ~0.707 got ${v.y}`);
  });

  it('positive y for upward touch (screen Y decreases)', () => {
    const v = calculateJoystickVector(200, 350, 200, 400, maxRadius, deadZone);
    assert.ok(Math.abs(v.y - 1) < 0.001);
    assert.equal(v.x, 0);
  });

  it('negative y for downward touch', () => {
    const v = calculateJoystickVector(200, 450, 200, 400, maxRadius, deadZone);
    assert.ok(v.y < -0.9);
  });

  it('negative x for leftward touch', () => {
    const v = calculateJoystickVector(150, 400, 200, 400, maxRadius, deadZone);
    assert.ok(Math.abs(v.x - -1) < 0.001);
  });
});

describe('normalizeStick', () => {
  const dz = 0.15;

  it('zeros out within dead zone', () => {
    const v = normalizeStick(0.1, 0.05, dz);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
  });

  it('zeros out at exact dead zone boundary', () => {
    const v = normalizeStick(0.15, 0, dz);
    assert.ok(Math.abs(v.x) < 0.001);
  });

  it('passes through full magnitude', () => {
    const v = normalizeStick(1, 0, dz);
    assert.ok(Math.abs(v.x - 1) < 0.001);
    assert.equal(v.y, 0);
  });

  it('rescales mid-range value', () => {
    const v = normalizeStick(0.575, 0, dz);
    assert.ok(Math.abs(v.x - 0.5) < 0.01, `expected ~0.5 got ${v.x}`);
  });

  it('handles diagonal with unit magnitude', () => {
    const v = normalizeStick(1, 1, dz);
    const mag = Math.sqrt(v.x * v.x + v.y * v.y);
    assert.ok(Math.abs(mag - 1) < 0.01, `expected magnitude ~1 got ${mag}`);
    assert.ok(v.x > 0);
    assert.ok(v.y > 0);
  });

  it('handles zero input', () => {
    const v = normalizeStick(0, 0, dz);
    assert.equal(v.x, 0);
    assert.equal(v.y, 0);
  });

  it('preserves direction at small magnitude above dead zone', () => {
    const v = normalizeStick(-0.3, 0.4, dz);
    assert.ok(v.x < 0, 'should be negative x');
    assert.ok(v.y > 0, 'should be positive y');
  });
});

describe('DEFAULT_GAMEPAD_MAP', () => {
  it('maps jump to button 0 (A/cross)', () => {
    assert.equal(DEFAULT_GAMEPAD_MAP.jump, 0);
  });

  it('maps grab to button 1 (B/circle)', () => {
    assert.equal(DEFAULT_GAMEPAD_MAP.grab, 1);
  });

  it('maps attack to button 2 (X/square)', () => {
    assert.equal(DEFAULT_GAMEPAD_MAP.attack, 2);
  });

  it('maps pause to button 9 (start)', () => {
    assert.equal(DEFAULT_GAMEPAD_MAP.pause, 9);
  });
});

describe('mapGamepadButtons', () => {
  function makeButtons(pressed) {
    return Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) }));
  }

  it('returns all false when nothing pressed', () => {
    const result = mapGamepadButtons(makeButtons([]), DEFAULT_GAMEPAD_MAP);
    assert.equal(result.jump, false);
    assert.equal(result.grab, false);
    assert.equal(result.attack, false);
    assert.equal(result.pause, false);
  });

  it('maps jump button press', () => {
    const result = mapGamepadButtons(makeButtons([0]), DEFAULT_GAMEPAD_MAP);
    assert.equal(result.jump, true);
    assert.equal(result.grab, false);
  });

  it('maps grab button press', () => {
    const result = mapGamepadButtons(makeButtons([1]), DEFAULT_GAMEPAD_MAP);
    assert.equal(result.grab, true);
    assert.equal(result.jump, false);
  });

  it('maps multiple simultaneous buttons', () => {
    const result = mapGamepadButtons(makeButtons([0, 2]), DEFAULT_GAMEPAD_MAP);
    assert.equal(result.jump, true);
    assert.equal(result.attack, true);
    assert.equal(result.grab, false);
  });

  it('handles missing buttons gracefully', () => {
    const result = mapGamepadButtons([], DEFAULT_GAMEPAD_MAP);
    assert.equal(result.jump, false);
    assert.equal(result.attack, false);
  });

  it('uses custom button map', () => {
    const customMap = { jump: 3, grab: 0 };
    const result = mapGamepadButtons(makeButtons([3]), customMap);
    assert.equal(result.jump, true);
    assert.equal(result.grab, false);
  });
});

describe('mapGamepadToInput', () => {
  it('returns empty state for zero input', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const state = mapGamepadToInput(0, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.deepEqual(state.move, { x: 0, y: 0 });
    assert.deepEqual(state.look, { x: 0, y: 0 });
    assert.equal(state.jump, false);
    assert.equal(state.attack, false);
  });

  it('maps left stick to move with dead zone', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const state = mapGamepadToInput(1, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.ok(Math.abs(state.move.x - 1) < 0.01);
    assert.equal(state.move.y, 0);
  });

  it('maps right stick to look with sensitivity', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const state = mapGamepadToInput(0, 0, 1, 0, buttons, DEFAULT_GAMEPAD_MAP, 2);
    assert.ok(Math.abs(state.look.x - 2) < 0.01);
  });

  it('zeros left stick within dead zone', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    const state = mapGamepadToInput(0.1, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.equal(state.move.x, 0);
  });

  it('maps jump button', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    buttons[0] = { pressed: true };
    const state = mapGamepadToInput(0, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.equal(state.jump, true);
  });

  it('maps grab to action', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    buttons[1] = { pressed: true };
    const state = mapGamepadToInput(0, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.equal(state.action, true);
  });

  it('maps attack button', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    buttons[2] = { pressed: true };
    const state = mapGamepadToInput(0, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.equal(state.attack, true);
  });

  it('maps start to pause', () => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    buttons[9] = { pressed: true };
    const state = mapGamepadToInput(0, 0, 0, 0, buttons, DEFAULT_GAMEPAD_MAP, 1);
    assert.equal(state.start, true);
  });
});

describe('isTouchInButtonRegion', () => {
  it('returns true for touch inside radius', () => {
    assert.equal(isTouchInButtonRegion(105, 205, 100, 200, 20), true);
  });

  it('returns false for touch outside radius', () => {
    assert.equal(isTouchInButtonRegion(130, 200, 100, 200, 20), false);
  });

  it('returns true for touch at exact edge', () => {
    assert.equal(isTouchInButtonRegion(120, 200, 100, 200, 20), true);
  });

  it('handles diagonal distance', () => {
    const d = 14.14;
    assert.equal(isTouchInButtonRegion(100 + d, 200 + d, 100, 200, 20), true);
    assert.equal(isTouchInButtonRegion(100 + d, 200 + d, 100, 200, 10), false);
  });
});
