import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Vite serves public/ at root; prefer absolute play path in production. */
function assetUrl(name: string) {
  // Prefer relative to game root so GitHub Pages base works
  return `./assets/kenney-space-kit/${name}`;
}

const cache = new Map<string, THREE.Group>();
const loader = new GLTFLoader();

export async function loadGlb(name: string): Promise<THREE.Group> {
  const hit = cache.get(name);
  if (hit) return hit.clone(true);
  const gltf = await loader.loadAsync(assetUrl(name));
  const root = gltf.scene;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  cache.set(name, root);
  return root.clone(true);
}

/**
 * Kenney Space Kit crafts are authored with a tile offset (not origin-centered).
 * Wrap + center so geometric center sits at (0,0,0), then nose → -Z.
 * Returns the outer orient group (add this to shipRoot).
 */
export function centerAndOrientCraft(raw: THREE.Object3D, scale = 1.35): THREE.Group {
  raw.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(raw);
  const center = box.getCenter(new THREE.Vector3());
  raw.position.set(-center.x, -center.y, -center.z);

  const orient = new THREE.Group();
  orient.name = 'hullOrient';
  orient.add(raw);
  orient.rotation.y = Math.PI; // Kenney +Z nose → game -Z forward
  orient.scale.setScalar(scale);
  orient.updateMatrixWorld(true);
  return orient;
}

export interface HullHardpoints {
  /** Rear nozzle tips in shipRoot/orient local space (nose -Z, +Z aft). */
  nozzles: THREE.Vector3[];
  /** Under-nose magnet hardpoint. */
  magnet: THREE.Vector3;
}

/**
 * Detect twin rear engine bells on a centered+oriented Kenney craft,
 * then expose three nozzles (L / mid / R) flush on that rear face for VFX.
 */
export function detectHullHardpoints(orient: THREE.Object3D): HullHardpoints {
  const verts: THREE.Vector3[] = [];
  orient.updateMatrixWorld(true);
  orient.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const pos = m.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      verts.push(v.clone());
    }
  });

  if (verts.length < 8) {
    return {
      nozzles: [
        new THREE.Vector3(-0.55, -0.15, 1.55),
        new THREE.Vector3(0, -0.15, 1.55),
        new THREE.Vector3(0.55, -0.15, 1.55),
      ],
      magnet: new THREE.Vector3(0, -0.55, -0.85),
    };
  }

  const maxZ = Math.max(...verts.map((p) => p.z));
  const rear = verts.filter((p) => p.z > maxZ - 0.14);
  const minX = Math.min(...rear.map((p) => p.x));
  const maxX = Math.max(...rear.map((p) => p.x));
  const midX = (minX + maxX) * 0.5;
  const left = rear.filter((p) => p.x < midX);
  const right = rear.filter((p) => p.x >= midX);

  const avg = (arr: THREE.Vector3[]) => {
    const a = new THREE.Vector3();
    for (const p of arr) a.add(p);
    return a.multiplyScalar(1 / Math.max(1, arr.length));
  };

  const L = left.length ? avg(left) : new THREE.Vector3(minX, -0.2, maxZ);
  const R = right.length ? avg(right) : new THREE.Vector3(maxX, -0.2, maxZ);
  const tipZ = maxZ + 0.04;
  const Ly = L.y;
  const Ry = R.y;
  const midY = (Ly + Ry) * 0.5;

  // Three nozzles on the real rear face: twin sockets + centerline between them
  const nozzles = [
    new THREE.Vector3(L.x, Ly, tipZ),
    new THREE.Vector3((L.x + R.x) * 0.5, midY, tipZ),
    new THREE.Vector3(R.x, Ry, tipZ),
  ];

  const minY = Math.min(...verts.map((p) => p.y));
  const maxY = Math.max(...verts.map((p) => p.y));
  const bottomFront = verts.filter(
    (p) => p.y < minY + (maxY - minY) * 0.22 && p.z < 0,
  );
  const mag = bottomFront.length ? avg(bottomFront) : new THREE.Vector3(0, minY, -0.9);
  mag.y = minY - 0.04; // sit just under the chin

  // Convert world (orient is under identity parent during detect) → local to orient
  // verts already in world; if orient is at origin with its transforms, world == orient-local
  // when orient.parent is identity. Caller detects while orient is unparented / at origin.
  return { nozzles, magnet: mag };
}

