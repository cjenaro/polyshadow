import { fbm2D } from "./noise.js";

export function generateNormalMapData(width, height, scale, seed, strength = 2.0) {
  const data = new Uint8ClampedArray(width * height * 4);
  const offsetX = seed * 0.137;
  const offsetY = seed * 0.259;

  const heights = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[y * width + x] = fbm2D(x * scale + offsetX, y * scale + offsetY, 4, 2, 0.5);
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const left = x > 0 ? heights[idx - 1] : heights[idx];
      const right = x < width - 1 ? heights[idx + 1] : heights[idx];
      const up = y > 0 ? heights[idx - width] : heights[idx];
      const down = y < height - 1 ? heights[idx + width] : heights[idx];

      const nX = -(left - right) * strength;
      const nY = -(up - down) * strength;
      const nZ = 1;

      const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ);

      const pi = idx * 4;
      data[pi] = Math.round(((nX / len) * 0.5 + 0.5) * 255);
      data[pi + 1] = Math.round(((nY / len) * 0.5 + 0.5) * 255);
      data[pi + 2] = Math.round(((nZ / len) * 0.5 + 0.5) * 255);
      data[pi + 3] = 255;
    }
  }

  return { data, width, height };
}
