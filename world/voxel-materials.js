import { BlockType, getBlockColor } from "./block-types.js";

const GRASS_SIDE_COLOR = [0.36, 0.25, 0.13];

export function getBlockColorForFace(type, nx, ny, _nz) {
  if (type === BlockType.GRASS && ny !== 1) {
    return GRASS_SIDE_COLOR;
  }
  return getBlockColor(type);
}

export function createMaterialConfig(opts) {
  const { transparent, emissive } = opts;
  const config = {
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    side: 0,
  };

  if (transparent) {
    config.transparent = true;
    config.alphaTest = 0.1;
    config.depthWrite = false;
  } else {
    config.transparent = false;
    config.alphaTest = 0;
  }

  if (emissive) {
    config.emissiveIntensity = 1;
  }

  return config;
}

let _THREE = null;

export function setTHREE(threeModule) {
  _THREE = threeModule;
}

export function createVoxelMesh(meshData) {
  const T = _THREE;
  if (!T) return null;

  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(meshData.positions, 3));
  geometry.setAttribute("normal", new T.Float32BufferAttribute(meshData.normals, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(meshData.colors, 3));
  if (meshData.emissives && meshData.emissives.length > 0) {
    geometry.setAttribute("aEmissive", new T.Float32BufferAttribute(meshData.emissives, 3));
  }
  geometry.setIndex(Array.from(meshData.indices));

  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
  });

  const mesh = new T.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

export function createVoxelMeshGroup() {
  const T = _THREE;
  if (!T) return null;

  const group = new T.Group();
  const meshes = [];

  group._createMesh = function (meshData, cx, cy, cz) {
    const mesh = createVoxelMesh(meshData);
    if (!mesh) return null;
    mesh.position.set(cx, cy, cz);
    group.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  group._clearMeshes = function () {
    for (const mesh of meshes) {
      group.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    meshes.length = 0;
  };

  return group;
}
