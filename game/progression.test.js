import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProgressionTracker } from './progression.js';

describe('ProgressionTracker', () => {
  it('starts with zero defeated', () => {
    const tracker = new ProgressionTracker();
    assert.strictEqual(tracker.getDefeatedCount(), 0);
    assert.strictEqual(tracker.isAllDefeated(), false);
  });

  it('tracks a defeated colossus', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    assert.strictEqual(tracker.getDefeatedCount(), 1);
  });

  it('does not double-count the same colossus', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('sentinel');
    assert.strictEqual(tracker.getDefeatedCount(), 1);
  });

  it('tracks multiple colossi', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    assert.strictEqual(tracker.getDefeatedCount(), 2);
  });

  it('reports all defeated when all 3 are defeated', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    assert.strictEqual(tracker.getDefeatedCount(), 3);
    assert.strictEqual(tracker.isAllDefeated(), true);
  });

  it('reports not all defeated with 2 of 3', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    assert.strictEqual(tracker.isAllDefeated(), false);
  });

  it('returns progress object', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    const progress = tracker.getProgress();
    assert.ok(progress.defeated.has('sentinel'));
    assert.strictEqual(progress.total, 3);
    assert.strictEqual(progress.allDefeated, false);
  });

  it('progress.defeated is a Set', () => {
    const tracker = new ProgressionTracker();
    const progress = tracker.getProgress();
    assert.ok(progress.defeated instanceof Set);
  });

  it('calls onAllDefeated callback when last colossus falls', () => {
    const tracker = new ProgressionTracker();
    let called = false;
    tracker.onAllDefeated(() => { called = true; });
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    assert.strictEqual(called, false);
    tracker.defeatColossus('titan');
    assert.strictEqual(called, true);
  });

  it('calls onAllDefeated only once', () => {
    const tracker = new ProgressionTracker();
    let count = 0;
    tracker.onAllDefeated(() => { count++; });
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    assert.strictEqual(count, 1);
  });

  it('supports multiple onAllDefeated callbacks', () => {
    const tracker = new ProgressionTracker();
    const results = [];
    tracker.onAllDefeated(() => { results.push('a'); });
    tracker.onAllDefeated(() => { results.push('b'); });
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    assert.deepStrictEqual(results, ['a', 'b']);
  });

  it('reset clears all defeated colossi', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.reset();
    assert.strictEqual(tracker.getDefeatedCount(), 0);
    assert.strictEqual(tracker.isAllDefeated(), false);
  });

  it('reset allows onAllDefeated to fire again', () => {
    const tracker = new ProgressionTracker();
    let count = 0;
    tracker.onAllDefeated(() => { count++; });
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    assert.strictEqual(count, 1);
    tracker.reset();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    assert.strictEqual(count, 2);
  });

  it('serializes to JSON', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    const json = tracker.toJSON();
    const parsed = JSON.parse(JSON.stringify(json));
    assert.deepStrictEqual(parsed.defeated, ['sentinel', 'wraith']);
  });

  it('deserializes from JSON', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    const json = tracker.toJSON();
    const restored = ProgressionTracker.fromJSON(JSON.parse(JSON.stringify(json)));
    assert.strictEqual(restored.getDefeatedCount(), 2);
    assert.ok(restored.getProgress().defeated.has('sentinel'));
    assert.ok(restored.getProgress().defeated.has('wraith'));
    assert.strictEqual(restored.isAllDefeated(), false);
  });

  it('fromJSON of fully defeated state', () => {
    const tracker = new ProgressionTracker();
    tracker.defeatColossus('sentinel');
    tracker.defeatColossus('wraith');
    tracker.defeatColossus('titan');
    const json = tracker.toJSON();
    const restored = ProgressionTracker.fromJSON(JSON.parse(JSON.stringify(json)));
    assert.strictEqual(restored.isAllDefeated(), true);
    assert.strictEqual(restored.getDefeatedCount(), 3);
  });
});
