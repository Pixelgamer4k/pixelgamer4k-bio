import * as THREE from 'three';

export type Collider =
  | { kind: 'sphere'; center: THREE.Vector3; radius: number; label?: string }
  | { kind: 'aabb'; min: THREE.Vector3; max: THREE.Vector3; label?: string };

export class CollisionWorld {
  colliders: Collider[] = [];

  clear() {
    this.colliders.length = 0;
  }

  addSphere(center: THREE.Vector3, radius: number, label?: string) {
    this.colliders.push({ kind: 'sphere', center: center.clone(), radius, label });
  }

  addAABB(min: THREE.Vector3, max: THREE.Vector3, label?: string) {
    this.colliders.push({ kind: 'aabb', min: min.clone(), max: max.clone(), label });
  }

  addMeshBounds(obj: THREE.Object3D, pad = 0.15, label?: string) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    box.min.addScalar(-pad);
    box.max.addScalar(pad);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    // Prefer sphere for roughly equal extents (asteroids), AABB for long wrecks
    const max = Math.max(size.x, size.y, size.z);
    const min = Math.min(size.x, size.y, size.z);
    if (max < 1e-3) return;
    if (max / Math.max(min, 0.01) < 1.6 && max < 14) {
      this.addSphere(center, max * 0.48, label);
    } else {
      this.addAABB(box.min, box.max, label);
    }
  }

  /**
   * Resolve a moving sphere against colliders.
   * Returns penetration push-out and whether an impact occurred this step.
   */
  resolveSphere(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    radius: number,
  ): { hit: boolean; push: THREE.Vector3; damage: number } {
    const push = new THREE.Vector3();
    let hit = false;
    let damage = 0;
    const closest = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (const c of this.colliders) {
      if (c.kind === 'sphere') {
        const d = pos.distanceTo(c.center);
        const minD = radius + c.radius;
        if (d < minD && d > 1e-6) {
          normal.copy(pos).sub(c.center).normalize();
          const pen = minD - d;
          push.addScaledVector(normal, pen);
          hit = true;
        } else if (d <= 1e-6) {
          normal.set(0, 1, 0);
          push.addScaledVector(normal, minD);
          hit = true;
        }
      } else {
        closest.set(
          Math.max(c.min.x, Math.min(pos.x, c.max.x)),
          Math.max(c.min.y, Math.min(pos.y, c.max.y)),
          Math.max(c.min.z, Math.min(pos.z, c.max.z)),
        );
        const dx = pos.x - closest.x;
        const dy = pos.y - closest.y;
        const dz = pos.z - closest.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < radius * radius) {
          if (distSq > 1e-8) {
            const dist = Math.sqrt(distSq);
            normal.set(dx / dist, dy / dist, dz / dist);
            push.addScaledVector(normal, radius - dist);
          } else {
            // Deep inside — push out along weakest axis
            const cx = (c.min.x + c.max.x) * 0.5;
            const cy = (c.min.y + c.max.y) * 0.5;
            const cz = (c.min.z + c.max.z) * 0.5;
            const ox = pos.x < cx ? c.min.x - radius - pos.x : c.max.x + radius - pos.x;
            const oy = pos.y < cy ? c.min.y - radius - pos.y : c.max.y + radius - pos.y;
            const oz = pos.z < cz ? c.min.z - radius - pos.z : c.max.z + radius - pos.z;
            const ax = Math.abs(ox);
            const ay = Math.abs(oy);
            const az = Math.abs(oz);
            if (ax <= ay && ax <= az) push.x += ox;
            else if (ay <= az) push.y += oy;
            else push.z += oz;
            normal.copy(push).normalize();
          }
          hit = true;
        }
      }
    }

    if (hit && push.lengthSq() > 0) {
      pos.add(push);
      // Slide/bounce: kill velocity into the surface
      normal.copy(push).normalize();
      const into = vel.dot(normal);
      if (into < 0) {
        vel.addScaledVector(normal, -into * 1.35); // bounce
        damage = Math.min(18, 4 + Math.abs(into) * 0.35);
      } else {
        damage = 3;
      }
    }

    return { hit, push, damage };
  }
}
