import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createWindCurrent,
  generateWindCurrentPath,
  isInWindCurrent,
  getWindForce,
  updateWindCurrent,
  createWindCurrentSystem,
  addCurrent,
  removeCurrent,
  updateCurrents,
  getForceAt,
  isInAnyCurrent,
  fadeOutCurrent,
  isCurrentFaded,
} from "./wind_currents.js";

describe("createWindCurrent", () => {
  it("creates a wind current with required properties", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.deepEqual(current.start, { x: 0, y: 20, z: 0 });
    assert.deepEqual(current.end, { x: 100, y: 30, z: 50 });
    assert.equal(current.strength, 5);
    assert.equal(current.width, 10);
  });

  it("has initial phase 0 and time 0", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
    });
    assert.equal(current.phase, 0);
    assert.equal(current.time, 0);
    assert.equal(current.active, true);
  });

  it("uses defaults when params omitted", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
    });
    assert.ok(typeof current.strength === "number");
    assert.ok(typeof current.width === "number");
    assert.ok(current.strength > 0);
    assert.ok(current.width > 0);
  });

  it("auto-generates and caches path points", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      seed: 42,
    });
    assert.ok(Array.isArray(current.points), "points should be auto-generated");
    assert.ok(current.points.length > 0, "points should not be empty");
  });

  it("cached points match generateWindCurrentPath output", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      seed: 42,
    });
    const manual = generateWindCurrentPath(current);
    assert.equal(current.points.length, manual.length);
    for (let i = 0; i < current.points.length; i++) {
      assert.equal(current.points[i].x, manual[i].x, `x mismatch at ${i}`);
      assert.equal(current.points[i].y, manual[i].y, `y mismatch at ${i}`);
      assert.equal(current.points[i].z, manual[i].z, `z mismatch at ${i}`);
    }
  });
});

describe("generateWindCurrentPath", () => {
  it("returns an array of 3D points", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    assert.ok(Array.isArray(points));
    assert.ok(points.length > 0);
    for (const p of points) {
      assert.ok(typeof p.x === "number");
      assert.ok(typeof p.y === "number");
      assert.ok(typeof p.z === "number");
    }
  });

  it("first point is near start", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    const first = points[0];
    assert.ok(Math.abs(first.x - 0) < 0.5);
    assert.ok(Math.abs(first.y - 20) < 0.5);
    assert.ok(Math.abs(first.z - 0) < 0.5);
  });

  it("last point is near end", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 42,
    });
    const points = generateWindCurrentPath(current);
    const last = points[points.length - 1];
    assert.ok(Math.abs(last.x - 100) < 0.5);
    assert.ok(Math.abs(last.y - 30) < 0.5);
    assert.ok(Math.abs(last.z - 50) < 0.5);
  });

  it("is deterministic with same seed", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 99,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 99,
    });
    const p1 = generateWindCurrentPath(c1);
    const p2 = generateWindCurrentPath(c2);
    assert.equal(p1.length, p2.length);
    for (let i = 0; i < p1.length; i++) {
      assert.equal(p1[i].x, p2[i].x, `x mismatch at ${i}`);
      assert.equal(p1[i].y, p2[i].y, `y mismatch at ${i}`);
      assert.equal(p1[i].z, p2[i].z, `z mismatch at ${i}`);
    }
  });

  it("different seeds produce different paths", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 1,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 30, z: 50 },
      strength: 5,
      seed: 2,
    });
    const p1 = generateWindCurrentPath(c1);
    const p2 = generateWindCurrentPath(c2);
    let diff = false;
    for (let i = 0; i < p1.length; i++) {
      if (p1[i].y !== p2[i].y) {
        diff = true;
        break;
      }
    }
    assert.ok(diff, "different seeds should produce different paths");
  });
});

