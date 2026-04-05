import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const BLOOM_ENABLE_THRESHOLD = 0.05;
const LERP_SPEED = 3.0;

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, t);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function createPostProcessState() {
  return {
    bloomIntensity: 0,
    bloomThreshold: 1.0,
    vignetteAmount: 0.3,
    colorGrade: 'warm',
    warmTint: 0,
    desaturationFactor: 0,
  };
}

export function updatePostProcessState(state, config, dt) {
  const t = 1 - Math.exp(-LERP_SPEED * dt);

  const bloomIntensity = clamp01(lerp(state.bloomIntensity, config.bloomIntensity, t));
  const bloomThreshold = lerp(state.bloomThreshold, config.bloomThreshold, t);
  const vignetteAmount = clamp01(lerp(state.vignetteAmount, config.vignetteAmount, t));

  const targetColorGrade = config.colorGrade;
  const isWarm = targetColorGrade === 'warm';
  const warmTint = lerp(state.warmTint, isWarm ? 0.8 : 0.0, t);
  const desaturationFactor = lerp(state.desaturationFactor, isWarm ? 0.0 : 0.6, t);

  return {
    bloomIntensity,
    bloomThreshold,
    vignetteAmount,
    colorGrade: bloomIntensity > BLOOM_ENABLE_THRESHOLD ? 'desaturated' : targetColorGrade,
    warmTint,
    desaturationFactor,
  };
}

export function getActiveColorGrading(state) {
  return {
    type: state.colorGrade,
    warmTint: state.warmTint,
    desaturationFactor: state.desaturationFactor,
  };
}

export function shouldEnableBloom(state) {
  return state.bloomIntensity > BLOOM_ENABLE_THRESHOLD;
}

export function createBloomPipeline(rendererImpl, sceneImpl, cameraImpl) {
  const composer = new EffectComposer(rendererImpl);
  const renderPass = new RenderPass(sceneImpl, cameraImpl);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,
    0.4,
    0.85
  );
  composer.addPass(bloomPass);

  return {
    composer,
    bloomPass,
    resize(w, h) {
      composer.setSize(w, h);
    },
    update(state) {
      bloomPass.strength = state.bloomIntensity;
      bloomPass.threshold = state.bloomThreshold;
    },
    render() {
      composer.render();
    },
  };
}
