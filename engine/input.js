const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

const MOVE_MAP = {
  KeyW:    { x:  0, y:  1 },
  KeyS:    { x:  0, y: -1 },
  KeyA:    { x: -1, y:  0 },
  KeyD:    { x:  1, y:  0 },
  ArrowUp:    { x:  0, y:  1 },
  ArrowDown:  { x:  0, y: -1 },
  ArrowLeft:  { x: -1, y:  0 },
  ArrowRight: { x:  1, y:  0 },
};

function createEmptyState() {
  return {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    action: false,
    attack: false,
    jump: false,
    sprint: false,
    dodge: false,
    start: false,
  };
}

function mapKeysToInput(pressedKeys, mouseDelta = { x: 0, y: 0 }, pressedMouseButtons = new Set()) {
  const state = createEmptyState();

  let mx = 0;
  let my = 0;

  for (const code of pressedKeys) {
    const dir = MOVE_MAP[code];
    if (dir) {
      mx += dir.x;
      my += dir.y;
    }

    if (code === 'Space') state.jump = true;
    if (code === 'ShiftLeft' || code === 'ShiftRight') state.sprint = true;
    if (code === 'KeyE') state.action = true;
    if (code === 'KeyC') state.dodge = true;
    if (code === 'Escape') state.start = true;
  }

  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) {
    state.move.x = mx / len;
    state.move.y = my / len;
  }

  state.look.x = mouseDelta.x;
  state.look.y = mouseDelta.y;

  if (pressedMouseButtons.has(0)) state.attack = true;
  if (pressedMouseButtons.has(2)) state.action = true;

  return state;
}

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pressedKeys = new Set();
    this.pressedMouseButtons = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.mouseButton = 0;
    this.justPressed = new Set();
    this.prevPressed = new Set();
    this.state = createEmptyState();

    this._onKeyDown = (e) => {
      if (!this.pressedKeys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.pressedKeys.add(e.code);
    };

    this._onKeyUp = (e) => {
      this.pressedKeys.delete(e.code);
      this.justPressed.delete(e.code);
    };

    this._onMouseMove = (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    };

    this._onMouseDown = (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      if (!this.pressedMouseButtons.has(e.button)) {
        this.justPressed.add('Mouse' + e.button);
      }
      this.pressedMouseButtons.add(e.button);
    };

    this._onMouseUp = (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.pressedMouseButtons.delete(e.button);
      this.justPressed.delete('Mouse' + e.button);
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  update() {
    this.state = mapKeysToInput(this.pressedKeys, this.mouseDelta, this.pressedMouseButtons);
    this.prevPressed = new Set(this.justPressed);
    this.justPressed.clear();
    this.mouseDelta = { x: 0, y: 0 };
  }

  getState() {
    return this.state;
  }

  isPressed(action) {
    const KEY_MAP = {
      jump: 'Space',
      sprint: 'ShiftLeft',
      action: 'KeyE',
      attack: 'Mouse0',
      start: 'Escape',
    };
    return this.prevPressed.has(KEY_MAP[action]);
  }

  lockPointer() {
    this.canvas.requestPointerLock();
  }

  unlockPointer() {
    document.exitPointerLock();
  }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
  }
}

const GAMEPAD_DEAD_ZONE = 0.15;
const TOUCH_DEAD_ZONE = 0.15;
const DEFAULT_LOOK_SENSITIVITY = 1;

const DEFAULT_GAMEPAD_MAP = {
  jump: 0,
  grab: 1,
  attack: 2,
  dodge: 3,
  pause: 9,
};

function classifyTouchZone(touchX, screenWidth) {
  return touchX < screenWidth * 0.4 ? 'left' : 'right';
}

function calculateJoystickVector(touchX, touchY, startX, startY, maxRadius, deadZone) {
  const dx = touchX - startX;
  const dy = startY - touchY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return { x: 0, y: 0, active: true };

  const clampedDist = Math.min(dist, maxRadius);
  const mag = clampedDist / maxRadius;

  if (mag <= deadZone) return { x: 0, y: 0, active: true };

  const rescaled = (mag - deadZone) / (1 - deadZone);
  return {
    x: (dx / dist) * rescaled,
    y: (dy / dist) * rescaled,
    active: true,
  };
}

function normalizeStick(x, y, deadZone) {
  const mag = Math.sqrt(x * x + y * y);
  if (mag <= deadZone) return { x: 0, y: 0 };
  const clampedMag = Math.min(mag, 1);
  const scale = (clampedMag - deadZone) / (1 - deadZone);
  return { x: (x / mag) * scale, y: (y / mag) * scale };
}

function mapGamepadButtons(buttons, buttonMap) {
  const result = {};
  for (const [action, index] of Object.entries(buttonMap)) {
    result[action] = buttons[index] ? buttons[index].pressed : false;
  }
  return result;
}

function mapGamepadToInput(leftStickX, leftStickY, rightStickX, rightStickY, buttons, buttonMap, lookSensitivity = DEFAULT_LOOK_SENSITIVITY) {
  const state = createEmptyState();

  const move = normalizeStick(leftStickX, leftStickY, GAMEPAD_DEAD_ZONE);
  state.move.x = move.x;
  state.move.y = move.y;

  const look = normalizeStick(rightStickX, rightStickY, GAMEPAD_DEAD_ZONE);
  state.look.x = look.x * lookSensitivity;
  state.look.y = look.y * lookSensitivity;

  const mapped = mapGamepadButtons(buttons, buttonMap);
  state.jump = mapped.jump || false;
  state.action = mapped.grab || false;
  state.attack = mapped.attack || false;
  state.dodge = mapped.dodge || false;
  state.start = mapped.pause || false;

  return state;
}

