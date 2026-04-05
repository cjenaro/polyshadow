import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createWindCurrentSystem,
  createWindCurrent,
  addCurrent,
  updateCurrents,
  getWindForce,
  isInAnyCurrent,
} from "./wind.js";

describe("createWindCurrentSystem", () => {
  it("creates empty system by default", () => {
    const system = createWindCurrentSystem();
    assert.ok(Array.isArray(system.currents));
    assert.equal(system.currents.length, 0);
  });

  it("creates system from initial currents", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      id: "w1",
      seed: 42,
    });
    const system = createWindCurrentSystem([c]);
    assert.equal(system.currents.length, 1);
  });
});

describe("addCurrent", () => {
  it("adds a current to the system", () => {
    const system = createWindCurrentSystem();
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = addCurrent(system, current);
    assert.equal(updated.currents.length, 1);
  });
});

describe("getWindForce", () => {
  it("returns zero force outside any current", () => {
    const system = createWindCurrentSystem();
    const force = getWindForce(system, { x: 0, y: 0, z: 0 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });

  it("returns non-zero force inside a current", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 0,
    });
    const system = createWindCurrentSystem([c]);
    const force = getWindForce(system, { x: 50, y: 20, z: 0 });
    assert.ok(Math.abs(force.x) > 0, "should have horizontal force inside current");
  });

  it("force direction follows path direction", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 0,
    });
    const system = createWindCurrentSystem([c]);
    const force = getWindForce(system, { x: 50, y: 20, z: 0 });
    assert.ok(force.x > 0, "should push toward end (positive x)");
  });

  it("uses cached points without regenerating", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const system = createWindCurrentSystem([c]);
    const originalPoints = c.points;
    getWindForce(system, { x: 50, y: 20, z: 0 });
    assert.strictEqual(c.points, originalPoints, "should use same cached points reference");
  });

  it("combines forces from multiple overlapping currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 20,
      seed: 42,
      fadeInDuration: 0,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 20,
      seed: 99,
      fadeInDuration: 0,
    });
    const singleSystem = createWindCurrentSystem([c1]);
    const doubleSystem = createWindCurrentSystem([c1, c2]);
    const f1 = getWindForce(singleSystem, { x: 50, y: 20, z: 0 });
    const f2 = getWindForce(doubleSystem, { x: 50, y: 20, z: 0 });
    const mag1 = Math.sqrt(f1.x * f1.x + f1.y * f1.y + f1.z * f1.z);
    const mag2 = Math.sqrt(f2.x * f2.x + f2.y * f2.y + f2.z * f2.z);
    assert.ok(mag2 > mag1, "two currents should produce more force than one");
  });
});

describe("updateCurrents", () => {
  it("advances all currents without regenerating paths", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const system = createWindCurrentSystem([c]);
    const updated = updateCurrents(system, 0.1);
    assert.ok(updated.currents[0].time > 0);
    assert.ok(Array.isArray(updated.currents[0].points), "cached points preserved");
  });
});

describe("isInAnyCurrent", () => {
  it("returns true inside a current", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const system = createWindCurrentSystem([c]);
    assert.ok(isInAnyCurrent(system, { x: 50, y: 20, z: 0 }));
  });

  it("returns false outside all currents", () => {
    const system = createWindCurrentSystem();
    assert.ok(!isInAnyCurrent(system, { x: 50, y: 20, z: 0 }));
  });
});
