export function moveToward2D(body, target, speed, dt) {
  const dx = target.x - body.x;
  const dz = target.z - body.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.01) return body;

  const step = Math.min(speed * dt, dist);
  const nx = dx / dist;
  const nz = dz / dist;

  return {
    x: body.x + nx * step,
    y: body.y,
    z: body.z + nz * step,
  };
}

export function moveToward3D(body, target, speed, dt) {
  const dx = target.x - body.x;
  const dy = target.y - body.y;
  const dz = target.z - body.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.01) return body;

  const step = Math.min(speed * dt, dist);
  const nx = dx / dist;
  const ny = dy / dist;
  const nz = dz / dist;

  return {
    x: body.x + nx * step,
    y: body.y + ny * step,
    z: body.z + nz * step,
  };
}