function isTouchInButtonRegion(touchX, touchY, btnX, btnY, btnRadius) {
  const dx = touchX - btnX;
  const dy = touchY - btnY;
  return dx * dx + dy * dy <= btnRadius * btnRadius;
}

class TouchInputManager {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.screenWidth = canvas.clientWidth || window.innerWidth;
    this.screenHeight = canvas.clientHeight || window.innerHeight;
    this.maxJoystickRadius = options.maxJoystickRadius || 50;
    this.deadZone = options.deadZone || TOUCH_DEAD_ZONE;
    this.joystickTouch = null;
    this.joystickStart = { x: 0, y: 0 };
    this.joystickState = { x: 0, y: 0, active: false };
    this.lookTouch = null;
    this.lookPrev = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.lookActive = false;
    this.actionButtons = options.actionButtons || [
      { id: 'jump', x: 0, y: 0, radius: 30 },
      { id: 'grab', x: 0, y: 0, radius: 30 },
      { id: 'attack', x: 0, y: 0, radius: 30 },
    ];
    this.touchActions = { jump: false, grab: false, attack: false };
    this.activeTouches = new Map();

    this._onTouchStart = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        const zone = classifyTouchZone(touch.clientX, this.screenWidth);
        if (zone === 'left' && !this.joystickTouch) {
          this.joystickTouch = touch.identifier;
          this.joystickStart = { x: touch.clientX, y: touch.clientY };
          this.joystickState.active = true;
        } else if (zone === 'right') {
          let matchedButton = false;
          for (const btn of this.actionButtons) {
            if (isTouchInButtonRegion(touch.clientX, touch.clientY, btn.x, btn.y, btn.radius)) {
              this.touchActions[btn.id] = true;
              this.activeTouches.set(touch.identifier, btn.id);
              matchedButton = true;
              break;
            }
          }
          if (!matchedButton && !this.lookTouch) {
            this.lookTouch = touch.identifier;
            this.lookPrev = { x: touch.clientX, y: touch.clientY };
            this.lookActive = true;
          }
        }
      }
    };

    this._onTouchMove = (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouch) {
          const v = calculateJoystickVector(
            touch.clientX, touch.clientY,
            this.joystickStart.x, this.joystickStart.y,
            this.maxJoystickRadius, this.deadZone,
          );
          this.joystickState = v;
        }
        if (touch.identifier === this.lookTouch) {
          this.lookDelta.x += touch.clientX - this.lookPrev.x;
          this.lookDelta.y += touch.clientY - this.lookPrev.y;
          this.lookPrev = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    this._onTouchEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this.joystickTouch) {
          this.joystickTouch = null;
          this.joystickState = { x: 0, y: 0, active: false };
        }
        if (touch.identifier === this.lookTouch) {
          this.lookTouch = null;
          this.lookActive = false;
          this.lookDelta = { x: 0, y: 0 };
        }
        const btnId = this.activeTouches.get(touch.identifier);
        if (btnId) {
          this.touchActions[btnId] = false;
          this.activeTouches.delete(touch.identifier);
        }
      }
    };

    this._onResize = () => {
      this.screenWidth = canvas.clientWidth || window.innerWidth;
      this.screenHeight = canvas.clientHeight || window.innerHeight;
    };

    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd);
    canvas.addEventListener('touchcancel', this._onTouchEnd);
    window.addEventListener('resize', this._onResize);
  }

  getTouchJoystick() {
    return this.joystickState;
  }

  getTouchLook() {
    return { ...this.lookDelta, active: this.lookActive };
  }

  getTouchAction() {
    return { ...this.touchActions };
  }

  update() {
    this.lookDelta = { x: 0, y: 0 };
  }

  static supportsTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  destroy() {
    this.canvas.removeEventListener('touchstart', this._onTouchStart);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    this.canvas.removeEventListener('touchend', this._onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this._onTouchEnd);
    window.removeEventListener('resize', this._onResize);
  }
}

class GamepadInputManager {
  constructor(options = {}) {
    this.buttonMap = options.buttonMap || DEFAULT_GAMEPAD_MAP;
    this.lookSensitivity = options.lookSensitivity || DEFAULT_LOOK_SENSITIVITY;
    this.deadZone = options.deadZone || GAMEPAD_DEAD_ZONE;
    this.state = createEmptyState();
    this.connected = false;
  }

  update() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (!gp) {
      this.connected = false;
      this.state = createEmptyState();
      return;
    }
    this.connected = true;
    this.state = mapGamepadToInput(
      gp.axes[0] || 0, gp.axes[1] || 0,
      gp.axes[2] || 0, gp.axes[3] || 0,
      gp.buttons, this.buttonMap, this.lookSensitivity,
    );
  }

  getState() {
    return this.state;
  }

  isGamepadConnected() {
    return this.connected;
  }

  static isAvailable() {
    return 'getGamepads' in navigator;
  }
}

export {
  InputManager,
  TouchInputManager,
  GamepadInputManager,
  mapKeysToInput,
  createEmptyState,
  classifyTouchZone,
  calculateJoystickVector,
  normalizeStick,
  mapGamepadButtons,
  mapGamepadToInput,
  isTouchInButtonRegion,
  DEFAULT_GAMEPAD_MAP,
  GAMEPAD_DEAD_ZONE,
  TOUCH_DEAD_ZONE,
  DEFAULT_LOOK_SENSITIVITY,
};
