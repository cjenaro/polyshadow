export class ProgressionTracker {
  constructor() {
    this.defeated = new Set();
    this.total = 3;
    this.allDefeatedFired = false;
    this.callbacks = [];
  }

  defeatColossus(id) {
    if (this.allDefeatedFired || this.defeated.has(id)) return;
    this.defeated.add(id);
    if (this.isAllDefeated()) {
      this.allDefeatedFired = true;
      for (const cb of this.callbacks) cb();
    }
  }

  getDefeatedCount() {
    return this.defeated.size;
  }

  isAllDefeated() {
    return this.defeated.size >= this.total;
  }

  getProgress() {
    return {
      defeated: this.defeated,
      total: this.total,
      allDefeated: this.isAllDefeated(),
    };
  }

  onAllDefeated(callback) {
    this.callbacks.push(callback);
  }

  reset() {
    this.defeated.clear();
    this.allDefeatedFired = false;
  }

  toJSON() {
    return {
      defeated: [...this.defeated],
      total: this.total,
    };
  }

  static fromJSON(data) {
    const tracker = new ProgressionTracker();
    for (const id of data.defeated) {
      tracker.defeated.add(id);
    }
    if (tracker.isAllDefeated()) {
      tracker.allDefeatedFired = true;
    }
    return tracker;
  }
}
