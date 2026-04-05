export class GameState {
  constructor() {
    this.state = "title";
    this.timer = 0;
    this.callbacks = [];
    this.validTransitions = {
      title: new Set(["playing"]),
      playing: new Set(["victory", "paused"]),
      victory: new Set(["credits"]),
      credits: new Set(["title"]),
      paused: new Set(["playing"]),
    };
    this.timedStates = {
      victory: { duration: 5, next: "credits" },
      credits: { duration: 15, next: "title" },
    };
  }

  transition(newState) {
    if (!this.validTransitions[this.state]?.has(newState)) return false;
    const from = this.state;
    this.state = newState;
    this.timer = 0;
    for (const cb of this.callbacks) cb(from, newState);
    return true;
  }

  getState() {
    return this.state;
  }

  isPlaying() {
    return this.state === "playing";
  }

  onTransition(callback) {
    this.callbacks.push(callback);
  }

  update(deltaTime) {
    const timed = this.timedStates[this.state];
    if (!timed) return;
    this.timer += deltaTime;
    if (this.timer >= timed.duration) {
      this.transition(timed.next);
    }
  }

  reset() {
    this.state = "title";
    this.timer = 0;
  }
}
