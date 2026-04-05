import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHUD } from './hud.js';

function createMockCanvas(w = 800, h = 600) {
  const calls = [];
  const ctx = {
    beginPath: () => calls.push('beginPath'),
    arc: (...args) => calls.push(['arc', ...args]),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: (...args) => calls.push(['translate', ...args]),
    rotate: (...args) => calls.push(['rotate', ...args]),
    setTransform: (...args) => calls.push(['setTransform', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
    measureText: (t) => ({ width: t.length * 10 }),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    closePath: () => calls.push('closePath'),
    lineWidth: null,
    strokeStyle: null,
    fillStyle: null,
    font: null,
    globalAlpha: null,
    textAlign: null,
    textBaseline: null,
    lineCap: null,
  };
  return {
    _ctx: ctx,
    _calls: calls,
    _callsFor(type) {
      return calls.filter(c => Array.isArray(c) && c[0] === type);
    },
    width: w,
    height: h,
    style: { display: '' },
    getContext: () => ctx,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function baseState() {
  return {
    stamina: 1.0,
    hints: [],
  };
}

describe('createHUD', () => {
  it('returns an object with update, draw, show, hide, resize', () => {
    const canvas = createMockCanvas();
    const hud = createHUD(canvas);
    assert.equal(typeof hud.update, 'function');
    assert.equal(typeof hud.draw, 'function');
    assert.equal(typeof hud.show, 'function');
    assert.equal(typeof hud.hide, 'function');
    assert.equal(typeof hud.resize, 'function');
  });

  describe('draw', () => {
    it('does not throw with valid state', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.draw(baseState()));
    });

    it('does not throw when stamina is 0', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.stamina = 0;
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('does not throw when stamina is 1', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.stamina = 1;
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('draws stamina arc when stamina < 1', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.stamina = 0.5;
      hud.draw(state);
      assert.ok(canvas._calls.some(c => c === 'beginPath'));
    });

    it('does not throw when hints array is empty', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.hints = [];
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('does not throw with direction hints', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.hints = [
        { label: 'Colossus A', angle: 0.5 },
        { label: 'Colossus B', angle: 2.0 },
      ];
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('clears the canvas before drawing', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.draw(baseState());
      const clearCalls = canvas._callsFor('clearRect');
      assert.ok(clearCalls.length > 0);
    });

    it('does not throw with all elements active', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = {
        stamina: 0.4,
        hints: [{ label: 'Argus', angle: 1.5 }],
      };
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('clamps stamina values above 1', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.stamina = 2.0;
      assert.doesNotThrow(() => hud.draw(state));
    });

    it('clamps stamina values below 0', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      const state = baseState();
      state.stamina = -0.5;
      assert.doesNotThrow(() => hud.draw(state));
    });
  });

  describe('update', () => {
    it('does not throw', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.update(0.016));
    });

    it('accepts zero dt', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.update(0));
    });

    it('accepts large dt', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.update(5.0));
    });
  });

  describe('show/hide', () => {
    it('hide sets canvas display to none', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.hide();
      assert.equal(canvas.style.display, 'none');
    });

    it('show sets canvas display to empty string', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.hide();
      hud.show();
      assert.equal(canvas.style.display, '');
    });

    it('starts visible', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.equal(canvas.style.display, '');
    });

    it('multiple hide calls are idempotent', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.hide();
      hud.hide();
      assert.equal(canvas.style.display, 'none');
    });

    it('multiple show calls are idempotent', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.show();
      hud.show();
      assert.equal(canvas.style.display, '');
    });
  });

  describe('resize', () => {
    it('does not throw', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.resize(1920, 1080));
    });

    it('updates canvas dimensions', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      hud.resize(1920, 1080);
      assert.equal(canvas.width, 1920);
      assert.equal(canvas.height, 1080);
    });

    it('handles zero dimensions', () => {
      const canvas = createMockCanvas();
      const hud = createHUD(canvas);
      assert.doesNotThrow(() => hud.resize(0, 0));
    });
  });
});
