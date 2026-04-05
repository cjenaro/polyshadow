const TAU = Math.PI * 2;
const LOW_STAMINA_THRESHOLD = 0.2;
const DIRECTION_HINT_IDLE_TIMEOUT = 15;
const FADE_DURATION = 2;
const DAMAGE_COOLDOWN = 3;
const LOW_HEALTH_PULSE_THRESHOLD = 0.3;
const MAX_HINT_DISTANCE = 100;
const VIGNETTE_BASE = 0.3;

export class UISystem {
  constructor() {
    this._titleState = 'visible';
    this._fadeTimer = 0;
    this._damageTimer = 0;
  }

  getStaminaArc(currentStamina, maxStamina, time = 0, isClimbing = false) {
    const ratio = Math.max(0, Math.min(1, currentStamina / maxStamina));

    if (ratio >= 1 && !isClimbing) {
      return { startAngle: 0, endAngle: TAU, color: { r: 1, g: 1, b: 1 }, opacity: 0 };
    }

    const endAngle = ratio * TAU;
    const r = 1;
    const g = ratio;
    const b = ratio;
    const color = { r, g, b };

    let opacity;
    if (ratio < LOW_STAMINA_THRESHOLD) {
      const pulse = Math.sin(time * 6) * 0.35 + 0.65;
      opacity = pulse;
    } else {
      opacity = 1;
    }

    return { startAngle: 0, endAngle, color, opacity };
  }

  getColossusHealthVisual(health, maxHealth) {
    const ratio = Math.max(0, Math.min(1, health / maxHealth));

    const opacity = 0.3 + 0.7 * ratio;
    const pulseRate = ratio < LOW_HEALTH_PULSE_THRESHOLD ? (1 - ratio / LOW_HEALTH_PULSE_THRESHOLD) * 2 : 0;

    return { opacity, pulseRate };
  }

  getDirectionHint(playerPos, targetPos, playerFacing, idleTime) {
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (idleTime < DIRECTION_HINT_IDLE_TIMEOUT || distance < 0.01) {
      return { active: false, direction: { x: 0, z: 0 }, intensity: 0 };
    }

    const len = Math.sqrt(dx * dx + dz * dz);
    const direction = { x: dx / len, z: dz / len };
    const intensity = Math.max(0, 1 - distance / MAX_HINT_DISTANCE);

    return { active: true, direction, intensity };
  }

  getTitleState() {
    return this._titleState;
  }

  showTitle() {
    this._titleState = 'visible';
    this._fadeTimer = 0;
  }

  hideTitle() {
    if (this._titleState === 'visible') {
      this._titleState = 'fading';
      this._fadeTimer = 0;
    }
  }

  getFadeProgress() {
    if (this._titleState === 'visible') return 0;
    if (this._titleState === 'hidden') return 1;
    return Math.min(1, this._fadeTimer / FADE_DURATION);
  }

  markDamage() {
    this._damageTimer = DAMAGE_COOLDOWN;
  }

  isRecentlyDamaged() {
    return this._damageTimer > 0;
  }

  getHUDState(gameState) {
    const { isClimbing, currentStamina, maxStamina, inCombat, recentlyDamaged, idleTime } = gameState;
    const ratio = currentStamina / maxStamina;

    const showStamina = isClimbing || ratio < 1;
    const showHealth = inCombat || recentlyDamaged;
    const showHint = idleTime >= DIRECTION_HINT_IDLE_TIMEOUT;

    return { showStamina, showHealth, showHint };
  }

  getPostProcessConfig(gameState, distToColossus) {
    if (gameState === 'combat') {
      const proximityFactor = Math.max(0, 1 - distToColossus / 50);
      return {
        bloomIntensity: 0.4 + proximityFactor * 0.6,
        bloomThreshold: 0.8,
        vignetteAmount: Math.min(0.9, VIGNETTE_BASE + proximityFactor * 0.4),
        colorGrade: 'desaturated',
      };
    }

    return {
      bloomIntensity: 0,
      bloomThreshold: 1.0,
      vignetteAmount: Math.max(0.1, VIGNETTE_BASE - distToColossus / 500),
      colorGrade: 'warm',
    };
  }

  update(deltaTime) {
    if (this._titleState === 'fading') {
      this._fadeTimer += deltaTime;
      if (this._fadeTimer >= FADE_DURATION) {
        this._titleState = 'hidden';
      }
    }

    if (this._damageTimer > 0) {
      this._damageTimer = Math.max(0, this._damageTimer - deltaTime);
    }
  }
}
