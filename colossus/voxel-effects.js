import { BlockType } from "../world/block-types.js";
import { clamp } from "../utils/math.js";

const HIT_COLORS = {
  [BlockType.STONE]: [0.55, 0.52, 0.48],
  [BlockType.RUNE_GLOW]: [0.0, 0.8, 1.0],
  [BlockType.CRACKED_STONE]: [0.4, 0.38, 0.35],
  [BlockType.MOSS_STONE]: [0.35, 0.5, 0.3],
};

const DEFAULT_HIT_COLOR = [1.0, 1.0, 1.0];
const HIT_CUBE_SIZE = 1.2;
const HIT_DURATION = 0.3;

const KNEEL_DURATION = 2;
const COLLAPSE_DURATION = 2;
const DISSOLVE_DURATION = 3;
const FALLEN_DURATION = 0.001;

const KNEEL_LIMB_FRACTION = 0.4;
const KNEEL_BODY_FRACTION = 0.15;
const KNEEL_HEAD_FRACTION = 0.5;

const COLLAPSE_BODY_FRACTION = 0.2;
const COLLAPSE_LIMB_FRACTION = 0.1;
const COLLAPSE_HEAD_FRACTION = 0.3;

const DISSOLVE_SCATTER_SPEED_MIN = 3;
const DISSOLVE_SCATTER_SPEED_MAX = 8;

const LIMB_PATTERNS = ["leg", "wing", "claw"];

function isLimbPart(partId) {
  return LIMB_PATTERNS.some((p) => partId.includes(p));
}

function getPartCategory(partId) {
  if (partId === "head") return "head";
  if (isLimbPart(partId)) return "limb";
  return "body";
}

function getCenterY(voxels, offset) {
  if (voxels.length === 0) return offset.y;
  let sum = 0;
  for (const v of voxels) sum += v.y;
  return offset.y + sum / voxels.length;
}

function randomUnitSphere() {
  while (true) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const z = Math.random() * 2 - 1;
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0.01 && len <= 1) return { x: x / len, y: y / len, z: z / len };
  }
}

export function createVoxelHitEffect(blockType, position) {
  const color = HIT_COLORS[blockType] || DEFAULT_HIT_COLOR;
  return {
    type: "cube",
    size: HIT_CUBE_SIZE,
    color,
    duration: HIT_DURATION,
    position,
  };
}

export function createVoxelDamageNumbers(count, position) {
  const results = [];
  for (let i = 0; i < count; i++) {
    const dx = Math.round(position.x + (Math.random() * 2 - 1) * 2);
    const dy = Math.round(position.y + 1 + Math.random() * 2);
    const dz = Math.round(position.z + (Math.random() * 2 - 1) * 2);
    results.push({
      position: { x: dx, y: dy, z: dz },
    });
  }
  return results;
}

