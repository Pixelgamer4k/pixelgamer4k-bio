/** Shared arena helpers — floors, walls, props */
import THREE from './three.js';

const FIELD = 0xfedd04;
const INK = 0x202022;

export function makeFloor(size = 28, color = 0xf5e56a) {
  const geo = new THREE.BoxGeometry(size, 0.4, size);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.2;
  mesh.receiveShadow = true;
  mesh.userData.solid = true;
  mesh.userData.half = size / 2;
  return mesh;
}

export function makeRing(radius = 12, color = INK) {
  const geo = new THREE.TorusGeometry(radius, 0.18, 8, 48);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2;
  m.position.y = 0.05;
  return m;
}

export function makeBlock(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function makePad(r = 2.2, color = 0x2ecc71, y = 0.08) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.16, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.15 })
  );
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}

export function makeOrb(color = 0x4fc3f7) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, emissive: color, emissiveIntensity: 0.35 })
  );
  m.castShadow = true;
  return m;
}

export function makePillar(h = 3, color = INK) {
  return makeBlock(0.9, h, 0.9, color, 0, h / 2, 0);
}

export function clampToArena(pos, half = 12) {
  pos.x = Math.max(-half, Math.min(half, pos.x));
  pos.z = Math.max(-half, Math.min(half, pos.z));
}

export function dist2(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function randRange(a, b) {
  return a + Math.random() * (b - a);
}

export function randPoint(half = 10, minR = 0) {
  for (let i = 0; i < 20; i++) {
    const x = randRange(-half, half);
    const z = randRange(-half, half);
    if (Math.hypot(x, z) >= minR) return { x, z };
  }
  return { x: half * 0.5, z: half * 0.5 };
}

export { FIELD, INK };
