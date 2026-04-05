import { createRenderer, initScene, resize, createIslandMesh } from '../engine/renderer.js';
import { createCharacterMesh } from '../player/character-mesh.js';
import { createSky } from '../world/sky.js';
import { createIntegratedInput, updateIntegratedInput, getActiveInputType, destroyIntegratedInput } from '../engine/input-integration.js';
import { OrbitCamera } from '../engine/camera.js';
import { updatePlayer } from '../player/movement.js';
import { PlayerCharacter } from '../player/character.js';
import { GameState } from './state.js';
import { ProgressionTracker } from './progression.js';
import { UISystem } from '../engine/ui.js';
import { createHubIsland, createArenaIsland, generateIslandGeometry, getIslandSurfaceHeight } from '../world/island.js';
import { createColossus, updateColossi, getColossusSurfaces, getColossusWeakPoints, damageColossus, getColossusByType } from '../colossus/integration.js';
import { setTHREE as setSentinelTHREE } from '../colossus/sentinel.js';
import { setTHREE as setWraithTHREE } from '../colossus/wraith.js';
import { setTHREE as setTitanTHREE } from '../colossus/titan.js';
import * as THREE from 'three';
import { createMockAdapter } from '../engine/physics-adapter.js';
import { createClimbingState, isPlayerClimbing, updateClimbing } from '../player/climbing-integration.js';
import { createIntegratedStamina, updateIntegratedStamina, getStaminaForUI } from '../player/stamina-integration.js';
import { createIntegratedCombat, updateIntegratedCombat, handleShakeOff, getCombatStats } from '../player/combat-integration.js';
import { createDodgeState, tryStartDodge, updateDodge, applyDodgeMovement, getDodgeStaminaCost, isDodging as isPlayerDodging } from '../player/dodge.js';
import { enterFall, updateFall, checkFall, respawn, getFreefallCameraData, FALL_CONSTANTS } from '../player/fall.js';
import { createDeathIntegration, triggerDeathSequence, updateDeathIntegration, applyDeathToMesh } from '../colossus/death-integration.js';
import {
  createEndingState, updateEndingState, getSkyConfig, getIslandPositions,
  getCreditsAlpha, shouldShowCredits, isEndingComplete,
} from './ending-sequence.js';
import { createSteppingStonesPath, generatePathPoints, isOnPath } from '../world/paths.js';
import { createDirectionIndicator, updateIndicators, isIndicatorVisible } from '../world/indicators.js';
import { MusicSystem } from '../engine/music.js';
import { createPostProcessState, updatePostProcessState, getActiveColorGrading, shouldEnableBloom, createBloomPipeline } from '../engine/post-processing.js';
import { createHUD } from '../engine/hud.js';
import { applyHealthOpacity } from '../engine/health-visual.js';
import { createTouchOverlay } from '../engine/touch-overlay.js';
import {
  createArenaTransitionManager, updateArenaTransition, getTransitionProgress,
  isTransitioning, startTransitionToArena, startTransitionToHub,
  shouldTriggerArenaEntry, shouldTriggerHubReturn,
  getArenaSpawnPoint, getHubSpawnPoint, TRANSITION_STATES,
} from './arena-transition.js';
import { createParticleSystem, updateParticleSystem, DEFAULT_BOUNDS } from '../world/particles.js';
import { createFogSystem, updateFogSystem, DEFAULT_LAYERS } from '../world/fog.js';
import {
  createWindCurrent,
  createWindCurrentSystem,
  addCurrent,
  updateCurrents,
  getWindForce,
  isInAnyCurrent,
} from '../world/wind.js';
import {
  createAudioState, initAudio, getEffectiveVolume, registerSound, cleanupSounds,
  getFootstepParams, shouldPlayFootstep,
  getClimbingGrabParams,
  getHeartbeatParams, shouldPlayHeartbeat,
  getSwordSlashParams,
  getWeakPointHitParams,
  getColossusDeathParams,
  getAmbientWindParams,
} from '../engine/audio.js';

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const { scene, camera } = initScene();
const handleResize = resize(renderer, camera);
const sky = createSky(scene);
const input = createIntegratedInput(canvas);
const touchOverlay = createTouchOverlay();
if (touchOverlay) {
  document.body.appendChild(touchOverlay.container);
}
const orbit = new OrbitCamera({ distance: 8, pitch: 0.4 });
let preFallCameraDistance = null;
let wasFalling = false;

const player = new PlayerCharacter();
const playerMesh = createCharacterMesh();
scene.add(playerMesh);

const gameState = new GameState();
const ui = new UISystem();
const progression = new ProgressionTracker();

const stamina = createIntegratedStamina();
const climbing = createClimbingState();
const combat = createIntegratedCombat();
const dodge = createDodgeState();
const music = new MusicSystem();
let audioCtx = null;
let audioState = createAudioState();
let prevClimbing = false;
let ambientWindNode = null;
let ambientWindGain = null;
let postProcess = createPostProcessState();
let bloomPipeline = null;
const hudCanvas = document.getElementById('hud-canvas');
const hud = createHUD(hudCanvas);
hud.resize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
  hud.resize(window.innerWidth, window.innerHeight);
  if (bloomPipeline) bloomPipeline.resize(window.innerWidth, window.innerHeight);
});
let endingState = null;
let arenaTransition = createArenaTransitionManager();

