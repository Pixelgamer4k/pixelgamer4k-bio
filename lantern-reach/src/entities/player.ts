import * as THREE from 'three';
import type { Input } from '../engine/input';
import { moveWithColliders, type AABB } from '../engine/collision';

export class Player {
  camera: THREE.PerspectiveCamera;
  position = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  hp = 1;
  stamina = 1;
  fuel = 1;
  private bob = 0;
  private bobPhase = 0;
  private roll = 0;
  private velY = 0;
  private grounded = true;
  lantern: THREE.Group;
  lanternLight: THREE.PointLight;
  private lean = 0;
  private hurtCooldown = 0;
  /** Pendulum state — lags walk for weighty chain feel */
  private pendAng = 0;
  private pendVel = 0;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.05, 80);
    this.lantern = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.35, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a2a20, flatShading: true }),
    );
    handle.position.set(0, -0.1, 0);
    const cage = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x5a4030, metalness: 0.4, roughness: 0.55, flatShading: true }),
    );
    cage.position.set(0, -0.32, 0);
    const flame = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff5522, emissiveIntensity: 2, flatShading: true }),
    );
    flame.position.set(0, -0.32, 0);
    flame.name = 'flame';
    this.lantern.add(handle, cage, flame);
    this.lanternLight = new THREE.PointLight(0xff8844, 2.8, 14, 1.2);
    this.lanternLight.castShadow = false;
    this.lantern.add(this.lanternLight);
    this.lanternLight.position.set(0, -0.32, 0);
    this.camera.add(this.lantern);
    this.lantern.position.set(0.28, -0.22, -0.45);
  }

  reset(spawn: THREE.Vector3) {
    this.position.copy(spawn);
    this.yaw = Math.PI; // face +Z into market
    this.pitch = -0.05;
    this.velY = 0;
    this.hp = 1;
    this.stamina = 1;
    this.fuel = 1;
    this.bob = 0;
    this.bobPhase = 0;
    this.roll = 0;
    this.pendAng = 0;
    this.pendVel = 0;
    this.syncCamera(0);
  }

  syncCamera(_dt: number) {
    const eye = 1.55 + this.bob;
    this.camera.position.set(this.position.x, this.position.y + eye, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = this.roll;
  }

  update(dt: number, input: Input, colliders: AABB[], interacting: boolean) {
    const sens = 0.0022;
    this.yaw -= input.state.aimX * sens;
    this.pitch -= input.state.aimY * sens;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));

    const moving = Math.hypot(input.state.moveX, input.state.moveY) > 0.08;
    const wantSprint = input.state.sprint && moving && this.stamina > 0.05;
    const speed = wantSprint ? 4.1 : 2.35;

    if (wantSprint) this.stamina = Math.max(0, this.stamina - dt * 0.28);
    else this.stamina = Math.min(1, this.stamina + dt * 0.18);

    this.fuel = Math.max(0.08, this.fuel - dt * 0.008);

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    wish.addScaledVector(forward, input.state.moveY);
    wish.addScaledVector(right, input.state.moveX);
    if (wish.lengthSq() > 1) wish.normalize();

    const dx = wish.x * speed * dt;
    const dz = wish.z * speed * dt;
    const res = moveWithColliders(this.position, dx, dz, colliders);
    this.position.x = res.x;
    this.position.z = res.z;

    const targetY = res.groundedY;
    if (this.position.y > targetY + 0.02) {
      this.velY -= 18 * dt;
      this.grounded = false;
    } else {
      this.position.y = targetY;
      this.velY = 0;
      this.grounded = true;
    }
    this.position.y += this.velY * dt;
    if (this.position.y < targetY) {
      this.position.y = targetY;
      this.velY = 0;
      this.grounded = true;
    }

    // Walk bob — weightier vertical + soft lateral roll
    if (moving && this.grounded) {
      const rate = wantSprint ? 10.2 : 6.5;
      this.bobPhase += dt * rate;
      const amp = wantSprint ? 0.098 : 0.072;
      // two-step: dip heavier on land half-cycle
      const s = Math.sin(this.bobPhase);
      const land = Math.pow(Math.max(0, -s), 1.6);
      this.bob = s * amp - land * amp * 0.35;
      const rollTarget = Math.sin(this.bobPhase) * (wantSprint ? 0.028 : 0.018);
      this.roll += (rollTarget - this.roll) * Math.min(1, dt * 10);
    } else {
      this.bob *= 1 - Math.min(1, dt * 7);
      this.roll *= 1 - Math.min(1, dt * 6);
    }

    const leanTarget = interacting ? 0.08 : 0;
    this.lean += (leanTarget - this.lean) * Math.min(1, dt * 6);

    // Lantern pendulum — spring toward walk drive, stronger arc
    const drive = moving ? Math.sin(this.bobPhase * 0.55) * (wantSprint ? 0.55 : 0.38) : Math.sin(performance.now() * 0.0011) * 0.08;
    const spring = 18;
    const damp = 6.5;
    const force = -spring * (this.pendAng - drive) - damp * this.pendVel;
    this.pendVel += force * dt;
    this.pendAng += this.pendVel * dt;
    const sway = this.pendAng * 0.22;
    const swayY = Math.cos(this.bobPhase * 0.48) * (moving ? 0.05 : 0.018) + Math.abs(this.pendAng) * 0.04;
    this.lantern.position.set(
      0.28 + sway,
      -0.22 + swayY - this.lean * 0.15,
      -0.45 - this.lean * 0.2,
    );
    this.lantern.rotation.z = this.pendAng * 0.85 + this.lean * 0.3;
    this.lantern.rotation.x = swayY * 1.4 - Math.abs(this.pendAng) * 0.15;

    const flicker = 1 + Math.sin(performance.now() * 0.012) * 0.06 + Math.sin(performance.now() * 0.031) * 0.04;
    this.lanternLight.intensity = (1.2 + this.fuel * 2.2) * flicker;
    this.lanternLight.distance = 10 + this.fuel * 6;
    const flame = this.lantern.getObjectByName('flame') as THREE.Mesh | undefined;
    if (flame) {
      const em = flame.material as THREE.MeshStandardMaterial;
      em.emissiveIntensity = 1.2 + this.fuel * 1.5 * flicker;
      flame.scale.setScalar(0.7 + this.fuel * 0.45);
    }

    if (this.hurtCooldown > 0) this.hurtCooldown -= dt;
    this.syncCamera(dt);
  }

  /** Quiet fail — watchman noticed; soft HP tick */
  spook(amount = 0.18) {
    if (this.hurtCooldown > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.stamina = Math.max(0, this.stamina - 0.25);
    this.hurtCooldown = 1.2;
  }

  get feetY() { return this.position.y; }
}
