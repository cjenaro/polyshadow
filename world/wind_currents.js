import { lerp, clamp } from '../utils/math.js';
import { noise2D } from '../utils/noise.js';

export function createWindCurrent({
  start,
  end,
  strength = 5,
  width = 10,
  seed = 42,
  id = null,
  pulseSpeed = 1.5,
  pulseAmplitude = 0.2,
} = {}) {
  return {
    id,
    start,
    end,
    strength,
    width,
    seed,
    phase: 0,
    time: 0,
    active: true,
    pulseSpeed,
    pulseAmplitude,
    points: null,
  };
}

export function generateWindCurrentPath(current) {
  const { start, end, seed } = current;
  const segments = 20;
  const points = [];
  const offsetX = seed * 0.137 + 500;
  const offsetZ = seed * 0.259 + 500;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const baseX = lerp(start.x, end.x, t);
    const baseY = lerp(start.y, end.y, t);
    const baseZ = lerp(start.z, end.z, t);
    const nx = baseX * 0.02 + offsetX;
    const nz = baseZ * 0.02 + offsetZ;
    const distFromCenter = Math.abs(t - 0.5) * 2;
    const curveFactor = 1 - distFromCenter;
    points.push({
      x: baseX + noise2D(nx, nz) * 3 * curveFactor,
      y: baseY + noise2D(nx + 100, nz + 100) * 4 * curveFactor,
      z: baseZ + noise2D(nx + 200, nz + 200) * 3 * curveFactor,
    });
  }
  return points;
}

function findClosestPointOnPath(points, position) {
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < points.length; i++) {
    const dx = position.x - points[i].x;
    const dy = position.y - points[i].y;
    const dz = position.z - points[i].z;
    const dist = dx * dx + dy * dy + dz * dz;
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }
  return { distance: Math.sqrt(minDist), index: closestIdx };
}

export function isInWindCurrent(current, position) {
  if (!current.active) return false;
  const points = current.points;
  if (!points || points.length === 0) return false;
  const { distance } = findClosestPointOnPath(points, position);
  return distance <= current.width / 2;
}

export function getWindForce(current, position) {
  if (!isInWindCurrent(current, position)) {
    return { x: 0, y: 0, z: 0 };
  }
  const points = current.points;
  if (!points || points.length < 2) return { x: 0, y: 0, z: 0 };
  const { index } = findClosestPointOnPath(points, position);
  const nextIdx = Math.min(index + 1, points.length - 1);
  const dx = points[nextIdx].x - points[index].x;
  const dy = points[nextIdx].y - points[index].y;
  const dz = points[nextIdx].z - points[index].z;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len === 0) return { x: 0, y: 0, z: 0 };

  const pulseFactor = 1 + Math.sin(current.phase) * current.pulseAmplitude;
  const effectiveStrength = current.strength * pulseFactor;
  const distanceFromCenter = findClosestPointOnPath(points, position).distance;
  const halfWidth = current.width / 2;
  const centerFactor = 1 - (distanceFromCenter / halfWidth) * 0.3;

  return {
    x: (dx / len) * effectiveStrength * centerFactor,
    y: (dy / len) * effectiveStrength * centerFactor,
    z: (dz / len) * effectiveStrength * centerFactor,
  };
}

export function updateWindCurrent(current, dt) {
  const newTime = current.time + dt;
  const newPhase = (current.phase + dt * current.pulseSpeed) % (Math.PI * 2);
  return {
    ...current,
    time: newTime,
    phase: newPhase,
  };
}

function attachMethods(system) {
  system.addCurrent = (current) => attachMethods(addCurrent(system, current));
  system.removeCurrent = (id) => attachMethods(removeCurrent(system, id));
  system.update = (dt) => attachMethods(updateSystem(system, dt));
  system.getForceAt = (position) => getForceAt(system, position);
  return system;
}

function addCurrent(system, current) {
  return { currents: [...system.currents, current] };
}

function removeCurrent(system, id) {
  return { currents: system.currents.filter(c => c.id !== id) };
}

function updateSystem(system, dt) {
  return { currents: system.currents.map(c => updateWindCurrent(c, dt)) };
}

function getForceAt(system, position) {
  let totalForce = { x: 0, y: 0, z: 0 };
  for (const current of system.currents) {
    const pts = current.points ?? generateWindCurrentPath(current);
    const force = getWindForce({ ...current, points: pts }, position);
    totalForce = {
      x: totalForce.x + force.x,
      y: totalForce.y + force.y,
      z: totalForce.z + force.z,
    };
  }
  return totalForce;
}

export function createWindCurrentSystem() {
  return attachMethods({ currents: [] });
}
