import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MusicSystem } from './music.js';

function createMockAudioContext() {
  const oscillators = [];
  const gains = [];
  const filters = [];

  function createGain() {
    const gain = { gain: { value: 0, linearRampToValueAtTime: mock.fn() }, connect: mock.fn() };
    gains.push(gain);
    return gain;
  }

  function createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { value: 440, setValueAtTime: mock.fn() },
      detune: { value: 0, setValueAtTime: mock.fn() },
      connect: mock.fn(),
      start: mock.fn(),
      stop: mock.fn(),
      disconnect: mock.fn(),
    };
    oscillators.push(osc);
    return osc;
  }

  function createBiquadFilter() {
    const filter = {
      type: 'lowpass',
      frequency: { value: 800, setValueAtTime: mock.fn() },
      Q: { value: 1, setValueAtTime: mock.fn() },
      connect: mock.fn(),
      disconnect: mock.fn(),
    };
    filters.push(filter);
    return filter;
  }

  return {
    oscillators,
    gains,
    filters,
    ctx: {
      currentTime: 0,
      createOscillator: mock.fn(createOscillator),
      createGain: mock.fn(createGain),
      createBiquadFilter: mock.fn(createBiquadFilter),
      destination: {},
    },
  };
}

describe('MusicSystem', () => {
  let music;
  let mockAudio;

  beforeEach(() => {
    mockAudio = createMockAudioContext();
    music = new MusicSystem();
  });

  describe('constructor', () => {
    it('starts with idle state', () => {
      assert.equal(music.state, 'idle');
    });

    it('is not initialized', () => {
      assert.equal(music.isInitialized, false);
    });

    it('layers object exists with all four layers', () => {
      assert.ok(music.layers);
      assert.ok('base' in music.layers);
      assert.ok('exploration' in music.layers);
      assert.ok('combat' in music.layers);
      assert.ok('victory' in music.layers);
    });
  });

  describe('init', () => {
    it('sets isInitialized to true', () => {
      music.init(mockAudio.ctx);
      assert.equal(music.isInitialized, true);
    });

    it('creates oscillators for each layer', () => {
      music.init(mockAudio.ctx);
      assert.ok(mockAudio.oscillators.length >= 4);
    });

    it('creates gain nodes for each layer', () => {
      music.init(mockAudio.ctx);
      assert.ok(mockAudio.gains.length >= 4);
    });

    it('creates filters for each layer', () => {
      music.init(mockAudio.ctx);
      assert.ok(mockAudio.filters.length >= 2);
    });

    it('starts all oscillators', () => {
      music.init(mockAudio.ctx);
      for (const osc of mockAudio.oscillators) {
        assert.equal(osc.start.mock.callCount(), 1);
      }
    });

    it('default state is idle', () => {
      music.init(mockAudio.ctx);
      assert.equal(music.state, 'idle');
    });
  });

  describe('setState', () => {
    it('accepts idle state', () => {
      music.init(mockAudio.ctx);
      music.setState('idle');
      assert.equal(music.state, 'idle');
    });

    it('accepts exploration state', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      assert.equal(music.state, 'exploration');
    });

    it('accepts combat state', () => {
      music.init(mockAudio.ctx);
      music.setState('combat');
      assert.equal(music.state, 'combat');
    });

    it('accepts victory state', () => {
      music.init(mockAudio.ctx);
      music.setState('victory');
      assert.equal(music.state, 'victory');
    });

    it('rejects invalid state', () => {
      music.init(mockAudio.ctx);
      assert.throws(() => music.setState('invalid'));
    });

    it('transitioning from idle to exploration sets crossfade targets', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      assert.equal(music.layers.exploration.targetGain, 1);
    });

    it('leaving a layer sets its target gain to 0', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      music.setState('idle');
      assert.equal(music.layers.exploration.targetGain, 0);
    });

    it('base layer always has targetGain 1', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      assert.equal(music.layers.base.targetGain, 1);
      music.setState('combat');
      assert.equal(music.layers.base.targetGain, 1);
      music.setState('idle');
      assert.equal(music.layers.base.targetGain, 1);
    });

    it('switching directly between non-idle states works', () => {
      music.init(mockAudio.ctx);
      music.setState('combat');
      assert.equal(music.state, 'combat');
      music.setState('exploration');
      assert.equal(music.state, 'exploration');
    });
  });

  describe('update', () => {
    it('interpolates gain toward target over time', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      const before = music.layers.exploration.currentGain;
      music.update(0.5);
      const after = music.layers.exploration.currentGain;
      assert.ok(after > before);
    });

    it('gain reaches target after sufficient time', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      for (let i = 0; i < 100; i++) {
        music.update(0.1);
      }
      assert.ok(Math.abs(music.layers.exploration.currentGain - music.layers.exploration.targetGain) < 0.01);
    });

    it('crossfade completes within ~2 seconds', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      let totalTime = 0;
      while (totalTime < 3) {
        music.update(0.016);
        totalTime += 0.016;
      }
      assert.ok(Math.abs(music.layers.exploration.currentGain - 1) < 0.05);
    });

    it('works before init without error', () => {
      assert.doesNotThrow(() => music.update(0.016));
    });
  });

  describe('pause', () => {
    it('sets isPaused to true', () => {
      music.init(mockAudio.ctx);
      music.pause();
      assert.equal(music.isPaused, true);
    });

    it('update does not interpolate when paused', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      music.pause();
      music.update(1);
      assert.equal(music.layers.exploration.currentGain, 0);
    });
  });

  describe('resume', () => {
    it('sets isPaused to false', () => {
      music.init(mockAudio.ctx);
      music.pause();
      music.resume();
      assert.equal(music.isPaused, false);
    });

    it('resumes interpolation', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      music.pause();
      music.resume();
      music.update(1);
      assert.ok(music.layers.exploration.currentGain > 0);
    });
  });

  describe('dispose', () => {
    it('stops all oscillators', () => {
      music.init(mockAudio.ctx);
      music.dispose();
      for (const osc of mockAudio.oscillators) {
        assert.equal(osc.stop.mock.callCount(), 1);
      }
    });

    it('sets isInitialized to false', () => {
      music.init(mockAudio.ctx);
      music.dispose();
      assert.equal(music.isInitialized, false);
    });

    it('can be called multiple times without error', () => {
      music.init(mockAudio.ctx);
      assert.doesNotThrow(() => {
        music.dispose();
        music.dispose();
      });
    });
  });

  describe('layer structure', () => {
    it('each layer has currentGain starting at correct value', () => {
      music.init(mockAudio.ctx);
      assert.equal(music.layers.base.currentGain, 1);
      assert.equal(music.layers.exploration.currentGain, 0);
      assert.equal(music.layers.combat.currentGain, 0);
      assert.equal(music.layers.victory.currentGain, 0);
    });

    it('each layer has targetGain', () => {
      music.init(mockAudio.ctx);
      assert.equal(music.layers.base.targetGain, 1);
      assert.equal(music.layers.exploration.targetGain, 0);
      assert.equal(music.layers.combat.targetGain, 0);
      assert.equal(music.layers.victory.targetGain, 0);
    });

    it('combat layer activates with targetGain 1', () => {
      music.init(mockAudio.ctx);
      music.setState('combat');
      assert.equal(music.layers.combat.targetGain, 1);
      assert.equal(music.layers.exploration.targetGain, 0);
    });

    it('victory layer activates with targetGain 1', () => {
      music.init(mockAudio.ctx);
      music.setState('victory');
      assert.equal(music.layers.victory.targetGain, 1);
      assert.equal(music.layers.combat.targetGain, 0);
      assert.equal(music.layers.exploration.targetGain, 0);
    });
  });

  describe('crossfade behavior', () => {
    it('all non-active layers fade to 0 when switching states', () => {
      music.init(mockAudio.ctx);
      music.setState('exploration');
      assert.equal(music.layers.combat.targetGain, 0);
      assert.equal(music.layers.victory.targetGain, 0);
    });

    it('rapid state switches handle intermediate gains correctly', () => {
      music.init(mockAudio.ctx);
      music.setState('combat');
      music.update(0.5);
      music.setState('exploration');
      assert.equal(music.layers.exploration.targetGain, 1);
      assert.equal(music.layers.combat.targetGain, 0);
    });
  });

  describe('volume', () => {
    it('setMasterVolume clamps between 0 and 1', () => {
      music.init(mockAudio.ctx);
      music.setMasterVolume(1.5);
      assert.equal(music.masterVolume, 1);
      music.setMasterVolume(-0.5);
      assert.equal(music.masterVolume, 0);
    });

    it('setMasterVolume accepts valid values', () => {
      music.init(mockAudio.ctx);
      music.setMasterVolume(0.5);
      assert.equal(music.masterVolume, 0.5);
    });
  });
});
