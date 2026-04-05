export const BlockType = {
  AIR: 0,
  DIRT: 1,
  GRASS: 2,
  STONE: 3,
  MOSS_STONE: 4,
  SAND: 5,
  WATER: 6,
  WOOD: 7,
  LEAVES: 8,
  RUNE_GLOW: 9,
  CRACKED_STONE: 10,
  MOSS_DIRT: 11,
};

export const BLOCK_PROPERTIES = {
  [BlockType.AIR]: {
    solid: false,
    transparent: true,
    color: [0, 0, 0],
    emissive: [0, 0, 0],
  },
  [BlockType.DIRT]: {
    solid: true,
    transparent: false,
    color: [0.36, 0.25, 0.13],
    emissive: [0, 0, 0],
  },
  [BlockType.GRASS]: {
    solid: true,
    transparent: false,
    color: [0.22, 0.55, 0.15],
    emissive: [0, 0, 0],
  },
  [BlockType.STONE]: {
    solid: true,
    transparent: false,
    color: [0.55, 0.52, 0.48],
    emissive: [0, 0, 0],
  },
  [BlockType.MOSS_STONE]: {
    solid: true,
    transparent: false,
    color: [0.35, 0.50, 0.30],
    emissive: [0, 0, 0],
  },
  [BlockType.SAND]: {
    solid: true,
    transparent: false,
    color: [0.76, 0.70, 0.50],
    emissive: [0, 0, 0],
  },
  [BlockType.WATER]: {
    solid: false,
    transparent: true,
    color: [0.15, 0.35, 0.65],
    emissive: [0, 0, 0],
  },
  [BlockType.WOOD]: {
    solid: true,
    transparent: false,
    color: [0.40, 0.26, 0.13],
    emissive: [0, 0, 0],
  },
  [BlockType.LEAVES]: {
    solid: true,
    transparent: true,
    color: [0.18, 0.42, 0.12],
    emissive: [0, 0, 0],
  },
  [BlockType.RUNE_GLOW]: {
    solid: true,
    transparent: false,
    color: [0.0, 0.8, 1.0],
    emissive: [0.0, 0.5, 0.7],
  },
  [BlockType.CRACKED_STONE]: {
    solid: true,
    transparent: false,
    color: [0.40, 0.38, 0.35],
    emissive: [0, 0, 0],
  },
  [BlockType.MOSS_DIRT]: {
    solid: true,
    transparent: false,
    color: [0.30, 0.40, 0.18],
    emissive: [0, 0, 0],
  },
};

export function getBlockProperty(type, prop) {
  const props = BLOCK_PROPERTIES[type];
  if (!props) return undefined;
  return props[prop];
}

export function isBlockSolid(type) {
  return getBlockProperty(type, 'solid') === true;
}

export function isBlockTransparent(type) {
  return getBlockProperty(type, 'transparent') === true;
}

export function getBlockColor(type) {
  return getBlockProperty(type, 'color');
}

export function getBlockEmissive(type) {
  return getBlockProperty(type, 'emissive');
}
