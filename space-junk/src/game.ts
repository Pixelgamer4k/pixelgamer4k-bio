import * as THREE from 'three';
import { Ship } from './entities/ship';
import { ChaseCamera } from './systems/camera';
import { Input } from './systems/input';
import { MagnetBeam } from './systems/magnet';
import { ScanPulse } from './systems/scanner';
import { WeaponSystem } from './systems/weapons';
import { Zone1 } from './zones/zone1';
import { Hud } from './ui/hud';
import { MobileControls } from './ui/mobile';
import { B12Tutorial } from './ui/tutorial';
import { MissionCompleteUI } from './ui/missionComplete';
import { UpgradePanel } from './ui/upgrades';
import { loadSave, writeSave, type SaveData } from './util/save';
import type { SalvagePiece } from './entities/salvage';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private ship = new Ship();
  private cam: ChaseCamera;
  private input: Input;
  private magnet: MagnetBeam;
  private scanner: ScanPulse;
  private weapons: WeaponSystem;
  private zone!: Zone1;
  private hud: Hud;
  private mobile: MobileControls;
  private b12!: B12Tutorial;
  private missionUI: MissionCompleteUI;
  private upgrades!: UpgradePanel;
  private save!: SaveData;
  private root: HTMLElement;
  private clock = new THREE.Clock();
  private paused = false;
  private toastT = 0;
  private toastMsg = '';
  private missionShown = false;
  private sessionCoins = 0;
  private sessionGems = 0;
  private flags = { scanTip: false, magnetTip: false, combatTip: false, bossTip: false };
  private running = false;
  private camQuat = new THREE.Quaternion();

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.style.cssText = 'position:fixed;inset:0;background:#0a0e1a;';

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.root.appendChild(this.renderer.domElement);

    this.cam = new ChaseCamera(window.innerWidth / window.innerHeight);
    this.input = new Input(this.renderer.domElement);
    this.magnet = new MagnetBeam(this.scene);
    this.scanner = new ScanPulse(this.scene);
    this.weapons = new WeaponSystem(this.scene);

    this.hud = new Hud(this.root);
    this.mobile = new MobileControls(this.root, this.input);
    this.missionUI = new MissionCompleteUI(this.root);

    this.hud.setTouchMode(this.input.touchMode);
    this.hud.onPause = () => this.togglePause();
    this.hud.onScan = () => this.input.pulseScan();
    this.missionUI.onContinue = () => {
      this.upgrades.open();
    };

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.togglePause();
      if (e.code === 'KeyU' && this.paused) this.upgrades.open();
    });
  }

  async start() {
    this.save = await loadSave();
    this.applyUpgrades();
    this.b12 = new B12Tutorial(this.root, this.save.tutorialDone);
    this.upgrades = new UpgradePanel(this.root, this.save);
    this.upgrades.onChanged = () => {
      this.applyUpgrades();
      void writeSave(this.save);
    };
    this.upgrades.onClose = () => {
      this.paused = false;
    };

    this.zone = new Zone1(this.scene);
    this.scene.add(this.ship.group);
    this.ship.position.set(0, 2, 18);

    this.b12.enqueue('cells');
    this.running = true;
    this.clock.start();
    this.loop();

    // Duck bed music if parent bio shell exposed hook
    try {
      (window as unknown as { __pg4kSetBedVolume?: (v: number, ms: number) => void }).__pg4kSetBedVolume?.(0.08, 600);
    } catch { /* standalone */ }
  }

  private applyUpgrades() {
    const u = this.save.upgrades;
    this.ship.thrusterLevel = u.thruster;
    this.ship.magnetLevel = u.magnet;
    this.ship.weaponLevel = u.weapons;
    this.ship.cargoCapacity = 10 + u.cargo * 4;
    this.ship.maxHull = 80 + u.hull * 25;
    this.ship.maxShield = 40 + u.hull * 12;
    this.ship.hull = Math.min(this.ship.hull, this.ship.maxHull);
    this.ship.shield = Math.min(this.ship.shield, this.ship.maxShield);
    this.magnet.range = 18 + u.magnet * 5;
  }

  private togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.toast('Paused — U for Upgrades');
      document.exitPointerLock?.();
    }
  }

  private toast(msg: string, sec = 2.2) {
    this.toastMsg = msg;
    this.toastT = sec;
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.cam.resize(w, h);
  }

  private collectPiece(p: SalvagePiece) {
    if (p.collected) return;
    const cargoCount = this.save.cargo.length;
    if (!this.zone.isPowerCell(p) && cargoCount >= this.ship.cargoCapacity) {
      this.toast('Cargo full');
      return;
    }
    this.zone.debris.remove(p);
    this.zone.onSalvageCollected(p);

    if (this.zone.isPowerCell(p)) {
      this.save.powerCells = this.zone.cellsCollected;
      this.toast(`Power Cell ${this.zone.cellsCollected}/3`);
      this.sessionGems += 1;
      this.save.gems += 1;
    } else {
      const coins = p.value;
      this.sessionCoins += coins;
      this.save.coins += coins;
      if (p.rarity === 'epic' || p.rarity === 'legendary') {
        this.sessionGems += 1;
        this.save.gems += 1;
      }
      this.save.cargo.push({ id: p.id, rarity: p.rarity, value: p.value });
      this.save.raresSalvaged = this.zone.raresCollected;
      this.toast(`+${coins} coins · ${p.rarity}`);
    }
    void writeSave(this.save);
  }

  private loop = () => {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.input.update();

    if (!this.paused && !this.missionShown) {
      this.tick(dt);
    }

    this.cam.camera.getWorldQuaternion(this.camQuat);
    this.renderer.render(this.scene, this.cam.camera);
    this.paintHud();
  };

  private tick(dt: number) {
    // Tutorial tips
    if (this.input.state.scan && !this.flags.scanTip) {
      this.flags.scanTip = true;
      this.b12.enqueue('scan');
    }
    if (this.input.state.magnet && !this.flags.magnetTip) {
      this.flags.magnetTip = true;
      this.b12.enqueue('magnet');
    }

    if (this.input.state.scan) this.scanner.trigger(this.ship);
    this.scanner.update(dt, this.ship, this.zone.debris.alive());

    this.ship.update(dt, this.input.state, this.camQuat);
    this.cam.update(dt, this.ship);

    const pulled = this.magnet.update(
      dt,
      this.ship,
      this.zone.debris.alive(),
      this.input.state.magnet,
    );
    if (pulled) this.collectPiece(pulled);

    // Interact near piece without magnet (LMB also fires — collect on proximity + interact unused)
    // Fire / combat
    if (this.zone.beat === 'drones' && !this.flags.combatTip) {
      this.flags.combatTip = true;
      this.b12.enqueue('combat');
    }
    if (this.zone.boss?.alive && !this.flags.bossTip) {
      this.flags.bossTip = true;
      this.b12.enqueue('boss');
      this.toast(this.zone.boss?.introSub || 'Junk Behemoth');
      this.cam.addShake(0.6);
    }

    this.zone.drones.update(dt, this.ship, (dmg) => {
      this.ship.damage(dmg);
      this.cam.addShake(0.15);
    });
    this.zone.drones.removeDead();

    this.weapons.update(
      dt,
      this.ship,
      this.input.state.fire,
      this.zone.drones.drones,
      this.zone.boss,
      (n) => {
        if (!this.zone.boss) return;
        const dead = this.zone.boss.takeDamage(n);
        this.cam.addShake(0.12);
        if (dead) {
          this.toast('Junk Behemoth down!');
          this.sessionCoins += 1200;
          this.sessionGems += 4;
          this.save.coins += 1200;
          this.save.gems += 4;
          this.save.bossDefeated = true;
          void writeSave(this.save);
          // unlock extract
          this.zone.extractPad.visible = true;
        }
      },
    );

    if (this.zone.boss?.alive) {
      this.zone.boss.update(
        dt,
        this.ship,
        (dmg) => {
          this.ship.damage(dmg);
          this.cam.addShake(0.25);
        },
        (pieces) => {
          for (const p of pieces) {
            this.zone.debris.pieces.push(p);
            this.zone.debris.group.add(p.mesh);
          }
        },
      );
    }

    this.zone.update(dt, this.ship.position);

    if (this.zone.beat === 'complete' && !this.missionShown) {
      this.missionShown = true;
      this.save.tutorialDone = true;
      this.save.missionStep = 1;
      void writeSave(this.save);
      this.b12.enqueue('done');
      this.missionUI.show({
        cells: this.zone.cellsCollected,
        cellsNeeded: 3,
        extracted: true,
        rares: this.zone.raresCollected,
        raresOptional: 10,
        coinsEarned: Math.max(this.sessionCoins, 400),
        gemsEarned: Math.max(this.sessionGems, 2),
        bossDown: this.zone.bossDefeated,
      });
      document.exitPointerLock?.();
    }

    if (this.ship.hull <= 0) {
      this.ship.hull = this.ship.maxHull;
      this.ship.shield = this.ship.maxShield * 0.5;
      this.ship.position.set(0, 2, 18);
      this.ship.velocity.set(0, 0, 0);
      this.toast('Systems reboot — try again');
    }

    this.toastT = Math.max(0, this.toastT - dt);
  }

  private paintHud() {
    const obj = this.zone?.objectiveText() || { objective: '…', progress: '' };
    const blips: { x: number; y: number; kind: 'salvage' | 'enemy' | 'objective' | 'extract' }[] = [];
    const range = 70;
    const yaw = this.ship.yaw;
    const toRadar = (pos: THREE.Vector3, kind: typeof blips[0]['kind']) => {
      const dx = pos.x - this.ship.position.x;
      const dz = pos.z - this.ship.position.z;
      // rotate into ship yaw frame
      const lx = dx * Math.cos(yaw) + dz * Math.sin(yaw);
      const lz = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
      blips.push({
        x: Math.max(-1, Math.min(1, lx / range)),
        y: Math.max(-1, Math.min(1, lz / range)),
        kind,
      });
    };
    if (this.zone) {
      for (const p of this.zone.powerCells) {
        if (!p.collected) toRadar(p.mesh.position, 'objective');
      }
      for (const d of this.zone.drones.drones) {
        if (d.alive) toRadar(d.mesh.position, 'enemy');
      }
      if (this.zone.boss?.alive) toRadar(this.zone.boss.position, 'enemy');
      if (this.zone.extractPad.visible) toRadar(this.zone.extractPad.position, 'extract');
      let n = 0;
      for (const p of this.zone.debris.alive()) {
        if (this.zone.isPowerCell(p)) continue;
        if (n++ > 12) break;
        toRadar(p.mesh.position, 'salvage');
      }
    }

    this.hud.update({
      hull: this.ship.hull,
      maxHull: this.ship.maxHull,
      shield: this.ship.shield,
      maxShield: this.ship.maxShield,
      cargo: this.save?.cargo.length || 0,
      cargoMax: this.ship.cargoCapacity,
      coins: this.save?.coins || 0,
      gems: this.save?.gems || 0,
      scanReady: this.scanner.ready,
      scanCd: this.scanner.cooldown,
      magnetOn: this.input.state.magnet,
      magnetLevel: this.ship.magnetLevel,
      objective: obj.objective,
      objectiveProgress: obj.progress,
      bossHp: this.zone?.boss?.alive ? this.zone.boss.hp : undefined,
      bossMax: this.zone?.boss?.alive ? this.zone.boss.maxHp : undefined,
      bossLabel: this.zone?.boss?.phaseLabel,
      toast: this.toastT > 0 ? this.toastMsg : undefined,
      radarBlips: blips,
    });
  }
}
