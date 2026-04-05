import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIO_CONFIG,
  createAudioState,
  initAudio,
  setMasterVolume,
  toggleMute,
  getEffectiveVolume,
  registerSound,
  cleanupSounds,
  isSoundPlaying,
  getFootstepParams,
  getClimbingGrabParams,
  getHeartbeatParams,
  shouldPlayHeartbeat,
  getSwordSlashParams,
  getColossusImpactParams,
  getWeakPointHitParams,
  getColossusDeathParams,
  getAmbientWindParams,
  shouldPlayFootstep,
} from "./audio.js";

describe("AUDIO_CONFIG", () => {
  it("has expected volume fields between 0 and 1", () => {
    assert.ok(AUDIO_CONFIG.masterVolume >= 0 && AUDIO_CONFIG.masterVolume <= 1);
    assert.ok(AUDIO_CONFIG.ambientWindVolume >= 0 && AUDIO_CONFIG.ambientWindVolume <= 1);
    assert.ok(AUDIO_CONFIG.footstepVolume >= 0 && AUDIO_CONFIG.footstepVolume <= 1);
    assert.ok(AUDIO_CONFIG.climbingGrabVolume >= 0 && AUDIO_CONFIG.climbingGrabVolume <= 1);
    assert.ok(AUDIO_CONFIG.staminaLowVolume >= 0 && AUDIO_CONFIG.staminaLowVolume <= 1);
    assert.ok(AUDIO_CONFIG.swordSlashVolume >= 0 && AUDIO_CONFIG.swordSlashVolume <= 1);
    assert.ok(AUDIO_CONFIG.colossusImpactVolume >= 0 && AUDIO_CONFIG.colossusImpactVolume <= 1);
    assert.ok(AUDIO_CONFIG.weakPointHitVolume >= 0 && AUDIO_CONFIG.weakPointHitVolume <= 1);
    assert.ok(AUDIO_CONFIG.colossusDeathVolume >= 0 && AUDIO_CONFIG.colossusDeathVolume <= 1);
  });

  it("has heartbeat timing fields", () => {
    assert.ok(AUDIO_CONFIG.heartbeatIntervalMin > 0);
    assert.ok(AUDIO_CONFIG.heartbeatIntervalMax > AUDIO_CONFIG.heartbeatIntervalMin);
  });

  it("has low stamina threshold between 0 and 1", () => {
    assert.ok(AUDIO_CONFIG.lowStaminaThreshold > 0);
    assert.ok(AUDIO_CONFIG.lowStaminaThreshold < 1);
  });
});

describe("createAudioState", () => {
  it("returns default state with expected fields", () => {
    const state = createAudioState();
    assert.equal(state.isInitialized, false);
    assert.equal(state.masterVolume, AUDIO_CONFIG.masterVolume);
    assert.equal(state.isMuted, false);
    assert.equal(state.lastFootstepTime, 0);
    assert.equal(state.lastHeartbeatTime, 0);
    assert.ok(state.activeSounds instanceof Map);
    assert.equal(state.activeSounds.size, 0);
  });

  it("accepts overrides", () => {
    const customMap = new Map();
    customMap.set("test", { startTime: 5, duration: 2 });
    const state = createAudioState({
      isMuted: true,
      masterVolume: 0.5,
      activeSounds: customMap,
    });
    assert.equal(state.masterVolume, 0.5);
    assert.equal(state.isMuted, true);
    assert.equal(state.activeSounds.size, 1);
  });
});

describe("initAudio", () => {
  it("sets isInitialized to true", () => {
    const state = createAudioState();
    const initialized = initAudio(state);
    assert.equal(initialized.isInitialized, true);
    assert.equal(state.isInitialized, false);
  });

  it("preserves other state fields", () => {
    const state = setMasterVolume(createAudioState(), 0.3);
    const initialized = initAudio(state);
    assert.equal(initialized.masterVolume, 0.3);
    assert.equal(initialized.isMuted, false);
  });
});

