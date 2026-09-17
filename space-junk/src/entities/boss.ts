import * as THREE from 'three';
import { clamp, randRange } from '../util/math';
import type { Ship } from './ship';
import { createSalvage, type SalvagePiece } from './salvage';

export type BossPhase = 'intro1' | 'grind' | 'intro2' | 'charge' | 'intro3' | 'overload' | 'stunned' | 'dead';

/**
 * Junk Behemoth — Zone 1 boss.
 * Three phases (not a health sponge): Grind → Charge → Overload.
 * Damage windows open on phase intros / stun; glowing red eye is the weak point.
 */
export class JunkBehemoth {
  group = new THREE.Group();
  hp = 180;
  maxHp = 180;
  phase: BossPhase = 'intro1';
  radius = 4.8;
  alive = true;
  phaseIndex = 0; // 0 grind, 1 charge, 2 overload
  private timer = 2.8;
  private spinVel = 0;
  private chargeDir = new THREE.Vector3();
  private body: THREE.Mesh;
  private eye: THREE.Mesh;
  private plates: THREE.Mesh[] = [];
  introTitle = 'JUNK BEHEMOTH';
  introSub = 'Phase I — Grind';

  constructor(pos: THREE.Vector3) {
    this.group.position.copy(pos);

    const scrap = new THREE.MeshStandardMaterial({ color: 0x7a828c, roughness: 0.65, metalness: 0.55 });
    const rust = new THREE.MeshStandardMaterial({ color: 0xb85a2a, roughness: 0.7, metalness: 0.3 });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2233,
      emissive: 0xff1122,
      emissiveIntensity: 1.2,
      roughness: 0.25,
    });

    // Towering scrap body
    this.body = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 5), scrap);
    this.body.position.y = 2;
    this.body.castShadow = true;
    this.group.add(this.body);

    for (let i = 0; i < 10; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(randRange(1.2, 2.4), randRange(0.3, 1.2), randRange(1, 2.2)),
        i % 2 ? rust : scrap,
      );
      const a = (i / 10) * Math.PI * 2;
      plate.position.set(Math.cos(a) * 3.2, randRange(-1, 5), Math.sin(a) * 3.2);
      this.group.add(plate);
      this.plates.push(plate);
    }

    // Glowing red eye / core (weak point)
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), eyeMat);
    this.eye.position.set(0, 2.2, 2.6);
    this.group.add(this.eye);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, 0.6), rust);
    brow.position.set(0, 3.5, 2.4);
    this.group.add(brow);
  }

  get position() {
    return this.group.position;
  }

  get phaseLabel() {
    if (!this.alive) return 'Destroyed';
    if (this.phaseIndex === 0) return 'Junk Behemoth — Phase I · Grind';
    if (this.phaseIndex === 1) return 'Junk Behemoth — Phase II · Charge';
    return 'Junk Behemoth — Phase III · Overload';
  }

  /** Phase thresholds: 100%→66% grind, 66%→33% charge, 33%→0 overload */
  private syncPhaseFromHp() {
    const pct = this.hp / this.maxHp;
    const idx = pct > 0.66 ? 0 : pct > 0.33 ? 1 : 2;
    if (idx > this.phaseIndex) {
      this.phaseIndex = idx;
      if (idx === 1) {
        this.phase = 'intro2';
        this.timer = 2.4;
        this.introSub = 'Phase II — Charge';
      } else if (idx === 2) {
        this.phase = 'intro3';
        this.timer = 2.4;
        this.introSub = 'Phase III — Overload';
      }
    }
  }

  takeDamage(n: number) {
    if (!this.alive || this.phase === 'dead') return false;
    // Reduced damage outside stun / intro windows (not a sponge — reward timing)
    let mul = 1;
    if (this.phase === 'stunned' || this.phase.startsWith('intro')) mul = 1.8;
    else if (this.phase === 'grind' || this.phase === 'charge') mul = 0.55;
    else if (this.phase === 'overload') mul = 0.7;

    this.hp = Math.max(0, this.hp - n * mul);
    const eyeMat = this.eye.material as THREE.MeshStandardMaterial;
    eyeMat.emissiveIntensity = 1.8;

    if (this.hp <= 0) {
      this.alive = false;
      this.phase = 'dead';
      return true;
    }
    this.syncPhaseFromHp();
    return false;
  }

  update(
    dt: number,
    ship: Ship,
    onRam: (dmg: number) => void,
    onSpawnDebris: (pieces: SalvagePiece[]) => void,
  ) {
    if (!this.alive) {
      this.group.rotation.y += dt * 0.4;
      this.eye.scale.multiplyScalar(Math.max(0.01, 1 - dt * 0.8));
      return;
    }

    this.timer -= dt;
    const eyeMat = this.eye.material as THREE.MeshStandardMaterial;
    eyeMat.emissiveIntensity = 0.9 + Math.sin(performance.now() * 0.008) * 0.35;

    const toShip = ship.position.clone().sub(this.group.position);
    const dist = toShip.length();

    for (const p of this.plates) p.rotation.y += dt * 0.4;

    switch (this.phase) {
      case 'intro1':
        this.group.lookAt(ship.position);
        if (this.timer <= 0) {
          this.phase = 'grind';
          this.timer = 5;
          this.spinVel = 0;
        }
        break;

      case 'grind': {
        this.spinVel = clamp(this.spinVel + dt * 6, 0, 12);
        this.group.rotation.y += this.spinVel * dt;
        if (dist < 12) onRam(10 * dt);
        this.group.position.addScaledVector(toShip.normalize(), 3.5 * dt);
        if (this.timer <= 0) {
          this.phase = 'stunned';
          this.timer = 2.2;
        }
        break;
      }

      case 'intro2':
      case 'intro3':
        this.group.lookAt(ship.position);
        eyeMat.emissiveIntensity = 2;
        if (this.timer <= 0) {
          this.phase = this.phase === 'intro2' ? 'charge' : 'overload';
          this.timer = this.phase === 'charge' ? 1.1 : 6;
          if (this.phase === 'charge') this.chargeDir.copy(toShip).normalize();
        }
        break;

      case 'charge': {
        this.group.position.addScaledVector(this.chargeDir, 36 * dt);
        this.group.lookAt(this.group.position.clone().add(this.chargeDir));
        if (dist < 6) onRam(22);
        if (this.timer <= 0) {
          // second charge or stun
          if (Math.random() > 0.4) {
            this.chargeDir.copy(ship.position.clone().sub(this.group.position).normalize());
            this.timer = 1;
          } else {
            this.phase = 'stunned';
            this.timer = 2.4;
          }
        }
        break;
      }

      case 'overload': {
        eyeMat.emissiveIntensity = 2.2;
        this.group.rotation.y += dt * 4;
        if (dist < 16) onRam(14 * dt);
        // vomit scrap mid-phase
        if (this.timer < 3.2 && this.timer > 3.05) {
          const pieces: SalvagePiece[] = [];
          for (let i = 0; i < 6; i++) {
            pieces.push(
              createSalvage(
                this.group.position.clone().add(
                  new THREE.Vector3(randRange(-5, 5), randRange(0, 4), randRange(-5, 5)),
                ),
              ),
            );
          }
          onSpawnDebris(pieces);
        }
        this.group.position.addScaledVector(toShip.normalize(), 5 * dt);
        if (this.timer <= 0) {
          this.phase = 'stunned';
          this.timer = 2.8;
        }
        break;
      }

      case 'stunned': {
        eyeMat.emissiveIntensity = 1.6;
        this.eye.scale.setScalar(1.15 + Math.sin(performance.now() * 0.02) * 0.08);
        if (this.timer <= 0) {
          this.eye.scale.setScalar(1);
          if (this.phaseIndex === 0) {
            this.phase = 'grind';
            this.timer = 4.5;
          } else if (this.phaseIndex === 1) {
            this.phase = 'charge';
            this.timer = 1.1;
            this.chargeDir.copy(ship.position.clone().sub(this.group.position).normalize());
          } else {
            this.phase = 'overload';
            this.timer = 5;
          }
        }
        break;
      }

      default:
        break;
    }
  }
}

// Back-compat alias if anything still imports JunkCrusher
export { JunkBehemoth as JunkCrusher };
