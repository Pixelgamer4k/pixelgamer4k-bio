import * as THREE from 'three';
import type { AudioBed } from '../engine/audio';
import type { Player } from './player';

/** Watchman = staged light cone + sound pass. No UI lecture. */
export class Watchman {
  root: THREE.Group;
  light: THREE.SpotLight;
  private path: THREE.Vector3[];
  private idx = 0;
  private t = 0;
  private hold = 0;
  private alert = 0;
  private stage: 'patrol' | 'notice' | 'search' | 'spook' = 'patrol';
  private probe: THREE.Mesh;
  private beam: THREE.Mesh;
  private lampMesh: THREE.Mesh;
  private soundCd = 0;
  private lastStage: typeof this.stage = 'patrol';

  constructor(path: THREE.Vector3[], matsEmber: THREE.Material) {
    this.path = path;
    this.root = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.1, 0.45),
      new THREE.MeshStandardMaterial({ color: 0x2a2438, flatShading: true }),
    );
    body.position.y = 1.05;
    body.castShadow = true;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      new THREE.MeshStandardMaterial({ color: 0x3a3048, flatShading: true }),
    );
    head.position.y = 1.75;
    this.lampMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), matsEmber);
    this.lampMesh.position.set(0.28, 1.25, 0.22);
    this.root.add(body, head, this.lampMesh);

    this.light = new THREE.SpotLight(0xffaa66, 2.2, 14, Math.PI / 5.2, 0.35, 1.05);
    this.light.castShadow = false;
    this.root.add(this.light);
    this.light.position.set(0.1, 1.55, 0.15);
    const target = new THREE.Object3D();
    target.position.set(0, 0.4, -5.5);
    this.root.add(target);
    this.light.target = target;

    // Visible volumetric-ish beam (mood, readable pass)
    const beamGeo = new THREE.ConeGeometry(1.85, 6.2, 10, 1, true);
    this.beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff9944,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.beam.rotation.x = Math.PI / 2;
    this.beam.position.set(0.1, 1.2, -3.1);
    this.root.add(this.beam);

    this.probe = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 10),
      new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    this.probe.rotation.x = -Math.PI / 2;
    this.probe.position.set(0, 0.04, -5.2);
    this.root.add(this.probe);

    if (path[0]) this.root.position.copy(path[0]);
  }

  update(dt: number, player: Player, audio: AudioBed): { spotted: boolean; proximity: number } {
    // Waypoint hold — staged beats, not continuous slide
    if (this.hold > 0) {
      this.hold -= dt;
    } else {
      this.t += dt * (this.stage === 'search' ? 0.12 : 0.2);
      if (this.t >= 1) {
        this.t = 0;
        this.idx = (this.idx + 1) % this.path.length;
        this.hold = this.stage === 'patrol' ? 0.55 : 0.25;
      }
    }
    const aa = this.path[this.idx];
    const bb = this.path[(this.idx + 1) % this.path.length];
    this.root.position.lerpVectors(aa, bb, this.t);
    const face = new THREE.Vector3().subVectors(bb, aa);
    if (face.lengthSq() > 0.001 && this.stage !== 'search') {
      this.root.rotation.y = Math.atan2(-face.x, -face.z);
    }

    // Detection
    const toPlayer = new THREE.Vector3().subVectors(player.position, this.root.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    const forward = new THREE.Vector3(-Math.sin(this.root.rotation.y), 0, -Math.cos(this.root.rotation.y));
    const flat = toPlayer.clone().normalize();
    const dot = forward.dot(flat);
    const inCone = dist < 8.2 && dot > 0.55;
    const loud = player.stamina < 0.92 && dist < 5.5;
    const close = dist < 2.4;
    const visible = inCone && (player.fuel > 0.18 || dist < 3.8);

    let proximity = 0;
    if (dist < 10) proximity = Math.max(0, 1 - dist / 10) * (0.35 + Math.max(0, dot));

    if (visible || loud || close) {
      this.alert = Math.min(1, this.alert + dt * (visible ? 0.48 : loud ? 0.32 : 0.55));
    } else {
      this.alert = Math.max(0, this.alert - dt * 0.28);
    }

    // Stage machine — light + sound readable
    if (this.alert >= 0.92) this.stage = 'spook';
    else if (this.alert >= 0.55) this.stage = 'search';
    else if (this.alert >= 0.22) this.stage = 'notice';
    else this.stage = 'patrol';

    if (this.stage === 'search' || this.stage === 'notice') {
      // Ease facing toward player when aware
      const want = Math.atan2(-toPlayer.x, -toPlayer.z);
      let dy = want - this.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.root.rotation.y += dy * Math.min(1, dt * (this.stage === 'search' ? 2.4 : 1.2));
    }

    const flick = 1 + Math.sin(performance.now() * 0.005) * 0.08;
    const stageBoost =
      this.stage === 'patrol' ? 1.6 :
      this.stage === 'notice' ? 2.35 :
      this.stage === 'search' ? 3.1 : 3.6;
    this.light.intensity = stageBoost * flick;
    this.light.angle = this.stage === 'search' ? Math.PI / 4.4 : Math.PI / 5.2;
    this.light.distance = this.stage === 'patrol' ? 12 : 15;

    const beamOp =
      this.stage === 'patrol' ? 0.07 :
      this.stage === 'notice' ? 0.12 :
      this.stage === 'search' ? 0.18 : 0.22;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = beamOp * flick;
    (this.probe.material as THREE.MeshBasicMaterial).opacity = 0.1 + this.alert * 0.28;
    this.probe.scale.setScalar(0.85 + this.alert * 0.7);

    // Lamp bob on watchman
    this.lampMesh.position.y = 1.25 + Math.sin(performance.now() * 0.006) * 0.03;
    this.lampMesh.rotation.z = Math.sin(performance.now() * 0.004) * 0.15;

    // Staged audio — only on stage enter + pulses
    this.soundCd = Math.max(0, this.soundCd - dt);
    if (this.stage !== this.lastStage) {
      if (this.stage === 'notice') audio.pulseThreat(0.35);
      if (this.stage === 'search') audio.pulseThreat(0.7);
      if (this.stage === 'spook') audio.pulseThreat(1);
      this.soundCd = 0.35;
      this.lastStage = this.stage;
    } else if (this.soundCd <= 0 && this.alert > 0.25) {
      audio.pulseThreat(0.25 + this.alert * 0.55);
      this.soundCd = this.stage === 'search' ? 0.45 : 0.75;
    }

    const spotted = this.stage === 'spook';
    if (spotted) {
      this.alert = 0.35;
      this.stage = 'notice';
      this.lastStage = 'notice';
    }
    return { spotted, proximity };
  }
}
