import { BlockType } from "../world/block-types.js";
import { createSentinelDefinition } from "./sentinel.js";
import { createWraithDefinition } from "./wraith.js";
import { createTitanDefinition } from "./titan.js";
import { voxelBox, voxelSphere, voxelCylinder } from "./voxel-templates.js";

function round3(v) {
  return {
    x: Math.round(v.x),
    y: Math.round(v.y),
    z: Math.round(v.z),
  };
}

function buildSentinelVoxels() {
  const def = createSentinelDefinition();
  const result = {};

  for (const part of def.parts) {
    let voxels;
    const blockType = part.isWeakPoint ? BlockType.RUNE_GLOW : BlockType.STONE;
    const dims = part.dimensions;

    if (part.id === "torso" || part.id === "hips") {
      voxels = voxelBox(
        Math.max(1, Math.round(dims.width)),
        Math.max(1, Math.round(dims.height)),
        Math.max(1, Math.round(dims.depth)),
        blockType,
      );
    } else if (part.id === "head") {
      voxels = voxelSphere(Math.max(1, Math.round(dims.width / 2)), blockType);
    } else if (part.id.includes("_upper") || part.id.includes("_lower")) {
      const radius = Math.max(1, Math.round(dims.width / 2));
      voxels = voxelCylinder(radius, radius, Math.max(1, Math.round(dims.height)), blockType);
    } else {
      voxels = voxelBox(
        Math.max(1, Math.round(dims.width)),
        Math.max(1, Math.round(dims.height)),
        Math.max(1, Math.round(dims.depth)),
        blockType,
      );
    }

    result[part.id] = {
      voxels,
      offset: round3(part.position),
      transparent: false,
    };
  }

  return result;
}

function buildWraithVoxels() {
  const def = createWraithDefinition();
  const result = {};

  for (const part of def.parts) {
    const blockType = part.isWeakPoint ? BlockType.RUNE_GLOW : BlockType.STONE;
    const dims = part.dimensions;
    let voxels;
    const isTransparent = !part.isWeakPoint;

    if (part.type === "head") {
      voxels = voxelSphere(Math.max(1, Math.round(dims.width / 2)), blockType);
    } else if (part.type === "limb_upper") {
      voxels = voxelBox(
        Math.max(1, Math.round(dims.width)),
        Math.max(1, Math.round(dims.height)),
        Math.max(1, Math.round(dims.depth)),
        blockType,
      );
    } else {
      const radius = Math.max(1, Math.round(Math.max(dims.width, dims.depth) / 2));
      const heightVoxels = Math.max(1, Math.round(dims.height));
      voxels = voxelCylinder(radius, radius, heightVoxels, blockType);
    }

    result[part.id] = {
      voxels,
      offset: round3(part.position),
      transparent: isTransparent,
    };
  }

  return result;
}

function buildTitanVoxels() {
  const def = createTitanDefinition();
  const result = {};

  for (const part of def.parts) {
    const blockType = part.isWeakPoint ? BlockType.RUNE_GLOW : BlockType.STONE;
    const dims = part.dimensions;
    let voxels;

    if (part.id === "shell_main" || part.id === "underbelly") {
      const radius = Math.max(1, Math.round(Math.max(dims.width, dims.depth) / 2));
      const heightVoxels = Math.max(1, Math.round(dims.height));
      voxels = voxelCylinder(radius, radius, heightVoxels, blockType);
    } else if (part.id === "head") {
      voxels = voxelSphere(Math.max(1, Math.round(dims.width / 2)), blockType);
    } else if (part.id.startsWith("leg_")) {
      const radius = Math.max(1, Math.round(dims.width / 2));
      voxels = voxelCylinder(radius, radius, Math.max(1, Math.round(dims.height)), blockType);
    } else {
      voxels = voxelBox(
        Math.max(1, Math.round(dims.width)),
        Math.max(1, Math.round(dims.height)),
        Math.max(1, Math.round(dims.depth)),
        blockType,
      );
    }

    result[part.id] = {
      voxels,
      offset: round3(part.position),
      transparent: false,
    };
  }

  return result;
}

export function buildColossusVoxels(type) {
  switch (type) {
    case "sentinel":
      return buildSentinelVoxels();
    case "wraith":
      return buildWraithVoxels();
    case "titan":
      return buildTitanVoxels();
    default:
      throw new Error(`unknown colossus type: ${type}`);
  }
}
