const SHAKE_DECAY = 8;
const DAMAGE_NUMBER_RISE_SPEED = 3;
const DAMAGE_NUMBER_DURATION = 1.5;
const HIT_FLASH_DURATION = 0.3;
const HIT_FLASH_MAX_SCALE = 2.5;
const MAX_POOL_SIZE = 12;

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

function createDamageTexture(text) {
  const T = _THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 128, 64);
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(text, 64, 32);
  ctx.fillText(text, 64, 32);
  const texture = new T.CanvasTexture(canvas);
  texture.minFilter = T.LinearFilter;
  return texture;
}

export function createCombatFeedback(scene) {
  const T = _THREE;
  const activeNumbers = [];
  const activeFlashes = [];
  let shakeIntensity = 0;
  const spritePool = [];

  function getSprite() {
    let sprite;
    if (spritePool.length > 0) {
      sprite = spritePool.pop();
    } else {
      const mat = new T.SpriteMaterial({ transparent: true, depthTest: false, sizeAttenuation: true });
      sprite = new T.Sprite(mat);
      sprite.renderOrder = 999;
    }
    return sprite;
  }

  function returnSprite(sprite) {
    sprite.visible = false;
    sprite.material.opacity = 1;
    sprite.scale.set(2, 1, 1);
    scene.impl.add(sprite);
    if (spritePool.length < MAX_POOL_SIZE) {
      spritePool.push(sprite);
    } else {
      scene.impl.remove(sprite);
      sprite.material.dispose();
    }
  }

  function spawnDamageNumber(position, damage) {
    const text = Math.round(damage).toString();
    const texture = createDamageTexture(text);
    const sprite = getSprite();
    sprite.material.map = texture;
    sprite.material.opacity = 1;
    sprite.scale.set(2, 1, 1);
    sprite.position.set(position.x, position.y + 1, position.z);
    sprite.visible = true;
    scene.impl.add(sprite);
    activeNumbers.push({ sprite, texture, timer: 0, startY: position.y + 1 });
  }

  function triggerScreenShake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
  }

  function spawnHitFlash(position) {
    const geo = new T.SphereGeometry(0.5, 12, 8);
    const mat = new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.position.set(position.x, position.y, position.z);
    scene.impl.add(mesh);
    activeFlashes.push({ mesh, timer: 0 });
  }

  function update(dt) {
    for (let i = activeNumbers.length - 1; i >= 0; i--) {
      const dn = activeNumbers[i];
      dn.timer += dt;
      const progress = dn.timer / DAMAGE_NUMBER_DURATION;
      if (progress >= 1) {
        dn.sprite.visible = false;
        scene.impl.remove(dn.sprite);
        dn.texture.dispose();
        dn.sprite.material.map = null;
        returnSprite(dn.sprite);
        activeNumbers.splice(i, 1);
        continue;
      }
      dn.sprite.position.y = dn.startY + dn.timer * DAMAGE_NUMBER_RISE_SPEED;
      dn.sprite.material.opacity = 1 - progress * progress;
      const scale = 1 + progress * 0.3;
      dn.sprite.scale.set(2 * scale, scale, 1);
    }

    for (let i = activeFlashes.length - 1; i >= 0; i--) {
      const flash = activeFlashes[i];
      flash.timer += dt;
      const progress = flash.timer / HIT_FLASH_DURATION;
      if (progress >= 1) {
        scene.impl.remove(flash.mesh);
        flash.mesh.geometry.dispose();
        flash.mesh.material.dispose();
        activeFlashes.splice(i, 1);
        continue;
      }
      const s = 1 + progress * (HIT_FLASH_MAX_SCALE - 1);
      flash.mesh.scale.set(s, s, s);
      flash.mesh.material.opacity = 0.9 * (1 - progress);
    }

    if (shakeIntensity > 0.001) {
      shakeIntensity *= Math.exp(-SHAKE_DECAY * dt);
    } else {
      shakeIntensity = 0;
    }
  }

  function getShakeOffset() {
    if (shakeIntensity <= 0) return { x: 0, y: 0, z: 0 };
    return {
      x: (Math.random() * 2 - 1) * shakeIntensity,
      y: (Math.random() * 2 - 1) * shakeIntensity,
      z: (Math.random() * 2 - 1) * shakeIntensity,
    };
  }

  function clearAll() {
    for (const dn of activeNumbers) {
      scene.impl.remove(dn.sprite);
      dn.texture.dispose();
      dn.sprite.material.dispose();
    }
    activeNumbers.length = 0;
    for (const flash of activeFlashes) {
      scene.impl.remove(flash.mesh);
      flash.mesh.geometry.dispose();
      flash.mesh.material.dispose();
    }
    activeFlashes.length = 0;
    shakeIntensity = 0;
    for (const sprite of spritePool) {
      scene.impl.remove(sprite);
      sprite.material.dispose();
    }
    spritePool.length = 0;
  }

  return {
    spawnDamageNumber,
    triggerScreenShake,
    spawnHitFlash,
    update,
    getShakeOffset,
    clearAll,
  };
}
