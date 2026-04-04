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
    start: false,
  };
}

function mapKeysToInput(pressedKeys, mouseDelta = { x: 0, y: 0 }, mouseButton = 0) {
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
    if (code === 'Escape') state.start = true;
  }

  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) {
    state.move.x = mx / len;
    state.move.y = my / len;
  }

  state.look.x = mouseDelta.x;
  state.look.y = mouseDelta.y;

  if (mouseButton === 1) state.attack = true;
  if (mouseButton === 2) state.action = true;

  return state;
}

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.pressedKeys = new Set();
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
      this.mouseButton = e.button;
    };

    this._onMouseUp = () => {
      this.mouseButton = 0;
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  update() {
    this.state = mapKeysToInput(this.pressedKeys, this.mouseDelta, this.mouseButton);
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

export { InputManager, mapKeysToInput, createEmptyState };
