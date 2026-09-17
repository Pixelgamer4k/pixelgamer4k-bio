import * as THREE from 'three';
import { dampVec3 } from '../util/math';
import type { Ship } from '../entities/ship';

/** Elevated chase cam with damping + boost zoom. */
export class ChaseCamera {
  camera: THREE.PerspectiveCamera;
  private ideal = new THREE.Vector3();
  private look = new THREE.Vector3();
  private lookCur = new THREE.Vector3();
  private shake = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 400);
    this.camera.position.set(0, 8, 14);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  addShake(a: number) {
    this.shake = Math.min(1.2, this.shake + a);
  }

  update(dt: number, ship: Ship) {
    const boost = ship.boosting;
    const dist = boost ? 9.5 : 12.5;
    const elev = boost ? 4.2 : 5.5;
    const fovTarget = boost ? 62 : 55;
    this.camera.fov += (fovTarget - this.camera.fov) * (1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();

    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.group.quaternion);
    this.ideal.copy(ship.position).addScaledVector(back, dist);
    this.ideal.y += elev;

    dampVec3(this.camera.position, this.ideal, boost ? 7 : 4.5, dt);

    this.look.copy(ship.position).add(new THREE.Vector3(0, 0.6, 0));
    const nose = new THREE.Vector3(0, 0, -6).applyQuaternion(ship.group.quaternion);
    this.look.add(nose);
    dampVec3(this.lookCur, this.look, 8, dt);

    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.35;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }

    this.camera.lookAt(this.lookCur);
  }
}