const physicsAdapter = createMockAdapter();
const physicsWorld = physicsAdapter.createPhysicsWorld();
const playerPhysicsBody = physicsAdapter.createBody(physicsWorld, {
  type: 'dynamic',
  shape: { type: 'capsule', radius: 0.3, height: 1.6 },
  mass: 1,
  position: player.state.position,
});
physicsAdapter.addBody(physicsWorld, playerPhysicsBody);
const physicsCtx = { adapter: physicsAdapter, world: physicsWorld, playerBody: playerPhysicsBody };

let hasTeleported = false;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioState = initAudio(audioState);
  music.init(audioCtx);
  startAmbientWind();
}

function createNoiseBuffer(duration) {
  const sampleRate = audioCtx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playProceduralSound(params) {
  if (!audioCtx || !audioState.isInitialized) return;
  const vol = getEffectiveVolume(audioState, params.gain || 1);
  if (vol <= 0) return;

  const t = audioCtx.currentTime;
  const duration = params.duration;

  switch (params.type) {
    case 'noise_burst': {
      const src = audioCtx.createBufferSource();
      src.buffer = createNoiseBuffer(duration);
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = params.bandpassFreq || 400;
      bp.Q.value = params.bandpassQ || 1;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.connect(bp).connect(g).connect(audioCtx.destination);
      src.start(t);
      src.stop(t + duration);
      break;
    }
    case 'filtered_click': {
      const src = audioCtx.createBufferSource();
      src.buffer = createNoiseBuffer(duration);
      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = params.highpassFreq || 2000;
      hp.Q.value = params.resonance || 3;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.connect(hp).connect(g).connect(audioCtx.destination);
      src.start(t);
      src.stop(t + duration);
      break;
    }
    case 'pulse': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = params.frequency || 40;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + (params.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
      break;
    }
    case 'metallic_resonance': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(params.frequency || 1200, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, (params.frequency || 1200) * 0.5), t + duration);
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = params.frequency || 1200;
      bp.Q.value = 10;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (params.decay || duration));
      osc.connect(bp).connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
      if (params.noiseMix > 0) {
        const nSrc = audioCtx.createBufferSource();
        nSrc.buffer = createNoiseBuffer(duration);
        const nG = audioCtx.createGain();
        nG.gain.setValueAtTime(vol * params.noiseMix * 0.3, t);
        nG.gain.exponentialRampToValueAtTime(0.001, t + duration);
        nSrc.connect(nG).connect(audioCtx.destination);
        nSrc.start(t);
        nSrc.stop(t + duration);
      }
      break;
    }
    case 'low_freq_boom': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(params.frequency || 30, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, (params.frequency || 30) * 0.3), t + duration);
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (params.decay || duration));
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
      break;
    }
    case 'resonant_ding': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = params.frequency || 1000;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (params.decay || 0.3));
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
      if (params.reverbMix > 0) {
        const delay = audioCtx.createDelay();
        delay.delayTime.value = 0.05;
        const dG = audioCtx.createGain();
        dG.gain.value = params.reverbMix * 0.5;
        const rOsc = audioCtx.createOscillator();
        rOsc.type = 'sine';
        rOsc.frequency.value = (params.frequency || 1000) * 1.5;
        const rG = audioCtx.createGain();
        rG.gain.setValueAtTime(vol * params.reverbMix * 0.3, t);
        rG.gain.exponentialRampToValueAtTime(0.001, t + duration);
        rOsc.connect(delay).connect(dG).connect(rG).connect(audioCtx.destination);
        rOsc.start(t);
        rOsc.stop(t + duration);
      }
      break;
    }
    case 'evolving_drone': {
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      const baseFreq = params.baseFrequency || 50;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(baseFreq * 2, t + duration);
      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = params.filterFreq || 200;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(lp).connect(g).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
      if (params.noiseAmount > 0) {
        const nSrc = audioCtx.createBufferSource();
        nSrc.buffer = createNoiseBuffer(duration);
        const nG = audioCtx.createGain();
        nG.gain.setValueAtTime(vol * params.noiseAmount * 0.2, t);
        nG.gain.setValueAtTime(vol * params.noiseAmount * 0.2, t + duration * 0.8);
        nG.gain.exponentialRampToValueAtTime(0.001, t + duration);
        nSrc.connect(nG).connect(audioCtx.destination);
        nSrc.start(t);
        nSrc.stop(t + duration);
      }
      break;
    }
    case 'filtered_noise': {
      return null;
    }
  }

  return { startTime: t, duration };
}

function startAmbientWind() {
  if (!audioCtx || ambientWindNode) return;
  const params = getAmbientWindParams(0.5);
  ambientWindNode = audioCtx.createBufferSource();
  ambientWindNode.buffer = createNoiseBuffer(2);
  ambientWindNode.loop = true;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = params.lowpassFreq;
  lp.Q.value = 1;
  ambientWindGain = audioCtx.createGain();
  ambientWindGain.gain.value = params.gain;
  ambientWindNode.connect(lp).connect(ambientWindGain).connect(audioCtx.destination);
  ambientWindNode.start();
}

function updateAmbientWind(strength) {
  if (!ambientWindGain) return;
  const params = getAmbientWindParams(strength);
  const vol = getEffectiveVolume(audioState, params.gain);
  ambientWindGain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.5);
}

progression.onAllDefeated(() => {
  if (gameState.isPlaying()) {
    gameState.transition('victory');
  }
});

