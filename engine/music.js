import { clamp, lerp } from "../utils/math.js";

const VALID_STATES = ["idle", "exploration", "combat", "victory"];
const CROSSFADE_SPEED = 1.5;

export class MusicSystem {
  constructor() {
    this.isInitialized = false;
    this.state = "idle";
    this.isPaused = false;
    this.masterVolume = 0.7;
    this.layers = {
      base: { currentGain: 1, targetGain: 1, oscillators: [], gainNode: null, filterNode: null },
      exploration: {
        currentGain: 0,
        targetGain: 0,
        oscillators: [],
        gainNode: null,
        filterNode: null,
      },
      combat: { currentGain: 0, targetGain: 0, oscillators: [], gainNode: null, filterNode: null },
      victory: { currentGain: 0, targetGain: 0, oscillators: [], gainNode: null, filterNode: null },
    };
    this._allOscillators = [];
    this._allFilters = [];
    this._ctx = null;
  }

  init(audioContext) {
    this._ctx = audioContext;
    this._masterGain = audioContext.createGain();
    this._masterGain.gain.value = this.masterVolume;
    this._masterGain.connect(audioContext.destination);

    this._initBaseLayer();
    this._initExplorationLayer();
    this._initCombatLayer();
    this._initVictoryLayer();

    this.isInitialized = true;
  }

  _createLayerGain() {
    const gain = this._ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this._masterGain);
    return gain;
  }

  _createFilter(type, freq, q) {
    const filter = this._ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    return filter;
  }

  _createOsc(type, freq, detune = 0) {
    const osc = this._ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.start();
    return osc;
  }

  _initBaseLayer() {
    const layer = this.layers.base;
    const gainNode = this._createLayerGain();
    const filterNode = this._createFilter("lowpass", 400, 1);
    filterNode.connect(gainNode);
    layer.gainNode = gainNode;
    layer.filterNode = filterNode;
    layer.currentGain = 1;
    gainNode.gain.value = 1 * this.masterVolume;

    const osc1 = this._createOsc("sine", 55, 0);
    const osc2 = this._createOsc("sine", 55.5, 8);
    const osc3 = this._createOsc("triangle", 82.5, -5);
    osc1.connect(filterNode);
    osc2.connect(filterNode);
    osc3.connect(filterNode);
    layer.oscillators = [osc1, osc2, osc3];
    this._allOscillators.push(osc1, osc2, osc3);
    this._allFilters.push(filterNode);
  }

  _initExplorationLayer() {
    const layer = this.layers.exploration;
    const gainNode = this._createLayerGain();
    const filterNode = this._createFilter("lowpass", 600, 0.8);
    filterNode.connect(gainNode);
    layer.gainNode = gainNode;
    layer.filterNode = filterNode;

    const osc1 = this._createOsc("sine", 110, 3);
    const osc2 = this._createOsc("sine", 165, -4);
    const osc3 = this._createOsc("triangle", 220, 7);
    osc1.connect(filterNode);
    osc2.connect(filterNode);
    osc3.connect(filterNode);
    layer.oscillators = [osc1, osc2, osc3];
    this._allOscillators.push(osc1, osc2, osc3);
    this._allFilters.push(filterNode);
  }

  _initCombatLayer() {
    const layer = this.layers.combat;
    const gainNode = this._createLayerGain();
    const filterNode = this._createFilter("lowpass", 900, 1.5);
    filterNode.connect(gainNode);
    layer.gainNode = gainNode;
    layer.filterNode = filterNode;

    const osc1 = this._createOsc("sawtooth", 55, 0);
    const osc2 = this._createOsc("square", 110, -10);
    const osc3 = this._createOsc("sine", 82, 5);
    osc1.connect(filterNode);
    osc2.connect(filterNode);
    osc3.connect(filterNode);
    layer.oscillators = [osc1, osc2, osc3];
    this._allOscillators.push(osc1, osc2, osc3);
    this._allFilters.push(filterNode);
  }

  _initVictoryLayer() {
    const layer = this.layers.victory;
    const gainNode = this._createLayerGain();
    const filterNode = this._createFilter("lowpass", 1200, 0.5);
    filterNode.connect(gainNode);
    layer.gainNode = gainNode;
    layer.filterNode = filterNode;

    const osc1 = this._createOsc("sine", 261.6, 0);
    const osc2 = this._createOsc("sine", 329.6, 4);
    const osc3 = this._createOsc("sine", 392, -3);
    const osc4 = this._createOsc("triangle", 523.3, 6);
    osc1.connect(filterNode);
    osc2.connect(filterNode);
    osc3.connect(filterNode);
    osc4.connect(filterNode);
    layer.oscillators = [osc1, osc2, osc3, osc4];
    this._allOscillators.push(osc1, osc2, osc3, osc4);
    this._allFilters.push(filterNode);
  }

  _getTargetGains(state) {
    switch (state) {
      case "idle":
        return { base: 1, exploration: 0, combat: 0, victory: 0 };
      case "exploration":
        return { base: 1, exploration: 1, combat: 0, victory: 0 };
      case "combat":
        return { base: 1, exploration: 0, combat: 1, victory: 0 };
      case "victory":
        return { base: 1, exploration: 0, combat: 0, victory: 1 };
    }
  }

  setState(state) {
    if (!VALID_STATES.includes(state)) {
      throw new Error(`Invalid music state: ${state}`);
    }
    this.state = state;
    const targets = this._getTargetGains(state);
    for (const [name, target] of Object.entries(targets)) {
      this.layers[name].targetGain = target;
    }
  }

  update(deltaTime) {
    if (!this.isInitialized || this.isPaused) return;

    for (const layer of Object.values(this.layers)) {
      if (Math.abs(layer.currentGain - layer.targetGain) > 0.001) {
        const t = clamp(CROSSFADE_SPEED * deltaTime, 0, 1);
        layer.currentGain = lerp(layer.currentGain, layer.targetGain, t);
        if (Math.abs(layer.currentGain - layer.targetGain) < 0.001) {
          layer.currentGain = layer.targetGain;
        }
        if (layer.gainNode) {
          layer.gainNode.gain.value = layer.currentGain * this.masterVolume;
        }
      }
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  setMasterVolume(volume) {
    this.masterVolume = clamp(volume, 0, 1);
    if (!this.isInitialized) return;
    for (const layer of Object.values(this.layers)) {
      if (layer.gainNode) {
        layer.gainNode.gain.value = layer.currentGain * this.masterVolume;
      }
    }
  }

  dispose() {
    if (!this.isInitialized) return;
    for (const osc of this._allOscillators) {
      try {
        osc.stop();
      } catch {}
      try {
        osc.disconnect();
      } catch {}
    }
    for (const filter of this._allFilters) {
      try {
        filter.disconnect();
      } catch {}
    }
    for (const layer of Object.values(this.layers)) {
      if (layer.gainNode) {
        try {
          layer.gainNode.disconnect();
        } catch {}
        layer.gainNode = null;
      }
      layer.filterNode = null;
      layer.oscillators = [];
    }
    try {
      this._masterGain.disconnect();
    } catch {}
    this._masterGain = null;
    this._allOscillators = [];
    this._allFilters = [];
    this._ctx = null;
    this.isInitialized = false;
  }
}
