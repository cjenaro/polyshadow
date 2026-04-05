import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UISystem } from "./ui.js";

const EPS = 1e-6;

function approx(a, b, eps = EPS) {
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b} (diff ${Math.abs(a - b)})`);
}

describe("UISystem", () => {
  describe("getStaminaArc", () => {
    it("returns full circle at max stamina when climbing", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(1.0, 1.0, 0, true);
      approx(arc.startAngle, 0);
      approx(arc.endAngle, Math.PI * 2);
      approx(arc.color.r, 1);
      approx(arc.color.g, 1);
      approx(arc.color.b, 1);
      approx(arc.opacity, 1);
    });

    it("arc shrinks as stamina decreases", () => {
      const ui = new UISystem();
      const half = ui.getStaminaArc(0.5, 1.0);
      approx(half.startAngle, 0);
      approx(half.endAngle, Math.PI);
    });

    it("arc is quarter circle at 0.25 stamina", () => {
      const ui = new UISystem();
      const quarter = ui.getStaminaArc(0.25, 1.0);
      approx(quarter.endAngle, Math.PI * 0.5);
    });

    it("arc is zero at 0 stamina", () => {
      const ui = new UISystem();
      const empty = ui.getStaminaArc(0, 1.0);
      approx(empty.endAngle, 0);
    });

    it("color lerps from white to red as stamina decreases", () => {
      const ui = new UISystem();
      const full = ui.getStaminaArc(1.0, 1.0);
      const mid = ui.getStaminaArc(0.5, 1.0);
      const low = ui.getStaminaArc(0, 1.0);
      approx(full.color.r, 1);
      approx(full.color.g, 1);
      approx(full.color.b, 1);
      approx(low.color.r, 1);
      approx(low.color.g, 0);
      approx(low.color.b, 0);
      assert.ok(mid.color.g < 1 && mid.color.g > 0);
      assert.ok(mid.color.b < 1 && mid.color.b > 0);
    });

    it("low stamina produces pulsing opacity", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(0.1, 1.0, 5.0);
      assert.ok(arc.opacity >= 0.3 && arc.opacity <= 1.0);
    });

    it("low stamina pulse varies with time", () => {
      const ui = new UISystem();
      const a = ui.getStaminaArc(0.1, 1.0, 0.0);
      const b = ui.getStaminaArc(0.1, 1.0, 0.5);
      assert.notDeepEqual(a, b);
    });

    it("opacity is 1.0 when stamina >= 0.2", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(0.5, 1.0, 5.0);
      approx(arc.opacity, 1.0);
    });

    it("respects maxStamina parameter", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(50, 100);
      approx(arc.startAngle, 0);
      approx(arc.endAngle, Math.PI);
    });

    it("clamps ratio above 1 to full circle", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(1.5, 1.0);
      approx(arc.endAngle, Math.PI * 2);
    });

    it("clamps ratio below 0 to zero arc", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(-0.5, 1.0);
      approx(arc.endAngle, 0);
    });

    it("hidden when at max and not climbing", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(1.0, 1.0, 0, false);
      approx(arc.opacity, 0);
    });

    it("visible when at max but climbing", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(1.0, 1.0, 0, true);
      approx(arc.opacity, 1);
    });

    it("visible when below max even without climbing", () => {
      const ui = new UISystem();
      const arc = ui.getStaminaArc(0.5, 1.0, 0, false);
      approx(arc.opacity, 1);
    });
  });

  describe("getColossusHealthVisual", () => {
    it("full health returns opacity 1.0 and no pulse", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(1.0, 1.0);
      approx(vis.opacity, 1.0);
      approx(vis.pulseRate, 0);
    });

    it("opacity fades as health decreases", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(0.5, 1.0);
      assert.ok(vis.opacity < 1.0);
      assert.ok(vis.opacity > 0.3);
    });

    it("low health has opacity between 0.3 and 0.6", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(0.1, 1.0);
      assert.ok(vis.opacity >= 0.3);
      assert.ok(vis.opacity <= 0.6);
    });

    it("zero health returns minimum opacity", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(0, 1.0);
      approx(vis.opacity, 0.3);
    });

    it("low health has positive pulse rate", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(0.2, 1.0);
      assert.ok(vis.pulseRate > 0);
    });

    it("high health has zero pulse rate", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(0.9, 1.0);
      approx(vis.pulseRate, 0);
    });

    it("pulse rate threshold is at 0.3", () => {
      const ui = new UISystem();
      const above = ui.getColossusHealthVisual(0.3, 1.0);
      const below = ui.getColossusHealthVisual(0.29, 1.0);
      approx(above.pulseRate, 0);
      assert.ok(below.pulseRate > 0);
    });

    it("respects maxHealth parameter", () => {
      const ui = new UISystem();
      const vis = ui.getColossusHealthVisual(50, 100);
      approx(vis.opacity, 0.65);
    });
  });

  describe("getDirectionHint", () => {
    it("returns inactive when idle time < 15 seconds", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 1, z: 0 }, 5.0);
      assert.equal(hint.active, false);
    });

    it("returns active when idle time >= 15 seconds", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 1, z: 0 }, 15.0);
      assert.equal(hint.active, true);
    });

    it("direction points toward target", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 1, z: 0 }, 15.0);
      approx(hint.direction.x, 1);
      approx(hint.direction.z, 0);
    });

    it("direction is normalized", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 3, z: 4 }, { x: 1, z: 0 }, 15.0);
      const len = Math.sqrt(hint.direction.x ** 2 + hint.direction.z ** 2);
      approx(len, 1);
    });

    it("intensity is higher when closer to target", () => {
      const ui = new UISystem();
      const far = ui.getDirectionHint({ x: 0, z: 0 }, { x: 100, z: 0 }, { x: 1, z: 0 }, 15.0);
      const close = ui.getDirectionHint({ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 1, z: 0 }, 15.0);
      assert.ok(close.intensity > far.intensity);
    });

    it("intensity is between 0 and 1", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 50, z: 0 }, { x: 1, z: 0 }, 15.0);
      assert.ok(hint.intensity >= 0);
      assert.ok(hint.intensity <= 1);
    });

    it("returns inactive when at same position as target", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 5, z: 5 }, { x: 5, z: 5 }, { x: 1, z: 0 }, 15.0);
      assert.equal(hint.active, false);
    });

    it("inactive hint has zero intensity", () => {
      const ui = new UISystem();
      const hint = ui.getDirectionHint({ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 1, z: 0 }, 5.0);
      approx(hint.intensity, 0);
    });
  });

  describe("title screen", () => {
    it("initial state is visible", () => {
      const ui = new UISystem();
      assert.equal(ui.getTitleState(), "visible");
    });

    it("showTitle sets state to visible", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(1.0);
      ui.showTitle();
      assert.equal(ui.getTitleState(), "visible");
    });

    it("hideTitle sets state to fading", () => {
      const ui = new UISystem();
      ui.hideTitle();
      assert.equal(ui.getTitleState(), "fading");
    });

    it("fading completes after 2 seconds", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(2.0);
      assert.equal(ui.getTitleState(), "hidden");
    });

    it("still fading at 1 second", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(1.0);
      assert.equal(ui.getTitleState(), "fading");
    });

    it("getFadeProgress returns 0 when visible", () => {
      const ui = new UISystem();
      approx(ui.getFadeProgress(), 0);
    });

    it("getFadeProgress returns 0.5 at halfway through fade", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(1.0);
      approx(ui.getFadeProgress(), 0.5);
    });

    it("getFadeProgress returns 1 when hidden", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(2.0);
      approx(ui.getFadeProgress(), 1);
    });

    it("multiple update calls accumulate", () => {
      const ui = new UISystem();
      ui.hideTitle();
      ui.update(0.5);
      ui.update(0.5);
      ui.update(0.5);
      ui.update(0.5);
      assert.equal(ui.getTitleState(), "hidden");
    });
  });

  describe("getHUDState", () => {
    it("hides all HUD initially", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: false,
        idleTime: 0,
      });
      assert.equal(hud.showStamina, false);
      assert.equal(hud.showHealth, false);
      assert.equal(hud.showHint, false);
    });

    it("shows stamina when climbing", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: true,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: false,
        idleTime: 0,
      });
      assert.equal(hud.showStamina, true);
    });

    it("shows stamina when below max", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 0.5,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: false,
        idleTime: 0,
      });
      assert.equal(hud.showStamina, true);
    });

    it("shows health when in combat", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: true,
        recentlyDamaged: false,
        idleTime: 0,
      });
      assert.equal(hud.showHealth, true);
    });

    it("shows health when recently damaged", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: true,
        idleTime: 0,
      });
      assert.equal(hud.showHealth, true);
    });

    it("shows hint after idle timeout", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: false,
        idleTime: 15.0,
      });
      assert.equal(hud.showHint, true);
    });

    it("hides hint before idle timeout", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: false,
        currentStamina: 1.0,
        maxStamina: 1.0,
        inCombat: false,
        recentlyDamaged: false,
        idleTime: 14.9,
      });
      assert.equal(hud.showHint, false);
    });

    it("shows all elements when all conditions met", () => {
      const ui = new UISystem();
      const hud = ui.getHUDState({
        isClimbing: true,
        currentStamina: 0.3,
        maxStamina: 1.0,
        inCombat: true,
        recentlyDamaged: true,
        idleTime: 20.0,
      });
      assert.equal(hud.showStamina, true);
      assert.equal(hud.showHealth, true);
      assert.equal(hud.showHint, true);
    });
  });

  describe("damage timer", () => {
    it("initially not recently damaged", () => {
      const ui = new UISystem();
      assert.equal(ui.isRecentlyDamaged(), false);
    });

    it("markDamage sets recently damaged", () => {
      const ui = new UISystem();
      ui.markDamage();
      assert.equal(ui.isRecentlyDamaged(), true);
    });

    it("damage clears after 3 seconds", () => {
      const ui = new UISystem();
      ui.markDamage();
      ui.update(3.0);
      assert.equal(ui.isRecentlyDamaged(), false);
    });

    it("damage still active at 2.9 seconds", () => {
      const ui = new UISystem();
      ui.markDamage();
      ui.update(2.9);
      assert.equal(ui.isRecentlyDamaged(), true);
    });

    it("markDamage resets the timer", () => {
      const ui = new UISystem();
      ui.markDamage();
      ui.update(2.5);
      ui.markDamage();
      ui.update(1.0);
      assert.equal(ui.isRecentlyDamaged(), true);
    });
  });

  describe("getPostProcessConfig", () => {
    it("returns exploration config by default", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("exploration", 0);
      approx(config.vignetteAmount, 0.3);
      assert.equal(config.colorGrade, "warm");
    });

    it("exploration has no bloom", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("exploration", 50);
      approx(config.bloomIntensity, 0);
    });

    it("combat has desaturated color grade", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("combat", 20);
      assert.equal(config.colorGrade, "desaturated");
    });

    it("combat has bloom", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("combat", 20);
      assert.ok(config.bloomIntensity > 0);
    });

    it("vignette increases when close to colossus", () => {
      const ui = new UISystem();
      const far = ui.getPostProcessConfig("combat", 100);
      const close = ui.getPostProcessConfig("combat", 5);
      assert.ok(close.vignetteAmount > far.vignetteAmount);
    });

    it("vignette is always between 0 and 1", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("combat", 0);
      assert.ok(config.vignetteAmount >= 0);
      assert.ok(config.vignetteAmount <= 1);
    });

    it("bloom has threshold", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("combat", 10);
      assert.equal(typeof config.bloomThreshold, "number");
    });

    it("has all required fields", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("exploration", 50);
      assert.equal(typeof config.bloomIntensity, "number");
      assert.equal(typeof config.bloomThreshold, "number");
      assert.equal(typeof config.vignetteAmount, "number");
      assert.equal(typeof config.colorGrade, "string");
    });

    it("vignette is always at least 0.1", () => {
      const ui = new UISystem();
      const config = ui.getPostProcessConfig("exploration", 1000);
      assert.ok(config.vignetteAmount >= 0.1);
    });
  });

  describe("getInputPrompt", () => {
    it("returns Space for jump with keyboard", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("jump", "keyboard"), "Space");
    });

    it("returns E for grab with keyboard", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("grab", "keyboard"), "E");
    });

    it("returns Click for attack with keyboard", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("attack", "keyboard"), "Click");
    });

    it("returns Esc for pause with keyboard", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("pause", "keyboard"), "Esc");
    });

    it("returns A for jump with gamepad", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("jump", "gamepad"), "A");
    });

    it("returns B for grab with gamepad", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("grab", "gamepad"), "B");
    });

    it("returns X for attack with gamepad", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("attack", "gamepad"), "X");
    });

    it("returns Start for pause with gamepad", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("pause", "gamepad"), "Start");
    });

    it("returns empty string for unknown action", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("unknown", "keyboard"), "");
    });

    it("returns empty string for unknown input type", () => {
      const ui = new UISystem();
      assert.equal(ui.getInputPrompt("jump", "touch"), "");
    });
  });

  describe("gamepad hint", () => {
    it("initially shouldShowGamepadHint returns false", () => {
      const ui = new UISystem();
      assert.equal(ui.shouldShowGamepadHint(), false);
    });

    it("showGamepadHint sets shouldShowGamepadHint to true", () => {
      const ui = new UISystem();
      ui.showGamepadHint();
      assert.equal(ui.shouldShowGamepadHint(), true);
    });

    it("hideGamepadHint sets shouldShowGamepadHint to false", () => {
      const ui = new UISystem();
      ui.showGamepadHint();
      ui.hideGamepadHint();
      assert.equal(ui.shouldShowGamepadHint(), false);
    });

    it("hint auto-hides after 3 seconds via update", () => {
      const ui = new UISystem();
      ui.showGamepadHint();
      ui.update(2.9);
      assert.equal(ui.shouldShowGamepadHint(), true);
      ui.update(0.2);
      assert.equal(ui.shouldShowGamepadHint(), false);
    });

    it("hint only shows once per session", () => {
      const ui = new UISystem();
      ui.showGamepadHint();
      ui.update(3.0);
      assert.equal(ui.shouldShowGamepadHint(), false);
      ui.showGamepadHint();
      assert.equal(ui.shouldShowGamepadHint(), false);
    });

    it("hideGamepadHint clears timer so reconnect shows again", () => {
      const ui = new UISystem();
      ui.showGamepadHint();
      ui.hideGamepadHint();
      ui.showGamepadHint();
      assert.equal(ui.shouldShowGamepadHint(), true);
    });
  });
});
