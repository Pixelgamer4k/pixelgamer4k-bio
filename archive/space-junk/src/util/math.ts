import * as THREE from 'three';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (cur: number, tgt: number, lambda: number, dt: number) =>
  lerp(cur, tgt, 1 - Math.exp(-lambda * dt));

export function dampVec3(cur: THREE.Vector3, tgt: THREE.Vector3, lambda: number, dt: number) {
  cur.x = damp(cur.x, tgt.x, lambda, dt);
  cur.y = damp(cur.y, tgt.y, lambda, dt);
  cur.z = damp(cur.z, tgt.z, lambda, dt);
}

export function randRange(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}
