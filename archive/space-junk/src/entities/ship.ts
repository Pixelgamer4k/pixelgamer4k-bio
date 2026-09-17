import * as THREE from 'three';
import { damp, clamp } from '../util/math';
import type { InputState } from '../systems/input';
import type { CollisionWorld } from '../systems/collision';
import {
  loadGlb,
  paintPioneerLivery,
  centerAndOrientCraft,
  detectHullHardpoints,
  ASSET,
} from '../assets/loader';

/**
 * Pioneer MK-I — white/red storefront livery.
 * Stable VFX roots: shipRoot, thrusterRoot (3 nozzles), magnetRoot (under-nose)
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
  private thrusterFlames: THREE.Mesh[] = [];
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
  private tmpW = new THREE.Vector3();
  private ready = false;
  private bank = 0;
  private nozzleLocals: THREE.Vector3[] = [];

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
    this.attachHardpoints(
      [
        new THREE.Vector3(-0.55, -0.12, 1.35),
        new THREE.Vector3(0, -0.12, 1.35),
        new THREE.Vector3(0.55, -0.12, 1.35),
      ],
      new THREE.Vector3(0, -0.55, -0.7),
    );
  }

  async loadVisual() {
    try {
      const raw = await loadGlb(ASSET.miner);
      paintPioneerLivery(raw);
      const orient = centerAndOrientCraft(raw, 1.35);
      const hp = detectHullHardpoints(orient);

      // Clear previous hull meshes; keep VFX roots
      for (const c of [...this.shipRoot.children]) {
        if (c !== this.thrusterRoot && c !== this.magnetRoot) this.shipRoot.remove(c);
      }
      this.shipRoot.add(orient);
      if (!this.shipRoot.children.includes(this.thrusterRoot)) this.shipRoot.add(this.thrusterRoot);
      if (!this.shipRoot.children.includes(this.magnetRoot)) this.shipRoot.add(this.magnetRoot);

      this.clearVfxChildren();
      this.attachHardpoints(hp.nozzles, hp.magnet);
      this.buildTrail();
      this.ready = true;
    } catch {
      this.clearVfxChildren();
      this.attachHardpoints(
        [
          new THREE.Vector3(-0.55, -0.12, 1.35),
          new THREE.Vector3(0, -0.12, 1.35),
          new THREE.Vector3(0.55, -0.12, 1.35),
        ],
        new THREE.Vector3(0, -0.55, -0.7),
      );
      this.buildTrail();
      this.ready = true;
    }
  }

  private clearVfxChildren() {
    while (this.thrusterRoot.children.length) this.thrusterRoot.remove(this.thrusterRoot.children[0]);
    while (this.magnetRoot.children.length) this.magnetRoot.remove(this.magnetRoot.children[0]);
    this.thrusters = [];
    this.thrusterFlames = [];
  }

  /** Place thrusterRoot nozzles + magnetRoot on hull hardpoints (shipRoot local). */
  private attachHardpoints(nozzles: THREE.Vector3[], magnet: THREE.Vector3) {
    this.nozzleLocals = nozzles.map((n) => n.clone());
    this.thrusterRoot.position.set(0, 0, 0);
    this.magnetRoot.position.copy(magnet);

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x3ad0ff,
      emissive: 0x1a88cc,
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x66e8ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.thrusters = [];
    this.thrusterFlames = [];
    nozzles.forEach((pos, i) => {
      const socket = new THREE.Group();
      socket.name = `nozzle_${i}`;
      socket.position.copy(pos);
      // Cone points aft (+Z) — tip sits on socket, body extends behind
      const glow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 10), glowMat.clone());
      glow.rotation.x = Math.PI; // base at socket, tip toward +Z aft
      glow.position.z = 0.28;
      glow.name = `thrusterGlow_${i}`;
      socket.add(glow);
      this.thrusters.push(glow);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.85, 8), flameMat.clone());
      flame.rotation.x = Math.PI;
      flame.position.z = 0.42;
      flame.name = `thrusterFlame_${i}`;
      socket.add(flame);
      this.thrusterFlames.push(flame);

      this.thrusterRoot.add(socket);
    });

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.045, 6, 18),
      new THREE.MeshStandardMaterial({
        color: 0x3ad0ff,
        emissive: 0x2288aa,
        emissiveIntensity: 0.75,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.name = 'magnetRing';
    this.magnetRoot.add(ring);
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

  private buildTrail() {
    if (this.trail) {
      this.group.remove(this.trail);
      this.trail.geometry.dispose();
      (this.trail.material as THREE.Material).dispose();
      this.trail = null;
    }
    const n = 48;
    this.trailPos = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    this.trail = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x3ad0ff,
        size: 0.2,
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

  /** World-space under-nose magnet hardpoint (for salvage beam). */
  getMagnetWorld(out = this.tmpW) {
    this.magnetRoot.getWorldPosition(out);
    return out;
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

    const speed = this.velocity.length();
    const idle = 0.5 + Math.min(1, speed / 22) * 0.55;
    const t = performance.now() * 0.02;
    for (let i = 0; i < this.thrusters.length; i++) {
      const glow = this.thrusters[i];
      const flame = this.thrusterFlames[i];
      const m = glow.material as THREE.MeshStandardMaterial;
      const base = this.boosting ? 1.55 : idle;
      m.emissiveIntensity = base + Math.sin(t + i * 1.7) * 0.14;
      const len = this.boosting ? 1.55 : 0.8 + Math.min(1, speed / 30) * 0.45;
      glow.scale.set(this.boosting ? 1.15 : 1, len, this.boosting ? 1.15 : 1);
      glow.visible = true;
      if (flame) {
        const fm = flame.material as THREE.MeshBasicMaterial;
        fm.opacity = this.boosting ? 0.75 : 0.28 + Math.min(0.35, speed / 40);
        flame.scale.set(1, this.boosting ? 1.7 : 0.9 + Math.min(0.5, speed / 35), 1);
        flame.visible = true;
      }
    }

    // Trail samples from real nozzle world positions (cycle across 3)
    if (this.trail && this.trailPos && this.nozzleLocals.length) {
      const ni = this.trailIdx % this.nozzleLocals.length;
      const socket = this.thrusterRoot.children[ni];
      if (socket) {
        socket.getWorldPosition(this.tmpW);
        // Emit slightly aft of nozzle (do not mutate shared forward)
        const aft = this.getForward(this.tmp).multiplyScalar(-0.35);
        this.tmpW.add(aft);
        const i = this.trailIdx % 48;
        this.trailPos[i * 3] = this.tmpW.x;
        this.trailPos[i * 3 + 1] = this.tmpW.y;
        this.trailPos[i * 3 + 2] = this.tmpW.z;
        this.trailIdx++;
        (this.trail.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        const mat = this.trail.material as THREE.PointsMaterial;
        mat.opacity = this.boosting ? 0.85 : 0.35 + Math.min(0.4, speed / 40);
      }
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
