import * as THREE from "three";
import { buildIslandGeometryData } from "./island-mesh.js";
import { generateNormalMapData } from "../utils/normal-map.js";

export function createNormalMapTexture(opts = {}) {
  const { size = 256, scale = 0.05, seed = 42, strength = 2.0 } = opts;
  const { data, width, height } = generateNormalMapData(size, size, scale, seed, strength);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(data);
  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createRenderer(canvas) {
  const impl = new THREE.WebGLRenderer({ canvas, antialias: true });
  impl.setPixelRatio(window.devicePixelRatio);
  impl.setSize(window.innerWidth, window.innerHeight);
  impl.shadowMap.enabled = true;
  impl.shadowMap.type = THREE.PCFSoftShadowMap;
  impl.toneMapping = THREE.ACESFilmicToneMapping;
  impl.toneMappingExposure = 1.2;

  return {
    impl,
    render(scene, camera) {
      impl.render(scene.impl, camera.impl);
    },
    setPixelRatio(ratio) {
      impl.setPixelRatio(ratio);
    },
    setSize(w, h) {
      impl.setSize(w, h);
    },
  };
}

export function initScene(renderer) {
  const impl = new THREE.Scene();
  impl.background = new THREE.Color(0x0a0a12);
  impl.fog = new THREE.FogExp2(0x0a0a12, 0.02);

  const pmremGenerator = new THREE.PMREMGenerator(renderer.impl);

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x0a0a12);
  envScene.add(new THREE.HemisphereLight(0x334466, 0x221100, 2));
  const envRT = pmremGenerator.fromScene(envScene);
  impl.environment = envRT.texture;
  pmremGenerator.dispose();
  envScene.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });

  const camera = createPerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.impl.position.set(0, 5, 10);
  camera.impl.lookAt(0, 0, 0);

  return {
    scene: {
      impl,
      add(obj) {
        impl.add(obj.impl);
      },
      remove(obj) {
        impl.remove(obj);
      },
      setFog(color, density) {
        impl.fog = new THREE.FogExp2(new THREE.Color(color), density);
      },
    },
    camera,
  };
}

export function resize(renderer, camera) {
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.setAspect(w / h);
  }
  window.addEventListener("resize", onResize);
  return onResize;
}

export function createPerspectiveCamera(fov, aspect, near, far) {
  const impl = new THREE.PerspectiveCamera(fov, aspect, near, far);
  return {
    impl,
    setAspect(a) {
      impl.aspect = a;
      impl.updateProjectionMatrix();
    },
    setPosition(x, y, z) {
      impl.position.set(x, y, z);
    },
    lookAt(x, y, z) {
      impl.lookAt(x, y, z);
    },
    getPosition() {
      return { x: impl.position.x, y: impl.position.y, z: impl.position.z };
    },
    updateProjectionMatrix() {
      impl.updateProjectionMatrix();
    },
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
    setPosition(x, y, z) {
      impl.position.set(x, y, z);
    },
    setCastShadow(cast) {
      impl.castShadow = cast;
    },
    setShadowMapSize(w, h) {
      impl.shadow.mapSize.set(w, h);
    },
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

export function createBoxMesh(opts = {}) {
  const geo = new THREE.BoxGeometry(opts.width || 1, opts.height || 1, opts.depth || 1);
  const mat = new THREE.MeshStandardMaterial({ color: opts.color || 0x888888 });
  const impl = new THREE.Mesh(geo, mat);
  impl.castShadow = opts.castShadow !== false;
  impl.receiveShadow = opts.receiveShadow !== false;
  return {
    impl,
    setPosition(x, y, z) {
      impl.position.set(x, y, z);
    },
    setRotationY(rad) {
      impl.rotation.y = rad;
    },
    setScale(x, y, z) {
      impl.scale.set(x, y, z);
    },
  };
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
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    },
    getPositionAttribute() {
      return geo.getAttribute("position");
    },
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

export function createIslandMesh(island) {
  const { positions, colors, vertCount } = buildIslandGeometryData(island);
  const resolution = island.resolution;

  const indices = [];
  for (let z = 0; z < resolution; z++) {
    for (let x = 0; x < resolution; x++) {
      const a = z * (resolution + 1) + x;
      const b = a + 1;
      const c = a + (resolution + 1);
      const d = c + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const normalMap = createNormalMapTexture({ size: 512, scale: 0.08, seed: 42, strength: 2.0 });

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 0.9,
    metalness: 0.0,
    normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
  });

  const impl = new THREE.Mesh(geometry, material);
  impl.receiveShadow = true;

  return {
    impl,
    setPosition(x, y, z) {
      impl.position.set(x, y, z);
    },
  };
}

export function createSimplifiedBoxMesh(width, height, depth) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    flatShading: true,
    roughness: 0.9,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function wrapInLOD(fullMesh, simplifiedMesh, nearThreshold, farThreshold) {
  const lod = new THREE.LOD();
  lod.addLevel(fullMesh.impl, nearThreshold);
  lod.addLevel(simplifiedMesh, farThreshold);
  return {
    impl: lod,
    meshByPart: fullMesh.meshByPart,
  };
}

export function createInstancedMesh(geometry, material, positions) {
  const count = positions.length;
  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    matrix.setPosition(positions[i].x, positions[i].y, positions[i].z);
    instancedMesh.setMatrixAt(i, matrix);
  }
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  instancedMesh.instanceMatrix.needsUpdate = true;
  return { impl: instancedMesh };
}
