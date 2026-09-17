import * as THREE from 'three';
import type { Ship } from '../entities/ship';
import type { SalvagePiece } from '../entities/salvage';
import { RARITY_COLOR } from '../entities/salvage';

export class ScanPulse {
  private mesh: THREE.Mesh;
  private t = 0;
  private active = false;
  cooldown = 0;
  radius = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.SphereGeometry(1, 24, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfedd04,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  get ready() {
    return this.cooldown <= 0 && !this.active;
  }

  trigger(ship: Ship) {
    if (!this.ready) return false;
    this.active = true;
    this.t = 0;
    this.radius = 0;
    this.cooldown = 3.2;
    this.mesh.position.copy(ship.position);
    this.mesh.visible = true;
    return true;
  }

  update(dt: number, ship: Ship, pieces: SalvagePiece[]) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!this.active) return;

    this.t += dt;
    this.radius = this.t * 38;
    this.mesh.position.copy(ship.position);
    this.mesh.scale.setScalar(Math.max(0.01, this.radius));
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.35 * (1 - this.t / 1.1));

    for (const p of pieces) {
      if (p.collected || p.scanned) continue;
      if (p.mesh.position.distanceTo(ship.position) <= this.radius) {
        p.scanned = true;
        const m = p.mesh.material as THREE.MeshStandardMaterial;
        m.emissive.setHex(RARITY_COLOR[p.rarity]);
        m.emissiveIntensity = 0.55;
      }
    }

    if (this.t > 1.1) {
      this.active = false;
      this.mesh.visible = false;
    }
  }
}
