import * as THREE from 'three';
import type { Ship } from '../entities/ship';
import type { SalvagePiece } from '../entities/salvage';
import { RARITY_COLOR } from '../entities/salvage';

export class MagnetBeam {
  private line: THREE.Line;
  private glow: THREE.Mesh;
  active = false;
  range = 22;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0x3ad0ff,
      transparent: true,
      opacity: 0.85,
    });
    this.line = new THREE.Line(geo, mat);
    this.line.visible = false;
    scene.add(this.line);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.5 }),
    );
    this.glow.visible = false;
    scene.add(this.glow);
  }

  update(dt: number, ship: Ship, pieces: SalvagePiece[], holding: boolean) {
    this.active = holding;
    this.line.visible = holding;
    this.glow.visible = holding;
    if (!holding) return null as SalvagePiece | null;

    const origin = ship.position.clone().add(new THREE.Vector3(0, -0.4, 0));
    const forward = ship.getForward().clone();
    const end = origin.clone().addScaledVector(forward, this.range);

    const positions = this.line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, origin.x, origin.y, origin.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;

    this.glow.position.copy(origin).addScaledVector(forward, 1.2);

    let best: SalvagePiece | null = null;
    let bestScore = Infinity;

    for (const p of pieces) {
      if (p.collected) continue;
      const to = p.mesh.position.clone().sub(origin);
      const along = to.dot(forward);
      if (along < 0.5 || along > this.range) continue;
      const closest = origin.clone().addScaledVector(forward, along);
      const lateral = p.mesh.position.distanceTo(closest);
      if (lateral > 3.5) continue;
      const score = lateral + along * 0.05;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }

    if (best) {
      best.pulled = true;
      const pull = origin.clone().sub(best.mesh.position);
      const d = pull.length();
      pull.normalize();
      const strength = 28 / Math.max(1, d * 0.35);
      best.mesh.position.addScaledVector(pull, strength * dt);
      const col = RARITY_COLOR[best.rarity];
      (this.line.material as THREE.LineBasicMaterial).color.setHex(col);
      positions.setXYZ(1, best.mesh.position.x, best.mesh.position.y, best.mesh.position.z);
      positions.needsUpdate = true;

      if (d < ship.radius + best.radius + 0.6) {
        return best;
      }
    } else {
      (this.line.material as THREE.LineBasicMaterial).color.setHex(0x3ad0ff);
      for (const p of pieces) p.pulled = false;
    }
    return null;
  }
}
