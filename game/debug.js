import * as THREE from "three";
import { RUNTIME_CONFIG } from "./config.js";

let debugOverlay = null;
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 60;
let fpsUpdateInterval = 500;
let lastFpsUpdate = 0;

export function createDebugOverlay() {
  const container = document.createElement("div");
  container.id = "debug-overlay";
  container.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    color: #0f0;
    font-family: monospace;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 1px 1px 1px #000;
    display: none;
  `;
  container.innerHTML = `
    <div id="debug-fps">FPS: 0</div>
    <div id="debug-physics" style="display:none">Physics: 0ms</div>
    <div id="debug-render" style="display:none">Render: 0ms</div>
    <div id="debug-position" style="display:none">Pos: 0, 0, 0</div>
    <div id="debug-velocity" style="display:none">Vel: 0, 0, 0</div>
  `;
  document.body.appendChild(container);
  debugOverlay = container;
  return container;
}

export function updateDebugOverlay(dt) {
  if (!debugOverlay) return;
  if (!RUNTIME_CONFIG.debug.showFPS) {
    debugOverlay.style.display = "none";
    return;
  }

  debugOverlay.style.display = "block";
  const now = performance.now();
  frameCount++;

  if (now - lastFpsUpdate > fpsUpdateInterval) {
    fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  const fpsEl = document.getElementById("debug-fps");
  if (fpsEl) fpsEl.textContent = `FPS: ${fps}`;
}

export function setDebugPosition(x, y, z) {
  if (!debugOverlay || !RUNTIME_CONFIG.debug.showFPS) return;
  const posEl = document.getElementById("debug-position");
  if (posEl) posEl.textContent = `Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
}

export function setDebugVelocity(vx, vy, vz) {
  if (!debugOverlay || !RUNTIME_CONFIG.debug.showFPS) return;
  const velEl = document.getElementById("debug-velocity");
  if (velEl) velEl.textContent = `Vel: ${vx.toFixed(1)}, ${vy.toFixed(1)}, ${vz.toFixed(1)}`;
}

let debugHelpers = {
  collisionLines: [],
  pathLines: [],
};

export function clearDebugHelpers() {
  for (const line of debugHelpers.collisionLines) {
    if (line.parent) line.parent.remove(line);
  }
  for (const line of debugHelpers.pathLines) {
    if (line.parent) line.parent.remove(line);
  }
  debugHelpers.collisionLines = [];
  debugHelpers.pathLines = [];
}

export function createDebugHelpers(scene) {
  return debugHelpers;
}

export function showCollisionBox(scene, position, size, color = 0xff0000) {
  if (!RUNTIME_CONFIG.debug.showCollision) return;
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(position.x, position.y, position.z);
  scene.impl.add(mesh);
  debugHelpers.collisionLines.push(mesh);
}

export function isDebugMode() {
  return RUNTIME_CONFIG.debug.showFPS || RUNTIME_CONFIG.debug.showCollision || RUNTIME_CONFIG.debug.showPaths;
}