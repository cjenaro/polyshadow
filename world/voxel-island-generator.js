import { BlockType } from './block-types.js';
import { fbm3D } from '../utils/noise.js';

function seededRandom(seed) {
  let s = (seed | 0) || 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateVoxelIsland({ centerX, centerZ, radius, maxHeight, seed, voxelStorage, baseY = 20 }) {
  const r = Math.max(1, radius);
  const topH = Math.max(1, maxHeight * 0.65);
  const botH = Math.max(1, maxHeight * 0.45);
  const cY = baseY + botH;

  const noiseScale = 0.04;
  const noX = seed * 0.137;
  const noZ = seed * 0.259;
  const basePerturbation = 0.18;

  const minY = Math.floor(cY - botH - 4);
  const maxY = Math.ceil(cY + topH + 4);
  const minX = centerX - r - 4;
  const maxX = centerX + r + 4;
  const minZ = centerZ - r - 4;
  const maxZ = centerZ + r + 4;

  const solid = new Set();

  for (let wz = minZ; wz <= maxZ; wz++) {
    const dz = (wz - centerZ) / r;
    const dz2 = dz * dz;
    for (let wx = minX; wx <= maxX; wx++) {
      const dx = (wx - centerX) / r;
      const hd2 = dx * dx + dz2;
      if (hd2 > 1.4) continue;

      for (let wy = minY; wy <= maxY; wy++) {
        const dy = wy >= cY
          ? (wy - cY) / topH
          : (wy - cY) / botH;
        const d2 = dx * dx + dy * dy + dz2;
        if (d2 > 1.5) continue;

        const n = fbm3D(wx * noiseScale + noX, wy * noiseScale, wz * noiseScale + noZ, 3, 2, 0.5);
        const perturbation = basePerturbation * (0.5 + Math.sqrt(hd2));

        if (d2 + n * perturbation < 1.0) {
          solid.add(wx + ',' + wy + ',' + wz);
        }
      }
    }
  }

  const colTop = new Map();
  const colBot = new Map();
  for (const k of solid) {
    const c1 = k.indexOf(',');
    const c2 = k.indexOf(',', c1 + 1);
    const wx = +k.slice(0, c1);
    const wy = +k.slice(c1 + 1, c2);
    const wz = +k.slice(c2 + 1);
    const ck = wx + ',' + wz;
    const t = colTop.get(ck);
    if (t === undefined || wy > t) colTop.set(ck, wy);
    const b = colBot.get(ck);
    if (b === undefined || wy < b) colBot.set(ck, wy);
  }

  for (const k of solid) {
    const c1 = k.indexOf(',');
    const c2 = k.indexOf(',', c1 + 1);
    const wx = +k.slice(0, c1);
    const wy = +k.slice(c1 + 1, c2);
    const wz = +k.slice(c2 + 1);
    const ck = wx + ',' + wz;
    const topY = colTop.get(ck);
    const depthFromTop = topY - wy;
    const hDist = Math.sqrt(((wx - centerX) / r) ** 2 + ((wz - centerZ) / r) ** 2);

    let bt = BlockType.STONE;

    if (!solid.has(wx + ',' + (wy + 1) + ',' + wz)) {
      bt = hDist > 0.7 ? BlockType.MOSS_STONE : BlockType.GRASS;
    } else if (!solid.has(wx + ',' + (wy - 1) + ',' + wz)) {
      bt = BlockType.MOSS_STONE;
    } else if (depthFromTop >= 1 && depthFromTop <= 3 && hDist < 0.75) {
      bt = BlockType.DIRT;
    } else if (hDist > 0.5 && (
      !solid.has((wx + 1) + ',' + wy + ',' + wz) || !solid.has((wx - 1) + ',' + wy + ',' + wz) ||
      !solid.has(wx + ',' + wy + ',' + (wz + 1)) || !solid.has(wx + ',' + wy + ',' + (wz - 1))
    )) {
      bt = BlockType.MOSS_STONE;
    }

    voxelStorage.setBlock(wx, wy, wz, bt);
  }
}

export function generateVoxelSteppingStones({ fromX, fromZ, toX, toZ, seed, voxelStorage, baseY = 20 }) {
  const rng = seededRandom(seed);
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const steps = Math.max(3, Math.floor(dist / 10));

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(fromX + dx * t + (rng() - 0.5) * 4);
    const z = Math.round(fromZ + dz * t + (rng() - 0.5) * 4);
    const w = 1 + Math.floor(rng() * 2);
    const h = 1 + Math.floor(rng() * 2);

    for (let sx = -w; sx <= w; sx++) {
      for (let sz = -w; sz <= w; sz++) {
        if (Math.abs(sx) + Math.abs(sz) > w + 1) continue;
        const bt = (sx === 0 && sz === 0) ? BlockType.STONE : BlockType.MOSS_STONE;
        for (let sy = 0; sy < h; sy++) {
          if (rng() > 0.3) {
            voxelStorage.setBlock(x + sx, baseY - sy, z + sz, bt);
          }
        }
      }
    }
  }
}

export function generateVoxelRuins({ centerX, centerZ, seed, voxelStorage, count = 5, baseY = 24, radius = 20 }) {
  const rng = seededRandom(seed + 777);
  const ruins = [];
  const minDist = 5;
  const inner = Math.max(1, radius * 0.15);
  const outer = radius * 0.85;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = rng() * Math.PI * 2;
      const r = inner + rng() * (outer - inner);
      const x = centerX + Math.cos(angle) * r;
      const z = centerZ + Math.sin(angle) * r;

      let valid = true;
      for (const e of ruins) {
        if (Math.hypot(x - e.x, z - e.z) < minDist) { valid = false; break; }
      }

      if (valid) {
        const isPillar = rng() < 0.5;
        const scale = 0.5 + rng() * 1.5;
        const height = Math.max(2, Math.floor(4 * scale));
        const rx = Math.round(x), rz = Math.round(z);

        if (isPillar) {
          for (let dy = 0; dy < height; dy++) {
            voxelStorage.setBlock(rx, baseY + dy, rz, dy === height - 1 ? BlockType.CRACKED_STONE : BlockType.STONE);
          }
        } else {
          const width = 2 + Math.floor(rng() * 2);
          const isX = rng() < 0.5;
          for (let w = 0; w < width; w++) {
            for (let dy = 0; dy < height; dy++) {
              const bx = isX ? rx + w : rx;
              const bz = isX ? rz : rz + w;
              voxelStorage.setBlock(bx, baseY + dy, bz, dy === height - 1 ? BlockType.CRACKED_STONE : BlockType.STONE);
            }
          }
        }

        ruins.push({ x, z, type: isPillar ? 'pillar' : 'wall', scale });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const angle = rng() * Math.PI * 2;
      const r = inner + rng() * (outer - inner);
      ruins.push({ x: centerX + Math.cos(angle) * r, z: centerZ + Math.sin(angle) * r, type: 'rubble', scale: 0.5 });
    }
  }

  return ruins;
}
