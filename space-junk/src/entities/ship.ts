import * as THREE from 'three';
import { damp, clamp } from '../util/math';
import type { InputState } from '../systems/input';

/** Pioneer MK-I — white/red storefront livery, N64 proportions, blue thrusters. */
export class Ship {
  group = new THREE.Group();
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  boostFuel = 1;
  hull = 100;
  maxHull = 100;
  shield = 50;
  maxShield = 50;
  boosting = false;
  magnetLevel = 1;
  cargoCapacity = 12;
  weaponLevel = 1;
  thrusterLevel = 1;
  readonly radius = 1.4;

  private body: THREE.Group;
  private thrusters: THREE.Mesh[] = [];
  private shieldMesh: THREE.Mesh;
  private hitFlash = 0;
  private stretch = 1;
  private tmp = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();

  constructor() {
    this.body = this.buildMesh();
    this.group.add(this.body);

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x3ad0ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.group.add(this.shieldMesh);
  }

  private buildMesh(): THREE.Group {
    const g = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4, metalness: 0.35 });
    const red = new THREE.MeshStandardMaterial({ color: 0xe22b2b, roughness: 0.4, metalness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.5, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x6ec8ff,
      emissive: 0x1a4a70,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x3ad0ff,
      emissive: 0x1a88cc,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });

    // Main hull — white
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 2.5), white);
    hull.castShadow = true;
    g.add(hull);

    // Red accent stripe / nose
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 2.55), red);
    stripe.position.y = 0.28;
    g.add(stripe);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.95), red);
    nose.position.set(0, 0.02, -1.4);
    g.add(nose);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.95), glass);
    canopy.position.set(0, 0.58, -0.3);
    g.add(canopy);

    // Wings white with red tips
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.95), white);
      wing.position.set(side * 1.2, -0.05, 0.2);
      wing.rotation.z = side * 0.1;
      g.add(wing);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.55), red);
      tip.position.set(side * 1.75, 0.05, 0.25);
      g.add(tip);
    }

    // Three blue thrusters (storefront look)
    const offsets = [-0.55, 0, 0.55];
    for (const ox of offsets) {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.55, 8), dark);
      housing.rotation.x = Math.PI / 2;
      housing.position.set(ox, -0.12, 1.2);
      g.add(housing);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), thrusterMat.clone());
      glow.position.set(ox, -0.12, 1.5);
      g.add(glow);
      this.thrusters.push(glow);
    }

    // Magnet emitter
    const magnet = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.3, 8), dark);
    magnet.position.set(0, -0.55, -0.75);
    g.add(magnet);
    const magRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.05, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0x3ad0ff, emissive: 0x2288aa, emissiveIntensity: 0.6 }),
    );
    magRing.rotation.x = Math.PI / 2;
    magRing.position.set(0, -0.7, -0.75);
    g.add(magRing);

    return g;
  }

  get position() {
    return this.group.position;
  }

  getForward(out = this.forward) {
    out.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return out;
  }

  getRight(out = this.right) {
    out.set(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0, 'YXZ'));
    return out;
  }

  /** Camera-forward horizontal for stick-up = camera-forward (never inverted). */
  getCamForwardFlat(camQuat: THREE.Quaternion, out = this.forward) {
    out.set(0, 0, -1).applyQuaternion(camQuat);
    out.y = 0;
    if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
    else out.normalize();
    return out;
  }

  getCamRightFlat(camQuat: THREE.Quaternion, out = this.right) {
    out.set(1, 0, 0).applyQuaternion(camQuat);
    out.y = 0;
    if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
    else out.normalize();
    return out;
  }

  update(dt: number, input: InputState, camQuat: THREE.Quaternion, bounds = 90) {
    const sens = 0.0022;
    this.yaw -= input.aimX * sens;
    this.pitch -= input.aimY * sens;
    this.pitch = clamp(this.pitch, -0.85, 0.85);

    // Stick / WASD relative to camera-forward on XZ — stick UP = forward
    const fwd = this.getCamForwardFlat(camQuat);
    const right = this.getCamRightFlat(camQuat);
    const up = this.tmp.set(0, 1, 0);

    const thrusterMul = 1 + (this.thrusterLevel - 1) * 0.12;
    const accel = (input.boost && this.boostFuel > 0.05 ? 40 : 24) * thrusterMul;
    const wish = new THREE.Vector3()
      .addScaledVector(fwd, input.moveY)
      .addScaledVector(right, input.moveX);

    // mild vertical from pitch when thrusting
    if (wish.lengthSq() > 0) {
      wish.normalize();
      wish.y += this.pitch * -0.35 * Math.abs(input.moveY);
      wish.normalize().multiplyScalar(accel);
    }

    this.velocity.addScaledVector(wish, dt);
    const drag = input.boost ? 1.5 : 2.7;
    this.velocity.multiplyScalar(Math.exp(-drag * dt));

    this.boosting = !!(input.boost && this.boostFuel > 0 && (wish.lengthSq() > 0 || input.moveY !== 0 || input.moveX !== 0));
    if (this.boosting) this.boostFuel = Math.max(0, this.boostFuel - dt * 0.35);
    else this.boostFuel = Math.min(1, this.boostFuel + dt * 0.22);

    this.group.position.addScaledVector(this.velocity, dt);

    for (const axis of ['x', 'y', 'z'] as const) {
      const p = this.group.position[axis];
      if (Math.abs(p) > bounds) {
        this.group.position[axis] = clamp(p, -bounds, bounds);
        this.velocity[axis] *= -0.4;
      }
    }
    this.group.position.y = clamp(this.group.position.y, -bounds * 0.5, bounds * 0.5);

    // Face move / aim: blend yaw toward camera-forward when moving
    if (Math.abs(input.moveX) + Math.abs(input.moveY) > 0.05) {
      const face = fwd.clone().multiplyScalar(input.moveY).add(right.clone().multiplyScalar(input.moveX));
      if (face.lengthSq() > 0.01) {
        const targetYaw = Math.atan2(-face.x, -face.z);
        let dy = targetYaw - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * (1 - Math.exp(-5 * dt));
      }
    }

    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.pitch;

    // Boost stretch anim
    const stretchT = this.boosting ? 1.18 : 1;
    this.stretch = damp(this.stretch, stretchT, 10, dt);
    this.body.scale.set(1 / Math.sqrt(this.stretch), 1 / Math.sqrt(this.stretch), this.stretch);

    const bank = damp(this.body.rotation.z, -input.moveX * 0.35, 8, dt);
    this.body.rotation.z = bank;

    // Idle thrust flicker + boost
    for (const t of this.thrusters) {
      const m = t.material as THREE.MeshStandardMaterial;
      const base = this.boosting ? 1.4 : 0.55 + Math.min(1, this.velocity.length() / 18) * 0.5;
      m.emissiveIntensity = base + Math.sin(performance.now() * 0.02 + t.position.x) * 0.15;
      t.scale.setScalar(this.boosting ? 1.35 : 0.9 + Math.random() * 0.08);
    }

    // Shield flare / hit flash
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const sm = this.shieldMesh.material as THREE.MeshBasicMaterial;
    if (this.hitFlash > 0) {
      sm.opacity = Math.min(0.55, this.hitFlash * 0.9);
      sm.color.setHex(0xff6688);
    } else if (this.shield > 0) {
      sm.opacity = 0.08 + (this.shield / this.maxShield) * 0.06;
      sm.color.setHex(0x3ad0ff);
    } else {
      sm.opacity = 0;
    }

    // Slow shield regen
    if (this.shield < this.maxShield && this.hitFlash <= 0) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 3.5);
    }
  }

  damage(n: number) {
    this.hitFlash = 0.55;
    let left = n;
    if (this.shield > 0) {
      const abs = Math.min(this.shield, left);
      this.shield -= abs;
      left -= abs;
    }
    if (left > 0) this.hull = Math.max(0, this.hull - left);
  }

  heal(n: number) {
    this.hull = Math.min(this.maxHull, this.hull + n);
  }
}
