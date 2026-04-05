export function isOnRestSpot(climbSurface, body) {
  if (!climbSurface || !body) return false;
  const part = body.parts.get(climbSurface.bodyPartId);
  if (!part) return false;
  return !!part.isRestSpot;
}
