import * as THREE from 'three';
import { PixelPipeline } from './engine/pixelPipeline';
import { Input } from './engine/input';
import { AudioBed } from './engine/audio';
import { loadSave, writeSave, defaultSave, type SaveData } from './engine/save';
import { dist2 } from './engine/collision';
import { buildWorld, type Interactable } from './world/buildWorld';
import { Player } from './entities/player';
import { Watchman } from './entities/watchman';
import { Hud } from './ui/hud';
import { MobileControls } from './ui/mobile';
import { Dialogue } from './ui/dialogue';

export class Game {
  private pipe: PixelPipeline;
  private input: Input;
  private audio = new AudioBed();
  private world = buildWorld();
  private player = new Player();
  private watchman: Watchman;
  private hud: Hud;
  private dialogue: Dialogue;
  private save: SaveData = defaultSave();
  private running = false;
  private last = 0;
  private nearest: Interactable | null = null;
  private completed = false;
  private saveTimer = 0;
  private wrap: HTMLDivElement;

  constructor(private app: HTMLElement) {
    this.wrap = document.createElement('div');
    this.wrap.style.cssText = 'position:absolute;inset:0;';
    this.app.appendChild(this.wrap);

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;';
    this.wrap.appendChild(canvas);

    this.pipe = new PixelPipeline(canvas, 4);
    this.input = new Input(canvas);
    this.world.scene.add(this.player.camera);

    this.watchman = new Watchman(this.world.watchPath, this.world.mats.ember);
    this.world.scene.add(this.watchman.root);

    this.hud = new Hud(this.wrap);
    this.dialogue = new Dialogue(this.wrap);
    new MobileControls(this.wrap, this.input);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize() {
    const w = this.wrap.clientWidth || window.innerWidth;
    const h = this.wrap.clientHeight || window.innerHeight;
    this.pipe.setSize(w, h);
    this.player.camera.aspect = w / h;
    this.player.camera.updateProjectionMatrix();
  }

  async start() {
    await this.audio.ensure();
    this.resize();
    this.save = await loadSave();
    this.player.reset(this.world.spawn);
    this.player.hp = this.save.hp;
    this.player.fuel = this.save.fuel;
    // restore door visual if already opened this save
    const door = this.world.interactables.find((i) => i.kind === 'door') as Extract<Interactable, { kind: 'door' }> | undefined;
    if (door && this.save.doorOpened) {
      door.open = true;
      door.mesh.rotation.y = -1.2;
      door.mesh.position.x = 0.55;
      door.label = 'E · Enter';
    }
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private frame(t: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.input.update();
    this.tick(dt);
    this.pipe.render(this.world.scene, this.player.camera);
    requestAnimationFrame((nt) => this.frame(nt));
    // debug hook for QA (no UI lecture)
    (window as unknown as { __lr: Game }).__lr = this;
  }

  private tick(dt: number) {
    if (this.completed) return;

    // dialogue absorbs interact
    if (this.dialogue.active) {
      this.player.update(dt, this.input, this.world.colliders, true);
      this.hud.setVitals(this.player.hp, this.player.stamina, this.player.fuel);
      this.hud.setPrompt('E · Continue');
      if (this.input.state.interactPressed) {
        this.dialogue.tryAdvance();
        this.audio.interactBlip();
      }
      this.moonBob(dt);
      return;
    }

    this.nearest = this.findNearest();
    const canUse = !!this.nearest;
    this.player.update(dt, this.input, this.world.colliders, canUse && this.input.state.interact);
    this.hud.setVitals(this.player.hp, this.player.stamina, this.player.fuel);
    this.hud.setPrompt(this.nearest ? this.nearest.label : null);
    this.audio.setMutedIntensity(this.input.state.sprint, this.player.fuel);

    if (this.input.state.interactPressed && this.nearest) {
      this.doInteract(this.nearest);
    }

    const { spotted } = this.watchman.update(dt, this.player, this.audio);
    if (spotted) {
      this.player.spook(0.16);
      this.hud.flashFade(280);
      // soft reset toward street if HP gone
      if (this.player.hp <= 0) {
        this.player.hp = 1;
        this.player.position.set(0, 0, 10);
        this.player.fuel = Math.min(1, this.player.fuel + 0.2);
      }
    }

    // loft success — quiet
    const p = this.player.position;
    const loft = this.world.loftZone;
    if (
      this.save.doorOpened &&
      p.x > loft.minX && p.x < loft.maxX &&
      p.z > loft.minZ && p.z < loft.maxZ &&
      p.y >= loft.minY - 0.1
    ) {
      this.onLoft();
    }

    this.moonBob(dt);
    this.saveTimer += dt;
    if (this.saveTimer > 4) {
      this.saveTimer = 0;
      this.persist();
    }
  }

  private moonBob(_dt: number) {
    this.world.moon.position.y = 14 + Math.sin(performance.now() * 0.0003) * 0.15;
    for (const lamp of this.world.lanternHooks) {
      const mesh = lamp as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m && m.emissiveIntensity !== undefined) {
        m.emissiveIntensity = 1.1 + Math.sin(performance.now() * 0.008 + lamp.position.z) * 0.25;
      }
    }
  }

  private findNearest(): Interactable | null {
    let best: Interactable | null = null;
    let bestD = 2.8 * 2.8;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    // facing bias — must roughly look at target
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    for (const it of this.world.interactables) {
      const wp = new THREE.Vector3();
      it.mesh.getWorldPosition(wp);
      const d = dist2(px, pz, wp.x, wp.z);
      if (d > bestD) continue;
      const to = new THREE.Vector3(wp.x - px, 0, wp.z - pz).normalize();
      if (forward.dot(to) < 0.05 && d > 1.4) continue;
      bestD = d;
      best = it;
    }
    return best;
  }

  private doInteract(it: Interactable) {
    this.audio.interactBlip();
    if (it.kind === 'npc') {
      this.dialogue.talk(it.id);
      if (it.id === 'ash') this.save.talkedAsh = true;
      if (it.id === 'mira') this.save.talkedMira = true;
      this.persist();
      return;
    }
    if (it.kind === 'door') {
      if (!it.open) {
        it.open = true;
        it.mesh.rotation.y = -1.15;
        it.mesh.position.x = 0.55;
        it.label = '';
        this.save.doorOpened = true;
        this.persist();
      }
    }
  }

  private async onLoft() {
    if (this.completed) return;
    this.completed = true;
    this.save.reachedLoft = true;
    await this.persist();
    this.audio.softSuccess();
    this.hud.flashFade(400);
    window.setTimeout(() => {
      this.hud.showEnd(() => this.restart());
    }, 500);
  }

  private restart() {
    this.completed = false;
    this.player.reset(this.world.spawn);
    this.player.hp = 1;
    this.player.fuel = 1;
    this.save.reachedLoft = false;
    // keep talked flags / door as atmosphere continuity optional — reset door for full loop
    const door = this.world.interactables.find((i) => i.kind === 'door') as Extract<Interactable, { kind: 'door' }> | undefined;
    if (door) {
      door.open = false;
      door.mesh.rotation.y = 0;
      door.mesh.position.set(0.0, 1.05, 19.02);
      door.label = 'E · Open';
      this.save.doorOpened = false;
    }
    this.persist();
  }

  /** QA helper */ debugTeleport(x: number, y: number, z: number, yaw?: number) {
    this.player.position.set(x, y, z);
    if (yaw !== undefined) this.player.yaw = yaw;
    this.player.syncCamera(0);
  }

  debugState() {
    return {
      pos: this.player.position.toArray(),
      yaw: this.player.yaw,
      nearest: this.nearest?.id ?? null,
      save: { ...this.save },
      completed: this.completed,
    };
  }

  private async persist() {
    this.save.hp = this.player.hp;
    this.save.fuel = this.player.fuel;
    await writeSave(this.save);
  }
}
