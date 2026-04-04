import { createRenderer, initScene, resize } from '../engine/renderer.js';
import { createSky } from '../world/sky.js';

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const { scene, camera } = initScene();
const handleResize = resize(renderer, camera);
const sky = createSky(scene);

function animate() {
  requestAnimationFrame(animate);
  sky.update(performance.now() * 0.001);
  renderer.render(scene, camera);
}

animate();
