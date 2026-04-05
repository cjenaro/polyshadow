import * as THREE from 'three';

const BODY_COLOR = 0xccaa77;
const DARK_COLOR = 0x8b7355;
const SWORD_COLOR = 0xaaaaaa;
const CAPE_COLOR = 0x663333;

function makePart(geo, color) {
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function createCharacterMesh() {
  const group = new THREE.Group();

  const torso = makePart(new THREE.BoxGeometry(0.5, 0.7, 0.3), BODY_COLOR);
  torso.position.y = 0.85;
  group.add(torso);

  const head = makePart(new THREE.BoxGeometry(0.35, 0.35, 0.35), BODY_COLOR);
  head.position.y = 1.4;
  group.add(head);

  const leftArm = makePart(new THREE.BoxGeometry(0.15, 0.6, 0.15), BODY_COLOR);
  leftArm.position.set(-0.35, 0.85, 0);
  group.add(leftArm);

  const rightArm = makePart(new THREE.BoxGeometry(0.15, 0.6, 0.15), BODY_COLOR);
  rightArm.position.set(0.35, 0.85, 0);
  group.add(rightArm);

  const leftLeg = makePart(new THREE.BoxGeometry(0.18, 0.6, 0.18), DARK_COLOR);
  leftLeg.position.set(-0.13, 0.3, 0);
  group.add(leftLeg);

  const rightLeg = makePart(new THREE.BoxGeometry(0.18, 0.6, 0.18), DARK_COLOR);
  rightLeg.position.set(0.13, 0.3, 0);
  group.add(rightLeg);

  const capeGeo = new THREE.PlaneGeometry(0.5, 0.8, 4, 6);
  const cape = makePart(capeGeo, CAPE_COLOR);
  cape.position.set(0, 0.9, 0.2);
  group.add(cape);

  const swordGroup = new THREE.Group();
  const blade = makePart(new THREE.BoxGeometry(0.06, 0.8, 0.06), SWORD_COLOR);
  blade.position.y = 0.4;
  swordGroup.add(blade);
  const hilt = makePart(new THREE.BoxGeometry(0.25, 0.06, 0.06), DARK_COLOR);
  hilt.position.y = 0;
  swordGroup.add(hilt);
  const handle = makePart(new THREE.BoxGeometry(0.06, 0.15, 0.06), DARK_COLOR);
  handle.position.y = -0.1;
  swordGroup.add(handle);
  swordGroup.position.set(-0.45, 0.9, 0.1);
  group.add(swordGroup);

  return {
    impl: group,
    setPosition(x, y, z) { group.position.set(x, y, z); },
    setRotationY(rad) { group.rotation.y = rad; },
    cape,
    sword: swordGroup,
  };
}