describe("isInWindCurrent", () => {
  it("returns true for a point on the wind path center", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.ok(isInWindCurrent(current, { x: 50, y: 20, z: 0 }));
  });

  it("returns true for a point within width of the path", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.ok(isInWindCurrent(current, { x: 50, y: 20, z: 4 }));
  });

  it("returns false for a point outside the current", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.ok(!isInWindCurrent(current, { x: 50, y: 20, z: 20 }));
  });

  it("returns false for a point past the end", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    assert.ok(!isInWindCurrent(current, { x: 150, y: 20, z: 0 }));
  });

  it("returns false when current is inactive", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    current.active = false;
    assert.ok(!isInWindCurrent(current, { x: 50, y: 20, z: 0 }));
  });
});

describe("getWindForce", () => {
  it("returns a force vector with x, y, z", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 25, z: 0 },
      strength: 5,
      seed: 42,
    });
    const force = getWindForce(current, { x: 50, y: 22, z: 0 });
    assert.ok(typeof force.x === "number");
    assert.ok(typeof force.y === "number");
    assert.ok(typeof force.z === "number");
  });

  it("force direction follows the path direction", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      seed: 42,
      fadeInDuration: 0,
    });
    const force = getWindForce(current, { x: 50, y: 20, z: 0 });
    assert.ok(force.x > 0, "force should push toward end (positive x)");
  });

  it("force magnitude is proportional to strength", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 2,
      seed: 42,
      fadeInDuration: 0,
    });

    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      seed: 42,
      fadeInDuration: 0,
    });

    const f1 = getWindForce(c1, { x: 50, y: 20, z: 0 });
    const f2 = getWindForce(c2, { x: 50, y: 20, z: 0 });

    const mag1 = Math.sqrt(f1.x * f1.x + f1.y * f1.y + f1.z * f1.z);
    const mag2 = Math.sqrt(f2.x * f2.x + f2.y * f2.y + f2.z * f2.z);
    assert.ok(mag2 > mag1, `stronger current should produce more force: ${mag2} vs ${mag1}`);
  });

  it("returns zero force when outside current", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 5,
      seed: 42,
    });
    const force = getWindForce(current, { x: 50, y: 20, z: 100 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });
});

describe("updateWindCurrent", () => {
  it("advances time by dt", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = updateWindCurrent(current, 0.1);
    assert.ok(updated.time > current.time);
    assert.ok(Math.abs(updated.time - current.time - 0.1) < 0.001);
  });

  it("advances phase for particle animation", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = updateWindCurrent(current, 0.1);
    assert.ok(updated.phase !== current.phase || updated.time > current.time);
  });

  it("does not mutate the original", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const originalTime = current.time;
    updateWindCurrent(current, 0.1);
    assert.equal(current.time, originalTime);
  });

  it("phase wraps around periodically", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    let updated = current;
    for (let i = 0; i < 1000; i++) {
      updated = updateWindCurrent(updated, 0.1);
    }
    assert.ok(updated.phase < Math.PI * 2, `phase should stay bounded, got ${updated.phase}`);
  });

  it("preserves cached points after update", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const updated = updateWindCurrent(current, 0.1);
    assert.ok(Array.isArray(updated.points), "points should be preserved after update");
    assert.equal(updated.points.length, current.points.length);
  });
});

describe("createWindCurrentSystem", () => {
  it("creates a system with empty currents array", () => {
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
    assert.equal(system.currents[0].id, "w1");
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
    assert.equal(updated.currents[0].strength, 5);
  });

  it("does not mutate the original system", () => {
    const system = createWindCurrentSystem();
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    addCurrent(system, current);
    assert.equal(system.currents.length, 0);
  });
});

describe("removeCurrent", () => {
  it("removes a current from the system", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      id: "wind1",
      seed: 42,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 50 },
      end: { x: 100, y: 20, z: 50 },
      strength: 3,
      id: "wind2",
      seed: 99,
    });
    const system = createWindCurrentSystem([c1, c2]);
    const updated = removeCurrent(system, "wind1");
    assert.equal(updated.currents.length, 1);
    assert.equal(updated.currents[0].id, "wind2");
  });

  it("does not mutate the original system", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      id: "wind1",
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    removeCurrent(system, "wind1");
    assert.equal(system.currents.length, 1);
  });
});

