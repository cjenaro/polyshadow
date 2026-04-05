import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createDirectionIndicator,
  updateIndicators,
  getIndicatorDirection,
  isIndicatorVisible,
  createShrine,
} from "./indicators.js";

describe("createDirectionIndicator", () => {
  it("creates indicator with colossus id", () => {
    const indicator = createDirectionIndicator("colossus_1", { x: 1, z: 0 });
    assert.equal(indicator.colossusId, "colossus_1");
  });

  it("creates indicator with direction", () => {
    const indicator = createDirectionIndicator("colossus_1", { x: 1, z: 0 });
    assert.ok(typeof indicator.direction === "object");
    assert.ok(typeof indicator.direction.x === "number");
    assert.ok(typeof indicator.direction.z === "number");
  });

  it("normalizes direction vector", () => {
    const indicator = createDirectionIndicator("colossus_1", { x: 100, z: 0 });
    const len = Math.sqrt(indicator.direction.x ** 2 + indicator.direction.z ** 2);
    assert.ok(Math.abs(len - 1) < 1e-6, `direction length should be 1, got ${len}`);
  });

  it("sets initial visibility", () => {
    const indicator = createDirectionIndicator("colossus_1", { x: 1, z: 0 });
    assert.equal(indicator.visible, true);
    assert.equal(indicator.opacity, 1);
  });

  it("handles zero direction gracefully", () => {
    const indicator = createDirectionIndicator("colossus_1", { x: 0, z: 0 });
    assert.equal(indicator.direction.x, 0);
    assert.equal(indicator.direction.z, 0);
  });
});

describe("getIndicatorDirection", () => {
  it("returns the direction vector", () => {
    const indicator = createDirectionIndicator("c1", { x: 3, z: 4 });
    const dir = getIndicatorDirection(indicator);
    assert.ok(Math.abs(dir.x - 0.6) < 1e-6);
    assert.ok(Math.abs(dir.z - 0.8) < 1e-6);
  });
});

describe("isIndicatorVisible", () => {
  it("returns true when player is on hub island", () => {
    const indicator = createDirectionIndicator("c1", { x: 1, z: 0 });
    assert.ok(isIndicatorVisible(indicator, { x: 0, y: 0, z: 0 }));
  });

  it("returns false when indicator opacity is near zero (close to colossus)", () => {
    const indicator = createDirectionIndicator("c1", { x: 100, z: 0 });
    indicator.opacity = 0;
    assert.ok(!isIndicatorVisible(indicator, { x: 95, y: 0, z: 0 }));
  });

  it("respects indicator disabled state", () => {
    const indicator = createDirectionIndicator("c1", { x: 100, z: 0 });
    indicator.visible = false;
    assert.ok(!isIndicatorVisible(indicator, { x: 0, y: 0, z: 0 }));
  });
});

describe("updateIndicators", () => {
  it("updates opacity based on distance", () => {
    const indicators = [
      createDirectionIndicator("c1", { x: 200, z: 0 }),
      createDirectionIndicator("c2", { x: 20, z: 0 }),
    ];
    const updated = updateIndicators(indicators, { x: 0, y: 0, z: 0 }, [
      { id: "c1", x: 200, z: 0, defeated: false },
      { id: "c2", x: 20, z: 0, defeated: false },
    ]);
    assert.ok(updated[0].opacity >= 0 && updated[0].opacity <= 1);
    assert.ok(updated[1].opacity >= 0 && updated[1].opacity <= 1);
  });

  it("hides indicators for defeated colossi", () => {
    const indicators = [createDirectionIndicator("c1", { x: 100, z: 0 })];
    const updated = updateIndicators(indicators, { x: 0, y: 0, z: 0 }, [
      { id: "c1", x: 100, z: 0, defeated: true },
    ]);
    assert.equal(updated[0].visible, false);
  });

  it("hides indicators when player is close to colossus", () => {
    const indicators = [createDirectionIndicator("c1", { x: 50, z: 0 })];
    const updated = updateIndicators(indicators, { x: 48, y: 0, z: 0 }, [
      { id: "c1", x: 50, z: 0, defeated: false },
    ]);
    assert.ok(!updated[0].visible);
  });

  it("does not mutate original indicators", () => {
    const indicators = [createDirectionIndicator("c1", { x: 100, z: 0 })];
    const originalOpacity = indicators[0].opacity;
    updateIndicators(indicators, { x: 0, y: 0, z: 0 }, [
      { id: "c1", x: 100, z: 0, defeated: true },
    ]);
    assert.equal(indicators[0].opacity, originalOpacity);
    assert.equal(indicators[0].visible, true);
  });

  it("fades indicators for distant colossi", () => {
    const indicators = [
      createDirectionIndicator("c1", { x: 2000, z: 0 }),
      createDirectionIndicator("c2", { x: 50, z: 0 }),
    ];
    const updated = updateIndicators(indicators, { x: 0, y: 0, z: 0 }, [
      { id: "c1", x: 2000, z: 0, defeated: false },
      { id: "c2", x: 50, z: 0, defeated: false },
    ]);
    assert.ok(updated[0].opacity < updated[1].opacity);
  });
});

describe("createShrine", () => {
  it("creates shrine with no defeated colossi", () => {
    const shrine = createShrine([]);
    assert.ok(Array.isArray(shrine.defeated));
    assert.equal(shrine.defeated.length, 0);
  });

  it("tracks defeated colossi", () => {
    const shrine = createShrine(["c1", "c2"]);
    assert.equal(shrine.defeated.length, 2);
    assert.ok(shrine.defeated.includes("c1"));
    assert.ok(shrine.defeated.includes("c2"));
  });

  it("can mark colossus as defeated (immutable)", () => {
    const shrine = createShrine([]);
    const updated = shrine.markDefeated("c1");
    assert.ok(updated.defeated.includes("c1"));
    assert.ok(!shrine.defeated.includes("c1"));
  });

  it("does not duplicate defeated entries", () => {
    const shrine = createShrine(["c1"]);
    const updated = shrine.markDefeated("c1");
    const count = updated.defeated.filter((id) => id === "c1").length;
    assert.equal(count, 1);
  });

  it("can check if colossus is defeated", () => {
    const shrine = createShrine(["c1"]);
    assert.equal(shrine.isDefeated("c1"), true);
    assert.equal(shrine.isDefeated("c2"), false);
  });

  it("can count remaining colossi", () => {
    const shrine = createShrine(["c1", "c2"]);
    assert.equal(shrine.remainingCount(5), 3);
    assert.equal(shrine.remainingCount(2), 0);
  });
});
