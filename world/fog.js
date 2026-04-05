import { clamp, smoothstep } from "../utils/math.js";
import { noise2D } from "../utils/noise.js";

export const DEFAULT_LAYERS = [
  {
    height: 15,
    thickness: 4,
    density: 0.6,
    color: { r: 0.79, g: 0.66, b: 0.3 },
    driftSpeed: 0.3,
    driftOffset: 0,
    currentDensity: 0.6,
  },
  {
    height: 30,
    thickness: 6,
    density: 0.4,
    color: { r: 0.6, g: 0.55, b: 0.35 },
    driftSpeed: 0.15,
    driftOffset: 0,
    currentDensity: 0.4,
  },
  {
    height: 50,
    thickness: 8,
    density: 0.3,
    color: { r: 0.5, g: 0.5, b: 0.4 },
    driftSpeed: 0.08,
    driftOffset: 0,
    currentDensity: 0.3,
  },
];

export function createFogSystem(layers = DEFAULT_LAYERS) {
  return {
    layers: layers.map((l) => ({
      ...l,
      currentDensity: l.currentDensity != null ? l.currentDensity : l.density,
    })),
    time: 0,
  };
}

export function updateFogSystem(system, dt) {
  return {
    time: system.time + dt,
    layers: system.layers.map((layer) => {
      const pulse = noise2D(system.time * 0.2 + layer.driftOffset, layer.height * 0.1);
      const newDensity = clamp(layer.density * (0.7 + 0.3 * pulse), 0, layer.density);
      return {
        ...layer,
        currentDensity: newDensity,
        driftOffset: layer.driftOffset + layer.driftSpeed * dt,
      };
    }),
  };
}

export function calculateFogDensity(system, height) {
  if (system.layers.length === 0) return 0;

  let total = 0;
  for (const layer of system.layers) {
    const halfThick = layer.thickness / 2;
    const edgeIn = smoothstep(layer.height - halfThick, layer.height, height);
    const edgeOut = smoothstep(layer.height, layer.height + halfThick, height);
    const bell = edgeIn * (1 - edgeOut);
    total += bell * layer.currentDensity;
  }

  return clamp(total, 0, 1);
}