describe("updateCurrents", () => {
  it("advances all currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 50 },
      end: { x: 100, y: 20, z: 50 },
      strength: 3,
      seed: 99,
    });
    const system = createWindCurrentSystem([c1, c2]);
    const updated = updateCurrents(system, 0.1);
    for (const c of updated.currents) {
      assert.ok(c.time > 0);
    }
  });

  it("does not mutate the original system", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    updateCurrents(system, 0.1);
    assert.equal(system.currents[0].time, 0);
  });

  it("preserves cached points on all currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    const updated = updateCurrents(system, 0.1);
    assert.ok(Array.isArray(updated.currents[0].points), "points should be preserved");
  });
});

describe("getForceAt", () => {
  it("returns combined force from all affecting currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
      fadeInDuration: 0,
    });
    const system = createWindCurrentSystem([c1]);
    const force = getForceAt(system, { x: 50, y: 20, z: 0 });
    assert.ok(typeof force.x === "number");
    assert.ok(typeof force.y === "number");
    assert.ok(typeof force.z === "number");
  });

  it("returns zero when no currents affect position", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 2,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    const force = getForceAt(system, { x: 500, y: 20, z: 500 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });

  it("uses cached points without regenerating", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    const originalPoints = c1.points;
    getForceAt(system, { x: 50, y: 20, z: 0 });
    assert.strictEqual(c1.points, originalPoints, "should use same cached points reference");
  });

  it("returns zero for empty system", () => {
    const system = createWindCurrentSystem();
    const force = getForceAt(system, { x: 50, y: 20, z: 0 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });
});

describe("isInAnyCurrent", () => {
  it("returns true when position is within a current", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    assert.ok(isInAnyCurrent(system, { x: 50, y: 20, z: 0 }));
  });

  it("returns false when position is outside all currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 10,
      seed: 42,
    });
    const system = createWindCurrentSystem([c1]);
    assert.ok(!isInAnyCurrent(system, { x: 500, y: 20, z: 500 }));
  });

  it("returns false for empty system", () => {
    const system = createWindCurrentSystem();
    assert.ok(!isInAnyCurrent(system, { x: 50, y: 20, z: 0 }));
  });

  it("returns true if position is in any of multiple currents", () => {
    const c1 = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      width: 5,
      seed: 42,
    });
    const c2 = createWindCurrent({
      start: { x: 0, y: 20, z: 50 },
      end: { x: 100, y: 20, z: 50 },
      strength: 3,
      width: 10,
      seed: 99,
    });
    const system = createWindCurrentSystem([c1, c2]);
    assert.ok(isInAnyCurrent(system, { x: 50, y: 20, z: 0 }));
    assert.ok(isInAnyCurrent(system, { x: 50, y: 20, z: 50 }));
  });
});

describe("wind fade in", () => {
  it("force is zero at time 0", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 1,
      pulseAmplitude: 0,
    });
    const force = getWindForce(current, { x: 50, y: 20, z: 0 });
    assert.equal(force.x, 0);
    assert.equal(force.y, 0);
    assert.equal(force.z, 0);
  });

  it("force is near full strength after fadeInDuration", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 0.5,
      pulseAmplitude: 0,
    });
    let updated = current;
    for (let i = 0; i < 100; i++) {
      updated = updateWindCurrent(updated, 0.01);
    }
    const force = getWindForce(updated, { x: 50, y: 20, z: 0 });
    const mag = Math.sqrt(force.x * force.x + force.y * force.y + force.z * force.z);
    assert.ok(mag > 8, `force should be near full strength after fade in, got ${mag}`);
  });

  it("force gradually increases during fade in", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 1,
      pulseAmplitude: 0,
    });
    let halfCurrent = current;
    for (let i = 0; i < 50; i++) {
      halfCurrent = updateWindCurrent(halfCurrent, 0.01);
    }
    let fullCurrent = current;
    for (let i = 0; i < 100; i++) {
      fullCurrent = updateWindCurrent(fullCurrent, 0.01);
    }
    const halfForce = getWindForce(halfCurrent, { x: 50, y: 20, z: 0 });
    const fullForce = getWindForce(fullCurrent, { x: 50, y: 20, z: 0 });
    const halfMag = Math.sqrt(
      halfForce.x * halfForce.x + halfForce.y * halfForce.y + halfForce.z * halfForce.z,
    );
    const fullMag = Math.sqrt(
      fullForce.x * fullForce.x + fullForce.y * fullForce.y + fullForce.z * fullForce.z,
    );
    assert.ok(halfMag < fullMag, "half-way force should be less than full force");
    assert.ok(halfMag > 0, "half-way force should be non-zero");
  });
});