export function createVoxelDeathSequence(voxelParts) {
  const partIds = Object.keys(voxelParts);

  const kneelTransforms = partIds.map((partId) => {
    const part = voxelParts[partId];
    const category = getPartCategory(partId);
    const origY = part.offset.y;
    let newY = origY;
    let rotX = 0;

    if (category === "limb") {
      newY = origY - origY * KNEEL_LIMB_FRACTION;
      rotX = 0.3;
    } else if (category === "head") {
      newY = origY - KNEEL_HEAD_FRACTION;
      rotX = 0.5;
    } else {
      newY = origY - origY * KNEEL_BODY_FRACTION;
    }

    return {
      partId,
      position: { x: part.offset.x, y: newY, z: part.offset.z },
      rotation: { x: rotX, y: 0, z: 0 },
      opacity: 1,
    };
  });

  const collapseTransforms = partIds.map((partId) => {
    const part = voxelParts[partId];
    const category = getPartCategory(partId);
    const origY = part.offset.y;
    let targetY;

    if (category === "limb") {
      targetY = origY * COLLAPSE_LIMB_FRACTION;
    } else if (category === "head") {
      targetY = origY * COLLAPSE_HEAD_FRACTION;
    } else {
      targetY = origY * COLLAPSE_BODY_FRACTION;
    }

    return {
      partId,
      position: { x: part.offset.x, y: targetY, z: part.offset.z },
      rotation: {
        x: category === "head" ? 1.2 : category === "limb" ? 0.3 : 0,
        y: Math.random() * 0.4 - 0.2,
        z: Math.random() * 0.2 - 0.1,
      },
      opacity: 1,
    };
  });

  const dissolveTransforms = partIds.map((partId) => {
    const part = voxelParts[partId];
    const scatterVoxels = part.voxels.map((v) => {
      const dir = randomUnitSphere();
      const speed =
        DISSOLVE_SCATTER_SPEED_MIN +
        Math.random() * (DISSOLVE_SCATTER_SPEED_MAX - DISSOLVE_SCATTER_SPEED_MIN);
      return {
        position: { x: v.x + part.offset.x, y: v.y + part.offset.y, z: v.z + part.offset.z },
        velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      };
    });

    return {
      partId,
      position: { x: part.offset.x, y: part.offset.y * COLLAPSE_BODY_FRACTION, z: part.offset.z },
      rotation: { x: 0, y: 0, z: 0 },
      opacity: 0,
      scatterVoxels,
    };
  });

  const fallenTransforms = partIds.map((partId) => {
    const part = voxelParts[partId];
    return {
      partId,
      position: { x: part.offset.x, y: 0, z: part.offset.z },
      rotation: { x: 0, y: 0, z: 0 },
      opacity: 0,
    };
  });

  return [
    { phase: "kneel", duration: KNEEL_DURATION, transforms: kneelTransforms },
    { phase: "collapse", duration: COLLAPSE_DURATION, transforms: collapseTransforms },
    { phase: "dissolve", duration: DISSOLVE_DURATION, transforms: dissolveTransforms },
    { phase: "fallen", duration: FALLEN_DURATION, transforms: fallenTransforms },
  ];
}

export function createVoxelWeakPointDestroy(voxels, position) {
  const removedVoxels = voxels.filter((v) => v.blockType === BlockType.RUNE_GLOW);
  const particles = [];

  for (const rv of removedVoxels) {
    const px = rv.x + position.x;
    const py = rv.y + position.y;
    const pz = rv.z + position.z;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const dir = randomUnitSphere();
      const speed = 2 + Math.random() * 5;
      particles.push({
        position: { x: px, y: py, z: pz },
        velocity: { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed },
      });
    }
  }

  return {
    removedVoxels: removedVoxels.map((v) => ({ x: v.x, y: v.y, z: v.z })),
    replacementType: BlockType.CRACKED_STONE,
    particles,
  };
}

export function createVoxelHealthOpacity(partVoxels, healthPercent) {
  const normalized = healthPercent <= 1 ? healthPercent * 100 : healthPercent;
  const hp = clamp(normalized, 0, 100);

  if (hp >= 100) {
    return { darken: [], remove: [] };
  }

  const allVoxels = [];
  for (const [partId, part] of Object.entries(partVoxels)) {
    for (const v of part.voxels) {
      allVoxels.push({
        x: v.x + part.offset.x,
        y: v.y + part.offset.y,
        z: v.z + part.offset.z,
        partId,
      });
    }
  }

  if (allVoxels.length === 0) {
    return { darken: [], remove: [] };
  }

  let cx = 0,
    cy = 0,
    cz = 0;
  for (const v of allVoxels) {
    cx += v.x;
    cy += v.y;
    cz += v.z;
  }
  cx /= allVoxels.length;
  cy /= allVoxels.length;
  cz /= allVoxels.length;

  allVoxels.sort((a, b) => {
    const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2 + (a.z - cz) ** 2;
    const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2 + (b.z - cz) ** 2;
    return distB - distA;
  });

  const damageFraction = 1 - hp / 100;
  const removeThreshold = damageFraction > 0.7;
  const removeCount = removeThreshold
    ? Math.floor(((damageFraction - 0.7) / 0.3) * allVoxels.length * 0.3)
    : 0;
  const darkenCount = Math.floor(damageFraction * allVoxels.length * 0.5);

  const darken = allVoxels.slice(0, darkenCount).map((v) => ({ x: v.x, y: v.y, z: v.z }));
  const remove = allVoxels.slice(0, removeCount).map((v) => ({ x: v.x, y: v.y, z: v.z }));

  return { darken, remove };
}
