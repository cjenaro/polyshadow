import { fbm2D } from "./noise.js";

function seededRandom(seed) {
  let s = seed | 0 || 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateHeightMap(width, height, scale, seed) {
  const map = new Float32Array(width * height);
  const offsetX = seed * 0.137;
  const offsetY = seed * 0.259;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x * scale + offsetX;
      const ny = y * scale + offsetY;
      const val = fbm2D(nx, ny, 4, 2, 0.5);
      map[y * width + x] = val;
    }
  }

  return map;
}

export function generateIslandShape(radius, heightScale, seed) {
  const side = radius * 2;
  const size = side * side;
  const heights = new Float32Array(size);
  const center = radius;
  const offsetX = seed * 0.137 + 0.5;
  const offsetY = seed * 0.259 + 0.5;

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / radius;

      const noiseVal = fbm2D(x * 0.05 + offsetX, y * 0.05 + offsetY, 4, 2, 0.5);

      let falloff = 1 - normalizedDist;
      falloff = falloff * falloff;

      if (normalizedDist > 1) falloff = 0;

      const h = (noiseVal * 0.5 + 0.5) * falloff * heightScale;
      heights[y * side + x] = h;
    }
  }

  return { heights, size, side, radius };
}

export function generateGrassPatches(islandHeightMap, density, seed) {
  const { heights, side } = islandHeightMap;
  const grass = [];
  const rng = seededRandom(seed);

  for (let i = 0; i < density; i++) {
    const gx = Math.floor(rng() * side);
    const gz = Math.floor(rng() * side);

    const h = heights[gz * side + gx];
    if (h <= 0.05) continue;

    let gradX = 0;
    let gradZ = 0;
    if (gx > 0 && gx < side - 1) {
      gradX = Math.abs(heights[gz * side + gx + 1] - heights[gz * side + gx - 1]) * 0.5;
    }
    if (gz > 0 && gz < side - 1) {
      gradZ = Math.abs(heights[(gz + 1) * side + gx] - heights[(gz - 1) * side + gx]) * 0.5;
    }

    const maxGrad = Math.max(gradX, gradZ);
    if (maxGrad > 0.3) continue;

    grass.push({
      x: gx,
      y: h,
      z: gz,
      scale: 0.5 + rng() * 1.5,
    });
  }

  return grass;
}
