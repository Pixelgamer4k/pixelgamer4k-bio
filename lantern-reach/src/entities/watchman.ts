import * as THREE from 'three';
import type { AudioBed } from '../engine/audio';
import type { Player } from './player';

/** Watchman = light cone + sound only. No UI lecture. */
export class Watchman {
  root: THREE.Group;
  light: THREE.SpotLight;
  private path: THREE.Vector3[];
  private idx = 0;
  private t = 0;
  private alert = 0;
  private probe: THREE.Mesh;

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
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), matsEmber);
    lamp.position.set(0.25, 1.2, 0.2);
    this.root.add(body, head, lamp);

    this.light = new THREE.SpotLight(0xffaa66, 1.4, 12, Math.PI / 5.5, 0.45, 1.2);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(256, 256);
    this.root.add(this.light);
    this.light.position.set(0, 1.5, 0);
    const target = new THREE.Object3D();
    target.position.set(0, 0.8, -4);
    this.root.add(target);
    this.light.target = target;

    // subtle ground probe disc (very dim) — mood, not UI
    this.probe = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.12, depthWrite: false }),
    );
    this.probe.rotation.x = -Math.PI / 2;
    this.probe.position.y = 0.03;
    this.root.add(this.probe);

    if (path[0]) this.root.position.copy(path[0]);
  }

  update(dt: number, player: Player, audio: AudioBed): { spotted: boolean; proximity: number } {
    const a = this.path[this.idx];
    const b = this.path[(this.idx + 1) % this.path.length];
    this.t += dt * 0.22;
    if (this.t >= 1) {
      this.t = 0;
      this.idx = (this.idx + 1) % this.path.length;
    }
    const aa = this.path[this.idx];
    const bb = this.path[(this.idx + 1) % this.path.length];
    this.root.position.lerpVectors(aa, bb, this.t);
    const face = new THREE.Vector3().subVectors(bb, aa);
    if (face.lengthSq() > 0.001) {
      this.root.rotation.y = Math.atan2(-face.x, -face.z);
    }
    // lantern sway on watchman
    this.light.intensity = 1.2 + Math.sin(performance.now() * 0.004) * 0.15;

    // detection: in front cone + close + player lantern bright / sprinting louder
    const toPlayer = new THREE.Vector3().subVectors(player.position, this.root.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    const forward = new THREE.Vector3(-Math.sin(this.root.rotation.y), 0, -Math.cos(this.root.rotation.y));
    const flat = toPlayer.clone().normalize();
    const dot = forward.dot(flat);
    const inCone = dist < 7.5 && dot > 0.62;
    const noise = (player.stamina < 0.95 && dist < 5 ? 0.15 : 0) + (dist < 2.2 ? 0.25 : 0);
    const visible = inCone && (player.fuel > 0.2 || dist < 3.5);

    let proximity = 0;
    if (dist < 9) proximity = Math.max(0, 1 - dist / 9) * (0.4 + Math.max(0, dot));

    if (visible || noise > 0.2) {
      this.alert = Math.min(1, this.alert + dt * (visible ? 0.55 : 0.25));
      if (this.alert > 0.35) audio.pulseThreat(this.alert);
    } else {
      this.alert = Math.max(0, this.alert - dt * 0.35);
    }

     (this.probe.material as THREE.MeshBasicMaterial).opacity = 0.08 + this.alert * 0.2;
    const spotted = this.alert >= 0.92;
    if (spotted) this.alert = 0.4; // soft reset after spook
    return { spotted, proximity };
  }
}
