import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildIslandVertexColors, buildIslandGeometryData } from './island-mesh.js';

describe('buildIslandVertexColors', () => {
  it('returns correct number of color entries for heightmap', () => {
    const heightData = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const resolution = 3;
    const colors = buildIslandVertexColors(heightData, resolution, 8);
    const vertCount = (resolution + 1) * (resolution + 1);
    assert.strictEqual(colors.length / 3, vertCount);
  });

  it('low heights produce brown colors', () => {
    const heightData = new Float32Array([0.5]);
    const colors = buildIslandVertexColors(heightData, 1, 10);
    assert.ok(colors[0] > 0.2, `brown R too low: ${colors[0]}`);
    assert.ok(colors[1] < 0.4, `brown G too high: ${colors[1]}`);
  });

  it('high heights produce stone colors', () => {
    const heightData = new Float32Array([9]);
    const colors = buildIslandVertexColors(heightData, 1, 10);
    assert.ok(colors[0] > 0.4, `stone R should be > 0.4, got ${colors[0]}`);
    assert.ok(colors[1] > 0.4, `stone G should be > 0.4, got ${colors[1]}`);
    assert.ok(colors[2] > 0.4, `stone B should be > 0.4, got ${colors[2]}`);
  });

  it('mid heights produce green colors', () => {
    const heightData = new Float32Array([4]);
    const colors = buildIslandVertexColors(heightData, 1, 10);
    assert.ok(colors[1] > 0.3, `green channel should be > 0.3, got ${colors[1]}`);
  });

  it('zero height produces brown/dirt color', () => {
    const heightData = new Float32Array([0]);
    const colors = buildIslandVertexColors(heightData, 1, 10);
    assert.ok(colors[0] > 0.1, 'dirt R should be positive');
  });
});

describe('buildIslandGeometryData', () => {
  it('returns correct vertex count', () => {
    const island = {
      center: { x: 0, z: 0 },
      radius: 5,
      maxHeight: 3,
      heightData: new Float32Array((8 + 1) * (8 + 1)),
      resolution: 8,
      generated: true,
    };
    const data = buildIslandGeometryData(island);
    assert.strictEqual(data.vertCount, 81);
    assert.strictEqual(data.positions.length, 81 * 3);
  });

  it('vertex Y values match heightData', () => {
    const res = 2;
    const heights = new Float32Array([
      1.0, 2.0, 0.5,
      1.5, 3.0, 1.0,
      0.8, 1.2, 0.3,
    ]);
    const island = {
      center: { x: 0, z: 0 },
      radius: 5,
      maxHeight: 3,
      heightData: heights,
      resolution: res,
      generated: true,
    };
    const data = buildIslandGeometryData(island);
    for (let i = 0; i < heights.length; i++) {
      assert.ok(
        Math.abs(data.positions[i * 3 + 1] - heights[i]) < 0.01,
        `vertex ${i} Y=${data.positions[i * 3 + 1]} expected ${heights[i]}`
      );
    }
  });

  it('vertex X positions span from -radius to +radius', () => {
    const island = {
      center: { x: 0, z: 0 },
      radius: 10,
      maxHeight: 3,
      heightData: new Float32Array(4),
      resolution: 1,
      generated: true,
    };
    const data = buildIslandGeometryData(island);
    const x0 = data.positions[0];
    const x1 = data.positions[3];
    assert.ok(Math.abs(x0 - (-10)) < 0.01, `left X should be -10, got ${x0}`);
    assert.ok(Math.abs(x1 - 10) < 0.01, `right X should be 10, got ${x1}`);
  });

  it('vertex Z positions span from -radius to +radius', () => {
    const island = {
      center: { x: 0, z: 0 },
      radius: 10,
      maxHeight: 3,
      heightData: new Float32Array(4),
      resolution: 1,
      generated: true,
    };
    const data = buildIslandGeometryData(island);
    const z0 = data.positions[2];
    const z1 = data.positions[8];
    assert.ok(Math.abs(z0 - (-10)) < 0.01, `top Z should be -10, got ${z0}`);
    assert.ok(Math.abs(z1 - 10) < 0.01, `bottom Z should be 10, got ${z1}`);
  });

  it('includes vertex colors matching height gradient', () => {
    const island = {
      center: { x: 0, z: 0 },
      radius: 5,
      maxHeight: 10,
      heightData: new Float32Array([0, 1, 5, 9]),
      resolution: 1,
      generated: true,
    };
    const data = buildIslandGeometryData(island);
    assert.strictEqual(data.colors.length, (1 + 1) * (1 + 1) * 3);
    assert.ok(data.colors[7] > 0.3, 'mid-height green G > 0.3');
  });
});
