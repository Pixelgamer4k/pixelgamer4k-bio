import * as THREE from 'three';
import { damp, clamp } from '../util/math';
import type { InputState } from '../systems/input';
import type { CollisionWorld } from '../systems/collision';
import { loadGlb, paintPioneerLivery, ASSET } from '../assets/loader';

/**
 * Pioneer MK-I — white/red storefront livery.
 * Roots for VFX: shipRoot, thrusterRoot, magnetRoot, hitchOverlay
 *
 * Flight: W/S thrust along nose · A/D strafe · mouse/look pad pitch+yaw · bank into turns · Space boost
 */
export class Ship {
  group = new THREE.Group();
  /** Visual / VFX root (meshes live here). */
  shipRoot = new THREE.Group();
  thrusterRoot = new THREE.Group();
  magnetRoot = new THREE.Group();
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  roll = 0;
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
  readonly radius = 1.55;
  /** Hard red hitch flash — collision only, no soft fade. */
  hitchFlash = 0;
  private thrusters: THREE.Mesh[] = [];
  private shieldMesh!: THREE.Mesh;
  private hitchOverlay!: THREE.Mesh;
  private trail: THREE.Points | null = null;
  private trailPos: Float32Array | null = null;
  private trailIdx = 0;
  private stretch = 1;
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private ready = false;
  private bank = 0;

  constructor() {
    this.group.name = 'pioneerMkI';
    this.shipRoot.name = 'shipRoot';
    this.thrusterRoot.name = 'thrusterRoot';
    this.magnetRoot.name = 'magnetRoot';
    this.group.add(this.shipRoot);
    this.shipRoot.add(this.thrusterRoot);
    this.shipRoot.add(this.magnetRoot);

    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0x3ad0ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.shieldMesh.name = 'shieldOverlay';
    this.group.add(this.shieldMesh);

    // Hard red hull hitch — snaps on, hard cut off (no soft fade)
    this.hitchOverlay = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff1430,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.hitchOverlay.name = 'hitchOverlay';
    this.group.add(this.hitchOverlay);

    // Placeholder until GLB loads
    this.shipRoot.add(this.buildFallbackMesh());
  }

  async loadVisual() {
    try {
      const mesh = await loadGlb(ASSET.miner);
      paintPioneerLivery(mesh);
      mesh.scale.setScalar(1.35);
      mesh.rotation.y = Math.PI; // nose toward -Z
      // Clear previous hull meshes; keep VFX roots
      for (const c of [...this.shipRoot.children]) {
        if (c !== this.thrusterRoot && c !== this.magnetRoot) this.shipRoot.remove(c);
      }
      this.shipRoot.add(mesh);
      if (!this.shipRoot.children.includes(this.thrusterRoot)) this.shipRoot.add(this.thrusterRoot);
      if (!this.shipRoot.children.includes(this.magnetRoot)) this.shipRoot.add(this.magnetRoot);
      this.buildThrusterVfx();
      this.buildMagnetVfx();
      this.buildTrail();
      this.ready = true;
    } catch {
      this.buildThrusterVfx();
      this.buildMagnetVfx();
      this.buildTrail();
      this.ready = true;
    }
  }

