import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BlockType, getBlockColor } from '../world/block-types.js';
import { getBlockColorForFace, createMaterialConfig } from '../world/voxel-materials.js';

describe('voxel-materials - pure logic', () => {
  it('getBlockColorForFace returns grass green for top face', () => {
    const color = getBlockColorForFace(BlockType.GRASS, 0, 1, 0);
    assert.ok(color[1] > 0.5, 'grass top should be green dominant');
    assert.ok(color[1] > color[0], 'green channel should dominate');
  });

  it('getBlockColorForFace returns dirt brown for grass side faces', () => {
    const topColor = getBlockColorForFace(BlockType.GRASS, 0, 1, 0);
    const sideColor = getBlockColorForFace(BlockType.GRASS, 1, 0, 0);
    const bottomColor = getBlockColorForFace(BlockType.GRASS, 0, -1, 0);
    assert.ok(sideColor[0] > topColor[0], 'grass side should be browner than top');
    assert.ok(sideColor[0] > sideColor[1], 'grass side should be brown dominant');
    assert.deepStrictEqual(bottomColor, sideColor, 'grass bottom should match side');
  });

  it('getBlockColorForFace returns dirt color for grass bottom face', () => {
    const dirtColor = getBlockColor(BlockType.DIRT);
    const grassBottom = getBlockColorForFace(BlockType.GRASS, 0, -1, 0);
    assert.deepStrictEqual(grassBottom, dirtColor, 'grass bottom should be dirt color');
  });

  it('getBlockColorForFace returns same color for STONE regardless of face', () => {
    const top = getBlockColorForFace(BlockType.STONE, 0, 1, 0);
    const side = getBlockColorForFace(BlockType.STONE, 1, 0, 0);
    const bottom = getBlockColorForFace(BlockType.STONE, 0, -1, 0);
    const front = getBlockColorForFace(BlockType.STONE, 0, 0, 1);
    assert.deepStrictEqual(top, side);
    assert.deepStrictEqual(side, bottom);
    assert.deepStrictEqual(bottom, front);
  });

  it('getBlockColorForFace falls back to getBlockColor for unknown block types', () => {
    const defaultColor = getBlockColorForFace(BlockType.SAND, 0, 1, 0);
    const expected = getBlockColor(BlockType.SAND);
    assert.deepStrictEqual(defaultColor, expected);
  });

  it('createMaterialConfig returns opaque config with vertexColors', () => {
    const config = createMaterialConfig({ opaque: true, transparent: false });
    assert.strictEqual(config.vertexColors, true);
    assert.strictEqual(config.transparent, false);
    assert.strictEqual(config.alphaTest, 0);
    assert.strictEqual(config.side, 0);
  });

  it('createMaterialConfig returns transparent config with alphaTest', () => {
    const config = createMaterialConfig({ opaque: false, transparent: true });
    assert.strictEqual(config.vertexColors, true);
    assert.strictEqual(config.transparent, true);
    assert.ok(config.alphaTest > 0, 'should have alpha test for transparent');
  });

  it('createMaterialConfig handles emissive blocks', () => {
    const config = createMaterialConfig({ opaque: true, transparent: false, emissive: true });
    assert.strictEqual(config.emissiveIntensity, 1);
  });
});
