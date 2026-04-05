const BASE_COLOR = 0xffaa00;
const FLASH_COLOR = 0xffffff;
const DESTROYED_COLOR = 0x333333;
const FLASH_DURATION = 0.3;
const PULSE_SPEED = 3.0;
const PULSE_AMOUNT = 0.15;
const DESTROYED_SCALE = 0.6;
const GLOW_COLOR = 0xff8800;
const LIGHT_COLOR = 0xffaa22;
const LIGHT_INTENSITY = 2.0;
const LIGHT_DISTANCE = 8.0;
const EMISSIVE_INTENSITY_MIN = 0.6;
const EMISSIVE_INTENSITY_MAX = 1.4;

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

export function createWeakPointVisuals(scene) {
  const T = _THREE;
  const weakPoints = new Map();
  let time = 0;
  let positionProvider = null;

  function createMesh(position) {
    const geo = new T.SphereGeometry(0.3, 16, 12);
    const mat = new T.MeshStandardMaterial({
      color: BASE_COLOR,
      emissive: GLOW_COLOR,
      emissiveIntensity: EMISSIVE_INTENSITY_MIN,
      roughness: 0.3,
      metalness: 0.1,
    });
    const impl = new T.Mesh(geo, mat);
    impl.position.set(position.x, position.y, position.z);
    scene.impl.add(impl);

    const light = new T.PointLight(LIGHT_COLOR, LIGHT_INTENSITY, LIGHT_DISTANCE);
    light.position.set(position.x, position.y, position.z);
    scene.impl.add(light);

    return { mesh: impl, light };
  }

  function addWeakPoint(position, id) {
    if (weakPoints.has(id)) return weakPoints.get(id);
    const { mesh, light } = createMesh(position);
    const handle = { id, mesh, light, bodyPartId: id };
    weakPoints.set(id, handle);
    return handle;
  }

  function removeWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp) return;
    scene.impl.remove(wp.mesh);
    scene.impl.remove(wp.light);
    if (wp.mesh.geometry && wp.mesh.geometry.dispose) wp.mesh.geometry.dispose();
    if (wp.mesh.material && wp.mesh.material.dispose) wp.mesh.material.dispose();
    if (wp.light && wp.light.dispose) wp.light.dispose();
    weakPoints.delete(id);
  }

  function flashWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp || wp.destroyed) return;
    wp.flashTimer = FLASH_DURATION;
    wp.mesh.material.emissive.set(FLASH_COLOR);
    wp.mesh.material.emissiveIntensity = 2.0;
    wp.light.intensity = LIGHT_INTENSITY * 3;
  }

  function destroyWeakPoint(id) {
    const wp = weakPoints.get(id);
    if (!wp || wp.destroyed) return;
    wp.destroyed = true;
    wp.mesh.material.color.set(DESTROYED_COLOR);
    wp.mesh.material.emissive.set(0x000000);
    wp.mesh.material.emissiveIntensity = 0;
    wp.mesh.scale.set(DESTROYED_SCALE, DESTROYED_SCALE, DESTROYED_SCALE);
    wp.light.intensity = 0;
    scene.impl.remove(wp.light);
    if (wp.light && wp.light.dispose) wp.light.dispose();
    wp.light = null;
  }

  function update(dt) {
    time += dt;
    for (const [id, wp] of weakPoints) {
      if (wp.destroyed) continue;
      if (positionProvider) {
        const worldPos = positionProvider(wp.bodyPartId);
        if (worldPos) {
          wp.mesh.position.set(worldPos.x, worldPos.y, worldPos.z);
          if (wp.light) wp.light.position.set(worldPos.x, worldPos.y, worldPos.z);
        }
      }
      if (wp.flashTimer > 0) {
        wp.flashTimer -= dt;
        if (wp.flashTimer <= 0) {
          wp.flashTimer = 0;
          wp.mesh.material.emissive.set(GLOW_COLOR);
          wp.mesh.material.emissiveIntensity = EMISSIVE_INTENSITY_MIN;
          if (wp.light) wp.light.intensity = LIGHT_INTENSITY;
        } else {
          const t = 1 - wp.flashTimer / FLASH_DURATION;
          wp.mesh.material.emissiveIntensity = 2.0 * (1 - t) + EMISSIVE_INTENSITY_MIN * t;
          if (wp.light) wp.light.intensity = LIGHT_INTENSITY * 3 * (1 - t) + LIGHT_INTENSITY * t;
        }
        continue;
      }
      const pulse = 1 + Math.sin(time * PULSE_SPEED + id.length) * PULSE_AMOUNT;
      wp.mesh.scale.set(pulse, pulse, pulse);
      const emPulse =
        EMISSIVE_INTENSITY_MIN +
        Math.sin(time * PULSE_SPEED + id.length) *
          (EMISSIVE_INTENSITY_MAX - EMISSIVE_INTENSITY_MIN);
      wp.mesh.material.emissiveIntensity = emPulse;
      if (wp.light)
        wp.light.intensity =
          LIGHT_INTENSITY * (0.7 + 0.3 * Math.sin(time * PULSE_SPEED + id.length));
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
    setPositionProvider(fn) {
      positionProvider = fn;
    },
  };
}
