import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEndingState,
  updateEndingState,
  getSkyConfig,
  getIslandPositions,
  getCreditsAlpha,
  shouldShowCredits,
  isEndingComplete,
} from './ending-sequence.js';

const HUB = { x: 0, y: 0, z: 0 };
const ISLANDS = [
  { x: 120, y: 0, z: 0 },
  { x: -100, y: 0, z: 80 },
  { x: -60, y: 0, z: -110 },
];

describe('createEndingState', () => {
  it('returns initial state with phase active and timer 0', () => {
    const state = createEndingState();
    assert.strictEqual(state.phase, 'active');
    assert.strictEqual(state.elapsed, 0);
  });
});

describe('updateEndingState', () => {
  it('accumulates elapsed time', () => {
    let state = createEndingState();
    state = updateEndingState(state, 1.5, ISLANDS, HUB);
    assert.ok(state.elapsed >= 1.4);
  });

  it('transitions from active to skyOpening after 1s', () => {
    let state = createEndingState();
    state = updateEndingState(state, 0.9, ISLANDS, HUB);
    assert.strictEqual(state.phase, 'active');
    state = updateEndingState(state, 0.2, ISLANDS, HUB);
    assert.strictEqual(state.phase, 'skyOpening');
  });

  it('transitions from skyOpening to islandsConverging after 4s', () => {
    let state = createEndingState();
    state = updateEndingState(state, 4.0, ISLANDS, HUB);
    assert.strictEqual(state.phase, 'islandsConverging');
  });

  it('transitions from islandsConverging to credits after 8s', () => {
    let state = createEndingState();
    state = updateEndingState(state, 8.0, ISLANDS, HUB);
    assert.strictEqual(state.phase, 'credits');
  });

  it('transitions from credits to complete after 18s', () => {
    let state = createEndingState();
    state = updateEndingState(state, 18.0, ISLANDS, HUB);
    assert.strictEqual(state.phase, 'complete');
  });
});

describe('getSkyConfig', () => {
  it('returns default warm colors in active phase', () => {
    const state = createEndingState();
    const config = getSkyConfig(state);
    assert.strictEqual(config.fogDensity, 1);
    assert.strictEqual(config.cosmicTint, 0);
  });

  it('increases cosmicTint during skyOpening', () => {
    let state = createEndingState();
    state = updateEndingState(state, 2.5, ISLANDS, HUB);
    const config = getSkyConfig(state);
    assert.ok(config.cosmicTint > 0);
    assert.ok(config.cosmicTint < 1);
  });

  it('reduces fog during skyOpening', () => {
    let state = createEndingState();
    state = updateEndingState(state, 3.5, ISLANDS, HUB);
    const config = getSkyConfig(state);
    assert.ok(config.fogDensity < 1);
  });

  it('adds golden tint during islandsConverging', () => {
    let state = createEndingState();
    state = updateEndingState(state, 6.0, ISLANDS, HUB);
    const config = getSkyConfig(state);
    assert.ok(config.goldenTint > 0);
  });

  it('full cosmic during credits', () => {
    let state = createEndingState();
    state = updateEndingState(state, 10.0, ISLANDS, HUB);
    const config = getSkyConfig(state);
    assert.strictEqual(config.cosmicTint, 1);
    assert.strictEqual(config.fogDensity, 0);
    assert.ok(config.goldenTint > 0);
  });
});