function getNearestLivingColossusDist(pos) {
  let minDist = Infinity;
  for (const c of colossi) {
    if (c.aiState.isDead) continue;
    const dx = pos.x - c.aiState.position.x;
    const dz = pos.z - c.aiState.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

gameState.onTransition((from, to) => {
  if (to === 'title') {
    progression.reset();
    ui.showTitleScreen();
    music.setState('idle');
  }
  if (from === 'title') {
    ui.hideTitleScreen();
    music.setState('exploration');
  }
  if (to === 'paused') {
    ui.showPauseOverlay();
    music.pause();
  }
  if (from === 'paused') {
    ui.hidePauseOverlay();
    music.resume();
  }
  if (to === 'victory') {
    music.setState('victory');
    endingState = createEndingState();
  }
  if (to === 'title') {
    endingState = null;
    arenaTransition = createArenaTransitionManager();
    hasTeleported = false;
    const creditsEl = document.getElementById('credits-overlay');
    if (creditsEl) creditsEl.style.display = 'none';
  }
});

setSentinelTHREE(THREE);
setWraithTHREE(THREE);
setTitanTHREE(THREE);

const hubIsland = generateIslandGeometry(createHubIsland());
const hubMesh = createIslandMesh(hubIsland);
hubMesh.setPosition(hubIsland.center.x, 0, hubIsland.center.z);
scene.add(hubMesh);

const arenaConfigs = [
  { type: 'sentinel', center: { x: 120, z: 0 } },
  { type: 'titan', center: { x: -100, z: 80 } },
  { type: 'wraith', center: { x: -60, z: -110 } },
];

const arenaIslands = [];
const arenaIslandMeshes = arenaConfigs.map(({ type, center }) => {
  const arena = createArenaIsland(type);
  arena.center = center;
  const generated = generateIslandGeometry(arena);
  arenaIslands.push(generated);
  const mesh = createIslandMesh(generated);
  mesh.setPosition(center.x, 0, center.z);
  scene.add(mesh);
  return mesh;
});

const allIslands = [hubIsland, ...arenaIslands];

function buildIslandTrimesh(island) {
  const { center, radius, resolution, heightData } = island;
  const vertices = [];
  const indices = [];
  const cols = resolution + 1;
  for (let iz = 0; iz <= resolution; iz++) {
    for (let ix = 0; ix <= resolution; ix++) {
      const cix = Math.min(ix, resolution - 1);
      const ciz = Math.min(iz, resolution - 1);
      vertices.push(
        center.x + (cix - radius),
        heightData[ciz * resolution + cix] || 0,
        center.z + (ciz - radius),
      );
    }
  }
  for (let iz = 0; iz < resolution; iz++) {
    for (let ix = 0; ix < resolution; ix++) {
      const a = iz * cols + ix;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

for (const island of allIslands) {
  const trimesh = buildIslandTrimesh(island);
  physicsAdapter.createTrimeshCollider(physicsWorld, {
    position: { x: island.center.x, y: 0, z: island.center.z },
    vertices: trimesh.vertices,
    indices: trimesh.indices,
  });
}

const pathDefs = arenaConfigs.map(({ center }) =>
  createSteppingStonesPath({ x: 0, y: 0, z: 0 }, { x: center.x, y: 0, z: center.z }, 5, { stoneRadius: 2 })
);
const pathPoints = pathDefs.map(p => generatePathPoints(p));
const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x888877, flatShading: true });
const stoneGeometry = new THREE.CylinderGeometry(2, 2.2, 0.6, 8);
for (const points of pathPoints) {
  for (const p of points) {
    const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
    stone.position.set(p.x, Math.max(p.y, 0), p.z);
    scene.impl.add(stone);
  }
}

function getStoneHeight(x, z) {
  for (const points of pathPoints) {
    if (isOnPath(points, x, z, 2.5)) {
      let minY = Infinity;
      for (const p of points) {
        const dx = x - p.x;
        const dz = z - p.z;
        if (dx * dx + dz * dz <= 2.5 * 2.5) {
          minY = Math.min(minY, p.y);
        }
      }
      if (minY < Infinity) return Math.max(minY, 0);
    }
  }
  return 0;
}


const respawnPoints = [
  { position: { x: 0, y: 2, z: 0 } },
  ...arenaConfigs.map(c => ({ position: { x: c.center.x, y: 2, z: c.center.z } })),
];

const colossi = arenaConfigs.map(({ type, center }) => {
  const c = createColossus(type, { x: center.x, y: 0, z: center.z });
  c.aiState.arenaCenter = { x: center.x, z: center.z };
  scene.add(c.mesh);
  return c;
});

const colossusBodies = colossi.map(c => {
  const body = physicsAdapter.createBody(physicsWorld, {
    type: 'kinematic',
    shape: { type: 'box', halfExtents: { x: 5, y: 10, z: 5 } },
    position: { x: c.aiState.position.x, y: c.aiState.position.y + 5, z: c.aiState.position.z },
    userData: { colossusType: c.type },
  });
  physicsAdapter.addBody(physicsWorld, body);
  return body;
});

const deathIntegrations = new Map();
for (const c of colossi) {
  deathIntegrations.set(c.type, createDeathIntegration(c));
}

const directionIndicators = arenaConfigs.map(({ type, center }) =>
  createDirectionIndicator(type, { x: center.x, z: center.z })
);

const indicatorMeshes = directionIndicators.map(() => {
  const geo = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  scene.impl.add(mesh);
  return mesh;
});

function updateDirectionIndicators(playerPos) {
  const colossusPositions = colossi.map(c => ({
    id: c.type,
    x: c.aiState.arenaCenter.x,
    z: c.aiState.arenaCenter.z,
    defeated: progression.defeated.has(c.type),
  }));

  const updated = updateIndicators(directionIndicators, playerPos, colossusPositions);

  for (let i = 0; i < updated.length; i++) {
    const ind = updated[i];
    const mesh = indicatorMeshes[i];
    directionIndicators[i] = ind;

    if (!isIndicatorVisible(ind, playerPos)) {
      mesh.visible = false;
      continue;
    }

    mesh.visible = true;
    mesh.material.opacity = ind.opacity;
    mesh.position.set(
      playerPos.x + ind.direction.x * 20,
      playerPos.y + 1.5,
      playerPos.z + ind.direction.z * 20
    );
    mesh.lookAt(playerPos.x, playerPos.y + 1.5, playerPos.z);
  }
}

const PARTICLE_COUNT = 200;
const particleSystem = createParticleSystem(PARTICLE_COUNT, DEFAULT_BOUNDS);
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  size: 0.15,
  color: 0xff6622,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const particlePoints = new THREE.Points(particleGeometry, particleMaterial);
scene.impl.add(particlePoints);

const fogSystem = createFogSystem(DEFAULT_LAYERS);
const fogPlanes = fogSystem.layers.map(layer => {
  const geo = new THREE.PlaneGeometry(800, 800);
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: layer.currentDensity * 0.15,
    color: new THREE.Color(layer.color.r, layer.color.g, layer.color.b),
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = layer.height;
  mesh.rotation.x = -Math.PI / 2;
  scene.impl.add(mesh);
  return mesh;
});

let windSystem = createWindCurrentSystem();

const windCurrentConfigs = arenaConfigs.map((cfg, i) => ({
  start: { x: cfg.center.x * 0.1, y: 3, z: cfg.center.z * 0.1 },
  end: { x: cfg.center.x * 0.9, y: 5, z: cfg.center.z * 0.9 },
  strength: 5,
  width: 15,
  seed: i * 100 + 42,
  id: `arena_${i}`,
}));

for (const cfg of windCurrentConfigs) {
  const current = createWindCurrent(cfg);
  windSystem = addCurrent(windSystem, current);
}

const windCurrentVisuals = [];
for (const current of windSystem.currents) {
  const pts = current.points;
  const count = 80;
  const tArr = [];
  const spreadX = [];
  const spreadY = [];
  const spreadZ = [];
  const posArr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    tArr.push(Math.random());
    spreadX.push((Math.random() - 0.5) * current.width * 0.3);
    spreadY.push((Math.random() - 0.5) * 2);
    spreadZ.push((Math.random() - 0.5) * current.width * 0.3);
    const segIdx = Math.min(Math.floor(tArr[i] * (pts.length - 1)), pts.length - 2);
    const localT = tArr[i] * (pts.length - 1) - segIdx;
    posArr[i * 3] = pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * localT + spreadX[i];
    posArr[i * 3 + 1] = pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * localT + spreadY[i];
    posArr[i * 3 + 2] = pts[segIdx].z + (pts[segIdx + 1].z - pts[segIdx].z) * localT + spreadZ[i];
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xfff5e6,
    size: 0.3,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });
  const pointsMesh = new THREE.Points(geom, mat);
  scene.impl.add(pointsMesh);
  windCurrentVisuals.push({ geom, pts, posArr, tArr, spreadX, spreadY, spreadZ, count });
}

function getGroundHeight(x, z) {
  let maxH = 0;
  for (const island of allIslands) {
    const h = getIslandSurfaceHeight(island, x, z);
    if (h > maxH) maxH = h;
  }
  const stoneH = getStoneHeight(x, z);
  if (stoneH > maxH) maxH = stoneH;
  return maxH;
}

ui.showTitleScreen();

const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) loadingScreen.remove();