describe("setMasterVolume", () => {
  it("sets volume to given value within range", () => {
    const state = setMasterVolume(createAudioState(), 0.5);
    assert.equal(state.masterVolume, 0.5);
  });

  it("clamps volume to 0 minimum", () => {
    const state = setMasterVolume(createAudioState(), -0.5);
    assert.equal(state.masterVolume, 0);
  });

  it("clamps volume to 1 maximum", () => {
    const state = setMasterVolume(createAudioState(), 1.5);
    assert.equal(state.masterVolume, 1);
  });

  it("handles exact boundary values", () => {
    const s0 = setMasterVolume(createAudioState(), 0);
    assert.equal(s0.masterVolume, 0);
    const s1 = setMasterVolume(createAudioState(), 1);
    assert.equal(s1.masterVolume, 1);
  });
});

describe("toggleMute", () => {
  it("toggles from false to true", () => {
    const state = createAudioState();
    const muted = toggleMute(state);
    assert.equal(muted.isMuted, true);
    assert.equal(state.isMuted, false);
  });

  it("toggles from true to false", () => {
    const state = toggleMute(createAudioState());
    const unmuted = toggleMute(state);
    assert.equal(unmuted.isMuted, false);
  });
});

describe("getEffectiveVolume", () => {
  it("returns masterVolume * baseVolume", () => {
    const state = setMasterVolume(createAudioState(), 0.5);
    assert.equal(getEffectiveVolume(state, 0.8), 0.4);
  });

  it("returns 0 when muted", () => {
    const state = toggleMute(createAudioState());
    assert.equal(getEffectiveVolume(state, 0.8), 0);
  });

  it("returns 0 when baseVolume is 0", () => {
    assert.equal(getEffectiveVolume(createAudioState(), 0), 0);
  });

  it("returns full volume at master 1.0", () => {
    const state = setMasterVolume(createAudioState(), 1.0);
    assert.equal(getEffectiveVolume(state, 0.6), 0.6);
  });
});

describe("registerSound", () => {
  it("adds sound to activeSounds", () => {
    const state = createAudioState();
    const updated = registerSound(state, "footstep_1", 0.12);
    assert.equal(updated.activeSounds.size, 1);
    assert.ok(updated.activeSounds.has("footstep_1"));
    assert.equal(updated.activeSounds.get("footstep_1").duration, 0.12);
  });

  it("sets startTime from currentTime parameter", () => {
    const state = createAudioState();
    const updated = registerSound(state, "slash", 0.2, 10.5);
    assert.equal(updated.activeSounds.get("slash").startTime, 10.5);
  });

  it("defaults startTime to 0", () => {
    const state = createAudioState();
    const updated = registerSound(state, "grab", 0.06);
    assert.equal(updated.activeSounds.get("grab").startTime, 0);
  });

  it("does not mutate original state", () => {
    const state = createAudioState();
    registerSound(state, "test", 0.1);
    assert.equal(state.activeSounds.size, 0);
  });
});

describe("cleanupSounds", () => {
  it("removes expired sounds", () => {
    let state = createAudioState();
    state = registerSound(state, "short", 0.1, 1.0);
    state = registerSound(state, "long", 5.0, 1.0);
    const cleaned = cleanupSounds(state, 2.0);
    assert.equal(cleaned.activeSounds.size, 1);
    assert.ok(cleaned.activeSounds.has("long"));
  });

  it("keeps sounds still playing", () => {
    let state = createAudioState();
    state = registerSound(state, "ongoing", 5.0, 1.0);
    const cleaned = cleanupSounds(state, 3.0);
    assert.equal(cleaned.activeSounds.size, 1);
    assert.ok(cleaned.activeSounds.has("ongoing"));
  });

  it("removes sound exactly at end time", () => {
    let state = createAudioState();
    state = registerSound(state, "exact", 1.0, 1.0);
    const cleaned = cleanupSounds(state, 2.0);
    assert.equal(cleaned.activeSounds.size, 0);
  });

  it("handles empty activeSounds", () => {
    const state = createAudioState();
    const cleaned = cleanupSounds(state, 5.0);
    assert.equal(cleaned.activeSounds.size, 0);
  });
});