describe('getIslandPositions', () => {
  it('returns original positions in active phase', () => {
    const state = createEndingState();
    const positions = getIslandPositions(state, ISLANDS, HUB);
    assert.strictEqual(positions[0].x, ISLANDS[0].x);
    assert.strictEqual(positions[1].z, ISLANDS[1].z);
  });

  it('returns original positions during skyOpening', () => {
    let state = createEndingState();
    state = updateEndingState(state, 3.0, ISLANDS, HUB);
    const positions = getIslandPositions(state, ISLANDS, HUB);
    assert.strictEqual(positions[0].x, ISLANDS[0].x);
  });

  it('moves islands toward hub during islandsConverging', () => {
    let state = createEndingState();
    state = updateEndingState(state, 6.0, ISLANDS, HUB);
    const positions = getIslandPositions(state, ISLANDS, HUB);
    const dist0 = Math.abs(positions[0].x - HUB.x);
    assert.ok(dist0 < Math.abs(ISLANDS[0].x - HUB.x), 'island 0 should be closer to hub');
  });

  it('islands reach near hub at end of converging phase', () => {
    let state = createEndingState();
    state = updateEndingState(state, 7.9, ISLANDS, HUB);
    const positions = getIslandPositions(state, ISLANDS, HUB);
    for (let i = 0; i < positions.length; i++) {
      const dist = Math.sqrt(
        (positions[i].x - HUB.x) ** 2 + (positions[i].z - HUB.z) ** 2
      );
      assert.ok(dist < 5, `island ${i} should be within 5 units of hub, got ${dist}`);
    }
  });

  it('islands stay at hub position during credits', () => {
    let state = createEndingState();
    state = updateEndingState(state, 10.0, ISLANDS, HUB);
    const positions = getIslandPositions(state, ISLANDS, HUB);
    for (let i = 0; i < positions.length; i++) {
      const dist = Math.sqrt(
        (positions[i].x - HUB.x) ** 2 + (positions[i].z - HUB.z) ** 2
      );
      assert.ok(dist < 2, `island ${i} should be at hub, got ${dist}`);
    }
  });
});

describe('getCreditsAlpha', () => {
  it('returns 0 before credits phase', () => {
    const state = createEndingState();
    assert.strictEqual(getCreditsAlpha(state), 0);

    let state2 = createEndingState();
    state2 = updateEndingState(state2, 7.0, ISLANDS, HUB);
    assert.strictEqual(getCreditsAlpha(state2), 0);
  });

  it('fades in from 0 to 1 over 3s during credits phase', () => {
    let state = createEndingState();
    state = updateEndingState(state, 8.0, ISLANDS, HUB);
    const alpha0 = getCreditsAlpha(state);
    assert.ok(alpha0 >= 0);
    assert.ok(alpha0 < 0.5);

    state = updateEndingState(state, 3.0, ISLANDS, HUB);
    const alpha1 = getCreditsAlpha(state);
    assert.ok(alpha1 > alpha0);
    assert.ok(alpha1 <= 1);
  });

  it('returns 1 after fully faded in', () => {
    let state = createEndingState();
    state = updateEndingState(state, 12.0, ISLANDS, HUB);
    assert.strictEqual(getCreditsAlpha(state), 1);
  });
});

describe('shouldShowCredits', () => {
  it('returns false before credits phase', () => {
    const state = createEndingState();
    assert.strictEqual(shouldShowCredits(state), false);

    let state2 = createEndingState();
    state2 = updateEndingState(state2, 7.5, ISLANDS, HUB);
    assert.strictEqual(shouldShowCredits(state2), false);
  });

  it('returns true during credits phase', () => {
    let state = createEndingState();
    state = updateEndingState(state, 9.0, ISLANDS, HUB);
    assert.strictEqual(shouldShowCredits(state), true);
  });

  it('returns true during complete phase', () => {
    let state = createEndingState();
    state = updateEndingState(state, 20.0, ISLANDS, HUB);
    assert.strictEqual(shouldShowCredits(state), true);
  });
});

describe('isEndingComplete', () => {
  it('returns false before complete phase', () => {
    const state = createEndingState();
    assert.strictEqual(isEndingComplete(state), false);

    let state2 = createEndingState();
    state2 = updateEndingState(state2, 17.0, ISLANDS, HUB);
    assert.strictEqual(isEndingComplete(state2), false);
  });

  it('returns true in complete phase', () => {
    let state = createEndingState();
    state = updateEndingState(state, 18.0, ISLANDS, HUB);
    assert.strictEqual(isEndingComplete(state), true);
  });
});
