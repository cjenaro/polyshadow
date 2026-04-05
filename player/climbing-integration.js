import {
  isGrabPressed,
  tryGrab,
  applyClimbingMovement,
  tryJumpClimb,
  releaseGrab,
  updateClimbNormal,
} from "./climbing.js";
import { shouldTriggerFall } from "./stamina.js";

export const CLIMB_CONFIG = {
  MAX_GRAB_DISTANCE: 5,
  MAX_JUMP_DISTANCE: 8,
  CLIMB_SPEED: 3,
};

export function createClimbingState() {
  return { isClimbing: false, climbGrabTime: 0 };
}

export function isPlayerClimbing(climbingState) {
  return !!climbingState.isClimbing;
}

export function updateClimbing(
  playerState,
  climbingState,
  input,
  staminaState,
  surfaces,
  dt,
  physicsCtx,
) {
  let pState = playerState;
  let cState = climbingState;

  if (!cState.isClimbing) {
    if (isGrabPressed(input)) {
      pState = tryGrab(pState, input, surfaces, CLIMB_CONFIG.MAX_GRAB_DISTANCE, physicsCtx);
      if (pState.isClimbing) {
        cState = { ...cState, isClimbing: true, climbGrabTime: 0 };
      }
    }
  } else {
    cState = { ...cState, climbGrabTime: cState.climbGrabTime + dt };
    pState = updateClimbNormal(pState, surfaces);
    pState = applyClimbingMovement(pState, input, dt, CLIMB_CONFIG, physicsCtx);
    pState = tryJumpClimb(pState, input, surfaces, CLIMB_CONFIG.MAX_JUMP_DISTANCE, physicsCtx, {
      now: cState.climbGrabTime,
      stamina: staminaState.current,
    });

    if (shouldTriggerFall(staminaState)) {
      pState = releaseGrab(pState, physicsCtx);
      cState = { ...cState, isClimbing: false };
    } else if (input.move.x === 0 && input.move.y === 0 && !input.action) {
      pState = releaseGrab(pState, physicsCtx);
      cState = { ...cState, isClimbing: false };
    }
  }

  return { playerState: pState, climbingState: cState };
}
