import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { noise2D, noise3D, fbm2D, fbm3D } from "./noise.js";

describe("noise2D", () => {
  it("returns values in [-1, 1]", () => {
    for (let i = 0; i < 200; i++) {
      const x = (i * 0.37) % 100;
      const y = (i * 0.53) % 100;
      const v = noise2D(x, y);
      assert.ok(v >= -1 && v <= 1, `noise2D(${x}, ${y}) = ${v} out of range`);
    }
  });

  it("returns same value for same input (deterministic)", () => {
    const a = noise2D(1.5, 2.5);
    const b = noise2D(1.5, 2.5);
    assert.equal(a, b);
  });

  it("different inputs give different values", () => {
    const vals = new Set();
    for (let i = 0; i < 50; i++) {
      vals.add(noise2D(i * 1.7, i * 2.3));
    }
    assert.ok(vals.size > 40, `only ${vals.size} unique values from 50 inputs`);
  });

  it("nearby points give similar values (smooth)", () => {
    const step = 0.001;
    for (let i = 0; i < 20; i++) {
      const x = i * 3.7;
      const y = i * 2.1;
      const a = noise2D(x, y);
      const b = noise2D(x + step, y + step);
      assert.ok(
        Math.abs(a - b) < 0.01,
        `large jump at (${x},${y}): ${a} vs ${b}, diff=${Math.abs(a - b)}`,
      );
    }
  });
});

describe("noise3D", () => {
  it("returns values in [-1, 1]", () => {
    for (let i = 0; i < 200; i++) {
      const x = (i * 0.37) % 100;
      const y = (i * 0.53) % 100;
      const z = (i * 0.71) % 100;
      const v = noise3D(x, y, z);
      assert.ok(v >= -1 && v <= 1, `noise3D(${x}, ${y}, ${z}) = ${v} out of range`);
    }
  });

  it("returns same value for same input (deterministic)", () => {
    const a = noise3D(1.5, 2.5, 3.5);
    const b = noise3D(1.5, 2.5, 3.5);
    assert.equal(a, b);
  });

  it("nearby points give similar values (smooth)", () => {
    const step = 0.001;
    for (let i = 0; i < 20; i++) {
      const x = i * 3.7;
      const y = i * 2.1;
      const z = i * 1.3;
      const a = noise3D(x, y, z);
      const b = noise3D(x + step, y + step, z + step);
      assert.ok(Math.abs(a - b) < 0.01, `large jump at (${x},${y},${z}): ${a} vs ${b}`);
    }
  });
});

describe("fbm2D", () => {
  it("returns values in expected range", () => {
    for (let i = 0; i < 100; i++) {
      const x = (i * 0.37) % 100;
      const y = (i * 0.53) % 100;
      const v = fbm2D(x, y, 4, 2, 0.5);
      assert.ok(v >= -1 && v <= 1, `fbm2D(${x}, ${y}) = ${v} out of range`);
    }
  });

  it("produces more detail than single noise call", () => {
    let singleVar = 0;
    let fbmVar = 0;
    const samples = 200;
    const xs = [];
    for (let i = 0; i < samples; i++) {
      xs.push(i * 0.1);
    }
    for (let i = 1; i < samples; i++) {
      singleVar += Math.abs(noise2D(xs[i], 1) - noise2D(xs[i - 1], 1));
      fbmVar += Math.abs(fbm2D(xs[i], 1, 4) - fbm2D(xs[i - 1], 1, 4));
    }
    singleVar /= samples;
    fbmVar /= samples;
    assert.ok(
      fbmVar > singleVar * 0.8,
      `fbm variation (${fbmVar}) not greater than single noise (${singleVar})`,
    );
  });

  it("is deterministic", () => {
    const a = fbm2D(5, 10, 4, 2, 0.5);
    const b = fbm2D(5, 10, 4, 2, 0.5);
    assert.equal(a, b);
  });
});

describe("fbm3D", () => {
  it("returns values in expected range", () => {
    for (let i = 0; i < 100; i++) {
      const x = (i * 0.37) % 100;
      const y = (i * 0.53) % 100;
      const z = (i * 0.71) % 100;
      const v = fbm3D(x, y, z, 4, 2, 0.5);
      assert.ok(v >= -1 && v <= 1, `fbm3D out of range: ${v}`);
    }
  });
});