describe("isSoundPlaying", () => {
  it("returns true for active sound", () => {
    let state = createAudioState();
    state = registerSound(state, "test", 1.0, 2.0);
    assert.equal(isSoundPlaying(state, "test", 2.5), true);
  });

  it("returns false for expired sound", () => {
    let state = createAudioState();
    state = registerSound(state, "test", 1.0, 2.0);
    assert.equal(isSoundPlaying(state, "test", 4.0), false);
  });

  it("returns false for unregistered sound", () => {
    assert.equal(isSoundPlaying(createAudioState(), "missing", 1.0), false);
  });

  it("returns true at exact start time", () => {
    let state = createAudioState();
    state = registerSound(state, "test", 1.0, 2.0);
    assert.equal(isSoundPlaying(state, "test", 2.0), true);
  });

  it("returns false at exact end time", () => {
    let state = createAudioState();
    state = registerSound(state, "test", 1.0, 2.0);
    assert.equal(isSoundPlaying(state, "test", 3.0), false);
  });
});

describe("getFootstepParams", () => {
  it("returns noise_burst with required fields", () => {
    const params = getFootstepParams(false);
    assert.equal(params.type, "noise_burst");
    assert.equal(typeof params.bandpassFreq, "number");
    assert.equal(typeof params.bandpassQ, "number");
    assert.equal(typeof params.gain, "number");
    assert.equal(typeof params.duration, "number");
    assert.equal(typeof params.decay, "number");
  });

  it("sprinting has shorter duration", () => {
    const walking = getFootstepParams(false);
    const sprinting = getFootstepParams(true);
    assert.ok(sprinting.duration < walking.duration);
  });
});

describe("getClimbingGrabParams", () => {
  it("returns filtered_click with key fields", () => {
    const params = getClimbingGrabParams();
    assert.equal(params.type, "filtered_click");
    assert.equal(params.duration, 0.06);
    assert.equal(typeof params.highpassFreq, "number");
    assert.equal(typeof params.resonance, "number");
    assert.equal(typeof params.gain, "number");
  });
});

describe("getHeartbeatParams", () => {
  it("returns pulse with required fields", () => {
    const params = getHeartbeatParams();
    assert.equal(params.type, "pulse");
    assert.equal(params.frequency, 40);
    assert.equal(params.duration, 0.15);
    assert.equal(typeof params.attack, "number");
    assert.equal(typeof params.decay, "number");
    assert.equal(typeof params.gain, "number");
  });

  it("gain matches config", () => {
    assert.equal(getHeartbeatParams().gain, AUDIO_CONFIG.staminaLowVolume);
  });
});

describe("shouldPlayHeartbeat", () => {
  it("returns false when stamina is above threshold", () => {
    const state = createAudioState();
    assert.equal(shouldPlayHeartbeat(state, 0.5, 1.0, 0.1), false);
  });

  it("returns false when stamina is exactly at threshold", () => {
    const state = createAudioState();
    assert.equal(shouldPlayHeartbeat(state, AUDIO_CONFIG.lowStaminaThreshold, 1.0, 0.1), false);
  });

  it("returns true on first call below threshold", () => {
    const state = createAudioState();
    assert.equal(shouldPlayHeartbeat(state, 0.2, 1.0, 0.1), true);
  });

  it("returns false when called again before interval", () => {
    let state = createAudioState();
    state = shouldPlayHeartbeat(state, 0.2, 1.0, 0.1)
      ? { ...state, lastHeartbeatTime: 1.0 }
      : state;
    assert.equal(shouldPlayHeartbeat(state, 0.2, 1.1, 0.1), false);
  });

  it("returns true after interval elapses", () => {
    let state = { ...createAudioState(), lastHeartbeatTime: 0 };
    state = shouldPlayHeartbeat(state, 0.2, 1.0, 0.1)
      ? { ...state, lastHeartbeatTime: 1.0 }
      : state;
    const result = shouldPlayHeartbeat(state, 0.2, 2.0, 0.1);
    assert.equal(result, true);
  });

  it("beats faster when stamina is lower", () => {
    let lowState = createAudioState();
    let midState = createAudioState();
    lowState = shouldPlayHeartbeat(lowState, 0.05, 0, 0.1)
      ? { ...lowState, lastHeartbeatTime: 0 }
      : lowState;
    midState = shouldPlayHeartbeat(midState, 0.2, 0, 0.1)
      ? { ...midState, lastHeartbeatTime: 0 }
      : midState;
    assert.equal(shouldPlayHeartbeat(lowState, 0.05, 0.5, 0.1), true);
    assert.equal(shouldPlayHeartbeat(midState, 0.2, 0.5, 0.1), false);
  });
});

