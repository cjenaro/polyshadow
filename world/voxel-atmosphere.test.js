import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  updateFogForVoxels,
  updateBloomForVoxels,
  createVoxelShadowConfig,
  AO_CURVE,
} from "./voxel-atmosphere.js";

describe("AO_CURVE", () => {
  it("has 4 levels", () => {
    assert.strictEqual(AO_CURVE.length, 4);
  });

  it("has correct values", () => {
    assert.deepStrictEqual(AO_CURVE, [0.45, 0.65, 0.8, 1.0]);
  });

  it("values increase monotonically from dark to bright", () => {
    for (let i = 1; i < AO_CURVE.length; i++) {
      assert.ok(AO_CURVE[i] > AO_CURVE[i - 1], `AO_CURVE[${i}] should be > AO_CURVE[${i - 1}]`);
    }
  });

  it("darkest level is below 0.5", () => {
    assert.ok(AO_CURVE[0] < 0.5, `darkest AO ${AO_CURVE[0]} should be < 0.5`);
  });

  it("brightest level is 1.0", () => {
    assert.strictEqual(AO_CURVE[3], 1.0);
  });
});

describe("updateFogForVoxels", () => {
  it("returns an object with fog settings", () => {
    const settings = updateFogForVoxels({});
    assert.ok(typeof settings === "object");
  });

  it("increases fog density for mid-range visibility", () => {
    const base = { sceneFogDensity: 0.005, sceneFogColor: 0xc9a84c };
    const settings = updateFogForVoxels(base);
    assert.ok(settings.sceneFogDensity > base.sceneFogDensity, "voxel fog should be denser");
  });

  it("does not exceed reasonable fog density", () => {
    const settings = updateFogForVoxels({ sceneFogDensity: 0.005 });
    assert.ok(
      settings.sceneFogDensity < 0.05,
      `fog density ${settings.sceneFogDensity} should be < 0.05`,
    );
    assert.ok(settings.sceneFogDensity > 0, "fog density should be positive");
  });

  it("passes through fog color unchanged", () => {
    const settings = updateFogForVoxels({ sceneFogColor: 0xc9a84c });
    assert.strictEqual(settings.sceneFogColor, 0xc9a84c);
  });

  it("includes fog layer density multiplier", () => {
    const settings = updateFogForVoxels({});
    assert.ok(typeof settings.layerDensityMultiplier === "number");
    assert.ok(settings.layerDensityMultiplier >= 1.0, "layer density multiplier should be >= 1.0");
  });

  it("handles default input with no base settings", () => {
    const settings = updateFogForVoxels();
    assert.ok(typeof settings.sceneFogDensity === "number");
  });

  it("density multiplier is finite number", () => {
    const settings = updateFogForVoxels({ sceneFogDensity: 0.005 });
    assert.ok(Number.isFinite(settings.sceneFogDensity));
  });
});

describe("updateBloomForVoxels", () => {
  it("returns an object with bloom settings", () => {
    const settings = updateBloomForVoxels({});
    assert.ok(typeof settings === "object");
  });

  it("raises bloom threshold above default 0.1", () => {
    const base = { bloomThreshold: 0.1, bloomIntensity: 0.5 };
    const settings = updateBloomForVoxels(base);
    assert.ok(
      settings.bloomThreshold > 0.1,
      `threshold ${settings.bloomThreshold} should be > 0.1`,
    );
  });

  it("threshold is at most 0.2", () => {
    const settings = updateBloomForVoxels({ bloomThreshold: 0.1 });
    assert.ok(
      settings.bloomThreshold <= 0.2,
      `threshold ${settings.bloomThreshold} should be <= 0.2`,
    );
  });

  it("increases bloom intensity for emissive voxels", () => {
    const base = { bloomThreshold: 0.1, bloomIntensity: 0.5 };
    const settings = updateBloomForVoxels(base);
    assert.ok(
      settings.bloomIntensity > base.bloomIntensity,
      "voxel bloom intensity should be higher",
    );
  });

  it("bloom values are finite numbers", () => {
    const settings = updateBloomForVoxels({ bloomThreshold: 0.1, bloomIntensity: 0.5 });
    assert.ok(Number.isFinite(settings.bloomThreshold));
    assert.ok(Number.isFinite(settings.bloomIntensity));
  });

  it("bloom intensity stays in reasonable range", () => {
    const settings = updateBloomForVoxels({ bloomIntensity: 0.5 });
    assert.ok(settings.bloomIntensity > 0, "bloom intensity should be positive");
    assert.ok(
      settings.bloomIntensity <= 3.0,
      `bloom intensity ${settings.bloomIntensity} should be <= 3.0`,
    );
  });

  it("handles default input", () => {
    const settings = updateBloomForVoxels();
    assert.ok(typeof settings.bloomThreshold === "number");
    assert.ok(typeof settings.bloomIntensity === "number");
  });
});

describe("createVoxelShadowConfig", () => {
  it("returns shadow configuration object", () => {
    const config = createVoxelShadowConfig();
    assert.ok(typeof config === "object");
  });

  it("specifies shadow map type", () => {
    const config = createVoxelShadowConfig();
    assert.ok(typeof config.shadowMapType === "number");
  });

  it("has shadow map size of at least 2048", () => {
    const config = createVoxelShadowConfig();
    assert.ok(
      config.shadowMapSize >= 2048,
      `shadow map size ${config.shadowMapSize} should be >= 2048`,
    );
  });

  it("has shadow bias between 0 and -0.01", () => {
    const config = createVoxelShadowConfig();
    assert.ok(config.shadowBias < 0, "shadow bias should be negative");
    assert.ok(config.shadowBias > -0.01, `shadow bias ${config.shadowBias} should be > -0.01`);
  });

  it("has shadow normal bias in reasonable range", () => {
    const config = createVoxelShadowConfig();
    assert.ok(typeof config.shadowNormalBias === "number");
    assert.ok(config.shadowNormalBias >= 0, "normal bias should be non-negative");
    assert.ok(
      config.shadowNormalBias <= 0.1,
      `normal bias ${config.shadowNormalBias} should be <= 0.1`,
    );
  });

  it("all values are finite", () => {
    const config = createVoxelShadowConfig();
    for (const [key, value] of Object.entries(config)) {
      assert.ok(Number.isFinite(value), `${key} should be finite, got ${value}`);
    }
  });
});
