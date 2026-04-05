const FOOTSTEP_SOUNDS = {
  GRASS: { frequency: 200, duration: 0.08, type: 'sine', volume: 0.3 },
  STONE: { frequency: 500, duration: 0.05, type: 'square', volume: 0.4 },
  DIRT: { frequency: 150, duration: 0.1, type: 'sine', volume: 0.3 },
  SAND: { frequency: 300, duration: 0.09, type: 'sawtooth', volume: 0.25 },
  MOSS_STONE: { frequency: 350, duration: 0.06, type: 'sine', volume: 0.35 },
  WOOD: { frequency: 250, duration: 0.07, type: 'triangle', volume: 0.35 },
};

const BREAK_SOUNDS = {
  GRASS: { frequency: 300, duration: 0.12, type: 'sine', volume: 0.35 },
  STONE: { frequency: 600, duration: 0.15, type: 'square', volume: 0.5 },
  DIRT: { frequency: 200, duration: 0.15, type: 'sine', volume: 0.35 },
  SAND: { frequency: 350, duration: 0.1, type: 'sawtooth', volume: 0.3 },
  MOSS_STONE: { frequency: 500, duration: 0.14, type: 'square', volume: 0.45 },
  WOOD: { frequency: 400, duration: 0.13, type: 'triangle', volume: 0.45 },
};

const PLACE_SOUND = { frequency: 350, duration: 0.06, type: 'sine', volume: 0.3 };

const DEFAULT_FOOTSTEP = FOOTSTEP_SOUNDS.STONE;
const DEFAULT_BREAK = BREAK_SOUNDS.STONE;

const BLOCK_TYPE_NAMES = ['AIR', 'DIRT', 'GRASS', 'STONE', 'MOSS_STONE', 'SAND', 'WATER', 'WOOD', 'LEAVES', 'RUNE_GLOW', 'CRACKED_STONE', 'MOSS_DIRT'];

function getBlockTypeName(blockType) {
  return BLOCK_TYPE_NAMES[blockType] ?? null;
}

export function getBlockFootstepSound(blockType) {
  const name = getBlockTypeName(blockType);
  return (name && FOOTSTEP_SOUNDS[name]) ? { ...FOOTSTEP_SOUNDS[name] } : { ...DEFAULT_FOOTSTEP };
}

export function getBlockBreakSound(blockType) {
  const name = getBlockTypeName(blockType);
  return (name && BREAK_SOUNDS[name]) ? { ...BREAK_SOUNDS[name] } : { ...DEFAULT_BREAK };
}

export function getBlockPlaceSound(blockType) {
  return { ...PLACE_SOUND };
}
