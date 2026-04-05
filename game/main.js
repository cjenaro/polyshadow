import { createRenderer, initScene, resize, createBoxMesh, createIslandMesh } from '../engine/renderer.js';
import { createSky } from '../world/sky.js';
import { InputManager } from '../engine/input.js';
import { OrbitCamera } from '../engine/camera.js';
import { updatePlayer } from '../player/movement.js';
import { PlayerCharacter } from '../player/character.js';
import { GameState } from './state.js';
import { ProgressionTracker } from './progression.js';
import { UISystem } from '../engine/ui.js';
import { createHubIsland, createArenaIsland, generateIslandGeometry, getIslandSurfaceHeight } from '../world/island.js';

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const { scene, camera } = initScene();
const handleResize = resize(renderer, camera);
const sky = createSky(scene);
const input = new InputManager(canvas);
const orbit = new OrbitCamera({ distance: 8, pitch: 0.4 });

const player = new PlayerCharacter();
const playerMesh = createBoxMesh({ width: 0.6, height: 1.2, depth: 0.6, color: 0xccaa77 });
scene.add(playerMesh);

const gameState = new GameState();
const ui = new UISystem();
const progression = new ProgressionTracker();

progression.onAllDefeated(() => {
  if (gameState.isPlaying()) {
    gameState.transition('victory');
  }
});

gameState.onTransition((from, to) => {
  if (to === 'title') {
    progression.reset();
    ui.showTitleScreen();
  }
  if (from === 'title') ui.hideTitleScreen();
  if (to === 'paused') ui.showPauseOverlay();
  if (from === 'paused') ui.hidePauseOverlay();
});

const hubIsland = generateIslandGeometry(createHubIsland());
const hubMesh = createIslandMesh(hubIsland);
hubMesh.setPosition(hubIsland.center.x, 0, hubIsland.center.z);
scene.add(hubMesh);

const arenaConfigs = [
  { type: 'sentinel', center: { x: 120, z: 0 } },
  { type: 'minotaur', center: { x: -100, z: 80 } },
  { type: 'wraith', center: { x: -60, z: -110 } },
];

const arenaIslands = arenaConfigs.map(({ type, center }) => {
  const arena = createArenaIsland(type);
  arena.center = center;
  const generated = generateIslandGeometry(arena);
  const mesh = createIslandMesh(generated);
  mesh.setPosition(center.x, 0, center.z);
  scene.add(mesh);
  return generated;
});

const allIslands = [hubIsland, ...arenaIslands];

function getGroundHeight(x, z) {
  let maxH = 0;
  for (const island of allIslands) {
    const h = getIslandSurfaceHeight(island, x, z);
    if (h > maxH) maxH = h;
  }
  return maxH;
}

ui.showTitleScreen();

document.addEventListener('keydown', (e) => {
  if (gameState.getState() === 'title') {
    gameState.transition('playing');
    return;
  }
  if (e.code === 'Escape') {
    if (gameState.getState() === 'playing') {
      gameState.transition('paused');
      input.unlockPointer();
    } else if (gameState.getState() === 'paused') {
      gameState.transition('playing');
    }
  }
});

canvas.addEventListener('click', () => {
  if (document.pointerLockElement !== canvas) {
    input.lockPointer();
  }
});

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  input.update();

  if (gameState.isPlaying()) {
    const state = input.getState();
    if (state.start) {
      if (document.pointerLockElement === canvas) {
        input.unlockPointer();
      }
    }

    const moveInput = { x: state.move.x, y: state.move.y, jump: state.jump, sprint: state.sprint };
    player.state = updatePlayer(player.state, moveInput, orbit.yaw, dt, player);

    const groundY = getGroundHeight(player.state.position.x, player.state.position.z);
    player.GROUND_Y = groundY;

    if (player.state.velocity.y <= 0 && player.state.position.y <= groundY + 0.1) {
      player.state = {
        ...player.state,
        position: { ...player.state.position, y: groundY },
        velocity: { ...player.state.velocity, y: 0 },
        isGrounded: true,
        isJumping: false,
      };
    }

    const pos = player.state.position;
    playerMesh.setPosition(pos.x, pos.y + 0.6, pos.z);

    const target = { x: pos.x, y: pos.y + 1, z: pos.z };
    const orbitResult = orbit.update(dt, state.look, target);
    camera.syncFromOrbit(orbitResult);
  }

  gameState.update(dt);
  ui.update(dt);
  sky.update(now * 0.001);
  renderer.render(scene, camera);
}

function onColossusDefeated(type) {
  progression.defeatColossus(type);
}

animate(performance.now());

export { progression, gameState, onColossusDefeated };
