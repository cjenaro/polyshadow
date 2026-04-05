export function extractIslandColliderData(island, resolution) {
  const res = resolution ?? island.resolution;
  const side = res + 1;
  const vertexCount = side * side;
  const vertices = new Float32Array(vertexCount * 3);
  const indices = [];

  const r = island.radius * 2;
  const cx = island.center.x;
  const cz = island.center.z;

  for (let iy = 0; iy < side; iy++) {
    for (let ix = 0; ix < side; ix++) {
      const idx = iy * side + ix;
      vertices[idx * 3] = (ix / res - 0.5) * r + cx;
      vertices[idx * 3 + 1] = island.heightData[idx];
      vertices[idx * 3 + 2] = (iy / res - 0.5) * r + cz;
    }
  }

  for (let iy = 0; iy < res; iy++) {
    for (let ix = 0; ix < res; ix++) {
      const a = iy * side + ix;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { vertices, indices };
}

export function createIslandCollider(adapter, world, island, downsampleFactor) {
  const resolution = downsampleFactor
    ? Math.max(1, Math.floor(island.resolution / downsampleFactor))
    : undefined;
  const { vertices, indices } = extractIslandColliderData(island, resolution);
  return adapter.createTrimeshCollider(world, {
    vertices,
    indices,
    position: { x: 0, y: 0, z: 0 },
    userData: { entity: 'island', type: island.type },
  });
}

export function groundHeightRaycast(adapter, world, x, z, maxDistance) {
  const hit = adapter.raycast(
    world,
    { x, y: maxDistance, z },
    { x, y: -maxDistance, z }
  );
  return hit ? hit.point.y : null;
}
