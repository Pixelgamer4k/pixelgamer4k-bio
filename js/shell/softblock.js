/** Soft-block hero: rounded brick body, stubby limbs. Yellow #FEDD04 / black #202022. NOT the logo. */
import THREE from './three.js';

const YELLOW = 0xfedd04;
const INK = 0x202022;

function boxMesh(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
  });
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Build a soft-block character group.
 * @param {{ yellow?: number, ink?: number, scale?: number }} opts
 */
export function createSoftBlock(opts = {}) {
  const yellow = opts.yellow ?? YELLOW;
  const ink = opts.ink ?? INK;
  const scale = opts.scale ?? 1;

  const root = new THREE.Group();
  root.name = 'softblock';

  const body = boxMesh(0.72, 0.78, 0.52, yellow);
  body.position.y = 0.78;
  root.add(body);

  const head = boxMesh(0.58, 0.48, 0.48, yellow);
  head.position.y = 1.42;
  root.add(head);

  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.06);
  const eyeMat = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.4 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.14, 1.44, 0.24);
  eyeR.position.set(0.14, 1.44, 0.24);
  root.add(eyeL, eyeR);

  const mouth = boxMesh(0.22, 0.05, 0.05, ink);
  mouth.position.set(0, 1.28, 0.24);
  root.add(mouth);

  const armL = boxMesh(0.22, 0.42, 0.22, yellow);
  const armR = boxMesh(0.22, 0.42, 0.22, yellow);
  armL.position.set(-0.52, 0.82, 0);
  armR.position.set(0.52, 0.82, 0);
  root.add(armL, armR);

  const legL = boxMesh(0.24, 0.38, 0.28, ink);
  const legR = boxMesh(0.24, 0.38, 0.28, ink);
  legL.position.set(-0.18, 0.2, 0);
  legR.position.set(0.18, 0.2, 0);
  root.add(legL, legR);

  const footL = boxMesh(0.28, 0.1, 0.36, ink);
  const footR = boxMesh(0.28, 0.1, 0.36, ink);
  footL.position.set(-0.18, 0.05, 0.04);
  footR.position.set(0.18, 0.05, 0.04);
  root.add(footL, footR);

  root.userData = { body, head, armL, armR, legL, legR, baseYellow: yellow, ink };
  root.scale.setScalar(scale);
  return root;
}

export function createRival(color = 0x3a3a3e, scale = 1) {
  return createSoftBlock({ yellow: color, ink: 0x101012, scale });
}

export function animateSoftBlock(root, state, dt) {
  const { armL, armR, legL, legR, body, head } = root.userData;
  if (!armL) return;
  const moving = state.moving;
  state.animT = (state.animT || 0) + dt * (moving ? 10 : 4);

  if (moving) {
    const swing = Math.sin(state.animT) * 0.45;
    armL.rotation.x = swing;
    armR.rotation.x = -swing;
    legL.rotation.x = -swing * 0.9;
    legR.rotation.x = swing * 0.9;
    body.position.y = 0.78 + Math.abs(Math.sin(state.animT * 2)) * 0.04;
  } else {
    armL.rotation.x *= 0.85;
    armR.rotation.x *= 0.85;
    legL.rotation.x *= 0.85;
    legR.rotation.x *= 0.85;
    body.position.y += (0.78 - body.position.y) * Math.min(1, dt * 8);
  }

  if (state.attackTimer > 0) {
    const p = 1 - state.attackTimer / (state.attackDur || 0.28);
    const punch = Math.sin(p * Math.PI) * 1.1;
    armR.rotation.x = -punch;
    armR.rotation.z = punch * 0.3;
    head.rotation.y = punch * 0.15;
  } else {
    armR.rotation.z *= 0.8;
    head.rotation.y *= 0.8;
  }
}

export { YELLOW, INK };
