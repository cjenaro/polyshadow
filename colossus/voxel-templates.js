import { BlockType } from "../world/block-types.js";

export function voxelBox(width, height, depth, blockType = BlockType.STONE) {
  const voxels = [];
  const hw = Math.floor(width / 2);
  const hh = Math.floor(height / 2);
  const hd = Math.floor(depth / 2);
  const xStart = width % 2 === 1 ? -hw || 0 : -hw || 0;
  const xEnd = width % 2 === 1 ? hw : hw - 1;
  const yStart = height % 2 === 1 ? -hh || 0 : -hh || 0;
  const yEnd = height % 2 === 1 ? hh : hh - 1;
  const zStart = depth % 2 === 1 ? -hd || 0 : -hd || 0;
  const zEnd = depth % 2 === 1 ? hd : hd - 1;

  for (let y = yStart; y <= yEnd; y++) {
    for (let z = zStart; z <= zEnd; z++) {
      for (let x = xStart; x <= xEnd; x++) {
        voxels.push({ x, y, z, blockType });
      }
    }
  }
  return voxels;
}

export function voxelSphere(radius, blockType = BlockType.STONE) {
  const voxels = [];
  if (radius <= 0) return voxels;
  const r = radius;

  for (let y = -r; y <= r; y++) {
    for (let z = -r; z <= r; z++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y + z * z <= r * r) {
          voxels.push({ x, y, z, blockType });
        }
      }
    }
  }
  return voxels;
}

export function voxelCylinder(radiusTop, radiusBottom, height, blockType = BlockType.STONE) {
  const voxels = [];
  if (height <= 0) return voxels;
  const maxR = Math.max(radiusTop, radiusBottom);
  const yStart = height % 2 === 0 ? -Math.floor(height / 2) : -Math.floor(height / 2);
  const yEnd = height % 2 === 0 ? Math.floor(height / 2) - 1 : Math.floor(height / 2);
  const totalY = yEnd - yStart;

  for (let y = yStart; y <= yEnd; y++) {
    const t = totalY > 0 ? (y - yStart) / totalY : 0;
    const currentR = radiusBottom + t * (radiusTop - radiusBottom);
    const rSq = currentR * currentR;

    for (let z = -maxR; z <= maxR; z++) {
      for (let x = -maxR; x <= maxR; x++) {
        if (x * x + z * z <= rSq) {
          voxels.push({ x, y, z, blockType });
        }
      }
    }
  }
  return voxels;
}

export function voxelHollowBox(width, height, depth, thickness, blockType = BlockType.STONE) {
  const solid = voxelBox(width, height, depth, blockType);
  if (thickness * 2 >= width && thickness * 2 >= height && thickness * 2 >= depth) {
    return solid;
  }
  return solid.filter((v) => {
    const hw = Math.floor(width / 2);
    const hh = Math.floor(height / 2);
    const hd = Math.floor(depth / 2);
    const xMin = width % 2 === 0 ? -hw : -hw;
    const xMax = width % 2 === 0 ? hw - 1 : hw;
    const yMin = height % 2 === 0 ? -hh : -hh;
    const yMax = height % 2 === 0 ? hh - 1 : hh;
    const zMin = depth % 2 === 0 ? -hd : -hd;
    const zMax = depth % 2 === 0 ? hd - 1 : hd;

    const withinX = v.x >= xMin + thickness && v.x <= xMax - thickness;
    const withinY = v.y >= yMin + thickness && v.y <= yMax - thickness;
    const withinZ = v.z >= zMin + thickness && v.z <= zMax - thickness;
    return !(withinX && withinY && withinZ);
  });
}
