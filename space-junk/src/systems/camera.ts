import * as THREE from 'three';
import { dampVec3 } from '../util/math';
import type { Ship } from '../entities/ship';

/** Chase cam that follows ship pitch/yaw with damping + boost zoom. */
export class ChaseCamera {
  camera: THREE.PerspectiveCamera;
  private ideal = new THREE.Vector3();
  private look = new THREE.Vector3();
  private lookCur = new THREE.Vector3();
  private shake = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.15, 450);
    this.camera.position.set(0, 6, 14);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  addShake(a: number) {
    this.shake = Math.min(1.4, this.shake + a);
  }

  update(dt: number, ship: Ship) {
    const boost = ship.boosting;
    const dist = boost ? 8.5 : 11.5;
    const elev = boost ? 2.8 : 3.6;
    const fovTarget = boost ? 68 : 58;
    this.camera.fov += (fovTarget - this.camera.fov) * (1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();

    // Behind ship along its orientation (follows pitch)
    const back = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.group.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.group.quaternion);
    this.ideal.copy(ship.position).addScaledVector(back, dist).addScaledVector(up, elev);

    dampVec3(this.camera.position, this.ideal, boost ? 8 : 5.5, dt);

    this.look.copy(ship.position).addScaledVector(up, 0.4);
    const nose = new THREE.Vector3(0, 0, -8).applyQuaternion(ship.group.quaternion);
    this.look.add(nose);
    dampVec3(this.lookCur, this.look, 10, dt);

    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.4;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.3;
      this.shake = Math.max(0, this.shake - dt * 2.8);
    }

    this.camera.lookAt(this.lookCur);
  }
}
