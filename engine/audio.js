import { clamp, lerp } from "../utils/math.js";

export const AUDIO_CONFIG = {
  masterVolume: 0.7,
  ambientWindVolume: 0.3,
  footstepVolume: 0.4,
  climbingGrabVolume: 0.3,
  staminaLowVolume: 0.5,
  swordSlashVolume: 0.6,
  colossusImpactVolume: 0.8,
  weakPointHitVolume: 0.7,
  colossusDeathVolume: 0.9,
  heartbeatIntervalMin: 0.4,
  heartbeatIntervalMax: 0.8,
  lowStaminaThreshold: 0.3,
};

export function createAudioState(overrides = {}) {
  return {
    isInitialized: false,
    masterVolume: AUDIO_CONFIG.masterVolume,
    isMuted: false,
    lastFootstepTime: 0,
    lastHeartbeatTime: 0,
    activeSounds: new Map(),
    ...overrides,
  };
}

export function initAudio(audioState) {
  return { ...audioState, isInitialized: true };
}

export function setMasterVolume(audioState, volume) {
  return { ...audioState, masterVolume: clamp(volume, 0, 1) };
}

export function toggleMute(audioState) {
  return { ...audioState, isMuted: !audioState.isMuted };
}

export function getEffectiveVolume(audioState, baseVolume) {
  if (audioState.isMuted) return 0;
  return audioState.masterVolume * baseVolume;
}

export function registerSound(audioState, soundId, duration, currentTime = 0) {
  const activeSounds = new Map(audioState.activeSounds);
  activeSounds.set(soundId, { startTime: currentTime, duration });
  return { ...audioState, activeSounds };
}

export function cleanupSounds(audioState, currentTime) {
  const activeSounds = new Map();
  for (const [id, sound] of audioState.activeSounds) {
    if (currentTime < sound.startTime + sound.duration) {
      activeSounds.set(id, sound);
    }
  }
  return { ...audioState, activeSounds };
}

export function isSoundPlaying(audioState, soundId, currentTime) {
  const sound = audioState.activeSounds.get(soundId);
  if (!sound) return false;
  return currentTime >= sound.startTime && currentTime < sound.startTime + sound.duration;
}

export function getFootstepParams(isSprinting) {
  return {
    type: "noise_burst",
    duration: isSprinting ? 0.08 : 0.12,
    bandpassFreq: isSprinting ? 800 : 400,
    bandpassQ: 1.5,
    gain: AUDIO_CONFIG.footstepVolume,
    decay: 0.05,
  };
}

export function getClimbingGrabParams() {
  return {
    type: "filtered_click",
    duration: 0.06,
    highpassFreq: 2000,
    gain: AUDIO_CONFIG.climbingGrabVolume,
    resonance: 3,
  };
}

export function getHeartbeatParams() {
  return {
    type: "pulse",
    duration: 0.15,
    frequency: 40,
    gain: AUDIO_CONFIG.staminaLowVolume,
    attack: 0.01,
    decay: 0.1,
  };
}

export function shouldPlayHeartbeat(audioState, staminaRatio, currentTime, _deltaTime) {
  if (staminaRatio >= AUDIO_CONFIG.lowStaminaThreshold) return false;
  const elapsed = currentTime - audioState.lastHeartbeatTime;
  const ratio = clamp(staminaRatio / AUDIO_CONFIG.lowStaminaThreshold, 0, 1);
  const interval = lerp(
    AUDIO_CONFIG.heartbeatIntervalMin,
    AUDIO_CONFIG.heartbeatIntervalMax,
    ratio,
  );
  return elapsed >= interval;
}

export function getSwordSlashParams(isCharged) {
  return {
    type: "metallic_resonance",
    duration: isCharged ? 0.4 : 0.2,
    frequency: isCharged ? 800 : 1200,
    gain: AUDIO_CONFIG.swordSlashVolume * (isCharged ? 1.3 : 1.0),
    decay: isCharged ? 0.3 : 0.15,
    noiseMix: 0.3,
  };
}

export function getColossusImpactParams(distance) {
  return {
    type: "low_freq_boom",
    duration: 0.8,
    frequency: 30 + distance * 0.5,
    gain: AUDIO_CONFIG.colossusImpactVolume * Math.max(0, 1 - distance / 100),
    decay: 0.6,
    shake: distance < 20,
  };
}

export function getWeakPointHitParams(isDestroyed) {
  return {
    type: "resonant_ding",
    duration: isDestroyed ? 0.8 : 0.3,
    frequency: isDestroyed ? 600 : 1000,
    gain: AUDIO_CONFIG.weakPointHitVolume * (isDestroyed ? 1.2 : 1.0),
    decay: isDestroyed ? 0.6 : 0.2,
    reverbMix: isDestroyed ? 0.7 : 0.3,
  };
}

export function getColossusDeathParams(phase) {
  return {
    type: "evolving_drone",
    duration: 5,
    baseFrequency: 50 - phase * 20,
    gain: AUDIO_CONFIG.colossusDeathVolume * (1 - phase * 0.5),
    filterFreq: 200 + phase * 800,
    decay: 5,
    noiseAmount: phase * 0.5,
  };
}

export function getAmbientWindParams(windStrength) {
  return {
    type: "filtered_noise",
    duration: Infinity,
    lowpassFreq: 300 + windStrength * 700,
    gain: AUDIO_CONFIG.ambientWindVolume * windStrength,
    lfoFreq: 0.1 + windStrength * 0.3,
    lfoDepth: 0.3 + windStrength * 0.4,
  };
}

export function shouldPlayFootstep(audioState, isMoving, isSprinting, currentTime) {
  if (!isMoving) return false;
  const cooldown = isSprinting ? 0.1 : 0.15;
  return currentTime - audioState.lastFootstepTime >= cooldown;
}
