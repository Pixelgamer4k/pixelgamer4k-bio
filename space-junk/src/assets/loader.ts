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
  barrel: 'barrel.glb',
  barrels: 'barrels.glb',
  structure: 'structure.glb',
  structureDetailed: 'structure_detailed.glb',
  structureClosed: 'structure_closed.glb',
  hangarLarge: 'hangar_largeA.glb',
  hangarRound: 'hangar_roundA.glb',
  hangarSmall: 'hangar_smallA.glb',
  dish: 'satelliteDish.glb',
  dishLarge: 'satelliteDish_large.glb',
  turret: 'turret_double.glb',
  rocketBase: 'rocket_baseA.glb',
  rocketFuel: 'rocket_fuelA.glb',
  rocketTop: 'rocket_topA.glb',
  rocketFins: 'rocket_finsA.glb',
  platformLarge: 'platform_large.glb',
  platformLong: 'platform_long.glb',
  corridor: 'corridor.glb',
  machineBarrel: 'machine_barrel.glb',
} as const;
