import {
  InputManager,
  TouchInputManager,
  GamepadInputManager,
  createEmptyState,
} from './input.js';
import { createTouchLayout } from './touch-overlay.js';

export function createIntegratedInput(canvas) {
  const integration = {
    keyboard: new InputManager(canvas),
    touch: null,
    gamepad: null,
    activeType: 'keyboard',
    _canvas: canvas,
  };

  if (TouchInputManager.supportsTouch()) {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const layout = createTouchLayout(w, h);
    integration.touch = new TouchInputManager(canvas, {
      maxJoystickRadius: layout.joystickRadius,
      actionButtons: layout.buttons,
    });
    integration._touchLayout = layout;
  }

  if (GamepadInputManager.isAvailable()) {
    integration.gamepad = new GamepadInputManager();
  }

  return integration;
}

export function updateIntegratedInput(integration) {
  integration.keyboard.update();
  if (integration.touch) integration.touch.update();
  if (integration.gamepad) integration.gamepad.update();

  const merged = createEmptyState();

  const kbState = integration.keyboard.getState();

  if (integration.gamepad && integration.gamepad.isGamepadConnected()) {
    integration.activeType = 'gamepad';
    const gpState = integration.gamepad.getState();
    merged.move.x = gpState.move.x;
    merged.move.y = gpState.move.y;
    merged.look.x = gpState.look.x;
    merged.look.y = gpState.look.y;
    merged.action = gpState.action;
    merged.attack = gpState.attack;
    merged.jump = gpState.jump;
    merged.sprint = gpState.sprint;
    merged.dodge = gpState.dodge;
    merged.start = gpState.start;
  } else if (integration.touch && integration.touch.getTouchJoystick().active) {
    integration.activeType = 'touch';
    const joystick = integration.touch.getTouchJoystick();
    merged.move.x = joystick.x;
    merged.move.y = joystick.y;

    const look = integration.touch.getTouchLook();
    merged.look.x = look.x;
    merged.look.y = look.y;

    const actions = integration.touch.getTouchAction();
    merged.action = actions.grab || false;
    merged.attack = actions.attack || false;
    merged.jump = actions.jump || false;

    merged.sprint = actions.sprint || kbState.sprint;
    merged.dodge = actions.dodge || kbState.dodge;
    merged.start = kbState.start;
  } else {
    integration.activeType = 'keyboard';
    merged.move.x = kbState.move.x;
    merged.move.y = kbState.move.y;
    merged.look.x = kbState.look.x;
    merged.look.y = kbState.look.y;
    merged.action = kbState.action;
    merged.attack = kbState.attack;
    merged.jump = kbState.jump;
    merged.sprint = kbState.sprint;
    merged.dodge = kbState.dodge;
    merged.start = kbState.start;
  }

  return merged;
}

export function getActiveInputType(integration) {
  return integration.activeType;
}

export function destroyIntegratedInput(integration) {
  integration.keyboard.destroy();
  if (integration.touch) integration.touch.destroy();
}
