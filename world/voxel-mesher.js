import { CHUNK_SIZE, getBlock, getExposedFaces, getChunkWorldPosition } from './voxel-chunk.js';
import { BlockType, getBlockColor, getBlockEmissive, isBlockSolid } from './block-types.js';
import { getBlockColorForFace } from './voxel-materials.js';

const FACE_VERTICES = {
  px: [
    [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1],
  ],
  nx: [
    [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0],
  ],
  py: [
    [0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0],
  ],
  ny: [
    [0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1],
  ],
  pz: [
    [1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1],
  ],
  nz: [
    [0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0],
  ],
};

const FACE_INDICES = [0, 1, 2, 0, 2, 3];

const AO_CURVE = [
  0.45,
  0.65,
  0.80,
  1.0,
];

function faceKey(nx, ny, nz) {
  if (nx === 1) return 'px';
  if (nx === -1) return 'nx';
  if (ny === 1) return 'py';
  if (ny === -1) return 'ny';
  if (nz === 1) return 'pz';
  return 'nz';
}

function vertexAO(side1, side2, corner) {
  if (side1 && side2) return 0;
  return AO_CURVE[(side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0)];
}

function computeFaceAO(chunk, x, y, z, nx, ny, nz, getNeighborBlock) {
  function isSolidNeighbor(wx, wy, wz) {
    const bt = getNeighborBlock ? getNeighborBlock(wx, wy, wz) : getBlock(chunk, wx, wy, wz);
    return isBlockSolid(bt);
  }

  const verts = FACE_VERTICES[faceKey(nx, ny, nz)];
  const ao = new Float32Array(4);

  for (let i = 0; i < 4; i++) {
    const vx = x + verts[i][0];
    const vy = y + verts[i][1];
    const vz = z + verts[i][2];

    const s1x = vx - nx + (nz !== 0 ? nx : 0);
    const s1y = vy - ny + (ny === 0 ? 1 : 0);
    const s1z = vz - nz + (nx !== 0 ? nx : 0);

    const s2x = vx - nx + (nx === 0 ? 1 : 0);
    const s2y = vy - ny + (nz !== 0 ? nx : 0);
    const s2z = vz - nz + (ny === 0 ? 1 : 0);

    const cx = vx - nx;
    const cy = vy - ny;
    const cz = vz - nz;

    const side1 = isSolidNeighbor(s1x, s1y, s1z);
    const side2 = isSolidNeighbor(s2x, s2y, s2z);
    const corner = isSolidNeighbor(cx, cy, cz);

    ao[i] = vertexAO(side1, side2, corner);
  }

  return ao;
}

export function buildChunkMeshData(chunk, getNeighborBlock) {
  const faces = getExposedFaces(chunk, getNeighborBlock);
  if (faces.length === 0) return null;

  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  const emissives = [];

  let vertexCount = 0;
  const origin = getChunkWorldPosition(chunk);

  const faceGroups = new Map();

  for (const face of faces) {
    const key = face.blockType;
    if (!faceGroups.has(key)) faceGroups.set(key, []);
    faceGroups.get(key).push(face);
  }

  for (const [blockType, groupFaces] of faceGroups) {
    const emissive = getBlockEmissive(blockType);

    for (const face of groupFaces) {
      const fk = faceKey(face.normal.x, face.normal.y, face.normal.z);
      const verts = FACE_VERTICES[fk];
      const ao = computeFaceAO(chunk, face.x, face.y, face.z, face.normal.x, face.normal.y, face.normal.z, getNeighborBlock);
      const baseColor = getBlockColorForFace(blockType, face.normal.x, face.normal.y, face.normal.z);

      for (let i = 0; i < 4; i++) {
        positions.push(
          origin.x + face.x + verts[i][0],
          origin.y + face.y + verts[i][1],
          origin.z + face.z + verts[i][2]
        );
        normals.push(face.normal.x, face.normal.y, face.normal.z);
        colors.push(baseColor[0] * ao[i], baseColor[1] * ao[i], baseColor[2] * ao[i]);
        emissives.push(emissive[0], emissive[1], emissive[2]);
      }

      for (const idx of FACE_INDICES) {
        indices.push(vertexCount + idx);
      }
      vertexCount += 4;
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    emissives: new Float32Array(emissives),
    indices: new Uint32Array(indices),
    vertexCount,
    faceCount: faces.length,
  };
}

export function buildVoxelGeometryForGroup(faces, origin) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  let vertexCount = 0;

  for (const face of faces) {
    const fk = faceKey(face.normal.x, face.normal.y, face.normal.z);
    const verts = FACE_VERTICES[fk];
    const baseColor = getBlockColorForFace(face.blockType, face.normal.x, face.normal.y, face.normal.z);

    for (let i = 0; i < 4; i++) {
      positions.push(
        origin.x + face.x + verts[i][0],
        origin.y + face.y + verts[i][1],
        origin.z + face.z + verts[i][2]
      );
      normals.push(face.normal.x, face.normal.y, face.normal.z);
      colors.push(baseColor[0], baseColor[1], baseColor[2]);
    }

    for (const idx of FACE_INDICES) {
      indices.push(vertexCount + idx);
    }
    vertexCount += 4;
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    vertexCount,
  };
}
