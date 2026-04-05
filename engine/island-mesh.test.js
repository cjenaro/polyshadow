import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildIslandVertexColors, buildIslandGeometryData } from './island-mesh.js';

describe('buildIslandVertexColors', () => {
  it('returns Float32Array with correct length', () => {
    const heightData = new Float32Array(4 * 4);
    const colors = buildIslandVertexColors(heightData, 4, 10);
    assert.ok(colors instanceof Float32Array);
    const vertCount = (4 + 1) * (4 + 1);
    assert.strictEqual(colors.length, vertCount * 3);
  });

  it('zero height produces brown (dirt) color', () => {
    const heightData = new Float32Array(4 * 4);
    const colors = buildIslandVertexColors(heightData, 4, 10);
    const dirtR = 0.36, dirtG = 0.25, dirtB = 0.13;
    assert.ok(Math.abs(colors[0] - dirtR) < 0.01, `R should be ~${dirtR}`);
    assert.ok(Math.abs(colors[1] - dirtG) < 0.01, `G should be ~${dirtG}`);
    assert.ok(Math.abs(colors[2] - dirtB) < 0.01, `B should be ~${dirtB}`);
  });

  it('mid height produces green (grass) color', () => {
    const grassThreshold = 10 * 0.15; // 1.5
    const stoneThreshold = 10 * 0.7;  // 7.0
    const midH = (grassThreshold + stoneThreshold) / 2;
    const heightData = new Float32Array(4 * 4);
    heightData[0] = midH;
    const colors = buildIslandVertexColors(heightData, 4, 10);
    assert.ok(colors[1] > 0.3, `G should be greenish, got ${colors[1]}`);
    assert.ok(colors[1] < 0.6, `G should not be too bright, got ${colors[1]}`);
  });

  it('max height produces stone/gray color', () => {
    const heightData = new Float32Array(4 * 4);
    heightData[0] = 10;
    const colors = buildIslandVertexColors(heightData, 4, 10);
    assert.ok(colors[0] > 0.5, `R should be stone-like, got ${colors[0]}`);
    assert.ok(colors[2] > 0.5, `B should be stone-like, got ${colors[2]}`);
  });

  it('colors interpolate smoothly from low to high', () => {
    const heightData = new Float32Array(1 * 1);
    heightData[0] = 0;
    const low = buildIslandVertexColors(heightData, 1, 10);
    heightData[0] = 10;
    const high = buildIslandVertexColors(heightData, 1, 10);
    assert.ok(high[0] > low[0], 'high R should be > low R');
    assert.ok(high[1] < low[1] || high[1] !== low[1], 'colors should differ');
  });

  it('handles vertices beyond heightData length (gracefully defaults to 0)', () => {
    const heightData = new Float32Array(1);
    const colors = buildIslandVertexColors(heightData, 1, 10);
    const vertCount = (1 + 1) * (1 + 1);
    assert.strictEqual(colors.length, vertCount * 3);
    const dirtR = 0.36;
    assert.ok(Math.abs(colors[0] - dirtR) < 0.02, 'first vertex should be brown');
  });
});

describe('buildIslandGeometryData', () => {
  function makeIsland(heightData, resolution, radius, maxHeight, center = { x: 0, z: 0 }) {
    return { heightData, resolution, radius, maxHeight, center };
  }

  it('returns positions and colors arrays', () => {
    const heightData = new Float32Array(4 * 4);
    const island = makeIsland(heightData, 4, 10, 5);
    const result = buildIslandGeometryData(island);
    assert.ok(result.positions instanceof Float32Array);
    assert.ok(result.colors instanceof Float32Array);
    assert.strictEqual(typeof result.vertCount, 'number');
  });

  it('vertCount matches (resolution+1)^2', () => {
    const heightData = new Float32Array(8 * 8);
    const island = makeIsland(heightData, 8, 10, 5);
    const result = buildIslandGeometryData(island);
    assert.strictEqual(result.vertCount, 9 * 9);
    assert.strictEqual(result.positions.length, 9 * 9 * 3);
    assert.strictEqual(result.colors.length, 9 * 9 * 3);
  });

  it('positions span from -radius to +radius in X and Z', () => {
    const heightData = new Float32Array(2 * 2);
    const island = makeIsland(heightData, 2, 10, 5);
    const { positions } = buildIslandGeometryData(island);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minZ = Math.min(minZ, positions[i + 2]);
      maxZ = Math.max(maxZ, positions[i + 2]);
    }
    assert.ok(Math.abs(minX - (-10)) < 0.01, `minX should be -10, got ${minX}`);
    assert.ok(Math.abs(maxX - 10) < 0.01, `maxX should be 10, got ${maxX}`);
    assert.ok(Math.abs(minZ - (-10)) < 0.01, `minZ should be -10, got ${minZ}`);
    assert.ok(Math.abs(maxZ - 10) < 0.01, `maxZ should be 10, got ${maxZ}`);
  });

  it('Y positions reflect heightData values', () => {
    const heightData = new Float32Array(2 * 2);
    heightData[0] = 5.0;
    heightData[1] = 3.0;
    heightData[2] = 1.0;
    heightData[3] = 0.0;
    const island = makeIsland(heightData, 2, 10, 8);
    const { positions } = buildIslandGeometryData(island);
    assert.ok(Math.abs(positions[1] - 5.0) < 0.01, `vertex 0 Y should be 5.0, got ${positions[1]}`);
    assert.ok(Math.abs(positions[4] - 3.0) < 0.01, `vertex 1 Y should be 3.0, got ${positions[4]}`);
    assert.ok(Math.abs(positions[7] - 1.0) < 0.01, `vertex 2 Y should be 1.0, got ${positions[7]}`);
  });

  it('does not mutate the input heightData', () => {
    const heightData = new Float32Array(4 * 4);
    heightData[0] = 2.5;
    const island = makeIsland(heightData, 4, 10, 5);
    buildIslandGeometryData(island);
    assert.strictEqual(heightData[0], 2.5);
  });
});