  private buildFallbackMesh(): THREE.Group {
    const g = new THREE.Group();
    g.name = 'fallbackHull';
    const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4, metalness: 0.35 });
    const red = new THREE.MeshStandardMaterial({ color: 0xe22b2b, roughness: 0.4, metalness: 0.25 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 2.5), white);
    g.add(hull);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 2.55), red);
    stripe.position.y = 0.28;
    g.add(stripe);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 0.95), red);
    nose.position.set(0, 0.02, -1.4);
    g.add(nose);
    return g;
  }

  private buildThrusterVfx() {
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x3ad0ff,
      emissive: 0x1a88cc,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    });
    this.thrusters = [];
    for (const ox of [-0.45, 0, 0.45]) {
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), thrusterMat.clone());
      glow.rotation.x = Math.PI;
      glow.position.set(ox, -0.05, 1.35);
      this.thrusterRoot.add(glow);
      this.thrusters.push(glow);
    }
  }

  private buildMagnetVfx() {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.05, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x3ad0ff, emissive: 0x2288aa, emissiveIntensity: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -0.55, -0.6);
    ring.name = 'magnetRing';
    this.magnetRoot.add(ring);
  }

  private buildTrail() {
    const n = 48;
    this.trailPos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trail = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x3ad0ff,
        size: 0.22,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.trail.name = 'thrusterTrail';
    this.group.add(this.trail);
  }

  get position() {
    return this.group.position;
  }

  getForward(out = this.forward) {
    out.set(0, 0, -1).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return out;
  }

  getRight(out = this.right) {
    out.set(1, 0, 0).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return out;
  }

  getUp(out = this.up) {
    out.set(0, 1, 0).applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return out;
  }

  /** Degrees for HUD pitch ladder. */
  get pitchDeg() {
    return (this.pitch * 180) / Math.PI;
  }

  triggerHitch(intensity = 1) {
    // Hard on — stays solid then hard cut (updated in update)
    this.hitchFlash = Math.max(this.hitchFlash, 0.18 + intensity * 0.12);
  }

  update(dt: number, input: InputState, world: CollisionWorld | null, bounds = 95) {
    const lookSens = 0.0024;
    this.yaw -= input.aimX * lookSens;
    this.pitch -= input.aimY * lookSens;
    this.pitch = clamp(this.pitch, -1.25, 1.25); // ~±72°

    const fwd = this.getForward();
    const right = this.getRight();
    const up = this.getUp();

    const thrusterMul = 1 + (this.thrusterLevel - 1) * 0.12;
    const boosting = !!(input.boost && this.boostFuel > 0.04);
    const accel = (boosting ? 48 : 28) * thrusterMul;

    // WASD / left stick in ship local space: Y = thrust along nose, X = strafe
    const wish = this.tmp.set(0, 0, 0);
    wish.addScaledVector(fwd, input.moveY);
    wish.addScaledVector(right, input.moveX);
    // mild lift assist when looking up/down while thrusting
    if (Math.abs(input.moveY) > 0.05) {
      wish.addScaledVector(up, -this.pitch * 0.15 * Math.abs(input.moveY));
    }

    if (wish.lengthSq() > 1e-6) {
      wish.normalize().multiplyScalar(accel);
      this.velocity.addScaledVector(wish, dt);
    }

    const drag = boosting ? 1.2 : 2.4;
    this.velocity.multiplyScalar(Math.exp(-drag * dt));

    this.boosting = boosting && (Math.abs(input.moveX) + Math.abs(input.moveY) > 0.02 || this.velocity.length() > 2);
    if (this.boosting) this.boostFuel = Math.max(0, this.boostFuel - dt * 0.32);
    else this.boostFuel = Math.min(1, this.boostFuel + dt * 0.24);

    this.group.position.addScaledVector(this.velocity, dt);

    // Soft world bounds
    for (const axis of ['x', 'y', 'z'] as const) {
      const p = this.group.position[axis];
      const lim = axis === 'y' ? bounds * 0.55 : bounds;
      if (Math.abs(p) > lim) {
        this.group.position[axis] = clamp(p, -lim, lim);
        this.velocity[axis] *= -0.35;
      }
    }

    // Hard collision — bounce + hitch
    if (world) {
      const res = world.resolveSphere(this.group.position, this.velocity, this.radius);
      if (res.hit) {
        this.triggerHitch(Math.min(1.5, res.damage / 8));
        if (res.damage > 0) this.damage(res.damage * 0.35, true);
      }
    }

    // Bank into turns (visual roll from yaw rate + strafe)
    const yawRate = -input.aimX * lookSens / Math.max(dt, 1 / 120);
    const bankT = clamp(-input.moveX * 0.45 - yawRate * 0.08, -0.55, 0.55);
    this.bank = damp(this.bank, bankT, 10, dt);
    this.roll = this.bank;

    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.yaw;
    this.group.rotation.x = this.pitch;
    this.group.rotation.z = this.roll;

    const stretchT = this.boosting ? 1.16 : 1;
    this.stretch = damp(this.stretch, stretchT, 10, dt);
    this.shipRoot.scale.set(1 / Math.sqrt(this.stretch), 1 / Math.sqrt(this.stretch), this.stretch);

    for (const t of this.thrusters) {
      const m = t.material as THREE.MeshStandardMaterial;
      const base = this.boosting ? 1.5 : 0.5 + Math.min(1, this.velocity.length() / 22) * 0.55;
      m.emissiveIntensity = base + Math.sin(performance.now() * 0.02 + t.position.x) * 0.12;
      t.scale.setScalar(this.boosting ? 1.4 : 0.85 + Math.min(1, this.velocity.length() / 30) * 0.4);
      t.visible = true;
    }

    // Thruster trail points
    if (this.trail && this.trailPos) {
      const back = this.getForward().multiplyScalar(-1.6);
      const p = this.group.position;
      const i = this.trailIdx % 48;
      this.trailPos[i * 3] = p.x + back.x;
      this.trailPos[i * 3 + 1] = p.y + back.y - 0.1;
      this.trailPos[i * 3 + 2] = p.z + back.z;
      this.trailIdx++;
      (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      const mat = this.trail.material as THREE.PointsMaterial;
      mat.opacity = this.boosting ? 0.85 : 0.35 + Math.min(0.4, this.velocity.length() / 40);
    }

    // Hard hitch: full red while timer > 0, then hard cut to 0
    if (this.hitchFlash > 0) {
      this.hitchFlash -= dt;
      const hm = this.hitchOverlay.material as THREE.MeshBasicMaterial;
      hm.opacity = this.hitchFlash > 0 ? 0.72 : 0;
      if (this.hitchFlash <= 0) {
        this.hitchFlash = 0;
        hm.opacity = 0;
      }
    }

    const sm = this.shieldMesh.material as THREE.MeshBasicMaterial;
    if (this.hitchFlash > 0) {
      sm.opacity = 0; // hitch owns the flash
    } else if (this.shield > 0) {
      sm.opacity = 0.07 + (this.shield / this.maxShield) * 0.05;
      sm.color.setHex(0x3ad0ff);
    } else {
      sm.opacity = 0;
    }

    if (this.shield < this.maxShield && this.hitchFlash <= 0) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 3.5);
    }
  }

  /** Hull damage. Red hitch is collision-only (call triggerHitch from collision). */
  damage(n: number, _fromCollision = false) {
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
