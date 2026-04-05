export function buildIslandVertexColors(heightData, resolution, maxHeight) {
  const vertCount = (resolution + 1) * (resolution + 1);
  const colors = new Float32Array(vertCount * 3);

  const dirtR = 0.36,
    dirtG = 0.25,
    dirtB = 0.13;
  const grassR = 0.22,
    grassG = 0.55,
    grassB = 0.15;
  const stoneR = 0.55,
    stoneG = 0.52,
    stoneB = 0.48;

  const grassThreshold = maxHeight * 0.15;
  const stoneThreshold = maxHeight * 0.7;

  for (let i = 0; i < vertCount; i++) {
    const h = i < heightData.length ? heightData[i] : 0;
    const idx = i * 3;

    if (h <= grassThreshold) {
      const t = grassThreshold > 0 ? h / grassThreshold : 0;
      colors[idx] = dirtR + (grassR - dirtR) * t;
      colors[idx + 1] = dirtG + (grassG - dirtG) * t;
      colors[idx + 2] = dirtB + (grassB - dirtB) * t;
    } else if (h <= stoneThreshold) {
      const t = (h - grassThreshold) / (stoneThreshold - grassThreshold);
      colors[idx] = grassR + (stoneR - grassR) * t;
      colors[idx + 1] = grassG + (stoneG - grassG) * t;
      colors[idx + 2] = grassB + (stoneB - stoneB) * t;
    } else {
      const t = Math.min(1, (h - stoneThreshold) / (maxHeight - stoneThreshold || 1));
      colors[idx] = stoneR + (0.7 - stoneR) * t;
      colors[idx + 1] = stoneG + (0.7 - stoneG) * t;
      colors[idx + 2] = stoneB + (0.68 - stoneB) * t;
    }
  }

  return colors;
}

export function buildIslandGeometryData(island) {
  const { heightData, resolution, radius } = island;
  const vertCount = (resolution + 1) * (resolution + 1);
  const positions = new Float32Array(vertCount * 3);
  const step = (radius * 2) / resolution;

  for (let z = 0; z <= resolution; z++) {
    for (let x = 0; x <= resolution; x++) {
      const i = z * (resolution + 1) + x;
      positions[i * 3] = x * step - radius;
      positions[i * 3 + 1] = i < heightData.length ? heightData[i] : 0;
      positions[i * 3 + 2] = z * step - radius;
    }
  }

  const colors = buildIslandVertexColors(heightData, resolution, island.maxHeight);

  return { positions, colors, vertCount };
}
