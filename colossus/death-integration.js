import {
  createDeathState,
  updateDeathAnimation,
  getPartTransform,
  getDeathShakeIntensity,
  isDeathComplete,
} from './death.js';

export function createDeathIntegration(colossusEntity) {
  return {
    entity: colossusEntity,
    deathState: createDeathState(),
    active: false,
  };
}

export function triggerDeathSequence(integration) {
  integration.deathState = createDeathState();
  integration.active = true;
  return integration;
}

export function updateDeathIntegration(integration, dt) {
  if (!integration.active) {
    return {
      integration,
      cameraShake: 0,
      isComplete: false,
    };
  }

  integration.deathState = updateDeathAnimation(integration.deathState, dt);

  return {
    integration,
    cameraShake: getDeathShakeIntensity(integration.deathState),
    isComplete: isDeathComplete(integration.deathState),
  };
}

export function applyDeathToMesh(integration, meshGroup) {
  const { deathState } = integration;

  for (const [partId, mesh] of meshGroup.meshByPart) {
    const transform = getPartTransform(
      partId,
      mesh.position,
      mesh.rotation,
      deathState,
    );

    mesh.position.x = transform.position.x;
    mesh.position.y = transform.position.y;
    mesh.position.z = transform.position.z;

    mesh.rotation.x = transform.rotation.x;
    mesh.rotation.y = transform.rotation.y;
    mesh.rotation.z = transform.rotation.z;

    if (deathState.dissolveProgress > 0) {
      mesh.material.opacity = transform.opacity;
      mesh.material.transparent = true;
    }
  }
}
