import { BlockType } from "../world/block-types.js";
import { buildVoxelGeometryForGroup } from "../world/voxel-mesher.js";

const FACE_DIRS = [
  { dx: 1, dy: 0, dz: 0, nx: 1, ny: 0, nz: 0 },
  { dx: -1, dy: 0, dz: 0, nx: -1, ny: 0, nz: 0 },
  { dx: 0, dy: 1, dz: 0, nx: 0, ny: 1, nz: 0 },
  { dx: 0, dy: -1, dz: 0, nx: 0, ny: -1, nz: 0 },
  { dx: 0, dy: 0, dz: 1, nx: 0, ny: 0, nz: 1 },
  { dx: 0, dy: 0, dz: -1, nx: 0, ny: 0, nz: -1 },
];

function vkey(x, y, z) {
  return `${x},${y},${z}`;
}

function computeExposedFaces(voxels) {
  const occupied = new Set();
  for (const v of voxels) {
    occupied.add(vkey(v.x, v.y, v.z));
  }

  const faces = [];
  for (const v of voxels) {
    for (const dir of FACE_DIRS) {
      const nk = vkey(v.x + dir.dx, v.y + dir.dy, v.z + dir.dz);
      if (!occupied.has(nk)) {
        faces.push({
          x: v.x,
          y: v.y,
          z: v.z,
          blockType: v.type,
          normal: { x: dir.nx, y: dir.ny, z: dir.nz },
        });
      }
    }
  }
  return faces;
}

export function createPlayerVoxelTemplate() {
  const voxels = [];

  voxels.push({ x: 0, y: 3, z: 0, type: BlockType.SAND });

  voxels.push({ x: 0, y: 2, z: 0, type: BlockType.SAND });
  voxels.push({ x: 0, y: 1, z: 0, type: BlockType.SAND });

  voxels.push({ x: -1, y: 2, z: 0, type: BlockType.SAND });
  voxels.push({ x: 1, y: 2, z: 0, type: BlockType.SAND });
  voxels.push({ x: -1, y: 1, z: 0, type: BlockType.SAND });
  voxels.push({ x: 1, y: 1, z: 0, type: BlockType.SAND });

  voxels.push({ x: -1, y: 0, z: 0, type: BlockType.WOOD });
  voxels.push({ x: 1, y: 0, z: 0, type: BlockType.WOOD });

  voxels.push({ x: -2, y: 2, z: 0, type: BlockType.STONE });
  voxels.push({ x: -2, y: 3, z: 0, type: BlockType.STONE });
  voxels.push({ x: -2, y: 1, z: 0, type: BlockType.CRACKED_STONE });

  voxels.push({ x: 0, y: 1, z: -1, type: BlockType.MOSS_DIRT });
  voxels.push({ x: 0, y: 2, z: -1, type: BlockType.MOSS_DIRT });
  voxels.push({ x: 0, y: 3, z: -1, type: BlockType.MOSS_DIRT });

  return voxels;
}

export function buildPlayerMeshData(voxels, origin = { x: 0, y: 0, z: 0 }) {
  const faces = computeExposedFaces(voxels);
  return buildVoxelGeometryForGroup(faces, origin);
}
