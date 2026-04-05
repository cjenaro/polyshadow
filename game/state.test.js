import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from './state.js';

describe('GameState', () => {
  it('starts in title state', () => {
    const state = new GameState();
    assert.strictEqual(state.getState(), 'title');
  });

  it('transitions from title to playing', () => {
    const state = new GameState();
    assert.strictEqual(state.transition('playing'), true);
    assert.strictEqual(state.getState(), 'playing');
  });

  it('rejects invalid transitions', () => {
    const state = new GameState();
    assert.strictEqual(state.transition('victory'), false);
    assert.strictEqual(state.transition('credits'), false);
    assert.strictEqual(state.transition('paused'), false);
    assert.strictEqual(state.getState(), 'title');
  });

  it('transitions from playing to paused and back', () => {
    const state = new GameState();
    state.transition('playing');
    assert.strictEqual(state.transition('paused'), true);
    assert.strictEqual(state.getState(), 'paused');
    assert.strictEqual(state.transition('playing'), true);
    assert.strictEqual(state.getState(), 'playing');
  });

  it('transitions from playing to victory', () => {
    const state = new GameState();
    state.transition('playing');
    assert.strictEqual(state.transition('victory'), true);
    assert.strictEqual(state.getState(), 'victory');
  });

  it('transitions from victory to credits', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    assert.strictEqual(state.transition('credits'), true);
    assert.strictEqual(state.getState(), 'credits');
  });

  it('transitions from credits to title', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    state.transition('credits');
    assert.strictEqual(state.transition('title'), true);
    assert.strictEqual(state.getState(), 'title');
  });

  it('rejects playing to credits directly', () => {
    const state = new GameState();
    state.transition('playing');
    assert.strictEqual(state.transition('credits'), false);
    assert.strictEqual(state.getState(), 'playing');
  });

  it('rejects title to paused directly', () => {
    const state = new GameState();
    assert.strictEqual(state.transition('paused'), false);
    assert.strictEqual(state.getState(), 'title');
  });

  it('rejects paused to victory', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('paused');
    assert.strictEqual(state.transition('victory'), false);
    assert.strictEqual(state.getState(), 'paused');
  });

  it('isPlaying returns true only in playing state', () => {
    const state = new GameState();
    assert.strictEqual(state.isPlaying(), false);
    state.transition('playing');
    assert.strictEqual(state.isPlaying(), true);
    state.transition('paused');
    assert.strictEqual(state.isPlaying(), false);
    state.transition('playing');
    assert.strictEqual(state.isPlaying(), true);
  });

  it('onTransition fires on valid transition', () => {
    const state = new GameState();
    const transitions = [];
    state.onTransition((from, to) => transitions.push({ from, to }));
    state.transition('playing');
    assert.deepStrictEqual(transitions, [{ from: 'title', to: 'playing' }]);
  });

  it('onTransition does not fire on invalid transition', () => {
    const state = new GameState();
    const transitions = [];
    state.onTransition((from, to) => transitions.push({ from, to }));
    state.transition('victory');
    assert.deepStrictEqual(transitions, []);
  });

  it('onTransition supports multiple callbacks', () => {
    const state = new GameState();
    const results = [];
    state.onTransition((from, to) => results.push('a'));
    state.onTransition((from, to) => results.push('b'));
    state.transition('playing');
    assert.deepStrictEqual(results, ['a', 'b']);
  });
});

describe('GameState update (timed transitions)', () => {
  it('victory auto-transitions to credits after 5 seconds', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    state.update(3.0);
    assert.strictEqual(state.getState(), 'victory');
    state.update(2.0);
    assert.strictEqual(state.getState(), 'credits');
  });

  it('credits auto-transitions to title after 15 seconds', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    state.transition('credits');
    state.update(10.0);
    assert.strictEqual(state.getState(), 'credits');
    state.update(5.0);
    assert.strictEqual(state.getState(), 'title');
  });

  it('update does nothing in title state', () => {
    const state = new GameState();
    state.update(100.0);
    assert.strictEqual(state.getState(), 'title');
  });

  it('update does nothing in playing state', () => {
    const state = new GameState();
    state.transition('playing');
    state.update(100.0);
    assert.strictEqual(state.getState(), 'playing');
  });

  it('update does nothing in paused state', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('paused');
    state.update(100.0);
    assert.strictEqual(state.getState(), 'paused');
  });

  it('timed victory transition fires onTransition callback', () => {
    const state = new GameState();
    const transitions = [];
    state.onTransition((from, to) => transitions.push({ from, to }));
    state.transition('playing');
    state.transition('victory');
    state.update(5.0);
    assert.deepStrictEqual(transitions, [
      { from: 'title', to: 'playing' },
      { from: 'playing', to: 'victory' },
      { from: 'victory', to: 'credits' },
    ]);
  });

  it('timed credits transition fires onTransition callback', () => {
    const state = new GameState();
    const transitions = [];
    state.onTransition((from, to) => transitions.push({ from, to }));
    state.transition('playing');
    state.transition('victory');
    state.update(5.0);
    state.update(15.0);
    assert.ok(transitions.some(t => t.from === 'credits' && t.to === 'title'));
  });

  it('reset returns to title', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    state.reset();
    assert.strictEqual(state.getState(), 'title');
    assert.strictEqual(state.isPlaying(), false);
  });

  it('reset clears timer so update does nothing', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('victory');
    state.update(4.0);
    state.reset();
    state.update(10.0);
    assert.strictEqual(state.getState(), 'title');
  });
});

describe('GameState main loop integration', () => {
  it('paused only allows transition back to playing', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('paused');
    assert.strictEqual(state.transition('title'), false);
    assert.strictEqual(state.transition('victory'), false);
    assert.strictEqual(state.transition('credits'), false);
    assert.strictEqual(state.getState(), 'paused');
  });

  it('full game cycle: title → playing → paused → playing → victory → credits → title', () => {
    const state = new GameState();
    const log = [];
    state.onTransition((from, to) => log.push(`${from}->${to}`));
    state.transition('playing');
    state.transition('paused');
    state.transition('playing');
    state.transition('victory');
    state.transition('credits');
    state.update(15);
    assert.strictEqual(state.getState(), 'title');
    assert.deepStrictEqual(log, [
      'title->playing',
      'playing->paused',
      'paused->playing',
      'playing->victory',
      'victory->credits',
      'credits->title',
    ]);
  });

  it('multiple pause/resume cycles work correctly', () => {
    const state = new GameState();
    state.transition('playing');
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(state.transition('paused'), true);
      assert.strictEqual(state.getState(), 'paused');
      assert.strictEqual(state.isPlaying(), false);
      assert.strictEqual(state.transition('playing'), true);
      assert.strictEqual(state.getState(), 'playing');
      assert.strictEqual(state.isPlaying(), true);
    }
  });

  it('isPlaying reflects state accurately across all transitions', () => {
    const state = new GameState();
    const playingStates = [];
    for (const transition of ['playing', 'paused', 'playing', 'victory', 'credits']) {
      playingStates.push(state.isPlaying());
      state.transition(transition);
    }
    assert.deepStrictEqual(playingStates, [false, true, false, true, false]);
  });

  it('cannot transition playing to playing', () => {
    const state = new GameState();
    state.transition('playing');
    assert.strictEqual(state.transition('playing'), false);
    assert.strictEqual(state.getState(), 'playing');
  });

  it('cannot transition paused to paused', () => {
    const state = new GameState();
    state.transition('playing');
    state.transition('paused');
    assert.strictEqual(state.transition('paused'), false);
    assert.strictEqual(state.getState(), 'paused');
  });
});
