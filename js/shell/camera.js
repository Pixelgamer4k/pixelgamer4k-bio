/** N64-ish chase camera */
import THREE from './three.js';

export function createChaseCam(camera) {
  const idealOffset = new THREE.Vector3(0, 5.2, 8.5);
  const look = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const smooth = 6.5;

  function update(target, dt, opts = {}) {
    const dist = opts.dist ?? 8.5;
    const height = opts.height ?? 5.2;
    const yaw = target.rotation.y;

    desired.set(
      Math.sin(yaw) * dist,
      height,
      Math.cos(yaw) * dist
    );
    desired.add(target.position);

    const k = 1 - Math.exp(-smooth * dt);
    camera.position.lerp(desired, k);

    look.copy(target.position);
    look.y += opts.lookY ?? 1.1;
    camera.lookAt(look);
  }

  // snap once at start
  function snap(target, opts = {}) {
    const dist = opts.dist ?? 8.5;
    const height = opts.height ?? 5.2;
    const yaw = target.rotation.y;
    camera.position.set(
      target.position.x + Math.sin(yaw) * dist,
      target.position.y + height,
      target.position.z + Math.cos(yaw) * dist
    );
    look.copy(target.position);
    look.y += 1.1;
    camera.lookAt(look);
  }

  return { update, snap };
}
