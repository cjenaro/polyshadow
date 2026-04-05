import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createIntegratedInput,
  updateIntegratedInput,
  getActiveInputType,
  destroyIntegratedInput,
} from './input-integration.js';
import { createEmptyState } from './input.js';

globalThis.window = globalThis;

const docListeners = {};
globalThis.document = {
  addEventListener(type, fn) { (docListeners[type] ||= []).push(fn); },
  removeEventListener(type, fn) {
    const arr = docListeners[type];
    if (arr) docListeners[type] = arr.filter(f => f !== fn);
  },
  pointerLockElement: null,
  exitPointerLock: () => {},
  _listeners: docListeners,
};

if (!navigator.getGamepads) {
  navigator.getGamepads = () => [];
}

function createMockCanvas() {
  const listeners = {};
  return {
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      const arr = listeners[type];
      if (arr) listeners[type] = arr.filter(f => f !== fn);
    },
    clientWidth: 800,
    clientHeight: 600,
    _listeners: listeners,
    requestPointerLock() {},
  };
}

describe('createIntegratedInput', () => {
  it('returns integration object with keyboard manager', () => {
    const canvas = createMockCanvas();
    const integration = createIntegratedInput(canvas);
    assert.ok(integration.keyboard);
    assert.strictEqual(integration.activeType, 'keyboard');
    destroyIntegratedInput(integration);
  });

  it('includes touch manager when touch is supported', () => {
    const canvas = createMockCanvas();
    const integration = createIntegratedInput(canvas);
    if ('ontouchstart' in globalThis || navigator.maxTouchPoints > 0) {
      assert.ok(integration.touch);
    }
    destroyIntegratedInput(integration);
  });

  it('includes gamepad manager when gamepad is available', () => {
    const canvas = createMockCanvas();
    const integration = createIntegratedInput(canvas);
    if ('getGamepads' in navigator) {
      assert.ok(integration.gamepad);
    }
    destroyIntegratedInput(integration);
  });
});

describe('updateIntegratedInput', () => {
  let integration;

  beforeEach(() => {
    const canvas = createMockCanvas();
    integration = createIntegratedInput(canvas);
  });

  afterEach(() => {
    destroyIntegratedInput(integration);
  });

  it('returns merged state with correct shape', () => {
    const state = updateIntegratedInput(integration);
    assert.ok('move' in state);
    assert.ok('look' in state);
    assert.ok('action' in state);
    assert.ok('attack' in state);
    assert.ok('jump' in state);
    assert.ok('sprint' in state);
    assert.ok('start' in state);
  });

  it('returns empty state when no input', () => {
    const state = updateIntegratedInput(integration);
    assert.deepEqual(state.move, { x: 0, y: 0 });
    assert.deepEqual(state.look, { x: 0, y: 0 });
    assert.strictEqual(state.action, false);
    assert.strictEqual(state.attack, false);
    assert.strictEqual(state.jump, false);
    assert.strictEqual(state.sprint, false);
    assert.strictEqual(state.start, false);
  });

  it('merges keyboard state by default', () => {
    integration.keyboard.pressedKeys.add('KeyW');
    integration.keyboard.update();
    const state = updateIntegratedInput(integration);
    assert.ok(state.move.y > 0);
  });

  it('gamepad state overrides keyboard when connected', () => {
    const originalGetGamepads = navigator.getGamepads;
    const mockGamepad = {
      axes: [0.8, 0.6, 0, 0],
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0 })),
    };
    navigator.getGamepads = () => [mockGamepad];

    integration.keyboard.update();
    const state = updateIntegratedInput(integration);

    assert.ok(state.move.x > 0.1, 'gamepad move should be used');
    assert.strictEqual(state.jump, true, 'gamepad jump button should override');

    navigator.getGamepads = originalGetGamepads;
  });

  it('touch overrides keyboard when touch is active', () => {
    if (!integration.touch) return;

    integration.touch.joystickState = { x: 0.5, y: 0.5, active: true };
    integration.touch.lookDelta = { x: 10, y: -5 };
    integration.touch.touchActions = { jump: true, grab: false, attack: true };

    const state = updateIntegratedInput(integration);

    assert.strictEqual(state.move.x, 0.5);
    assert.strictEqual(state.move.y, 0.5);
    assert.strictEqual(state.look.x, 10);
    assert.strictEqual(state.look.y, -5);
    assert.strictEqual(state.jump, true);
    assert.strictEqual(state.attack, true);

    integration.touch.joystickState = { x: 0, y: 0, active: false };
    integration.touch.lookDelta = { x: 0, y: 0 };
    integration.touch.touchActions = { jump: false, grab: false, attack: false };
  });

  it('touch grab maps to action', () => {
    if (!integration.touch) return;

    integration.touch.joystickState = { x: 0, y: 0, active: false };
    integration.touch.lookDelta = { x: 0, y: 0 };
    integration.touch.touchActions = { jump: false, grab: true, attack: false };

    const state = updateIntegratedInput(integration);

    assert.strictEqual(state.action, true);

    integration.touch.touchActions = { jump: false, grab: false, attack: false };
  });
});

describe('getActiveInputType', () => {
  let integration;

  afterEach(() => {
    if (integration) destroyIntegratedInput(integration);
  });

  it('returns keyboard by default', () => {
    const canvas = createMockCanvas();
    integration = createIntegratedInput(canvas);
    assert.strictEqual(getActiveInputType(integration), 'keyboard');
  });

  it('returns touch when touch joystick is active', () => {
    const canvas = createMockCanvas();
    integration = createIntegratedInput(canvas);
    if (!integration.touch) return;

    integration.touch.joystickState = { x: 0.5, y: 0, active: true };
    integration.activeType = 'touch';
    assert.strictEqual(getActiveInputType(integration), 'touch');

    integration.touch.joystickState = { x: 0, y: 0, active: false };
  });

  it('returns gamepad when gamepad is connected', () => {
    const canvas = createMockCanvas();
    integration = createIntegratedInput(canvas);
    if (!integration.gamepad) return;

    integration.gamepad.connected = true;
    integration.activeType = 'gamepad';
    assert.strictEqual(getActiveInputType(integration), 'gamepad');

    integration.gamepad.connected = false;
  });
});

describe('destroyIntegratedInput', () => {
  it('removes all event listeners', () => {
    const canvas = createMockCanvas();
    const integration = createIntegratedInput(canvas);

    const keyboardListenersBefore = document._listeners['keydown']?.length || 0;
    destroyIntegratedInput(integration);

    const keyboardListenersAfter = document._listeners['keydown']?.length || 0;
    assert.ok(keyboardListenersAfter < keyboardListenersBefore);
  });

  it('can be called without error when already destroyed', () => {
    const canvas = createMockCanvas();
    const integration = createIntegratedInput(canvas);
    destroyIntegratedInput(integration);
    assert.doesNotThrow(() => destroyIntegratedInput(integration));
  });
});
