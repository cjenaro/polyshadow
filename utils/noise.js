const PERM = new Uint8Array(512);
const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1]
];
const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

function seedPermutation(seed) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  let s = seed | 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }

  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function dot2(g, x, y) {
  return g[0] * x + g[1] * y;
}

function dot3(g, x, y, z) {
  return g[0] * x + g[1] * y + g[2] * z;
}

seedPermutation(42);

export function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[X] + Y] % 8;
  const ab = PERM[PERM[X] + Y + 1] % 8;
  const ba = PERM[PERM[X + 1] + Y] % 8;
  const bb = PERM[PERM[X + 1] + Y + 1] % 8;

  const x1 = lerp(dot2(GRAD2[aa], xf, yf), dot2(GRAD2[ba], xf - 1, yf), u);
  const x2 = lerp(dot2(GRAD2[ab], xf, yf - 1), dot2(GRAD2[bb], xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

export function noise3D(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const zf = z - Math.floor(z);
  const u = fade(xf);
  const v = fade(yf);
  const w = fade(zf);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  const g = GRAD3;
  const aaa = PERM[AA] % 12;
  const baa = PERM[BA] % 12;
  const aba = PERM[AB] % 12;
  const bba = PERM[BB] % 12;
  const aab = PERM[AA + 1] % 12;
  const bab = PERM[BA + 1] % 12;
  const abb = PERM[AB + 1] % 12;
  const bbb = PERM[BB + 1] % 12;

  const x1 = lerp(dot3(g[aaa], xf, yf, zf), dot3(g[baa], xf - 1, yf, zf), u);
  const x2 = lerp(dot3(g[aba], xf, yf - 1, zf), dot3(g[bba], xf - 1, yf - 1, zf), u);
  const x3 = lerp(dot3(g[aab], xf, yf, zf - 1), dot3(g[bab], xf - 1, yf, zf - 1), u);
  const x4 = lerp(dot3(g[abb], xf, yf - 1, zf - 1), dot3(g[bbb], xf - 1, yf - 1, zf - 1), u);

  const y1 = lerp(x1, x2, v);
  const y2 = lerp(x3, x4, v);

  return lerp(y1, y2, w);
}

function lerp(a, b, t) {
  return a + t * (b - a);
}

export function fbm2D(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxAmp;
}

export function fbm3D(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
    maxAmp += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / maxAmp;
}