document.addEventListener('keydown', (e) => {
  ensureAudio();
  if (gameState.getState() === 'title') {
    gameState.transition('playing');
    return;
  }
  if (e.code === 'Escape') {
    if (gameState.getState() === 'playing') {
      gameState.transition('paused');
      input.keyboard.unlockPointer();
    } else if (gameState.getState() === 'paused') {
      gameState.transition('playing');
    }
  }
});

canvas.addEventListener('click', () => {
  ensureAudio();
  if (document.pointerLockElement !== canvas) {
    input.keyboard.lockPointer();
  }
});

canvas.addEventListener('touchstart', (e) => {
  ensureAudio();
  if (gameState.getState() === 'title') {
    gameState.transition('playing');
    return;
  }
});

if (touchOverlay && input.touch) {
  canvas.addEventListener('touchstart', (e) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const touch of e.changedTouches) {
      if (touch.clientX >= w * 0.4) {
        const layout = input._touchLayout || touchOverlay.getLayout();
        for (const btn of layout.buttons) {
          const dx = touch.clientX - btn.x;
          const dy = touch.clientY - btn.y;
          if (dx * dx + dy * dy <= btn.radius * btn.radius * 1.5) {
            touchOverlay.highlightButton(btn.id);
          }
        }
      }
    }
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      const layout = input._touchLayout || touchOverlay.getLayout();
      for (const btn of layout.buttons) {
        touchOverlay.unhighlightButton(btn.id);
      }
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const touch of e.changedTouches) {
      if (input.touch.joystickTouch !== null && touch.identifier === input.touch.joystickTouch) {
        const dx = touch.clientX - input.touch.joystickStart.x;
        const dy = touch.clientY - input.touch.joystickStart.y;
        const maxR = input.touch.maxJoystickRadius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const clampDist = Math.min(dist, maxR);
          touchOverlay.updateJoystickThumb(
            (dx / dist) * clampDist,
            (dy / dist) * clampDist
          );
        }
      }
    }
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    for (const touch of e.changedTouches) {
      if (input.touch.joystickTouch !== null && touch.identifier === input.touch.joystickTouch) {
        touchOverlay.resetJoystickThumb();
      }
    }
  }, { passive: true });
  canvas.addEventListener('touchcancel', (e) => {
    for (const touch of e.changedTouches) {
      if (input.touch.joystickTouch !== null && touch.identifier === input.touch.joystickTouch) {
        touchOverlay.resetJoystickThumb();
      }
    }
  }, { passive: true });
}

