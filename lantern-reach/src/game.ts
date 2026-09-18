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

const DOOR_OPEN_RAD = -1.25;

function setDoorBlocker(blocker: Interactable & { kind: 'door' }, open: boolean) {
  if (open) {
    // Park off-world so corridor is walkable
    blocker.blocker.minX = 90;
    blocker.blocker.maxX = 91;
    blocker.blocker.minZ = 90;
    blocker.blocker.maxZ = 91;
    blocker.blocker.minY = -10;
    blocker.blocker.maxY = -9;
  } else {
    blocker.blocker.minX = -0.625;
    blocker.blocker.maxX = 0.625;
    blocker.blocker.minY = 0;
    blocker.blocker.maxY = 2.15;
    blocker.blocker.minZ = 18.82;
    blocker.blocker.maxZ = 19.22;
  }
}

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
    const door = this.door();
    if (door && this.save.doorOpened) {
      door.open = true;
      door.openAmount = 1;
      door.hinge.rotation.y = DOOR_OPEN_RAD;
      door.label = 'E · Enter';
      setDoorBlocker(door, true);
    }
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private door() {
    return this.world.interactables.find((i) => i.kind === 'door') as
      | Extract<Interactable, { kind: 'door' }>
      | undefined;
  }

  private frame(t: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.input.update();
    this.tick(dt);
    this.pipe.render(this.world.scene, this.player.camera);
    requestAnimationFrame((nt) => this.frame(nt));
    (window as unknown as { __lr: Game }).__lr = this;
  }

  private tick(dt: number) {
    if (this.completed) return;

    this.animateLiving(dt);

    if (this.dialogue.active) {
      this.player.update(dt, this.input, this.world.colliders, true);
      this.hud.setVitals(this.player.hp, this.player.stamina, this.player.fuel);
      this.hud.setPrompt('E · Continue');
      if (this.input.state.interactPressed) {
        this.dialogue.tryAdvance();
        this.audio.interactBlip();
      }
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
      if (this.player.hp <= 0) {
        this.player.hp = 1;
        this.player.position.set(0, 0, 10);
        this.player.fuel = Math.min(1, this.player.fuel + 0.2);
      }
    }

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

    this.saveTimer += dt;
    if (this.saveTimer > 4) {
      this.saveTimer = 0;
      this.persist();
    }
  }

  /** NPC breath/sway, street lantern pendulums, door swing */
  private animateLiving(dt: number) {
    const now = performance.now();
    this.world.moon.position.y = 14 + Math.sin(now * 0.0003) * 0.15;

    for (const it of this.world.interactables) {
      if (it.kind !== 'npc') continue;
      const t = now * 0.001 + it.phase;
      const breath = Math.sin(t * 1.55) * 0.018;
      const sway = Math.sin(t * 0.85) * 0.045;
      const nod = Math.sin(t * 1.1) * 0.025;
      it.mesh.rotation.z = sway;
      const body = it.mesh.getObjectByName('body');
      const head = it.mesh.getObjectByName('head');
      if (body) {
        body.scale.y = 1 + breath;
        body.position.y = 0.95 + breath * 0.35;
      }
      if (head) {
        head.position.y = 1.55 + breath * 0.5;
        head.rotation.x = nod;
        head.rotation.y = Math.sin(t * 0.6) * 0.04;
      }
    }

    for (let i = 0; i < this.world.lanternPivots.length; i++) {
      const pivot = this.world.lanternPivots[i];
      const seed = pivot.position.x * 0.7 + pivot.position.z * 0.31 + i;
      pivot.rotation.z = Math.sin(now * 0.0018 + seed) * 0.22;
      pivot.rotation.x = Math.cos(now * 0.0014 + seed * 1.3) * 0.1;
      const ember = pivot.getObjectByName('ember') as THREE.Mesh | undefined;
      if (ember) {
        const m = ember.material as THREE.MeshStandardMaterial;
        if (m?.emissiveIntensity !== undefined) {
          m.emissiveIntensity = 1.1 + Math.sin(now * 0.008 + seed) * 0.28;
        }
      }
    }

    const door = this.door();
    if (door) {
      const target = door.open ? 1 : 0;
      if (Math.abs(door.openAmount - target) > 0.001) {
        door.openAmount += Math.sign(target - door.openAmount) * Math.min(1, dt * 2.4);
        if (door.open && door.openAmount > 0.98) door.openAmount = 1;
        if (!door.open && door.openAmount < 0.02) door.openAmount = 0;
      }
      door.hinge.rotation.y = DOOR_OPEN_RAD * door.openAmount;
    }
  }

  private findNearest(): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    const tmp = new THREE.Vector3();

    for (const it of this.world.interactables) {
      let wx: number;
      let wz: number;
      let range = 2.8;
      if (it.kind === 'door') {
        wx = it.anchor.x;
        wz = it.anchor.z;
        range = 3.6; // soft prompt like Talk, easier at jamb
      } else {
        it.mesh.getWorldPosition(tmp);
        wx = tmp.x;
        wz = tmp.z;
      }
      const d = dist2(px, pz, wx, wz);
      const maxD = range * range;
      if (d > maxD) continue;
      const to = new THREE.Vector3(wx - px, 0, wz - pz);
      if (to.lengthSq() > 0.0001) to.normalize();
      // Door: relax facing when close so E · Open always reads in range
      const faceOk = it.kind === 'door'
        ? (forward.dot(to) > -0.15 || d < 2.2 * 2.2)
        : (forward.dot(to) >= 0.05 || d <= 1.4 * 1.4);
      if (!faceOk) continue;
      if (d < bestD) {
        bestD = d;
        best = it;
      }
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
        it.label = 'E · Enter';
        this.save.doorOpened = true;
        setDoorBlocker(it, true);
        this.persist();
      }
      // Already open — walking through is enough; keep Enter label if still near
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
    const door = this.door();
    if (door) {
      door.open = false;
      door.openAmount = 0;
      door.hinge.rotation.y = 0;
      door.label = 'E · Open';
      this.save.doorOpened = false;
      setDoorBlocker(door, false);
    }
    this.persist();
  }

  /** QA helper */ debugTeleport(x: number, y: number, z: number, yaw?: number) {
    this.player.position.set(x, y, z);
    if (yaw !== undefined) this.player.yaw = yaw;
    this.player.syncCamera(0);
  }

  /** QA helper — force nearest interact */
  debugInteract() {
    const it = this.findNearest();
    if (it) this.doInteract(it);
    return it?.id ?? null;
  }

  debugState() {
    return {
      pos: this.player.position.toArray(),
      yaw: this.player.yaw,
      nearest: this.nearest?.id ?? null,
      nearestLabel: this.nearest?.label ?? null,
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