export function paintPioneerLivery(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat, i) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      const c = mat.color;
      const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11;
      const next = mat.clone();
      if (lum > 0.55 || c.r > 0.7) {
        next.color.setHex(0xf4f6f8);
        next.metalness = 0.35;
        next.roughness = 0.4;
      } else if (c.r > c.g && c.r > c.b) {
        next.color.setHex(0xe22b2b);
        next.metalness = 0.25;
        next.roughness = 0.4;
      } else if (c.b > c.r && c.b > 0.4) {
        next.color.setHex(0x3ad0ff);
        next.emissive.setHex(0x1a88cc);
        next.emissiveIntensity = 0.55;
      } else {
        next.color.setHex(0x2a2e36);
        next.metalness = 0.5;
        next.roughness = 0.5;
      }
      if (Array.isArray(m.material)) m.material[i] = next;
      else m.material = next;
    });
  });
}

export const ASSET = {
  miner: 'craft_miner.glb',
  racer: 'craft_racer.glb',
  speederA: 'craft_speederA.glb',
  speederB: 'craft_speederB.glb',
  speederC: 'craft_speederC.glb',
  speederD: 'craft_speederD.glb',
  cargoA: 'craft_cargoA.glb',
  cargoB: 'craft_cargoB.glb',
  meteor: 'meteor.glb',
  meteorDetailed: 'meteor_detailed.glb',
  meteorHalf: 'meteor_half.glb',
  rock: 'rock.glb',
  rockLargeA: 'rock_largeA.glb',
  rockLargeB: 'rock_largeB.glb',
  rocksSmallA: 'rocks_smallA.glb',
  rocksSmallB: 'rocks_smallB.glb',
  rockCrystalA: 'rock_crystalsLargeA.glb',
  rockCrystalB: 'rock_crystalsLargeB.glb',
  barrel: 'barrel.glb',
  barrels: 'barrels.glb',
  barrelsRail: 'barrels_rail.glb',
  structure: 'structure.glb',
  structureDetailed: 'structure_detailed.glb',
  structureClosed: 'structure_closed.glb',
  structureDiagonal: 'structure_diagonal.glb',
  hangarLarge: 'hangar_largeA.glb',
  hangarLargeB: 'hangar_largeB.glb',
  hangarRound: 'hangar_roundA.glb',
  hangarRoundB: 'hangar_roundB.glb',
  hangarRoundGlass: 'hangar_roundGlass.glb',
  hangarSmall: 'hangar_smallA.glb',
  hangarSmallB: 'hangar_smallB.glb',
  dish: 'satelliteDish.glb',
  dishLarge: 'satelliteDish_large.glb',
  turret: 'turret_double.glb',
  rocketBase: 'rocket_baseA.glb',
  rocketBaseB: 'rocket_baseB.glb',
  rocketFuel: 'rocket_fuelA.glb',
  rocketFuelB: 'rocket_fuelB.glb',
  rocketTop: 'rocket_topA.glb',
  rocketFins: 'rocket_finsA.glb',
  rocketSidesB: 'rocket_sidesB.glb',
  platformLarge: 'platform_large.glb',
  platformLong: 'platform_long.glb',
  platformHigh: 'platform_high.glb',
  platformSmall: 'platform_small.glb',
  corridor: 'corridor.glb',
  corridorDetailed: 'corridor_detailed.glb',
  corridorOpen: 'corridor_open.glb',
  corridorSplit: 'corridor_split.glb',
  corridorEnd: 'corridor_end.glb',
  corridorCross: 'corridor_cross.glb',
  machineBarrel: 'machine_barrel.glb',
  machineBarrelLarge: 'machine_barrelLarge.glb',
  machineGenerator: 'machine_generator.glb',
  machineGeneratorLarge: 'machine_generatorLarge.glb',
  machineWireless: 'machine_wireless.glb',
  gateComplex: 'gate_complex.glb',
  gateSimple: 'gate_simple.glb',
  rover: 'rover.glb',
  chimney: 'chimney.glb',
  chimneyDetailed: 'chimney_detailed.glb',
  trainCargo: 'monorail_trainCargo.glb',
  trainBox: 'monorail_trainBox.glb',
  trainFlat: 'monorail_trainFlat.glb',
  trainFront: 'monorail_trainFront.glb',
  supportsHigh: 'supports_high.glb',
  supportsLow: 'supports_low.glb',
  pipeCross: 'pipe_cross.glb',
  pipeEntrance: 'pipe_entrance.glb',
  craterLarge: 'craterLarge.glb',
} as const;
