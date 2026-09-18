import * as THREE from 'three';
import { createMaterials, pointFilterAll, type MatBag } from './materials';
import { makeBox, type AABB } from '../engine/collision';

export type Interactable =
  | { kind: 'npc'; id: 'ash' | 'mira'; mesh: THREE.Object3D; label: string }
  | { kind: 'door'; id: 'loft-door'; mesh: THREE.Object3D; label: string; open: boolean };

export interface WorldBuilt {
  scene: THREE.Scene;
  mats: MatBag;
  colliders: AABB[];
  interactables: Interactable[];
  spawn: THREE.Vector3;
  loftZone: AABB;
  watchPath: THREE.Vector3[];
  lanternHooks: THREE.Object3D[];
  moon: THREE.Mesh;
}

function box(
  mats: MatBag,
  mat: THREE.Material,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  colliders: AABB[],
  solid = true,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (solid) colliders.push(makeBox(x, y, z, w, h, d));
  return m;
}

export function buildWorld(): WorldBuilt {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0712);
  scene.fog = new THREE.FogExp2(0x100818, 0.028);

  const mats = createMaterials();
  const colliders: AABB[] = [];
  const group = new THREE.Group();
  scene.add(group);

  // Street floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 36), mats.cobble);
  floor.position.set(0, -0.1, 4);
  floor.receiveShadow = true;
  group.add(floor);

  // Side buildings — left row
  for (const z of [-8, -2, 4, 10, 16]) {
    const h = 4.2 + (z % 5) * 0.15;
    group.add(box(mats, mats.plaster, -5.2, 0, z, 3.2, h, 5.2, colliders));
    group.add(box(mats, mats.roof, -5.2, h, z, 3.6, 0.35, 5.6, colliders, false));
    // awning
    const awn = box(mats, mats.cloth, -3.2, 2.1, z, 1.4, 0.08, 3.2, colliders, false);
    awn.rotation.z = -0.25;
    group.add(awn);
  }
  // Right row
  for (const z of [-6, 0, 6, 12, 18]) {
    const h = 3.8 + ((z + 3) % 4) * 0.2;
    group.add(box(mats, mats.plaster, 5.2, 0, z, 3.2, h, 5.0, colliders));
    group.add(box(mats, mats.roof, 5.2, h, z, 3.6, 0.35, 5.4, colliders, false));
    const awn = box(mats, mats.cloth, 3.2, 2.0, z, 1.4, 0.08, 3.0, colliders, false);
    awn.rotation.z = 0.22;
    group.add(awn);
  }

  // Market stalls (center-ish)
  const stallZs = [-4, 2, 8];
  for (const z of stallZs) {
    group.add(box(mats, mats.wood, -1.6, 0, z, 1.8, 1.1, 1.4, colliders));
    group.add(box(mats, mats.cloth, -1.6, 1.1, z, 2.0, 0.06, 1.6, colliders, false));
    group.add(box(mats, mats.wood, 1.8, 0, z + 1.5, 1.6, 1.0, 1.3, colliders));
    group.add(box(mats, mats.cloth, 1.8, 1.0, z + 1.5, 1.8, 0.06, 1.5, colliders, false));
  }

  // Climbable crates near start
  group.add(box(mats, mats.wood, 2.4, 0, -9.5, 1.0, 0.7, 1.0, colliders));
  group.add(box(mats, mats.wood, 2.4, 0.7, -9.5, 0.9, 0.55, 0.9, colliders));
  group.add(box(mats, mats.wood, -2.2, 0, -7.2, 1.1, 0.65, 1.1, colliders));

  // Alley mouth + loft building at far end (+Z) — clear ~2.2m door corridor at x≈0
  group.add(box(mats, mats.plaster, -3.1, 0, 22.5, 3.6, 5.5, 7, colliders));
  group.add(box(mats, mats.plaster, 3.2, 0, 22.5, 3.6, 5.5, 7, colliders));
  // loft floor / walkway (climb via stairs)
  group.add(box(mats, mats.wood, 0.0, 2.55, 24.0, 2.4, 0.22, 5.0, colliders));
  // stairs to loft (centered in corridor)
  for (let i = 0; i < 7; i++) {
    group.add(box(mats, mats.wood, 0.0, i * 0.36, 19.4 + i * 0.5, 1.5, 0.36, 0.55, colliders));
  }
  // loft rail
  group.add(box(mats, mats.wood, 1.15, 2.75, 23.5, 0.12, 0.7, 4, colliders, false));

  // End wall / sky block
  group.add(box(mats, mats.dark, 0, 0, 28, 16, 8, 1, colliders));
  group.add(box(mats, mats.dark, 0, 0, -14, 16, 8, 1, colliders));
  group.add(box(mats, mats.dark, -8, 0, 4, 1, 8, 40, colliders));
  group.add(box(mats, mats.dark, 8, 0, 4, 1, 8, 40, colliders));

  // Street lantern posts (world lights — dim; player lantern is main)
  const lanternHooks: THREE.Object3D[] = [];
  const postZs = [-10, -3, 5, 13, 20];
  for (const z of postZs) {
    for (const x of [-3.4, 3.4]) {
      const post = box(mats, mats.metal, x, 0, z, 0.12, 2.4, 0.12, colliders, false);
      group.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mats.ember);
      lamp.position.set(x, 2.5, z);
      group.add(lamp);
      lanternHooks.push(lamp);
      const pl = new THREE.PointLight(0xff7733, 0.9, 9, 1.8);
      pl.intensity = 0.85;
      pl.distance = 8;
      pl.position.set(x, 2.45, z);
      scene.add(pl);
    }
  }

  // Red moon
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xc43828 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), moonMat);
  moon.position.set(-6, 14, 30);
  scene.add(moon);

  // Ambient + moon rim
  scene.add(new THREE.AmbientLight(0x2a1830, 0.75));
  const moonLight = new THREE.DirectionalLight(0xcc4455, 0.55);
  moonLight.position.set(-8, 18, 10);
  scene.add(moonLight);

  // NPCs — blocky silhouettes
  const ash = makeNpc(mats, 0x4a6080);
  ash.position.set(-2.0, 0, -5.5);
  ash.rotation.y = Math.PI * 0.15;
  group.add(ash);

  const mira = makeNpc(mats, 0x6a4050);
  mira.position.set(2.2, 0, 7.5);
  mira.rotation.y = -Math.PI * 0.4;
  group.add(mira);

  // Door on loft building
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, 0.12), mats.wood);
  door.position.set(0.0, 1.05, 19.02);
  group.add(door);
  const doorFrame = box(mats, mats.metal, 0.0, 0, 19.0, 1.5, 2.25, 0.18, colliders, false);
  group.add(doorFrame);

  const interactables: Interactable[] = [
    { kind: 'npc', id: 'ash', mesh: ash, label: 'E · Talk' },
    { kind: 'npc', id: 'mira', mesh: mira, label: 'E · Talk' },
    { kind: 'door', id: 'loft-door', mesh: door, label: 'E · Open', open: false },
  ];

  // Watchman patrol along street (near loft approach)
  const watchPath = [
    new THREE.Vector3(0.8, 0, 13.5),
    new THREE.Vector3(-1.4, 0, 15.8),
    new THREE.Vector3(1.3, 0, 17.2),
    new THREE.Vector3(-0.2, 0, 16.0),
  ];

  const loftZone = makeBox(0.0, 2.55, 24.0, 2.2, 2.5, 4.5);
  const spawn = new THREE.Vector3(0, 0, -11);

  pointFilterAll(scene);
  return { scene, mats, colliders, interactables, spawn, loftZone, watchPath, lanternHooks, moon };
}

function makeNpc(mats: MatBag, cloak: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.4), new THREE.MeshStandardMaterial({
    color: cloak, roughness: 0.9, flatShading: true,
  }));
  body.position.y = 0.95;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mats.wood);
  head.position.y = 1.55;
  head.castShadow = true;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.35), mats.dark);
  legs.position.y = 0.25;
  const ember = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mats.ember);
  ember.position.set(0.2, 1.15, 0.22);
  const glow = new THREE.PointLight(0xff6633, 0.55, 3.5, 2);
  glow.position.copy(ember.position);
  g.add(body, head, legs, ember, glow);
  return g;
}
