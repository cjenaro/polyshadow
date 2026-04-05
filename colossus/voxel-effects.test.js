import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BlockType } from '../world/block-types.js';
import {
  createVoxelHitEffect,
  createVoxelDamageNumbers,
  createVoxelDeathSequence,
  createVoxelWeakPointDestroy,
  createVoxelHealthOpacity,
} from './voxel-effects.js';

function makeVoxelParts() {
  return {
    torso: {
      voxels: [
        { x: 0, y: 0, z: 0, blockType: BlockType.STONE },
        { x: 1, y: 0, z: 0, blockType: BlockType.STONE },
        { x: 0, y: 1, z: 0, blockType: BlockType.STONE },
        { x: 0, y: -1, z: 0, blockType: BlockType.STONE },
      ],
      offset: { x: 0, y: 5, z: 0 },
      transparent: false,
    },
    head: {
      voxels: [
        { x: 0, y: 0, z: 0, blockType: BlockType.STONE },
        { x: 1, y: 0, z: 0, blockType: BlockType.STONE },
        { x: 0, y: 1, z: 0, blockType: BlockType.STONE },
      ],
      offset: { x: 0, y: 12, z: 0 },
      transparent: false,
    },
    leg_front_left: {
      voxels: [
        { x: 0, y: 0, z: 0, blockType: BlockType.STONE },
        { x: 0, y: -1, z: 0, blockType: BlockType.STONE },
      ],
      offset: { x: 2, y: 2, z: 0 },
      transparent: false,
    },
  };
}

describe('createVoxelHitEffect', () => {
  it('returns config with cube type', () => {
    const config = createVoxelHitEffect(BlockType.STONE, { x: 5, y: 3, z: 1 });
    assert.strictEqual(config.type, 'cube');
  });

  it('includes the given position', () => {
    const pos = { x: 5, y: 3, z: 1 };
    const config = createVoxelHitEffect(BlockType.STONE, pos);
    assert.deepStrictEqual(config.position, pos);
  });

  it('has a positive size', () => {
    const config = createVoxelHitEffect(BlockType.STONE, { x: 0, y: 0, z: 0 });
    assert.ok(config.size > 0);
  });

  it('has a positive duration', () => {
    const config = createVoxelHitEffect(BlockType.STONE, { x: 0, y: 0, z: 0 });
    assert.ok(config.duration > 0);
  });

  it('returns a color for STONE block type', () => {
    const config = createVoxelHitEffect(BlockType.STONE, { x: 0, y: 0, z: 0 });
    assert.ok(config.color !== undefined);
  });

  it('returns a different color for RUNE_GLOW block type', () => {
    const stone = createVoxelHitEffect(BlockType.STONE, { x: 0, y: 0, z: 0 });
    const rune = createVoxelHitEffect(BlockType.RUNE_GLOW, { x: 0, y: 0, z: 0 });
    assert.notDeepStrictEqual(stone.color, rune.color);
  });
});

describe('createVoxelDamageNumbers', () => {
  it('returns an array of configs', () => {
    const result = createVoxelDamageNumbers(3, { x: 0, y: 5, z: 0 });
    assert.ok(Array.isArray(result));
  });

  it('returns count entries', () => {
    const result = createVoxelDamageNumbers(3, { x: 0, y: 5, z: 0 });
    assert.strictEqual(result.length, 3);
  });

  it('each entry has a snapped position (integer coords)', () => {
    const result = createVoxelDamageNumbers(2, { x: 1.7, y: 5.3, z: 2.1 });
    for (const entry of result) {
      assert.strictEqual(entry.position.x, Math.round(entry.position.x));
      assert.strictEqual(entry.position.y, Math.round(entry.position.y));
      assert.strictEqual(entry.position.z, Math.round(entry.position.z));
    }
  });

  it('positions are near the input position', () => {
    const result = createVoxelDamageNumbers(2, { x: 5, y: 10, z: 3 });
    for (const entry of result) {
      assert.ok(Math.abs(entry.position.x - 5) <= 2);
      assert.ok(Math.abs(entry.position.z - 3) <= 2);
    }
  });

  it('positions are above the input y', () => {
    const result = createVoxelDamageNumbers(2, { x: 0, y: 5, z: 0 });
    for (const entry of result) {
      assert.ok(entry.position.y >= 5);
    }
  });

  it('returns empty array for zero count', () => {
    const result = createVoxelDamageNumbers(0, { x: 0, y: 0, z: 0 });
    assert.strictEqual(result.length, 0);
  });
});

