import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createArenaTransitionManager,
  updateArenaTransition,
  getTransitionProgress,
  isTransitioning,
  startTransitionToArena,
  startTransitionToHub,
  shouldTriggerArenaEntry,
  shouldTriggerHubReturn,
  TRANSITION_STATES,
} from "./arena-transition.js";

describe("arena-transition", () => {
  const arenaConfigs = [
    { type: "sentinel", center: { x: 120, z: 0 } },
    { type: "titan", center: { x: -100, z: 80 } },
    { type: "wraith", center: { x: -60, z: -110 } },
  ];
  const defeated = new Set();

  describe("createArenaTransitionManager", () => {
    it("creates manager in idle state", () => {
      const mgr = createArenaTransitionManager();
      assert.strictEqual(mgr.state, TRANSITION_STATES.IDLE);
      assert.strictEqual(mgr.progress, 0);
      assert.strictEqual(mgr.currentArena, null);
      assert.strictEqual(mgr.fadeDuration, 1);
    });

    it("creates manager with custom fade duration", () => {
      const mgr = createArenaTransitionManager({ fadeDuration: 2 });
      assert.strictEqual(mgr.fadeDuration, 2);
    });
  });

  describe("startTransitionToArena", () => {
    it("transitions to fading_out state with correct arena", () => {
      const mgr = createArenaTransitionManager();
      const result = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      assert.strictEqual(result.state, TRANSITION_STATES.FADING_OUT);
      assert.strictEqual(result.currentArena, "sentinel");
      assert.strictEqual(result.progress, 0);
      assert.ok(result !== mgr);
    });

    it("returns unchanged state if already transitioning", () => {
      const mgr = createArenaTransitionManager();
      const first = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      const second = startTransitionToArena(first, "titan", arenaConfigs);
      assert.strictEqual(second.state, TRANSITION_STATES.FADING_OUT);
      assert.strictEqual(second.currentArena, "sentinel");
    });

    it("returns unchanged state if arena already defeated", () => {
      const mgr = createArenaTransitionManager();
      const defeatedSet = new Set(["sentinel"]);
      const result = startTransitionToArena(mgr, "sentinel", arenaConfigs, defeatedSet);
      assert.strictEqual(result.state, TRANSITION_STATES.IDLE);
    });
  });

  describe("startTransitionToHub", () => {
    it("transitions to fading_out state for hub return", () => {
      const mgr = createArenaTransitionManager();
      mgr.state = TRANSITION_STATES.IN_ARENA;
      mgr.currentArena = "sentinel";
      const result = startTransitionToHub(mgr);
      assert.strictEqual(result.state, TRANSITION_STATES.FADING_OUT);
      assert.strictEqual(result.returningToHub, true);
    });

    it("does nothing if not in arena", () => {
      const mgr = createArenaTransitionManager();
      const result = startTransitionToHub(mgr);
      assert.strictEqual(result.state, TRANSITION_STATES.IDLE);
    });
  });

  describe("updateArenaTransition", () => {
    it("advances progress during fading_out", () => {
      let mgr = createArenaTransitionManager();
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      const result = updateArenaTransition(mgr, 0.5);
      assert.strictEqual(result.state, TRANSITION_STATES.FADING_OUT);
      assert.ok(result.progress > 0);
    });

    it("transitions to teleporting when fade_out completes", () => {
      let mgr = createArenaTransitionManager({ fadeDuration: 1 });
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      mgr = { ...mgr, progress: 0.99 };
      const result = updateArenaTransition(mgr, 0.05);
      assert.strictEqual(result.state, TRANSITION_STATES.TELEPORTING);
    });

    it("transitions to fading_in after teleporting", () => {
      let mgr = createArenaTransitionManager({ teleportDelay: 0.1 });
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      mgr = { ...mgr, state: TRANSITION_STATES.TELEPORTING, progress: 0.05 };
      const result = updateArenaTransition(mgr, 0.1);
      assert.strictEqual(result.state, TRANSITION_STATES.FADING_IN);
    });

    it("transitions to in_arena when fading_in completes", () => {
      let mgr = createArenaTransitionManager({ fadeDuration: 1 });
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      mgr = { ...mgr, state: TRANSITION_STATES.FADING_IN, progress: 0.99 };
      const result = updateArenaTransition(mgr, 0.05);
      assert.strictEqual(result.state, TRANSITION_STATES.IN_ARENA);
    });

    it("transitions to idle when returning to hub completes", () => {
      let mgr = createArenaTransitionManager({ fadeDuration: 1 });
      mgr = { ...mgr, state: TRANSITION_STATES.FADING_IN, returningToHub: true, progress: 0.99 };
      const result = updateArenaTransition(mgr, 0.05);
      assert.strictEqual(result.state, TRANSITION_STATES.IDLE);
      assert.strictEqual(result.currentArena, null);
    });

    it("does not mutate the original", () => {
      let mgr = createArenaTransitionManager();
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      const copy = { ...mgr };
      updateArenaTransition(mgr, 0.5);
      assert.strictEqual(mgr.progress, copy.progress);
    });
  });

  describe("getTransitionProgress", () => {
    it("returns normalized 0-1 fade value during fading_out", () => {
      let mgr = createArenaTransitionManager({ fadeDuration: 1 });
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      mgr = updateArenaTransition(mgr, 0.5);
      const progress = getTransitionProgress(mgr);
      assert.ok(progress >= 0 && progress <= 1);
    });

    it("returns 1 during teleporting (fully black)", () => {
      let mgr = createArenaTransitionManager();
      mgr = { ...mgr, state: TRANSITION_STATES.TELEPORTING };
      assert.strictEqual(getTransitionProgress(mgr), 1);
    });

    it("returns inverted value during fading_in", () => {
      let mgr = createArenaTransitionManager({ fadeDuration: 1 });
      mgr = { ...mgr, state: TRANSITION_STATES.FADING_IN, progress: 0.75 };
      const progress = getTransitionProgress(mgr);
      assert.ok(progress < 0.3);
    });
  });

  describe("isTransitioning", () => {
    it("returns true during fading_out", () => {
      let mgr = createArenaTransitionManager();
      mgr = startTransitionToArena(mgr, "sentinel", arenaConfigs);
      assert.ok(isTransitioning(mgr));
    });

    it("returns true during teleporting", () => {
      let mgr = createArenaTransitionManager();
      mgr = { ...mgr, state: TRANSITION_STATES.TELEPORTING };
      assert.ok(isTransitioning(mgr));
    });

    it("returns true during fading_in", () => {
      let mgr = createArenaTransitionManager();
      mgr = { ...mgr, state: TRANSITION_STATES.FADING_IN };
      assert.ok(isTransitioning(mgr));
    });

    it("returns false when idle", () => {
      const mgr = createArenaTransitionManager();
      assert.ok(!isTransitioning(mgr));
    });

    it("returns false when in_arena", () => {
      let mgr = createArenaTransitionManager();
      mgr = { ...mgr, state: TRANSITION_STATES.IN_ARENA };
      assert.ok(!isTransitioning(mgr));
    });
  });

  describe("shouldTriggerArenaEntry", () => {
    it("returns colossus type when player is close to arena indicator", () => {
      const playerPos = { x: 110, z: 0 };
      const result = shouldTriggerArenaEntry(playerPos, arenaConfigs, defeated, 15);
      assert.strictEqual(result, "sentinel");
    });

    it("returns null when player is far from all arenas", () => {
      const playerPos = { x: 0, z: 0 };
      const result = shouldTriggerArenaEntry(playerPos, arenaConfigs, defeated, 15);
      assert.strictEqual(result, null);
    });

    it("returns null for defeated colossus", () => {
      const playerPos = { x: 110, z: 0 };
      const defeatedSet = new Set(["sentinel"]);
      const result = shouldTriggerArenaEntry(playerPos, arenaConfigs, defeatedSet, 15);
      assert.strictEqual(result, null);
    });

    it("respects custom trigger distance", () => {
      const playerPos = { x: 110, z: 0 };
      const result = shouldTriggerArenaEntry(playerPos, arenaConfigs, defeated, 8);
      assert.strictEqual(result, null);
      const result2 = shouldTriggerArenaEntry(playerPos, arenaConfigs, defeated, 12);
      assert.strictEqual(result2, "sentinel");
    });
  });

  describe("shouldTriggerHubReturn", () => {
    it("returns true when colossus is defeated and in arena", () => {
      const mgr = createArenaTransitionManager();
      mgr.state = TRANSITION_STATES.IN_ARENA;
      mgr.currentArena = "sentinel";
      const result = shouldTriggerHubReturn(mgr, "sentinel", new Set());
      assert.ok(result);
    });

    it("returns false when not in arena", () => {
      const mgr = createArenaTransitionManager();
      const result = shouldTriggerHubReturn(mgr, "sentinel", new Set());
      assert.ok(!result);
    });

    it("returns false when already transitioning", () => {
      const mgr = createArenaTransitionManager();
      mgr.state = TRANSITION_STATES.FADING_OUT;
      mgr.currentArena = "sentinel";
      const result = shouldTriggerHubReturn(mgr, "sentinel", new Set());
      assert.ok(!result);
    });
  });
});
