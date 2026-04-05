export function applyHealthOpacity(meshGroup, health, maxHealth) {
  const ratio = Math.max(0, Math.min(1, health / maxHealth));
  const opacity = 0.3 + 0.7 * ratio;

  for (const [, mesh] of meshGroup.meshByPart) {
    mesh.material.opacity = opacity;
    if (ratio < 1) {
      mesh.material.transparent = true;
    }
  }

  return opacity;
}