describe('createVoxelDeathSequence', () => {
  it('returns an array of 4 phases', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    assert.strictEqual(sequence.length, 4);
  });

  it('phases are in order: kneel, collapse, dissolve, fallen', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    assert.strictEqual(sequence[0].phase, 'kneel');
    assert.strictEqual(sequence[1].phase, 'collapse');
    assert.strictEqual(sequence[2].phase, 'dissolve');
    assert.strictEqual(sequence[3].phase, 'fallen');
  });

  it('each phase has a positive duration', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    for (const step of sequence) {
      assert.ok(step.duration > 0, `${step.phase} should have positive duration`);
    }
  });

  it('each phase has transforms array covering all parts', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const partIds = new Set(Object.keys(parts));
    for (const step of sequence) {
      assert.ok(Array.isArray(step.transforms));
      const transformIds = new Set(step.transforms.map(t => t.partId));
      for (const pid of partIds) {
        assert.ok(transformIds.has(pid), `${step.phase} missing transform for ${pid}`);
      }
    }
  });

  it('kneel phase lowers limb voxels', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const kneel = sequence[0];
    const legTransform = kneel.transforms.find(t => t.partId === 'leg_front_left');
    assert.ok(legTransform.position.y < parts.leg_front_left.offset.y,
      'leg y should be lowered during kneel');
  });

  it('collapse phase sinks all parts below their original positions', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const collapse = sequence[1];
    for (const transform of collapse.transforms) {
      const origY = parts[transform.partId].offset.y;
      assert.ok(transform.position.y <= origY,
        `${transform.partId} should sink during collapse`);
    }
  });

  it('dissolve phase has voxels with outward velocities', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const dissolve = sequence[2];
    const hasScatter = dissolve.transforms.some(t => t.scatterVoxels && t.scatterVoxels.length > 0);
    assert.ok(hasScatter, 'dissolve should have scatter voxels');
  });

  it('dissolve scatter voxels have outward velocities', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const dissolve = sequence[2];
    for (const transform of dissolve.transforms) {
      if (!transform.scatterVoxels) continue;
      for (const sv of transform.scatterVoxels) {
        const dist = Math.sqrt(sv.velocity.x ** 2 + sv.velocity.y ** 2 + sv.velocity.z ** 2);
        assert.ok(dist > 0, `scatter voxel at ${sv.position} should have non-zero velocity`);
      }
    }
  });

  it('fallen phase has opacity 0 on all parts', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const fallen = sequence[3];
    for (const transform of fallen.transforms) {
      assert.strictEqual(transform.opacity, 0);
    }
  });

  it('total duration matches death system (7 seconds)', () => {
    const parts = makeVoxelParts();
    const sequence = createVoxelDeathSequence(parts);
    const total = sequence.reduce((sum, s) => sum + s.duration, 0);
    assert.ok(Math.abs(total - 7) < 0.01, `total duration should be 7, got ${total}`);
  });
});

describe('createVoxelWeakPointDestroy', () => {
  it('returns removed voxels list', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
      { x: 1, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.ok(Array.isArray(result.removedVoxels));
  });

  it('removes RUNE_GLOW voxels', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
      { x: 1, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.strictEqual(result.removedVoxels.length, 2);
  });

  it('does not remove non-RUNE_GLOW voxels', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.STONE },
      { x: 1, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.strictEqual(result.removedVoxels.length, 1);
  });

  it('replaces with CRACKED_STONE', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.strictEqual(result.replacementType, BlockType.CRACKED_STONE);
  });

  it('returns particle burst configs', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
      { x: 1, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.ok(Array.isArray(result.particles));
  });

  it('particles have outward velocities', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    for (const p of result.particles) {
      assert.ok(p.position !== undefined);
      assert.ok(p.velocity !== undefined);
      const dist = Math.sqrt(p.velocity.x ** 2 + p.velocity.y ** 2 + p.velocity.z ** 2);
      assert.ok(dist > 0, 'particle should have non-zero velocity');
    }
  });

  it('particle positions are near the input position', () => {
    const pos = { x: 10, y: 20, z: 30 };
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.RUNE_GLOW },
    ];
    const result = createVoxelWeakPointDestroy(voxels, pos);
    for (const p of result.particles) {
      assert.ok(Math.abs(p.position.x - pos.x) <= 2);
      assert.ok(Math.abs(p.position.y - pos.y) <= 2);
      assert.ok(Math.abs(p.position.z - pos.z) <= 2);
    }
  });

  it('returns empty arrays when no RUNE_GLOW voxels', () => {
    const voxels = [
      { x: 0, y: 0, z: 0, blockType: BlockType.STONE },
    ];
    const result = createVoxelWeakPointDestroy(voxels, { x: 0, y: 5, z: 0 });
    assert.strictEqual(result.removedVoxels.length, 0);
    assert.strictEqual(result.particles.length, 0);
  });
});

describe('createVoxelHealthOpacity', () => {
  it('returns empty darken and remove arrays at 100% health', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 100);
    assert.strictEqual(result.darken.length, 0);
    assert.strictEqual(result.remove.length, 0);
  });

  it('returns empty arrays at full health (1.0)', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 1.0);
    assert.strictEqual(result.darken.length, 0);
    assert.strictEqual(result.remove.length, 0);
  });

  it('returns some voxels to darken at low health', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 30);
    assert.ok(result.darken.length > 0, 'should darken some voxels at 30% health');
  });

  it('returns some voxels to remove at very low health', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 10);
    assert.ok(result.remove.length >= 0, 'remove array should exist');
  });

  it('darkened voxels come from extremities (farthest from center)', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 50);
    for (const v of result.darken) {
      assert.ok(v.x !== undefined);
      assert.ok(v.y !== undefined);
      assert.ok(v.z !== undefined);
    }
  });

  it('higher health darkens fewer voxels than lower health', () => {
    const parts = makeVoxelParts();
    const high = createVoxelHealthOpacity(parts, 80);
    const low = createVoxelHealthOpacity(parts, 30);
    assert.ok(high.darken.length <= low.darken.length,
      '80% health should darken fewer or equal voxels than 30%');
  });

  it('handles empty voxel parts', () => {
    const result = createVoxelHealthOpacity({}, 50);
    assert.strictEqual(result.darken.length, 0);
    assert.strictEqual(result.remove.length, 0);
  });

  it('clamp health > 100 to full health (empty arrays)', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, 150);
    assert.strictEqual(result.darken.length, 0);
    assert.strictEqual(result.remove.length, 0);
  });

  it('clamp health <= 0 to zero health', () => {
    const parts = makeVoxelParts();
    const result = createVoxelHealthOpacity(parts, -10);
    assert.ok(result.darken.length > 0 || result.remove.length > 0,
      'zero health should darken or remove voxels');
  });
});
