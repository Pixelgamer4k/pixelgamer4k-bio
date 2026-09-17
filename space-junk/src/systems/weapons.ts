import * as THREE from 'three';
import type { Ship } from '../entities/ship';
import type { ScrapDrone } from '../entities/drone';
import type { JunkBehemoth } from '../entities/boss';

interface Bolt {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

export class WeaponSystem {
  private bolts: Bolt[] = [];
  private group = new THREE.Group();
  private cd = 0;
  private pops: { mesh: THREE.Mesh; life: number }[] = [];

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(
    dt: number,
    ship: Ship,
    firing: boolean,
    drones: ScrapDrone[],
    boss: JunkBehemoth | null,
    onBossHit: (n: number) => void,
  ) {
    this.cd = Math.max(0, this.cd - dt);
    const rate = 0.18 / (1 + (ship.weaponLevel - 1) * 0.15);
    if (firing && this.cd <= 0) {
      this.cd = rate;
      this.fire(ship);
    }

    for (const b of this.bolts) {
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      for (const d of drones) {
        if (!d.alive) continue;
        if (b.mesh.position.distanceTo(d.mesh.position) < d.radius + 0.4) {
          b.life = 0;
          const dead = d.takeDamage(12 + ship.weaponLevel * 3);
          if (dead) this.spawnPop(d.mesh.position.clone());
        }
      }
      if (boss?.alive && b.mesh.position.distanceTo(boss.position) < boss.radius) {
        b.life = 0;
        const mul = boss.phase === 'stunned' || boss.phase.startsWith('intro') ? 2.2 : 1;
        onBossHit((10 + ship.weaponLevel * 4) * mul);
      }
    }

    this.bolts = this.bolts.filter((b) => {
      if (b.life <= 0) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        return false;
      }
      return true;
    });

    for (const p of this.pops) {
      p.life -= dt;
      p.mesh.scale.multiplyScalar(1 + dt * 4);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 2);
    }
    this.pops = this.pops.filter((p) => {
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        return false;
      }
      return true;
    });
  }

  private fire(ship: Ship) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6644 }),
    );
    mesh.position.copy(ship.position).add(ship.getForward().multiplyScalar(2));
    const vel = ship.getForward().clone().multiplyScalar(55).add(ship.velocity);
    this.group.add(mesh);
    this.bolts.push({ mesh, vel, life: 1.4 });
  }

  spawnPop(pos: THREE.Vector3) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.9 }),
    );
    mesh.position.copy(pos);
    this.group.add(mesh);
    this.pops.push({ mesh, life: 0.45 });
  }
}
