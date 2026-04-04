import { lerp, clamp } from '../utils/math.js';
import { noise2D } from '../utils/noise.js';

export function createPath({ start, end, type, seed = 42, ...rest }) {
  return {
    start,
    end,
    type,
    seed,
    segments: rest.segments ?? 20,
    maxWidth: rest.maxWidth ?? 3,
    minWidth: rest.minWidth ?? 1,
    count: rest.count ?? 4,
    stoneRadius: rest.stoneRadius ?? 2,
    strength: rest.strength ?? 3,
    width: rest.width ?? 8,
  };
}

export function generatePathPoints(path) {
  const { start, end, type, seed, segments, count } = path;
  const points = [];
  const offsetX = seed * 0.137;
  const offsetZ = seed * 0.259;

  if (type === 'stepping_stones') {
    points.push({ x: start.x, y: start.y, z: start.z });
    const stoneCount = count ?? 4;
    for (let i = 1; i <= stoneCount; i++) {
      const t = i / (stoneCount + 1);
      const baseX = lerp(start.x, end.x, t);
      const baseY = lerp(start.y, end.y, t);
      const baseZ = lerp(start.z, end.z, t);
      const nx = baseX * 0.02 + offsetX;
      const nz = baseZ * 0.02 + offsetZ;
      points.push({
        x: baseX + noise2D(nx, nz) * 3,
        y: baseY + noise2D(nx + 100, nz + 100) * 1.5,
        z: baseZ + noise2D(nx + 200, nz + 200) * 3,
      });
    }
    points.push({ x: end.x, y: end.y, z: end.z });
    return points;
  }

  const segs = segments ?? 20;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const baseX = lerp(start.x, end.x, t);
    const baseY = lerp(start.y, end.y, t);
    const baseZ = lerp(start.z, end.z, t);
    const nx = baseX * 0.02 + offsetX;
    const nz = baseZ * 0.02 + offsetZ;

    const distFromCenter = Math.abs(t - 0.5) * 2;
    const curveFactor = type === 'bridge' ? (1 - distFromCenter) : 1;

    points.push({
      x: baseX,
      y: baseY + noise2D(nx, nz) * 2 * curveFactor,
      z: baseZ + noise2D(nx + 50, nz + 50) * 4 * curveFactor,
    });
  }

  return points;
}

export function getPathSegment(points, t) {
  const ct = clamp(t, 0, 1);
  const idx = ct * (points.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const a = points[Math.min(i, points.length - 1)];
  const b = points[Math.min(i + 1, points.length - 1)];
  return {
    x: lerp(a.x, b.x, frac),
    y: lerp(a.y, b.y, frac),
    z: lerp(a.z, b.z, frac),
  };
}

export function getPathDirection(points, t) {
  const epsilon = 0.001;
  const t0 = clamp(t - epsilon, 0, 1);
  const t1 = clamp(t + epsilon, 0, 1);
  const p0 = getPathSegment(points, t0);
  const p1 = getPathSegment(points, t1);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: dx / len, y: dy / len, z: dz / len };
}

export function isOnPath(points, x, z, tolerance) {
  const steps = Math.max(points.length - 1, 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = getPathSegment(points, t);
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz <= tolerance * tolerance) return true;
  }
  return false;
}

export function getPathWidth(path, t) {
  if (path.type === 'stepping_stones') {
    return (path.stoneRadius ?? 2) * 2;
  }
  if (path.type === 'wind_glide') {
    return path.width ?? 8;
  }
  const distFromCenter = Math.abs(t - 0.5) * 2;
  return lerp(path.minWidth ?? 1, path.maxWidth ?? 3, distFromCenter);
}

export function createBridgePath(start, end, options = {}) {
  return createPath({
    start,
    end,
    type: 'bridge',
    maxWidth: options.maxWidth ?? 3,
    minWidth: options.minWidth ?? 1,
    segments: options.segments ?? 20,
    seed: options.seed ?? 42,
    ...options,
  });
}

export function createSteppingStonesPath(start, end, count, options = {}) {
  return createPath({
    start,
    end,
    type: 'stepping_stones',
    count: count ?? 4,
    stoneRadius: options.stoneRadius ?? 2,
    seed: options.seed ?? 42,
    ...options,
  });
}
