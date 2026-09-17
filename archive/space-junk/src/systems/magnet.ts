import * as THREE from 'three';
import type { Ship } from '../entities/ship';
import type { SalvagePiece } from '../entities/salvage';
import { RARITY_COLOR } from '../entities/salvage';

export class MagnetBeam {
  private line: THREE.Line;
  private glow: THREE.Mesh;
  private ring: THREE.Mesh;
  private particles: THREE.Points;
  private partPos: Float32Array;
  active = false;
  range = 22;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -1),
    ]);
    this.line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.9 }),
    );
    this.line.visible = false;
    this.line.name = 'magnetBeam';
    scene.add(this.line);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.55 }),
    );
    this.glow.visible = false;
    scene.add(this.glow);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.06, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0x3ad0ff, transparent: true, opacity: 0.5 }),
    );
    this.ring.visible = false;
    scene.add(this.ring);

    this.partPos = new Float32Array(24 * 3);
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(this.partPos, 3));
    this.particles = new THREE.Points(
      pgeo,
      new THREE.PointsMaterial({ color: 0x66e0ff, size: 0.18, transparent: true, opacity: 0.7, depthWrite: false }),
    );
    this.particles.visible = false;
    this.particles.name = 'magnetParticles';
    scene.add(this.particles);
  }

  update(dt: number, ship: Ship, pieces: SalvagePiece[], holding: boolean) {
    this.active = holding;
    this.line.visible = holding;
    this.glow.visible = holding;
    this.ring.visible = holding;
    this.particles.visible = holding;
    if (!holding) return null as SalvagePiece | null;

    // Beam originates at under-nose magnetRoot hardpoint (ship-local → world)
    const origin = ship.getMagnetWorld(new THREE.Vector3()).clone();
    const forward = ship.getForward().clone();
    const end = origin.clone().addScaledVector(forward, this.range);

    const positions = this.line.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, origin.x, origin.y, origin.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;

    this.glow.position.copy(origin).addScaledVector(forward, 1.1);
    this.ring.position.copy(origin).addScaledVector(forward, 2.2);
    this.ring.lookAt(end);
    this.ring.rotateX(Math.PI / 2);
    this.ring.scale.setScalar(1 + Math.sin(performance.now() * 0.01) * 0.12);

    let best: SalvagePiece | null = null;
    let bestScore = Infinity;

    for (const p of pieces) {
      if (p.collected) continue;
      const to = p.mesh.position.clone().sub(origin);
      const along = to.dot(forward);
      if (along < 0.5 || along > this.range) continue;
      const closest = origin.clone().addScaledVector(forward, along);
      const lateral = p.mesh.position.distanceTo(closest);
      if (lateral > 4.4) continue;
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
      const strength = 32 / Math.max(1, d * 0.32);
      best.mesh.position.addScaledVector(pull, strength * dt);
      const col = RARITY_COLOR[best.rarity];
      (this.line.material as THREE.LineBasicMaterial).color.setHex(col);
      positions.setXYZ(1, best.mesh.position.x, best.mesh.position.y, best.mesh.position.z);
      positions.needsUpdate = true;

      for (let i = 0; i < 24; i++) {
        const t = (i / 24 + performance.now() * 0.0004) % 1;
        this.partPos[i * 3] = THREE.MathUtils.lerp(best.mesh.position.x, origin.x, t) + Math.sin(i + t * 8) * 0.15;
        this.partPos[i * 3 + 1] = THREE.MathUtils.lerp(best.mesh.position.y, origin.y, t) + Math.cos(i * 1.3) * 0.12;
        this.partPos[i * 3 + 2] = THREE.MathUtils.lerp(best.mesh.position.z, origin.z, t);
      }
      (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      if (d < ship.radius + best.radius + 1.0) return best;
    } else {
      (this.line.material as THREE.LineBasicMaterial).color.setHex(0x3ad0ff);
      for (const p of pieces) p.pulled = false;
      for (let i = 0; i < 24; i++) {
        const t = i / 24;
        const pt = origin.clone().addScaledVector(forward, t * 8);
        this.partPos[i * 3] = pt.x;
        this.partPos[i * 3 + 1] = pt.y;
        this.partPos[i * 3 + 2] = pt.z;
      }
      (this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
    return null;
  }
}
