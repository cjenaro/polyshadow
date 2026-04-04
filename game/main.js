import { createRenderer, initScene, resize, createBoxMesh } from '../engine/renderer.js';
import { createSky } from '../world/sky.js';
import { InputManager } from '../engine/input.js';
import { OrbitCamera } from '../engine/camera.js';
import { updatePlayer, PlayerCharacter } from '../player/movement.js';

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

  const state = input.getState();
  if (state.start) {
    if (document.pointerLockElement === canvas) {
      input.unlockPointer();
    }
  }

  const moveInput = { x: state.move.x, y: state.move.y, jump: state.jump, sprint: state.sprint };
  player.state = updatePlayer(player.state, moveInput, orbit.yaw, dt, player);

  const pos = player.state.position;
  playerMesh.setPosition(pos.x, pos.y + 0.6, pos.z);

  const target = { x: pos.x, y: pos.y + 1, z: pos.z };
  const orbitResult = orbit.update(dt, state.look, target);
  camera.syncFromOrbit(orbitResult);

  sky.update(now * 0.001);
  renderer.render(scene, camera);
}

animate(performance.now());
