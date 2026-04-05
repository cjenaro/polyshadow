import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createPostProcessState,
  updatePostProcessState,
  getActiveColorGrading,
  shouldEnableBloom,
} from "./post-processing.js";

const EPS = 1e-6;

function approx(a, b, eps = EPS) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (diff ${Math.abs(a - b)})`);
}

describe("createPostProcessState", () => {
  it("returns object with all required fields", () => {
    const state = createPostProcessState();
    assert.equal(typeof state.bloomIntensity, "number");
    assert.equal(typeof state.bloomThreshold, "number");
    assert.equal(typeof state.vignetteAmount, "number");
    assert.equal(typeof state.colorGrade, "string");
    assert.equal(typeof state.warmTint, "number");
    assert.equal(typeof state.desaturationFactor, "number");
  });

  it("initial values are zero or neutral", () => {
    const state = createPostProcessState();
    approx(state.bloomIntensity, 0);
    approx(state.bloomThreshold, 1.0);
    approx(state.vignetteAmount, 0.3);
    assert.equal(state.colorGrade, "warm");
    approx(state.warmTint, 0);
    approx(state.desaturationFactor, 0);
  });
});

describe("updatePostProcessState", () => {
  it("interpolates bloomIntensity toward target", () => {
    const state = createPostProcessState();
    const config = {
      bloomIntensity: 1.0,
      bloomThreshold: 0.8,
      vignetteAmount: 0.7,
      colorGrade: "desaturated",
    };
    const updated = updatePostProcessState(state, config, 1.0);
    assert.ok(updated.bloomIntensity > state.bloomIntensity);
    assert.ok(updated.bloomIntensity < 1.0);
  });

  it("interpolates vignetteAmount toward target", () => {
    const state = createPostProcessState();
    const config = {
      bloomIntensity: 0,
      bloomThreshold: 1.0,
      vignetteAmount: 0.9,
      colorGrade: "warm",
    };
    const updated = updatePostProcessState(state, config, 1.0);
    assert.ok(updated.vignetteAmount > state.vignetteAmount);
    assert.ok(updated.vignetteAmount < 0.9);
  });

  it("converges to target over time", () => {
    let state = createPostProcessState();
    const config = {
      bloomIntensity: 0.8,
      bloomThreshold: 0.8,
      vignetteAmount: 0.7,
      colorGrade: "desaturated",
    };
    for (let i = 0; i < 200; i++) {
      state = updatePostProcessState(state, config, 0.1);
    }
    approx(state.bloomIntensity, 0.8, 0.01);
    approx(state.vignetteAmount, 0.7, 0.01);
  });

  it("dt of zero returns unchanged state", () => {
    const state = createPostProcessState();
    const config = {
      bloomIntensity: 1.0,
      bloomThreshold: 0.8,
      vignetteAmount: 0.9,
      colorGrade: "desaturated",
    };
    const updated = updatePostProcessState(state, config, 0);
    approx(updated.bloomIntensity, state.bloomIntensity);
  });

  it("higher dt causes faster convergence", () => {
    const state = createPostProcessState();
    const config = {
      bloomIntensity: 1.0,
      bloomThreshold: 0.8,
      vignetteAmount: 0.9,
      colorGrade: "desaturated",
    };
    const slow = updatePostProcessState(state, config, 0.01);
    const fast = updatePostProcessState(state, config, 0.5);
    assert.ok(fast.bloomIntensity > slow.bloomIntensity);
  });

  it("does not mutate the input state", () => {
    const state = createPostProcessState();
    const originalBloom = state.bloomIntensity;
    const config = {
      bloomIntensity: 1.0,
      bloomThreshold: 0.8,
      vignetteAmount: 0.9,
      colorGrade: "desaturated",
    };
    updatePostProcessState(state, config, 1.0);
    approx(state.bloomIntensity, originalBloom);
  });

  it("clamps bloomIntensity to [0, 1]", () => {
    let state = createPostProcessState();
    const config = {
      bloomIntensity: 5.0,
      bloomThreshold: 0.8,
      vignetteAmount: 0.5,
      colorGrade: "warm",
    };
    for (let i = 0; i < 300; i++) {
      state = updatePostProcessState(state, config, 0.1);
    }
    assert.ok(state.bloomIntensity <= 1.0);
    assert.ok(state.bloomIntensity >= 0);
  });
});

describe("getActiveColorGrading", () => {
  it("returns warm tint values for warm color grade", () => {
    const state = {
      ...createPostProcessState(),
      colorGrade: "warm",
      warmTint: 0.5,
      desaturationFactor: 0,
    };
    const grading = getActiveColorGrading(state);
    assert.equal(grading.type, "warm");
    approx(grading.warmTint, 0.5);
    approx(grading.desaturationFactor, 0);
  });

  it("returns desaturation values for desaturated color grade", () => {
    const state = {
      ...createPostProcessState(),
      colorGrade: "desaturated",
      warmTint: 0,
      desaturationFactor: 0.7,
    };
    const grading = getActiveColorGrading(state);
    assert.equal(grading.type, "desaturated");
    approx(grading.desaturationFactor, 0.7);
  });

  it("warm tint lerps based on color grade blend", () => {
    const state = {
      ...createPostProcessState(),
      colorGrade: "warm",
      warmTint: 0.8,
      desaturationFactor: 0.1,
    };
    const grading = getActiveColorGrading(state);
    assert.ok(grading.warmTint > 0.7);
  });

  it("desaturation factor is between 0 and 1", () => {
    const state = {
      ...createPostProcessState(),
      colorGrade: "desaturated",
      warmTint: 0,
      desaturationFactor: 0.5,
    };
    const grading = getActiveColorGrading(state);
    assert.ok(grading.desaturationFactor >= 0);
    assert.ok(grading.desaturationFactor <= 1);
  });
});

describe("shouldEnableBloom", () => {
  it("returns false when bloomIntensity is below threshold", () => {
    const state = { ...createPostProcessState(), bloomIntensity: 0.01 };
    assert.equal(shouldEnableBloom(state), false);
  });

  it("returns true when bloomIntensity is above threshold", () => {
    const state = { ...createPostProcessState(), bloomIntensity: 0.1 };
    assert.equal(shouldEnableBloom(state), true);
  });

  it("returns false when bloomIntensity is exactly zero", () => {
    const state = { ...createPostProcessState(), bloomIntensity: 0 };
    assert.equal(shouldEnableBloom(state), false);
  });

  it("returns true for combat-level bloom", () => {
    const state = { ...createPostProcessState(), bloomIntensity: 0.6 };
    assert.equal(shouldEnableBloom(state), true);
  });
});
