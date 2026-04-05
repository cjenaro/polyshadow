const BASE_COLOR = 0xff4444;
const FLASH_COLOR = 0xffffff;
const DESTROYED_COLOR = 0x333333;
const FLASH_DURATION = 0.3;
const PULSE_SPEED = 3.0;
const PULSE_AMOUNT = 0.15;
const DESTROYED_SCALE = 0.6;

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

export function createWeakPointVisuals(scene) {
  const T = _THREE;
  const weakPoints = new Map();
  let time = 0;

  function createMesh(position) {
    const geo = new T.SphereGeometry(0.3, 16, 12);
    const mat = new T.MeshBasicMaterial({ color: BASE_COLOR });
    const impl = new T.Mesh(geo, mat);
    impl.position.set(position.x, position.y, position.z);
    scene.impl.add(impl);
    return impl;
  }

  function addWeakPoint(position, id) {
    if (weakPoints.has(id)) return weakPoints.get(id);
    const impl = createMesh(position);
    const handle = { id, mesh: impl };
    weakPoints.set(id, handle);
    return handle;
  }

  function removeWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp) return;
    scene.impl.remove(wp.mesh);
    if (wp.mesh.geometry && wp.mesh.geometry.dispose) wp.mesh.geometry.dispose();
    if (wp.mesh.material && wp.mesh.material.dispose) wp.mesh.material.dispose();
    weakPoints.delete(id);
  }

  function flashWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp || wp.destroyed) return;
    wp.flashTimer = FLASH_DURATION;
    wp.mesh.material.color = FLASH_COLOR;
  }

  function destroyWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp || wp.destroyed) return;
    wp.destroyed = true;
    wp.mesh.material.color = DESTROYED_COLOR;
    wp.mesh.scale.set(DESTROYED_SCALE, DESTROYED_SCALE, DESTROYED_SCALE);
  }

  function update(dt) {
    time += dt;
    for (const [id, wp] of weakPoints) {
      if (wp.destroyed) continue;
      if (wp.flashTimer > 0) {
        wp.flashTimer -= dt;
        if (wp.flashTimer <= 0) {
          wp.flashTimer = 0;
          wp.mesh.material.color = BASE_COLOR;
        } else {
          const t = 1 - wp.flashTimer / FLASH_DURATION;
          const r = ((FLASH_COLOR >> 16) & 0xff) * (1 - t) + ((BASE_COLOR >> 16) & 0xff) * t;
          const g = ((FLASH_COLOR >> 8) & 0xff) * (1 - t) + ((BASE_COLOR >> 8) & 0xff) * t;
          const b = (FLASH_COLOR & 0xff) * (1 - t) + (BASE_COLOR & 0xff) * t;
          wp.mesh.material.color = { r: r / 255, g: g / 255, b: b / 255 };
        }
        continue;
      }
      const pulse = 1 + Math.sin(time * PULSE_SPEED + id.length) * PULSE_AMOUNT;
      wp.mesh.scale.set(pulse, pulse, pulse);
    }
  }

  function clearAll() {
    for (const [id] of weakPoints) {
      removeWeakPoint(id);
    }
  }

  return {
    addWeakPoint,
    removeWeakPoint,
    flashWeakPoint,
    destroyWeakPoint,
    update,
    clearAll,
  };
}
