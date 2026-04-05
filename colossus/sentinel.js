import { vec3Add, vec3Scale } from '../utils/math.js';
import { createColossusBody, getBodyPartWorldPosition, getWeakPoints } from './base.js';
import { generateNormalMapData } from '../utils/normal-map.js';

export const STONE_SENTINEL_SCALE = 20;

export function createSentinelDefinition() {
  const S = STONE_SENTINEL_SCALE;
  const torsoH = S * 0.35;
  const torsoW = S * 0.55;
  const torsoD = S * 0.5;
  const torsoY = S * 0.55;

  const headSize = S * 0.15;
  const headY = torsoY + torsoH / 2 + headSize / 2;

  const upperLegH = S * 0.25;
  const lowerLegH = S * 0.2;
  const legW = S * 0.12;

  const legUpperY = torsoY - torsoH / 2 - upperLegH / 2;
  const legLowerY = legUpperY - upperLegH / 2 - lowerLegH / 2;

  const legSpreadX = torsoW / 2 + legW * 0.5;
  const frontZ = torsoD / 2 - legW;
  const backZ = -torsoD / 2 + legW;

  const parts = [
    {
      id: 'torso', name: 'Torso', type: 'core',
      position: { x: 0, y: torsoY, z: 0 },
      dimensions: { width: torsoW, height: torsoH, depth: torsoD },
      rotation: { x: 0, y: 0, z: 0 },
      parent: null, isClimbable: true, isWeakPoint: false, isRestSpot: true, healthMultiplier: 1.0,
    },
    {
      id: 'hips', name: 'Hips', type: 'core',
      position: { x: 0, y: torsoY - torsoH * 0.3, z: -torsoD * 0.1 },
      dimensions: { width: torsoW * 0.8, height: torsoH * 0.4, depth: torsoD * 0.7 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, isRestSpot: true, healthMultiplier: 1.0,
    },
    {
      id: 'head', name: 'Head', type: 'head',
      position: { x: 0, y: headY, z: torsoD * 0.25 },
      dimensions: { width: headSize, height: headSize, depth: headSize * 1.2 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: false, isWeakPoint: true, healthMultiplier: 3.0,
    },
    {
      id: 'back_rune_left', name: 'Back Rune Left', type: 'core',
      position: { x: -torsoW * 0.2, y: torsoY + torsoH * 0.15, z: -torsoD / 2 },
      dimensions: { width: torsoW * 0.2, height: torsoH * 0.15, depth: 0.1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: false, isWeakPoint: true, healthMultiplier: 2.0,
    },
    {
      id: 'back_rune_right', name: 'Back Rune Right', type: 'core',
      position: { x: torsoW * 0.2, y: torsoY + torsoH * 0.15, z: -torsoD / 2 },
      dimensions: { width: torsoW * 0.2, height: torsoH * 0.15, depth: 0.1 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'torso', isClimbable: false, isWeakPoint: true, healthMultiplier: 2.0,
    },
    {
      id: 'front_left_upper', name: 'Front Left Upper Leg', type: 'limb_upper',
      position: { x: -legSpreadX, y: legUpperY, z: frontZ },
      dimensions: { width: legW, height: upperLegH, depth: legW },
      rotation: { x: 0, y: 0, z: 0.15 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'front_left_lower', name: 'Front Left Lower Leg', type: 'limb_lower',
      position: { x: -legSpreadX, y: legLowerY, z: frontZ },
      dimensions: { width: legW * 0.9, height: lowerLegH, depth: legW * 0.9 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'front_left_upper', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'front_right_upper', name: 'Front Right Upper Leg', type: 'limb_upper',
      position: { x: legSpreadX, y: legUpperY, z: frontZ },
      dimensions: { width: legW, height: upperLegH, depth: legW },
      rotation: { x: 0, y: 0, z: -0.15 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'front_right_lower', name: 'Front Right Lower Leg', type: 'limb_lower',
      position: { x: legSpreadX, y: legLowerY, z: frontZ },
      dimensions: { width: legW * 0.9, height: lowerLegH, depth: legW * 0.9 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'front_right_upper', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'back_left_upper', name: 'Back Left Upper Leg', type: 'limb_upper',
      position: { x: -legSpreadX, y: legUpperY, z: backZ },
      dimensions: { width: legW, height: upperLegH, depth: legW },
      rotation: { x: 0, y: 0, z: 0.15 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'back_left_lower', name: 'Back Left Lower Leg', type: 'limb_lower',
      position: { x: -legSpreadX, y: legLowerY, z: backZ },
      dimensions: { width: legW * 0.9, height: lowerLegH, depth: legW * 0.9 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'back_left_upper', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'back_right_upper', name: 'Back Right Upper Leg', type: 'limb_upper',
      position: { x: legSpreadX, y: legUpperY, z: backZ },
      dimensions: { width: legW, height: upperLegH, depth: legW },
      rotation: { x: 0, y: 0, z: -0.15 },
      parent: 'torso', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
    {
      id: 'back_right_lower', name: 'Back Right Lower Leg', type: 'limb_lower',
      position: { x: legSpreadX, y: legLowerY, z: backZ },
      dimensions: { width: legW * 0.9, height: lowerLegH, depth: legW * 0.9 },
      rotation: { x: 0, y: 0, z: 0 },
      parent: 'back_right_upper', isClimbable: true, isWeakPoint: false, healthMultiplier: 1.0,
    },
  ];

  return { parts };
}

export function generateSentinelSurfacePatches(definition) {
  const patches = [];
  const partList = definition.parts;

  for (const part of partList) {
    if (!part.isClimbable) continue;

    const { position: pos, dimensions: dim } = part;
    const hw = dim.width / 2;
    const hh = dim.height / 2;
    const hd = dim.depth / 2;
    const parent = part.parent || part.id;

    const topY = pos.y + hh;
    const bottomY = pos.y - hh;
    const leftX = pos.x - hw;
    const rightX = pos.x + hw;
    const frontZ = pos.z + hd;
    const backZ = pos.z - hd;

    const stepsX = Math.max(2, Math.ceil(dim.width / 2));
    const stepsZ = Math.max(2, Math.ceil(dim.depth / 2));
    const stepsY = Math.max(2, Math.ceil(dim.height / 2));

    for (let i = 0; i <= stepsX; i++) {
      const t = stepsX === 0 ? 0.5 : i / stepsX;
      const x = leftX + t * dim.width;

      for (let j = 0; j <= stepsZ; j++) {
        const s = stepsZ === 0 ? 0.5 : j / stepsZ;
        const z = backZ + s * dim.depth;

        patches.push({
          position: { x, y: topY, z },
          normal: { x: 0, y: 1, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }

    for (let i = 0; i <= stepsX; i++) {
      const t = stepsX === 0 ? 0.5 : i / stepsX;
      const x = leftX + t * dim.width;

      for (let j = 0; j <= stepsY; j++) {
        const s = stepsY === 0 ? 0.5 : j / stepsY;
        const y = bottomY + s * dim.height;

        patches.push({
          position: { x, y, z: frontZ },
          normal: { x: 0, y: 0, z: 1 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
        patches.push({
          position: { x, y, z: backZ },
          normal: { x: 0, y: 0, z: -1 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }

    for (let j = 0; j <= stepsZ; j++) {
      const s = stepsZ === 0 ? 0.5 : j / stepsZ;
      const z = backZ + s * dim.depth;

      for (let k = 0; k <= stepsY; k++) {
        const u = stepsY === 0 ? 0.5 : k / stepsY;
        const y = bottomY + u * dim.height;

        patches.push({
          position: { x: leftX, y, z },
          normal: { x: -1, y: 0, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
        patches.push({
          position: { x: rightX, y, z },
          normal: { x: 1, y: 0, z: 0 },
          climbable: true,
          bodyPartId: part.id,
          parentPartId: parent,
        });
      }
    }
  }

  return patches;
}

export function getSentinelWeakPointPositions(definition, colossusPosition, colossusRotation) {
  const body = definition.parts instanceof Map ? definition : createColossusBody(definition);
  const weak = getWeakPoints(body);
  const positions = [];

  for (const part of weak) {
    const pos = getBodyPartWorldPosition(body, part.id, colossusPosition, colossusRotation);
    if (pos) {
      positions.push({ ...pos, bodyPartId: part.id });
    }
  }

  return positions;
}

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

function getTHREE() {
  return _THREE;
}

export const WEAK_POINT_BASE_HEALTH = 50;

export function buildCombatWeakPoints(definition, colossusPosition, colossusRotation) {
  const body = definition.parts instanceof Map ? definition : createColossusBody(definition);
  const weak = getWeakPoints(body);
  const combatWeakPoints = [];

  for (const part of weak) {
    const pos = getBodyPartWorldPosition(body, part.id, colossusPosition, colossusRotation);
    if (pos) {
      const maxHealth = Math.round(WEAK_POINT_BASE_HEALTH * part.healthMultiplier);
      combatWeakPoints.push({
        id: part.id,
        position: { ...pos },
        health: maxHealth,
        maxHealth,
        isDestroyed: false,
        isActive: true,
      });
    }
  }

  return combatWeakPoints;
}

function getGeometryType(partId) {
  if (partId.includes('_upper') || partId.includes('_lower')) {
    return 'cylinder';
  }
  return 'box';
}

let _colossusNormalMap = null;

function getColossusNormalMap() {
  if (_colossusNormalMap) return _colossusNormalMap;
  const T = getTHREE();
  if (!T || typeof document === 'undefined') return null;
  const { data, width, height } = generateNormalMapData(256, 256, 0.12, 77, 2.5);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  _colossusNormalMap = new T.CanvasTexture(canvas);
  _colossusNormalMap.wrapS = T.RepeatWrapping;
  _colossusNormalMap.wrapT = T.RepeatWrapping;
  return _colossusNormalMap;
}

function createSentinelMaterial(part) {
  const T = getTHREE();
  if (part.isWeakPoint) {
    return new T.MeshStandardMaterial({
      color: 0x00ccff,
      roughness: 0.3,
      metalness: 0.8,
      emissive: new T.Color(0x00ccff),
      emissiveIntensity: 0.5,
    });
  }
  const normalMap = getColossusNormalMap();
  const normalProps = normalMap ? { normalMap, normalScale: new T.Vector2(0.5, 0.5) } : {};
  return new T.MeshStandardMaterial({
    color: 0x444444,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
    ...normalProps,
  });
}

export function createSentinelMesh(definition) {
  const T = getTHREE();
  const group = new T.Group();
  const meshByPart = new Map();

  for (const part of definition.parts) {
    const { dimensions: dim, id, position: pos, rotation: rot } = part;
    const geoType = getGeometryType(id);
    let geometry;

    if (geoType === 'cylinder') {
      geometry = new T.CylinderGeometry(dim.width / 2, dim.width / 2, dim.height, 8);
    } else {
      geometry = new T.BoxGeometry(dim.width, dim.height, dim.depth);
    }

    const material = createSentinelMaterial(part);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.set(rot.x, rot.y, rot.z);
    mesh.userData.partId = id;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const parentNode = part.parent ? meshByPart.get(part.parent) : null;
    if (parentNode) {
      parentNode.add(mesh);
    } else {
      group.add(mesh);
    }
    meshByPart.set(id, mesh);
  }

  return { impl: group, meshByPart };
}

export function animateSentinel(mesh, time) {
  const { meshByPart } = mesh;
  const torso = meshByPart.get('torso');
  if (!torso) return;

  const pulse = 1 + Math.sin(time * 1.5) * 0.015;
  torso.scale.set(pulse, pulse, pulse);
}
