export class PlayerCharacter {
  WALK_SPEED = 4;
  RUN_SPEED = 8;
  JUMP_FORCE = 8;
  GRAVITY = -20;
  GROUND_Y = 0;

  constructor() {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: 0,
      isGrounded: true,
      isSprinting: false,
      isJumping: false,
    };
  }
}
