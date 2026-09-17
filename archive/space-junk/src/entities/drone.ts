import * as THREE from 'three';
import { randRange } from '../util/math';
import type { Ship } from './ship';

export class ScrapDrone {
  mesh: THREE.Group;
  velocity = new THREE.Vector3();
  hp = 28;
  radius = 1.1;
  alive = true;
  private attackCd = 0;
  private orbitPhase: number;

  constructor(pos: THREE.Vector3) {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(pos);
    this.orbitPhase = Math.random() * Math.PI * 2;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.5, metalness: 0.55 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0xaa1122, emissiveIntensity: 0.8 });
    const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), bodyMat);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), eyeMat);
    eye.position.set(0, 0.15, -0.55);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.9), bodyMat);
    armL.position.set(-0.55, 0, 0.2);
    const armR = armL.clone();
    armR.position.x = 0.55;
    this.mesh.add(body, eye, armL, armR);
  }

  update(dt: number, ship: Ship, onHit: (dmg: number) => void) {
    if (!this.alive) return;
    this.orbitPhase += dt;
    const toShip = ship.position.clone().sub(this.mesh.position);
    const dist = toShip.length();
    const dir = toShip.normalize();

    // Approach then strafe
    if (dist > 18) {
      this.velocity.lerp(dir.multiplyScalar(9), 1 - Math.exp(-3 * dt));
    } else if (dist < 8) {
      this.velocity.lerp(dir.multiplyScalar(-6), 1 - Math.exp(-3 * dt));
    } else {
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(Math.sin(this.orbitPhase) * 7);
      this.velocity.lerp(side.add(dir.multiplyScalar(2)), 1 - Math.exp(-2 * dt));
    }

    this.mesh.position.addScaledVector(this.velocity, dt);
    this.mesh.lookAt(ship.position);

    this.attackCd -= dt;
    if (dist < 14 && this.attackCd <= 0) {
      this.attackCd = randRange(1.4, 2.2);
      // hit-scan bolt if roughly facing
      if (dist < 12) onHit(6 + Math.random() * 4);
    }

    // spin arms
    this.mesh.children[0].rotation.y += dt * 2;
  }

  takeDamage(n: number) {
    this.hp -= n;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }
}

export class DroneSwarm {
  drones: ScrapDrone[] = [];
  group = new THREE.Group();

  spawn(n: number, around: THREE.Vector3, spread = 30) {
    for (let i = 0; i < n; i++) {
      const p = around.clone().add(
        new THREE.Vector3(randRange(-spread, spread), randRange(-10, 10), randRange(-spread, spread)),
      );
      if (p.distanceTo(around) < 15) p.add(new THREE.Vector3(20, 0, 0));
      const d = new ScrapDrone(p);
      this.drones.push(d);
      this.group.add(d.mesh);
    }
  }

  update(dt: number, ship: Ship, onHit: (dmg: number) => void) {
    for (const d of this.drones) {
      if (!d.alive) continue;
      d.update(dt, ship, onHit);
    }
  }

  removeDead() {
    for (const d of this.drones) {
      if (!d.alive && d.mesh.parent) {
        this.group.remove(d.mesh);
      }
    }
  }

  aliveCount() {
    return this.drones.filter((d) => d.alive).length;
  }
}
