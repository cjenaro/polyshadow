import * as THREE from 'three';

export function createRenderer(canvas) {
  const impl = new THREE.WebGLRenderer({ canvas, antialias: true });
  impl.setPixelRatio(window.devicePixelRatio);
  impl.setSize(window.innerWidth, window.innerHeight);
  impl.shadowMap.enabled = true;
  impl.shadowMap.type = THREE.PCFSoftShadowMap;

  return {
    impl,
    render(scene, camera) { impl.render(scene.impl, camera.impl); },
    setPixelRatio(ratio) { impl.setPixelRatio(ratio); },
    setSize(w, h) { impl.setSize(w, h); },
  };
}

export function initScene() {
  const impl = new THREE.Scene();
  impl.background = new THREE.Color(0x0a0a12);
  impl.fog = new THREE.FogExp2(0x0a0a12, 0.02);

  const camera = createPerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.impl.position.set(0, 5, 10);
  camera.impl.lookAt(0, 0, 0);

  return { scene: { impl, add(obj) { impl.add(obj.impl); }, setFog(color, density) { impl.fog = new THREE.FogExp2(new THREE.Color(color), density); } }, camera };
}

export function resize(renderer, camera) {
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.setAspect(w / h);
  }
  window.addEventListener('resize', onResize);
  return onResize;
}

export function createPerspectiveCamera(fov, aspect, near, far) {
  const impl = new THREE.PerspectiveCamera(fov, aspect, near, far);
  return {
    impl,
    setAspect(a) { impl.aspect = a; impl.updateProjectionMatrix(); },
    setPosition(x, y, z) { impl.position.set(x, y, z); },
    lookAt(x, y, z) { impl.lookAt(x, y, z); },
    getPosition() { return { x: impl.position.x, y: impl.position.y, z: impl.position.z }; },
    updateProjectionMatrix() { impl.updateProjectionMatrix(); },
    syncFromOrbit(orbitResult) {
      impl.position.set(orbitResult.position.x, orbitResult.position.y, orbitResult.position.z);
      impl.lookAt(orbitResult.target.x, orbitResult.target.y, orbitResult.target.z);
    },
  };
}

export function createDirectionalLight(color, intensity) {
  const impl = new THREE.DirectionalLight(color, intensity);
  const adapter = {
    impl,
    setPosition(x, y, z) { impl.position.set(x, y, z); },
    setCastShadow(cast) { impl.castShadow = cast; },
    setShadowMapSize(w, h) { impl.shadow.mapSize.set(w, h); },
    configureShadowCamera(opts) {
      Object.assign(impl.shadow.camera, opts);
      if (opts.near != null) impl.shadow.camera.near = opts.near;
      if (opts.far != null) impl.shadow.camera.far = opts.far;
      if (opts.left != null) impl.shadow.camera.left = opts.left;
      if (opts.right != null) impl.shadow.camera.right = opts.right;
      if (opts.top != null) impl.shadow.camera.top = opts.top;
      if (opts.bottom != null) impl.shadow.camera.bottom = opts.bottom;
      impl.shadow.camera.updateProjectionMatrix();
    },
  };
  return adapter;
}

export function createAmbientLight(color, intensity) {
  const impl = new THREE.AmbientLight(color, intensity);
  return { impl };
}

export function createHemisphereLight(skyColor, groundColor, intensity) {
  const impl = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  return { impl };
}

export function createMesh(opts) {
  const geo = new THREE.SphereGeometry(opts.radius, opts.widthSegments, opts.heightSegments);
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: opts.vertexColors || false,
    side: opts.side || THREE.FrontSide,
    fog: opts.fog !== false,
  });
  const impl = new THREE.Mesh(geo, mat);
  return {
    impl,
    setVertexColors(colors) {
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    },
    getPositionAttribute() { return geo.getAttribute('position'); },
  };
}

export function createColor(r, g, b) {
  return new THREE.Color(r, g, b);
}

export function lerpColors(c1, c2, t) {
  const c = new THREE.Color();
  c.lerpColors(c1, c2, t);
  return c;
}