describe("wind fade out", () => {
  it("fadeOutCurrent marks current as fading", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    const faded = fadeOutCurrent(current);
    assert.equal(faded.fadingOut, true);
    assert.equal(faded.fadeOutStart, current.time);
  });

  it("force decreases after fade out starts", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 0,
      fadeOutDuration: 1,
      pulseAmplitude: 0,
    });
    let updated = current;
    for (let i = 0; i < 200; i++) {
      updated = updateWindCurrent(updated, 0.01);
    }
    const fullForce = getWindForce(updated, { x: 50, y: 20, z: 0 });
    const fullMag = Math.sqrt(
      fullForce.x * fullForce.x + fullForce.y * fullForce.y + fullForce.z * fullForce.z,
    );

    const fading = fadeOutCurrent(updated);
    let faded = fading;
    for (let i = 0; i < 50; i++) {
      faded = updateWindCurrent(faded, 0.01);
    }
    const fadedForce = getWindForce(faded, { x: 50, y: 20, z: 0 });
    const fadedMag = Math.sqrt(
      fadedForce.x * fadedForce.x + fadedForce.y * fadedForce.y + fadedForce.z * fadedForce.z,
    );

    assert.ok(fadedMag < fullMag, "faded force should be less than full force");
    assert.ok(fadedMag > 0, "half-way faded force should be non-zero");
  });

  it("force reaches zero after fadeOutDuration", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 10,
      width: 10,
      seed: 42,
      fadeInDuration: 0,
      fadeOutDuration: 0.5,
      pulseAmplitude: 0,
    });
    let updated = current;
    for (let i = 0; i < 200; i++) {
      updated = updateWindCurrent(updated, 0.01);
    }
    const fading = fadeOutCurrent(updated);
    let faded = fading;
    for (let i = 0; i < 60; i++) {
      faded = updateWindCurrent(faded, 0.01);
    }
    const force = getWindForce(faded, { x: 50, y: 20, z: 0 });
    const mag = Math.sqrt(force.x * force.x + force.y * force.y + force.z * force.z);
    assert.ok(mag < 0.01, `force should be ~0 after fade out, got ${mag}`);
  });

  it("isCurrentFaded returns false when not fading", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      seed: 42,
    });
    assert.equal(isCurrentFaded(current), false);
  });

  it("isCurrentFaded returns false before fadeOutDuration", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      fadeOutDuration: 1,
      seed: 42,
    });
    let updated = fadeOutCurrent(current);
    updated = updateWindCurrent(updated, 0.5);
    assert.equal(isCurrentFaded(updated), false);
  });

  it("isCurrentFaded returns true after fadeOutDuration", () => {
    const current = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      fadeOutDuration: 1,
      seed: 42,
    });
    let updated = fadeOutCurrent(current);
    for (let i = 0; i < 110; i++) {
      updated = updateWindCurrent(updated, 0.01);
    }
    assert.equal(isCurrentFaded(updated), true);
  });

  it("updateCurrents removes fully faded currents", () => {
    const c = createWindCurrent({
      start: { x: 0, y: 20, z: 0 },
      end: { x: 100, y: 20, z: 0 },
      strength: 5,
      fadeOutDuration: 0.5,
      seed: 42,
    });
    let current = fadeOutCurrent(c);
    for (let i = 0; i < 200; i++) {
      current = updateWindCurrent(current, 0.01);
    }
    const system = createWindCurrentSystem([current]);
    const updated = updateCurrents(system, 0.01);
    assert.equal(updated.currents.length, 0);
  });
});
