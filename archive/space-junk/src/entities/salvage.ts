import * as THREE from 'three';
import { pick, randRange } from '../util/math';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLOR: Record<Rarity, number> = {
  common: 0xb0b8c0,
  uncommon: 0x3ddc84,
  rare: 0x3ad0ff,
  epic: 0xb44dff,
  legendary: 0xfedd04,
};

export const RARITY_VALUE: Record<Rarity, number> = {
  common: 8,
  uncommon: 22,
  rare: 55,
  epic: 120,
  legendary: 280,
};

const WEIGHTS: [Rarity, number][] = [
  ['common', 0.48],
  ['uncommon', 0.28],
  ['rare', 0.15],
  ['epic', 0.07],
  ['legendary', 0.02],
];

export function rollRarity(): Rarity {
  const r = Math.random();
  let a = 0;
  for (const [name, w] of WEIGHTS) {
    a += w;
    if (r <= a) return name;
  }
  return 'common';
}

export interface SalvagePiece {
  id: string;
  mesh: THREE.Mesh;
  rarity: Rarity;
  value: number;
  radius: number;
  scanned: boolean;
  pulled: boolean;
  collected: boolean;
  velocity: THREE.Vector3;
}

let _id = 0;

export function createSalvage(pos: THREE.Vector3, forced?: Rarity): SalvagePiece {
  const rarity = forced ?? rollRarity();
  const color = RARITY_COLOR[rarity];
  const size = rarity === 'legendary' ? 1.1 : rarity === 'epic' ? 0.9 : rarity === 'rare' ? 0.75 : 0.55;
  const geo =
    rarity === 'legendary'
      ? new THREE.OctahedronGeometry(size, 0)
      : rarity === 'epic'
        ? new THREE.DodecahedronGeometry(size * 0.7, 0)
        : pick([
            new THREE.BoxGeometry(size, size * randRange(0.5, 1.2), size * randRange(0.6, 1.1)),
            new THREE.TetrahedronGeometry(size * 0.85, 0),
            new THREE.CylinderGeometry(size * 0.35, size * 0.5, size, 6),
          ]);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.15,
    roughness: 0.55,
    metalness: 0.45,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.rotation.set(randRange(0, 6), randRange(0, 6), randRange(0, 6));
  mesh.castShadow = true;
  return {
    id: `s${++_id}`,
    mesh,
    rarity,
    value: RARITY_VALUE[rarity],
    radius: size * 0.7,
    scanned: false,
    pulled: false,
    collected: false,
    velocity: new THREE.Vector3(randRange(-0.4, 0.4), randRange(-0.2, 0.2), randRange(-0.4, 0.4)),
  };
}

export class DebrisField {
  pieces: SalvagePiece[] = [];
  group = new THREE.Group();

  populate(count: number, radius: number) {
    for (let i = 0; i < count; i++) {
      const p = new THREE.Vector3(
        randRange(-radius, radius),
        randRange(-radius * 0.4, radius * 0.4),
        randRange(-radius, radius),
      );
      if (p.length() < 12) p.setLength(12 + Math.random() * 8);
      const piece = createSalvage(p);
      this.pieces.push(piece);
      this.group.add(piece.mesh);
    }
  }

  update(dt: number) {
    for (const p of this.pieces) {
      if (p.collected) continue;
      p.mesh.rotation.x += dt * 0.4;
      p.mesh.rotation.y += dt * 0.55;
      if (!p.pulled) {
        p.mesh.position.addScaledVector(p.velocity, dt);
      }
    }
  }

  remove(piece: SalvagePiece) {
    piece.collected = true;
    this.group.remove(piece.mesh);
    piece.mesh.geometry.dispose();
    (piece.mesh.material as THREE.Material).dispose();
  }

  alive() {
    return this.pieces.filter((p) => !p.collected);
  }
}