describe("getSwordSlashParams", () => {
  it("returns metallic_resonance with required fields", () => {
    const params = getSwordSlashParams(false);
    assert.equal(params.type, "metallic_resonance");
    assert.equal(typeof params.frequency, "number");
    assert.equal(typeof params.gain, "number");
    assert.equal(typeof params.duration, "number");
    assert.equal(typeof params.decay, "number");
    assert.equal(typeof params.noiseMix, "number");
  });

  it("charged slash has longer duration", () => {
    assert.ok(getSwordSlashParams(true).duration > getSwordSlashParams(false).duration);
  });
});

describe("getColossusImpactParams", () => {
  it("returns type low_freq_boom", () => {
    assert.equal(getColossusImpactParams(0).type, "low_freq_boom");
  });

  it("volume decreases with distance", () => {
    const close = getColossusImpactParams(10);
    const far = getColossusImpactParams(50);
    assert.ok(close.gain > far.gain);
  });
});

describe("getWeakPointHitParams", () => {
  it("returns resonant_ding with required fields", () => {
    const params = getWeakPointHitParams(false);
    assert.equal(params.type, "resonant_ding");
    assert.equal(typeof params.frequency, "number");
    assert.equal(typeof params.gain, "number");
    assert.equal(typeof params.duration, "number");
    assert.equal(typeof params.reverbMix, "number");
  });

  it("destroyed has longer duration", () => {
    assert.ok(getWeakPointHitParams(true).duration > getWeakPointHitParams(false).duration);
  });
});

describe("getColossusDeathParams", () => {
  it("returns evolving_drone with required fields", () => {
    const params = getColossusDeathParams(0.5);
    assert.equal(params.type, "evolving_drone");
    assert.equal(typeof params.baseFrequency, "number");
    assert.equal(typeof params.gain, "number");
    assert.equal(typeof params.filterFreq, "number");
    assert.equal(typeof params.noiseAmount, "number");
    assert.equal(typeof params.duration, "number");
  });

  it("gain decreases as phase increases", () => {
    const start = getColossusDeathParams(0);
    const end = getColossusDeathParams(1);
    assert.ok(start.gain > end.gain);
  });
});

describe("getAmbientWindParams", () => {
  it("returns filtered_noise with required fields", () => {
    const params = getAmbientWindParams(0.5);
    assert.equal(params.type, "filtered_noise");
    assert.equal(params.duration, Infinity);
    assert.equal(typeof params.gain, "number");
    assert.equal(typeof params.lowpassFreq, "number");
    assert.equal(typeof params.lfoFreq, "number");
  });

  it("gain increases with wind strength", () => {
    const calm = getAmbientWindParams(0.1);
    const strong = getAmbientWindParams(0.9);
    assert.ok(strong.gain > calm.gain);
  });
});

describe("shouldPlayFootstep", () => {
  it("returns false when not moving", () => {
    assert.equal(shouldPlayFootstep(createAudioState(), false, false, 1.0), false);
  });

  it("returns true on first step while moving", () => {
    assert.equal(shouldPlayFootstep(createAudioState(), true, false, 1.0), true);
  });

  it("returns false before cooldown elapses", () => {
    let state = createAudioState();
    state = shouldPlayFootstep(state, true, false, 1.0)
      ? { ...state, lastFootstepTime: 1.0 }
      : state;
    assert.equal(shouldPlayFootstep(state, true, false, 1.1), false);
  });

  it("sprinting has shorter cooldown", () => {
    let walkState = createAudioState();
    let sprintState = createAudioState();
    walkState = shouldPlayFootstep(walkState, true, false, 0)
      ? { ...walkState, lastFootstepTime: 0 }
      : walkState;
    sprintState = shouldPlayFootstep(sprintState, true, true, 0)
      ? { ...sprintState, lastFootstepTime: 0 }
      : sprintState;
    assert.equal(shouldPlayFootstep(sprintState, true, true, 0.1), true);
    assert.equal(shouldPlayFootstep(walkState, true, false, 0.1), false);
  });

  it("returns true after walking cooldown", () => {
    let state = createAudioState();
    state = shouldPlayFootstep(state, true, false, 0) ? { ...state, lastFootstepTime: 0 } : state;
    assert.equal(shouldPlayFootstep(state, true, false, 0.2), true);
  });
});
