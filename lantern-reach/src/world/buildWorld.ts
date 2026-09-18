import * as THREE from 'three';
import { createMaterials, pointFilterAll, type MatBag } from './materials';
import { makeBox, type AABB } from '../engine/collision';

export type Interactable =
  | { kind: 'npc'; id: 'ash' | 'mira'; mesh: THREE.Object3D; label: string; phase: number }
  | {
      kind: 'door';
      id: 'loft-door';
      mesh: THREE.Object3D;
      hinge: THREE.Group;
      label: string;
      open: boolean;
      openAmount: number;
      blocker: AABB;
      anchor: THREE.Vector3;
    };

export interface WorldBuilt {
  scene: THREE.Scene;
  mats: MatBag;
  colliders: AABB[];
  interactables: Interactable[];
  spawn: THREE.Vector3;
  loftZone: AABB;
  watchPath: THREE.Vector3[];
  lanternPivots: THREE.Group[];
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

  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 36), mats.cobble);
  floor.position.set(0, -0.1, 4);
  floor.receiveShadow = true;
  group.add(floor);

  for (const z of [-8, -2, 4, 10, 16]) {
    const h = 4.2 + (z % 5) * 0.15;
    group.add(box(mats, mats.plaster, -5.2, 0, z, 3.2, h, 5.2, colliders));
    group.add(box(mats, mats.roof, -5.2, h, z, 3.6, 0.35, 5.6, colliders, false));
    const awn = box(mats, mats.cloth, -3.2, 2.1, z, 1.4, 0.08, 3.2, colliders, false);
    awn.rotation.z = -0.25;
    group.add(awn);
  }
  for (const z of [-6, 0, 6, 12, 18]) {
    const h = 3.8 + ((z + 3) % 4) * 0.2;
    group.add(box(mats, mats.plaster, 5.2, 0, z, 3.2, h, 5.0, colliders));
    group.add(box(mats, mats.roof, 5.2, h, z, 3.6, 0.35, 5.4, colliders, false));
    const awn = box(mats, mats.cloth, 3.2, 2.0, z, 1.4, 0.08, 3.0, colliders, false);
    awn.rotation.z = 0.22;
    group.add(awn);
  }

  const stallZs = [-4, 2, 8];
  for (const z of stallZs) {
    group.add(box(mats, mats.wood, -1.6, 0, z, 1.8, 1.1, 1.4, colliders));
    group.add(box(mats, mats.cloth, -1.6, 1.1, z, 2.0, 0.06, 1.6, colliders, false));
    group.add(box(mats, mats.wood, 1.8, 0, z + 1.5, 1.6, 1.0, 1.3, colliders));
    group.add(box(mats, mats.cloth, 1.8, 1.0, z + 1.5, 1.8, 0.06, 1.5, colliders, false));
  }

  group.add(box(mats, mats.wood, 2.4, 0, -9.5, 1.0, 0.7, 1.0, colliders));
  group.add(box(mats, mats.wood, 2.4, 0.7, -9.5, 0.9, 0.55, 0.9, colliders));
  group.add(box(mats, mats.wood, -2.2, 0, -7.2, 1.1, 0.65, 1.1, colliders));

  group.add(box(mats, mats.plaster, -3.1, 0, 22.5, 3.6, 5.5, 7, colliders));
  group.add(box(mats, mats.plaster, 3.2, 0, 22.5, 3.6, 5.5, 7, colliders));
  group.add(box(mats, mats.wood, 0.0, 2.55, 24.0, 2.4, 0.22, 5.0, colliders));
  for (let i = 0; i < 7; i++) {
    group.add(box(mats, mats.wood, 0.0, i * 0.36, 19.4 + i * 0.5, 1.5, 0.36, 0.55, colliders));
  }
  group.add(box(mats, mats.wood, 1.15, 2.75, 23.5, 0.12, 0.7, 4, colliders, false));

  group.add(box(mats, mats.dark, 0, 0, 28, 16, 8, 1, colliders));
  group.add(box(mats, mats.dark, 0, 0, -14, 16, 8, 1, colliders));
  group.add(box(mats, mats.dark, -8, 0, 4, 1, 8, 40, colliders));
  group.add(box(mats, mats.dark, 8, 0, 4, 1, 8, 40, colliders));

  // Street lantern posts — pendulum pivots at post top
  const lanternPivots: THREE.Group[] = [];
  const postZs = [-10, -3, 5, 13, 20];
  for (const z of postZs) {
    for (const x of [-3.4, 3.4]) {
      const post = box(mats, mats.metal, x, 0, z, 0.12, 2.35, 0.12, colliders, false);
      group.add(post);
      const pivot = new THREE.Group();
      pivot.position.set(x, 2.48, z);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.35, 0.06),
        mats.metal,
      );
      arm.position.set(0, -0.12, 0);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), mats.ember);
      lamp.position.set(0, -0.38, 0);
      lamp.name = 'ember';
      pivot.add(arm, lamp);
      group.add(pivot);
      lanternPivots.push(pivot);
      const pl = new THREE.PointLight(0xff7733, 0.9, 9, 1.8);
      pl.intensity = 0.85;
      pl.distance = 8;
      pl.position.set(0, -0.38, 0);
      pivot.add(pl);
    }
  }

  const moonMat = new THREE.MeshBasicMaterial({ color: 0xc43828 });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), moonMat);
  moon.position.set(-6, 14, 30);
  scene.add(moon);

  scene.add(new THREE.AmbientLight(0x2a1830, 0.75));
  const moonLight = new THREE.DirectionalLight(0xcc4455, 0.55);
  moonLight.position.set(-8, 18, 10);
  scene.add(moonLight);

  const ash = makeNpc(mats, 0x4a6080);
  ash.position.set(-2.0, 0, -5.5);
  ash.rotation.y = Math.PI * 0.15;
  group.add(ash);

  const mira = makeNpc(mats, 0x6a4050);
  mira.position.set(2.2, 0, 7.5);
  mira.rotation.y = -Math.PI * 0.4;
  group.add(mira);

  // Hinged loft door — pivot on left jamb, panel offset so closed fills frame
  const hinge = new THREE.Group();
  hinge.position.set(-0.58, 0, 19.02);
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.05, 0.12), mats.wood);
  doorPanel.position.set(0.58, 1.05, 0);
  doorPanel.castShadow = true;
  hinge.add(doorPanel);
  group.add(hinge);
  const doorFrame = box(mats, mats.metal, 0.0, 0, 19.0, 1.5, 2.25, 0.18, colliders, false);
  group.add(doorFrame);

  const doorBlocker = makeBox(0.0, 0, 19.02, 1.25, 2.15, 0.4);
  colliders.push(doorBlocker);

  const interactables: Interactable[] = [
    { kind: 'npc', id: 'ash', mesh: ash, label: 'E · Talk', phase: 0.2 },
    { kind: 'npc', id: 'mira', mesh: mira, label: 'E · Talk', phase: 1.7 },
    {
      kind: 'door',
      id: 'loft-door',
      mesh: doorPanel,
      hinge,
      label: 'E · Open',
      open: false,
      openAmount: 0,
      blocker: doorBlocker,
      anchor: new THREE.Vector3(0, 1.0, 19.02),
    },
  ];

  const watchPath = [
    new THREE.Vector3(0.8, 0, 13.5),
    new THREE.Vector3(-1.4, 0, 15.8),
    new THREE.Vector3(1.3, 0, 17.2),
    new THREE.Vector3(-0.2, 0, 16.0),
  ];

  const loftZone = makeBox(0.0, 2.55, 24.0, 2.2, 2.5, 4.5);
  const spawn = new THREE.Vector3(0, 0, -11);

  pointFilterAll(scene);
  return { scene, mats, colliders, interactables, spawn, loftZone, watchPath, lanternPivots, moon };
}

function makeNpc(mats: MatBag, cloak: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.4), new THREE.MeshStandardMaterial({
    color: cloak, roughness: 0.9, flatShading: true,
  }));
  body.position.y = 0.95;
  body.castShadow = true;
  body.name = 'body';
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mats.wood);
  head.position.y = 1.55;
  head.castShadow = true;
  head.name = 'head';
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.35), mats.dark);
  legs.position.y = 0.25;
  legs.name = 'legs';
  const ember = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mats.ember);
  ember.position.set(0.2, 1.15, 0.22);
  const glow = new THREE.PointLight(0xff6633, 0.55, 3.5, 2);
  glow.position.copy(ember.position);
  g.add(body, head, legs, ember, glow);
  return g;
}
