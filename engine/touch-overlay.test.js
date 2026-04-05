import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchLayout } from './touch-overlay.js';

describe('createTouchLayout', () => {
  it('returns joystick on left side of screen', () => {
    const layout = createTouchLayout(800, 600);
    assert.ok(layout.joystickCenter.x < 800 / 2, 'joystick should be in left half');
    assert.ok(layout.joystickCenter.x > 0, 'joystick x should be positive');
    assert.ok(layout.joystickCenter.y > 0, 'joystick y should be positive');
    assert.ok(layout.joystickCenter.y < 600, 'joystick y within screen height');
  });

  it('returns positive joystick radius', () => {
    const layout = createTouchLayout(800, 600);
    assert.ok(layout.joystickRadius > 0, 'joystick radius must be positive');
    assert.ok(layout.joystickRadius < 400, 'joystick radius should be reasonable');
  });

  it('returns three buttons with correct IDs', () => {
    const layout = createTouchLayout(800, 600);
    const ids = layout.buttons.map(b => b.id);
    assert.deepEqual(ids.sort(), ['attack', 'grab', 'jump']);
  });

  it('places all buttons on right half of screen', () => {
    const layout = createTouchLayout(800, 600);
    for (const btn of layout.buttons) {
      assert.ok(btn.x > 800 / 2, `${btn.id} should be in right half (x=${btn.x})`);
    }
  });

  it('places all button positions within screen bounds', () => {
    const layout = createTouchLayout(800, 600);
    for (const btn of layout.buttons) {
      assert.ok(btn.x - btn.radius >= 0, `${btn.id} left edge in bounds`);
      assert.ok(btn.x + btn.radius <= 800, `${btn.id} right edge in bounds`);
      assert.ok(btn.y - btn.radius >= 0, `${btn.id} top edge in bounds`);
      assert.ok(btn.y + btn.radius <= 600, `${btn.id} bottom edge in bounds`);
    }
  });

  it('gives each button a positive radius', () => {
    const layout = createTouchLayout(800, 600);
    for (const btn of layout.buttons) {
      assert.ok(btn.radius > 0, `${btn.id} radius must be positive`);
    }
  });

  it('buttons are in triangular layout (not all at same y)', () => {
    const layout = createTouchLayout(800, 600);
    const ys = layout.buttons.map(b => b.y);
    const uniqueYs = new Set(ys);
    assert.ok(uniqueYs.size > 1, 'buttons should span multiple Y positions');
  });

  it('scales to portrait orientation', () => {
    const layout = createTouchLayout(375, 812);
    for (const btn of layout.buttons) {
      assert.ok(btn.x > 375 / 2, `${btn.id} should be right half in portrait`);
      assert.ok(btn.x + btn.radius <= 375, `${btn.id} right edge in bounds (portrait)`);
      assert.ok(btn.y + btn.radius <= 812, `${btn.id} bottom edge in bounds (portrait)`);
    }
    assert.ok(layout.joystickCenter.x < 375 / 2, 'joystick left half in portrait');
  });

  it('scales to very small screen', () => {
    const layout = createTouchLayout(320, 480);
    for (const btn of layout.buttons) {
      assert.ok(btn.radius > 0, `${btn.id} radius positive on small screen`);
      assert.ok(btn.x + btn.radius <= 320, `${btn.id} fits small width`);
    }
  });

  it('joystick stays in lower-left region', () => {
    const layout = createTouchLayout(800, 600);
    assert.ok(layout.joystickCenter.y > 600 * 0.4, 'joystick should be in lower area');
  });
});
