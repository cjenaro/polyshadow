import { vec3Add, vec3Scale } from '../utils/math.js';

const VALID_TYPES = new Set(['core', 'limb_upper', 'limb_lower', 'head']);

function normalizePart(part) {
  if (!part.id || typeof part.id !== 'string') throw new Error('part.id is required');
  if (!VALID_TYPES.has(part.type)) throw new Error(`invalid part type: ${part.type}`);
  if (!part.position || typeof part.position.x !== 'number') throw new Error('part.position is required');
  if (!part.dimensions) throw new Error('part.dimensions is required');
  if (!part.rotation) throw new Error('part.rotation is required');
  return {
    ...part,
    name: part.name || part.id,
    isClimbable: part.isClimbable !== undefined ? part.isClimbable : (part.type !== 'head'),
    isWeakPoint: part.isWeakPoint || false,
    healthMultiplier: part.healthMultiplier || 1.0,
  };
}

export function createColossusBody(definition) {
  if (!definition.parts || definition.parts.length === 0) {
    throw new Error('body must have at least one part');
  }
  const parts = new Map();
  for (const partDef of definition.parts) {
    const part = normalizePart(partDef);
    parts.set(part.id, part);
  }
  return { parts };
}

export function getBodyPart(body, partId) {
  return body.parts.get(partId) || null;
}

export function getChildParts(body, parentId) {
  const children = [];
  for (const part of body.parts.values()) {
    if (part.parent === parentId) children.push(part);
  }
  return children;
}

export function getAllClimbableParts(body) {
  const result = [];
  for (const part of body.parts.values()) {
    if (part.isClimbable) result.push(part);
  }
  return result;
}

export function getWeakPoints(body) {
  const result = [];
  for (const part of body.parts.values()) {
    if (part.isWeakPoint) result.push(part);
  }
  return result;
}

export function getBodyBounds(body) {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const part of body.parts.values()) {
    const hw = part.dimensions.width / 2;
    const hh = part.dimensions.height / 2;
    const hd = part.dimensions.depth / 2;
    const px = part.position.x;
    const py = part.position.y;
    const pz = part.position.z;

    if (px - hw < minX) minX = px - hw;
    if (py - hh < minY) minY = py - hh;
    if (pz - hd < minZ) minZ = pz - hd;
    if (px + hw > maxX) maxX = px + hw;
    if (py + hh > maxY) maxY = py + hh;
    if (pz + hd > maxZ) maxZ = pz + hd;
  }

  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

export function getBodyHeight(body) {
  const bounds = getBodyBounds(body);
  return bounds.max.y - bounds.min.y;
}

export function getBodyPartWorldPosition(body, partId, colossusPosition, colossusRotation) {
  const part = body.parts.get(partId);
  if (!part) return null;

  const cosR = Math.cos(colossusRotation);
  const sinR = Math.sin(colossusRotation);
  const lx = part.position.x;
  const lz = part.position.z;

  const rx = lx * cosR - lz * sinR;
  const rz = lx * sinR + lz * cosR;

  return {
    x: colossusPosition.x + rx,
    y: colossusPosition.y + part.position.y,
    z: colossusPosition.z + rz,
  };
}

export function findNearestWeakPoint(playerPosition, weakPoints, maxDistance) {
  let nearest = null;
  let nearestDist = maxDistance;

  for (const wp of weakPoints) {
    if (!wp.isActive || wp.isDestroyed) continue;
    const dx = playerPosition.x - wp.position.x;
    const dy = playerPosition.y - wp.position.y;
    const dz = playerPosition.z - wp.position.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = wp;
    }
  }

  return nearest;
}

export function isNearWeakPoint(playerPosition, weakPoints, radius) {
  const nearest = findNearestWeakPoint(playerPosition, weakPoints, radius);
  if (!nearest) {
    return { near: false, weakPointId: null };
  }
  return { near: true, weakPointId: nearest.id };
}