let prevAttack = false;
let prevDodge = false;
let prevGamepadConnected = false;
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  const inputState = updateIntegratedInput(input);

  const gamepadConnected = input.gamepad && input.gamepad.isGamepadConnected();
  if (gamepadConnected && !prevGamepadConnected) {
    ui.showGamepadHint();
  }
  if (!gamepadConnected && prevGamepadConnected) {
    ui.hideGamepadHint();
  }
  prevGamepadConnected = gamepadConnected;

  if (gameState.isPlaying()) {
    windSystem = updateCurrents(windSystem, dt);

    for (let i = 0; i < colossi.length; i++) {
      const pos = colossi[i].aiState.position || colossi[i].position;
      physicsAdapter.setPosition(physicsWorld, colossusBodies[i], pos);
    }
    physicsAdapter.setPosition(physicsWorld, playerPhysicsBody, player.state.position);
    physicsAdapter.setVelocity(physicsWorld, playerPhysicsBody, player.state.velocity);
    physicsAdapter.step(physicsWorld, dt);

    if (inputState.start) {
      if (document.pointerLockElement === canvas) {
        input.keyboard.unlockPointer();
      }
    }

    const surfaces = getColossusSurfaces(colossi);
    const weakPoints = getColossusWeakPoints(colossi);
    const playerPos = player.state.position;
    const prevClimbingThisFrame = isPlayerClimbing(climbing);

    const climbResult = updateClimbing(player.state, climbing, inputState, stamina, surfaces, dt, physicsCtx);
    player.state = climbResult.playerState;
    climbing.isClimbing = climbResult.climbingState.isClimbing;
    climbing.climbGrabTime = climbResult.climbingState.climbGrabTime;
    const isClimbing = isPlayerClimbing(climbing);

    if (isClimbing && !prevClimbing) {
      const grabParams = getClimbingGrabParams();
      playProceduralSound(grabParams);
      audioState = registerSound(audioState, 'climbGrab', grabParams.duration, now * 0.001);
    }
    prevClimbing = isClimbing;

    const staminaResult = updateIntegratedStamina(stamina, {
      isClimbing,
      isSprinting: inputState.sprint && !isClimbing,
      isGrounded: player.state.isGrounded,
      isOnRestSpot: isClimbing && !!(player.state.climbSurface?.isRestSpot),
    }, dt);
    Object.assign(stamina, staminaResult.staminaState);

    const dodgeJustPressed = inputState.dodge && !prevDodge;
    const prevDodgeState = { ...dodge };
    if (dodgeJustPressed && !isClimbing && !player.state.isFalling && player.state.isGrounded) {
      Object.assign(dodge, tryStartDodge(dodge, inputState.move, stamina));
    }
    Object.assign(dodge, updateDodge(dodge, dt));
    const dodgeCost = getDodgeStaminaCost(dodge, prevDodgeState);
    if (dodgeCost > 0) {
      Object.assign(stamina, drainStamina(stamina, dodgeCost));
    }
    prevDodge = inputState.dodge;

    if (isPlayerDodging(dodge)) {
      player.state = applyDodgeMovement(player.state, dodge, orbit.yaw, dt);
    }

    const fallCheck = checkFall(player.state, stamina);
    if (fallCheck.shouldFall && !player.state.isFalling) {
      preFallCameraDistance = orbit.distance;
      player.state = enterFall(player.state, physicsCtx);
    }
    if (player.state.isFalling) {
      player.state = updateFall(player.state, dt, FALL_CONSTANTS, physicsCtx);
    }
    if (fallCheck.shouldRespawn) {
      player.state = respawn(player.state, respawnPoints, physicsCtx);
    }

    if (!isPlayerClimbing(climbing) && !player.state.isFalling && !player.state.justRespawned && !isPlayerDodging(dodge)) {
      const moveInput = { x: inputState.move.x, y: inputState.move.y, jump: inputState.jump, sprint: inputState.sprint && !staminaResult.shouldPreventSprint };
      player.state = updatePlayer(player.state, moveInput, orbit.yaw, dt, player, physicsCtx);
    }
    if (player.state.justRespawned) {
      player.state = { ...player.state, justRespawned: false };
    }

    const windForce = getWindForce(windSystem, player.state.position);
    player.state.position.x += windForce.x * 0.1 * dt;
    player.state.position.y += windForce.y * 0.1 * dt;
    player.state.position.z += windForce.z * 0.1 * dt;

    const groundY = getGroundHeight(player.state.position.x, player.state.position.z);
    player.GROUND_Y = groundY;

    if (player.state.velocity.y <= 0 && player.state.position.y <= groundY + 0.1 && !isPlayerClimbing(climbing)) {
      player.state = {
        ...player.state,
        position: { ...player.state.position, y: groundY },
        velocity: { ...player.state.velocity, y: 0 },
        isGrounded: true,
        isJumping: false,
      };
    }

    physicsAdapter.setPosition(physicsWorld, playerPhysicsBody, player.state.position);
    physicsAdapter.setVelocity(physicsWorld, playerPhysicsBody, player.state.velocity);

    const isMoving = player.state.isGrounded && !isPlayerClimbing(climbing) &&
      (Math.abs(inputState.move.x) > 0.1 || Math.abs(inputState.move.y) > 0.1);
    const isSprinting = inputState.sprint && !staminaResult.shouldPreventSprint;
    if (shouldPlayFootstep(audioState, isMoving, isSprinting, now * 0.001)) {
      const fsParams = getFootstepParams(isSprinting);
      playProceduralSound(fsParams);
      audioState = { ...audioState, lastFootstepTime: now * 0.001 };
      audioState = registerSound(audioState, 'footstep', fsParams.duration, now * 0.001);
    }

    const staminaRatio = stamina.current / stamina.max;
    if (shouldPlayHeartbeat(audioState, staminaRatio, now * 0.001, dt)) {
      const hbParams = getHeartbeatParams();
      playProceduralSound(hbParams);
      audioState = { ...audioState, lastHeartbeatTime: now * 0.001 };
      audioState = registerSound(audioState, 'heartbeat', hbParams.duration, now * 0.001);
    }

    const attackJustPressed = inputState.attack && !prevAttack;
    if (attackJustPressed) {
      const slashParams = getSwordSlashParams(false);
      playProceduralSound(slashParams);
      audioState = registerSound(audioState, 'swordSlash', slashParams.duration, now * 0.001);
    }
    const combatResult = updateIntegratedCombat(combat, { ...inputState, attackJustPressed }, player.state.position, player.state.rotation, weakPoints, isPlayerClimbing(climbing), dt);
    prevAttack = inputState.attack;

    if (combatResult.hitResult.attacked && combatResult.hitResult.hitWeakPoint) {
      const hr = combatResult.hitResult;
      const hitParams = getWeakPointHitParams(false);
      playProceduralSound(hitParams);
      audioState = registerSound(audioState, 'weakPointHit', hitParams.duration, now * 0.001);
      for (const c of colossi) {
        const wp = c.weakPoints.find(w => w.id === hr.weakPointId);
        if (wp) {
          const dmgResult = damageColossus(colossi, c.type, hr.weakPointId, hr.damage);
          if (dmgResult.allDestroyed) {
            const deathInt = deathIntegrations.get(c.type);
            if (deathInt) triggerDeathSequence(deathInt);
            const deathParams = getColossusDeathParams(0);
            playProceduralSound(deathParams);
            audioState = registerSound(audioState, `colossusDeath_${c.type}`, deathParams.duration, now * 0.001);
          }
          break;
        }
      }
    }

    const colossusEvents = updateColossi(colossi, player.state.position, dt);
    for (const event of colossusEvents) {
      if (event.type === 'shakeOff' && isPlayerClimbing(climbing)) {
        const shakeResult = handleShakeOff(combat, stamina, dt, inputState.action);
        Object.assign(combat, shakeResult.combatState);
        Object.assign(stamina, shakeResult.staminaState);
      }
    }

    for (const [type, deathInt] of deathIntegrations) {
      if (deathInt.active) {
        const result = updateDeathIntegration(deathInt, dt);
        const entity = getColossusByType(colossi, type);
        if (entity) {
          applyDeathToMesh(deathInt, entity.mesh);
        }
        if (result.isComplete) {
          scene.remove(entity.mesh.impl);
          onColossusDefeated(type);
          if (shouldTriggerHubReturn(arenaTransition, type, progression.defeated)) {
            arenaTransition = startTransitionToHub(arenaTransition);
          }
        }
      }
    }

    for (const c of colossi) {
      const animateFn = c.type === 'sentinel' ? sentinelAnimate : c.type === 'wraith' ? wraithAnimate : titanAnimate;
      animateFn(c.mesh, now * 0.001);
    }

    if (!isTransitioning(arenaTransition) && arenaTransition.state !== TRANSITION_STATES.IN_ARENA) {
      const entryArena = shouldTriggerArenaEntry(player.state.position, arenaConfigs, progression.defeated);
      if (entryArena) {
        arenaTransition = startTransitionToArena(arenaTransition, entryArena, arenaConfigs, progression.defeated);
        hasTeleported = false;
      }
    }

    arenaTransition = updateArenaTransition(arenaTransition, dt);

    if (arenaTransition.state === TRANSITION_STATES.TELEPORTING && !hasTeleported) {
      hasTeleported = true;
      if (arenaTransition.returningToHub) {
        const spawn = getHubSpawnPoint();
        player.state = { ...player.state, position: spawn, velocity: { x: 0, y: 0, z: 0 }, isGrounded: true, isFalling: false, isJumping: false };
      } else {
        const config = arenaConfigs.find(c => c.type === arenaTransition.currentArena);
        const spawn = getArenaSpawnPoint(config.center);
        player.state = { ...player.state, position: spawn, velocity: { x: 0, y: 0, z: 0 }, isGrounded: true, isFalling: false, isJumping: false };
      }
      orbit.snapToTarget(player.state.position);
    }

    if (arenaTransition.state === TRANSITION_STATES.IN_ARENA) {
      const activeColossus = colossi.find(c => c.type === arenaTransition.currentArena);
      if (activeColossus && activeColossus.aiState.isDead) {
        arenaTransition = startTransitionToHub(arenaTransition);
        hasTeleported = false;
      }
    }

    const colossusDist = getNearestLivingColossusDist(player.state.position);
    if (colossusDist < 50) {
      music.setState('combat');
    } else {
      music.setState('exploration');
    }

    const ppConfig = ui.getPostProcessConfig(colossusDist < 50 ? 'combat' : 'exploration', colossusDist);
    postProcess = updatePostProcessState(postProcess, ppConfig, dt);
    if (shouldEnableBloom(postProcess)) {
      if (!bloomPipeline) {
        bloomPipeline = createBloomPipeline(renderer.impl, scene.impl, camera.impl);
      }
      bloomPipeline.update(postProcess);
    } else if (bloomPipeline) {
      bloomPipeline.update(postProcess);
    }
    const grading = getActiveColorGrading(postProcess);

    const baseFogDensity = 0.02;
    const fogDensity = baseFogDensity + postProcess.vignetteAmount * 0.02;
    const warmR = grading.type === 'warm' ? 0.06 + grading.warmTint * 0.04 : 0.04;
    const warmG = grading.type === 'warm' ? 0.05 + grading.warmTint * 0.02 : 0.04;
    const warmB = grading.type === 'desaturated' ? 0.1 + grading.desaturationFactor * 0.03 : 0.07;
    scene.setFog(new THREE.Color(warmR, warmG, warmB), fogDensity);

    for (const vis of windCurrentVisuals) {
      for (let i = 0; i < vis.count; i++) {
        vis.tArr[i] = (vis.tArr[i] + dt * 0.05) % 1;
        const segIdx = Math.min(Math.floor(vis.tArr[i] * (vis.pts.length - 1)), vis.pts.length - 2);
        const localT = vis.tArr[i] * (vis.pts.length - 1) - segIdx;
        vis.posArr[i * 3] = vis.pts[segIdx].x + (vis.pts[segIdx + 1].x - vis.pts[segIdx].x) * localT + vis.spreadX[i];
        vis.posArr[i * 3 + 1] = vis.pts[segIdx].y + (vis.pts[segIdx + 1].y - vis.pts[segIdx].y) * localT + vis.spreadY[i];
        vis.posArr[i * 3 + 2] = vis.pts[segIdx].z + (vis.pts[segIdx + 1].z - vis.pts[segIdx].z) * localT + vis.spreadZ[i];
      }
      vis.geom.attributes.position.needsUpdate = true;
    }

    const pos = player.state.position;
    playerMesh.setPosition(pos.x, pos.y, pos.z);

    const wind = { x: 0, z: 0, strength: 1 };
    particleSystem.particles = updateParticleSystem(particleSystem, wind, dt).particles;
    const posAttr = particleGeometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particleSystem.particles[i];
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;

    updateDirectionIndicators(pos);
    updateAmbientWind(0.3 + Math.sin(now * 0.0003) * 0.15);

    const target = { x: pos.x, y: pos.y + 1, z: pos.z };
    const fallCamData = getFreefallCameraData(player.state, FALL_CONSTANTS);
    const justExitedFall = wasFalling && !player.state.isFalling;
    if (fallCamData.lookUp) {
      orbit.setDistance(orbit.distance * fallCamData.zoom);
    } else if (justExitedFall && preFallCameraDistance !== null) {
      const lerpT = 1 - Math.exp(-5 * dt);
      orbit.setDistance(orbit.distance + (preFallCameraDistance - orbit.distance) * lerpT);
      if (Math.abs(orbit.distance - preFallCameraDistance) < 0.01) {
        orbit.setDistance(preFallCameraDistance);
        preFallCameraDistance = null;
      }
    }
    wasFalling = player.state.isFalling;
    const adjustedTarget = { x: pos.x, y: pos.y + 1 + fallCamData.offsetY, z: pos.z };
    const orbitResult = orbit.update(dt, inputState.look, adjustedTarget, {
      raycastFn: (origin, dir) => {
        const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        if (dist === 0) return null;
        const to = {
          x: origin.x + dir.x,
          y: origin.y + dir.y,
          z: origin.z + dir.z,
        };
        return physicsAdapter.raycast(physicsWorld, origin, to);
      },
    });
    camera.syncFromOrbit(orbitResult);

    audioState = cleanupSounds(audioState, now * 0.001);
  }

  const currentState = gameState.getState();
  if (endingState && (currentState === 'victory' || currentState === 'credits')) {
    const originalPositions = arenaConfigs.map(c => ({ x: c.center.x, y: 0, z: c.center.z }));
    const hubPos = { x: hubIsland.center.x, y: 0, z: hubIsland.center.z };
    endingState = updateEndingState(endingState, dt, originalPositions, hubPos);

    const skyCfg = getSkyConfig(endingState);
    if (skyCfg.cosmicTint > 0) {
      const r = 0.1 + skyCfg.goldenTint * 0.3;
      const g = 0.05 + skyCfg.goldenTint * 0.2;
      const b = 0.2 + skyCfg.cosmicTint * 0.6;
      scene.impl.background = new THREE.Color(r, g, b);
      scene.impl.fog = scene.impl.fog || new THREE.FogExp2(0xc9a84c, 0.005);
      scene.impl.fog.density = 0.005 * skyCfg.fogDensity;
    }

    const islandPositions = getIslandPositions(endingState, originalPositions, hubPos);
    for (let i = 0; i < arenaIslandMeshes.length; i++) {
      const mesh = arenaIslandMeshes[i];
      if (mesh) mesh.setPosition(islandPositions[i].x, 0, islandPositions[i].z);
    }

    const creditsEl = document.getElementById('credits-overlay');
    if (creditsEl) {
      if (shouldShowCredits(endingState)) {
        creditsEl.style.display = 'flex';
        creditsEl.style.opacity = getCreditsAlpha(endingState);
      } else {
        creditsEl.style.display = 'none';
      }
    }

    if (currentState !== 'playing') {
      const pos = player.state.position;
      playerMesh.setPosition(pos.x, pos.y, pos.z);
      const adjustedTarget = { x: pos.x, y: pos.y + 1, z: pos.z };
      const orbitResult = orbit.update(dt, inputState.look, adjustedTarget);
      camera.syncFromOrbit(orbitResult);
    }
  }

  music.update(dt);
  Object.assign(fogSystem, updateFogSystem(fogSystem, dt));
  for (let i = 0; i < fogPlanes.length; i++) {
    fogPlanes[i].material.opacity = fogSystem.layers[i].currentDensity * 0.15;
  }

  gameState.update(dt);
  ui.update(dt);
  hud.update(dt);

  if (gameState.isPlaying()) {
    const staminaForUI = getStaminaForUI(stamina);
    const isClimbingNow = isPlayerClimbing(climbing);
    const showStamina = isClimbingNow || staminaForUI.percent < 1;

    let colossusHealth = null;
    const nearestColossus = colossi.find(c => {
      const dx = player.state.position.x - c.aiState.position.x;
      const dz = player.state.position.z - c.aiState.position.z;
      return Math.sqrt(dx * dx + dz * dz) < 60 && !c.aiState.isDead;
    });
    if (nearestColossus) {
      colossusHealth = nearestColossus.aiState.health / nearestColossus.behaviorConfig.maxHealth;
      applyHealthOpacity(
        nearestColossus.mesh,
        nearestColossus.aiState.health,
        nearestColossus.behaviorConfig.maxHealth,
      );
    }

    const hudState = {
      stamina: showStamina ? staminaForUI.percent : 1,
      hints: [],
    };
    hud.draw(hudState);
  } else if (gameState.getState() === 'paused') {
    hud.draw({ stamina: 1, hints: [] });
  } else {
    hud.draw({ stamina: 1, hints: [] });
  }

  sky.update(now * 0.001);

  const transitionOverlay = document.getElementById('transition-overlay');
  if (transitionOverlay) {
    const fadeProgress = getTransitionProgress(arenaTransition);
    transitionOverlay.style.opacity = fadeProgress;
  }

  const arenaNameEl = document.getElementById('arena-name');
  if (arenaNameEl) {
    if (arenaTransition.state === TRANSITION_STATES.TELEPORTING && !arenaTransition.returningToHub) {
      const names = { sentinel: 'Stone Sentinel', titan: 'Tide Titan', wraith: 'Wind Wraith' };
      arenaNameEl.textContent = names[arenaTransition.currentArena] || '';
      arenaNameEl.style.opacity = 1;
    } else if (arenaTransition.state === TRANSITION_STATES.FADING_IN) {
      arenaNameEl.style.opacity = Math.max(0, 1 - getTransitionProgress(arenaTransition) * 2);
    } else {
      arenaNameEl.style.opacity = 0;
    }
  }

  if (bloomPipeline) {
    bloomPipeline.render();
  } else {
    renderer.render(scene, camera);
  }
}

function sentinelAnimate(mesh, time) {
  const torso = mesh.meshByPart.get('torso');
  if (torso) {
    const pulse = 1 + Math.sin(time * 1.5) * 0.015;
    torso.scale.set(pulse, pulse, pulse);
  }
}

function wraithAnimate(mesh, time) {
  const wings = [mesh.meshByPart.get('wing_left'), mesh.meshByPart.get('wing_right')];
  for (const wing of wings) {
    if (wing) wing.rotation.z = Math.sin(time * 2) * 0.3;
  }
}

function titanAnimate(mesh, time) {
  const legs = ['front_left_upper', 'front_right_upper', 'back_left_upper', 'back_right_upper'];
  for (let i = 0; i < legs.length; i++) {
    const leg = mesh.meshByPart.get(legs[i]);
    if (leg) leg.rotation.x = Math.sin(time * 0.5 + i * 1.5) * 0.05;
  }
}

function onColossusDefeated(type) {
  progression.defeatColossus(type);
}

animate(performance.now());

export { progression, gameState, onColossusDefeated };
