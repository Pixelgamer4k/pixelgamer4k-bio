export type AABB = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

export function makeBox(x: number, y: number, z: number, w: number, h: number, d: number): AABB {
  return {
    minX: x - w / 2, maxX: x + w / 2,
    minY: y, maxY: y + h,
    minZ: z - d / 2, maxZ: z + d / 2,
  };
}

export function dist2(ax: number, az: number, bx: number, bz: number) {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
}

/** Horizontal move + step-up against solid AABBs. */
export function moveWithColliders(
  pos: { x: number; y: number; z: number },
  dx: number, dz: number,
  colliders: AABB[],
  radius = 0.28,
  eyeHeight = 1.55,
): { x: number; z: number; groundedY: number } {
  const feet = pos.y;
  const head = feet + eyeHeight;
  const STEP = 0.55;

  const blocked = (px: number, pz: number, fy: number) => {
    for (const c of colliders) {
      // can step onto tops within STEP
      if (c.maxY <= fy + STEP && c.maxY >= fy - 0.02) continue;
      if (head <= c.minY + 0.02 || fy >= c.maxY - 0.02) continue;
      if (px + radius > c.minX && px - radius < c.maxX && pz + radius > c.minZ && pz - radius < c.maxZ) {
        return true;
      }
    }
    return false;
  };

  let x = pos.x;
  let z = pos.z;
  const nx = pos.x + dx;
  const nz = pos.z + dz;

  if (!blocked(nx, z, feet)) x = nx;
  if (!blocked(x, nz, feet)) z = nz;

  // floor / step height under feet
  let groundedY = 0;
  for (const c of colliders) {
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      const top = c.maxY;
      if (top <= feet + STEP + 0.02 && top >= groundedY && top <= feet + STEP) {
        groundedY = top;
      }
    }
  }

  return { x, z, groundedY };
}
