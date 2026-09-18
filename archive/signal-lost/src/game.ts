/**
 * Signal Lost — opening slice game loop.
 * Smooth Pokémon-like grid move, layered maps, quest flags, IndexedDB saves.
 */
import { TILE, SCALE, DIRS, type Dir } from './engine/types';
import { Input } from './engine/input';
import { AudioBus } from './engine/audio';
import { SpriteKit } from './engine/sprites';
import { saveGame, loadGame, hasSave, type SaveBlob } from './engine/save';
import { getMap, buildCollision, MAPS, type MapDef } from './data/maps';
import { NPCS } from './data/npcs';
import { QUESTS, questMarker, questWaypoint } from './data/quests';
import { ITEMS } from './data/items';
import { createCompanion, companionFollow, TUTORIAL_LINES, type CompanionBrain } from './entities/companion';
import {
  startBossBattle,
  battleUpdate,
  checkBattleEnd,
  type BattleState,
} from './combat/battle';
import {
  drawTitleCard,
  drawNameplate,
  drawNpcNameplate,
  drawQuestMarker,
  drawWaypointPing,
  drawQuestCompass,
  drawDialogue,
  dialogueTop,
  drawPartyHp,
  drawPause,
  drawBossHud,
  drawBattleScene,
  drawToast,
  drawQuestCompleteJuice,
  drawMapTransition,
  drawStepDust,
} from './ui/hud';

type Mode = 'title' | 'play' | 'dialogue' | 'pause' | 'battle' | 'toast';

interface Actor {
  tx: number;
  ty: number;
  x: number;
  y: number;
  facing: Dir;
  moving: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  frame: number;
  anim: number;
}

const MOVE_DUR = 0.14;
const SAVE_SLOT = 'slot0';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new Input();
  private audio = new AudioBus();
  private sprites = new SpriteKit();
  private mode: Mode = 'title';
  private time = 0;
  private hasSave = false;
  private map!: MapDef;
  private collision: boolean[][] = [];
  private player!: Actor;
  private companion!: CompanionBrain;
  private hp = 24;
  private maxHp = 24;
  private beepHp = 20;
  private beepMax = 20;
  private inv: Record<string, number> = { soda: 1 };
  private flags: Record<string, string | boolean | number> = {};
  private gold = 0;
  private dialogue: { name: string; portrait: string; lines: string[]; i: number } | null = null;
  private pauseTab: 'items' | 'quest' | 'party' = 'items';
  private pauseCursor = 0;
  private pauseTabHits: { id: 'items' | 'quest' | 'party'; x: number; y: number; w: number; h: number }[] = [];
  private battle: BattleState | null = null;
  private toast = '';
  private toastT = 0;
  private nameplateT = 0;
  private nameplate = '';
  private warpCooldown = 0;
  private touchUi: HTMLDivElement | null = null;
  private last = 0;
  private running = false;
  private titleChoice: 'continue' | 'new' = 'new';
  private pauseNavCool = 0;
  private hitLatch = false;
  private questJuice = 0;
  private transition = 0;
  private transitionKind: 'fade' | 'wipe' = 'wipe';
  private pendingWarp: { toMap: string; toSpawn: string } | null = null;
  private stepDusts: { x: number; y: number; age: number }[] = [];
  private prevFlags: Record<string, string | boolean | number> = {};

  constructor(private root: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'game';
    this.root.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context missing');
    this.ctx = ctx;
    this.sprites.build();
    this.mountTouch();
    this.mountPauseClicks();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  async start() {
    this.hasSave = await hasSave(SAVE_SLOT);
    if (this.hasSave) this.titleChoice = 'continue';
    this.running = true;
    this.last = performance.now();
    this.audio.playMusic('title');
    requestAnimationFrame((t) => this.frame(t));
  }

  private resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.layoutTouch(h);
  }

  /** Large hold-to-walk zone; stays above dialogue hit area. */
  private layoutTouch(h: number) {
    if (!this.touchUi) return;
    const dpad = this.touchUi.querySelector('#dpad') as HTMLElement | null;
    if (!dpad) return;
    const dialTop = dialogueTop(h);
    // Keep entire pad above dialogue box with 12px gap
    const padSize = 168;
    const maxBottom = Math.max(16, h - dialTop + 12);
    dpad.style.width = `${padSize}px`;
    dpad.style.height = `${padSize}px`;
    dpad.style.bottom = `${Math.max(maxBottom, 16)}px`;
  }

  private mountTouch() {
    const ui = document.createElement('div');
    ui.id = 'touch-ui';
    ui.innerHTML = `
      <style>
        #touch-ui { position:fixed; inset:0; pointer-events:none; z-index:20; }
        #dpad {
          pointer-events:auto; position:absolute;
          left: max(8px, env(safe-area-inset-left));
          bottom: max(120px, env(safe-area-inset-bottom));
          width: 168px; height: 168px;
          border-radius: 50%;
          background: rgba(254,221,4,0.18);
          border: 3px solid rgba(18,18,18,0.85);
          touch-action: none;
          -webkit-user-select:none; user-select:none;
        }
        #dpad::after {
          content:''; position:absolute; left:50%; top:50%;
          width:36px; height:36px; margin:-18px 0 0 -18px;
          border-radius:50%; background:rgba(254,221,4,0.55);
          border:2px solid #121212; pointer-events:none;
        }
        #dpad .knob {
          position:absolute; left:50%; top:50%;
          width:52px; height:52px; margin:-26px 0 0 -26px;
          border-radius:50%; background:#FEDD04; border:2.5px solid #121212;
          pointer-events:none; transition: none;
        }
        #actBtn, #menuBtn {
          pointer-events:auto; position:absolute;
          right: max(16px, env(safe-area-inset-right));
          border-radius:50%; border:2.5px solid #121212; background:#FEDD04; color:#121212;
          font-weight:800; font-size:12px; letter-spacing:0.04em;
          -webkit-user-select:none; user-select:none;
        }
        #actBtn { bottom: max(140px, env(safe-area-inset-bottom)); width:76px; height:76px; }
        #menuBtn { bottom: max(228px, env(safe-area-inset-bottom)); width:52px; height:52px; font-size:10px; }
        #touch-ui.hide-pad #dpad { opacity:0; pointer-events:none; }
        @media (hover:hover) and (pointer:fine) {
          #touch-ui { opacity:0; } #touch-ui.show-force { opacity:1; }
        }
      </style>
      <div id="dpad"><div class="knob" id="dpadKnob"></div></div>
      <button type="button" id="menuBtn">MENU</button>
      <button type="button" id="actBtn">ACTION</button>
    `;
    this.root.appendChild(ui);
    this.touchUi = ui;
    const pad = ui.querySelector('#dpad') as HTMLElement;
    const knob = ui.querySelector('#dpadKnob') as HTMLElement;
    let active = false;
    const radius = 60;

    const setFromEvent = (e: PointerEvent) => {
      const rect = pad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const mag = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(mag, radius);
      dx = (dx / mag) * clamped;
      dy = (dy / mag) * clamped;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const nx = dx / radius;
      const ny = dy / radius;
      // deadzone then full hold-to-walk
      if (Math.hypot(nx, ny) < 0.22) this.input.setStick(0, 0);
      else this.input.setStick(nx, ny);
    };
    const clear = () => {
      active = false;
      knob.style.transform = 'translate(0,0)';
      this.input.setStick(0, 0);
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = true;
      pad.setPointerCapture(e.pointerId);
      setFromEvent(e);
    });
    pad.addEventListener('pointermove', (e) => {
      if (!active) return;
      e.preventDefault();
      setFromEvent(e);
    });
    pad.addEventListener('pointerup', clear);
    pad.addEventListener('pointercancel', clear);
    const act = ui.querySelector('#actBtn')!;
    act.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.setAction(true, true);
    });
    act.addEventListener('pointerup', () => this.input.setAction(false));
    ui.querySelector('#menuBtn')!.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.pulseMenu();
    });
    window.addEventListener(
      'touchstart',
      () => ui.classList.add('show-force'),
      { once: true, passive: true },
    );
  }

  /** Tap pause tabs on canvas (fixes Party showing quest when tab never switches). */
  private mountPauseClicks() {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'pause') return;
      const rect = this.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * window.innerWidth;
      const y = ((e.clientY - rect.top) / rect.height) * window.innerHeight;
      for (const t of this.pauseTabHits) {
        if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
          this.pauseTab = t.id;
          this.pauseCursor = 0;
          this.audio.sfx('menu');
          e.preventDefault();
          break;
        }
      }
    });
  }

  private frame(now: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  private async beginNew() {
    this.flags = {};
    this.prevFlags = {};
    this.inv = { soda: 1 };
    this.hp = 24;
    this.maxHp = 24;
    this.beepHp = 20;
    this.beepMax = 20;
    this.gold = 0;
    this.loadMap('town', 'default');
    this.companion = createCompanion(this.player.tx, this.player.ty + 1);
    this.mode = 'dialogue';
    this.dialogue = {
      name: 'Beep',
      portrait: 'companion',
      lines: [...TUTORIAL_LINES],
      i: 0,
    };
    this.audio.playMusic('town');
    this.showToast('Neon Plaza');
  }

  private async beginContinue() {
    const data = await loadGame(SAVE_SLOT);
    if (!data) {
      await this.beginNew();
      return;
    }
    this.flags = { ...data.questFlags };
    this.prevFlags = { ...this.flags };
    this.inv = Object.fromEntries(data.inventory.map((i) => [i.id, i.qty]));
    this.hp = data.player.hp;
    this.maxHp = data.player.maxHp;
    this.gold = data.gold;
    this.loadMap(data.mapId, 'default');
    this.player.tx = data.player.tx;
    this.player.ty = data.player.ty;
    this.player.x = data.player.tx * TILE;
    this.player.y = data.player.ty * TILE;
    this.player.facing = (data.player.facing as Dir) || 'down';
    this.companion = createCompanion(this.player.tx, this.player.ty + 1);
    this.companion.unlocked = data.companionUnlocked;
    this.mode = 'play';
    this.audio.playMusic(this.map.music);
    this.showToast(this.map.name);
  }

  private loadMap(id: string, spawnKey: string) {
    this.map = getMap(id);
    this.collision = buildCollision(this.map);
    const sp = this.map.spawns[spawnKey] ?? this.map.spawns.default;
    this.player = {
      tx: sp.x,
      ty: sp.y,
      x: sp.x * TILE,
      y: sp.y * TILE,
      facing: 'down',
      moving: false,
      fromX: sp.x * TILE,
      fromY: sp.y * TILE,
      toX: sp.x * TILE,
      toY: sp.y * TILE,
      t: 0,
      frame: 0,
      anim: 0,
    };
    if (this.companion) {
      this.companion.tx = sp.x;
      this.companion.ty = sp.y;
      this.companion.x = sp.x * TILE;
      this.companion.y = sp.y * TILE;
      this.companion.trail = [];
    }
    this.warpCooldown = 0.4;
    this.nameplate = this.map.name;
    this.nameplateT = 2.2;
    this.stepDusts = [];
  }

  private blocked(tx: number, ty: number): boolean {
    if (ty < 0 || tx < 0 || ty >= this.map.h || tx >= this.map.w) return true;
    if (this.collision[ty]?.[tx]) return true;
    for (const n of NPCS) {
      if (n.mapId === this.map.id && n.tx === tx && n.ty === ty) return true;
    }
    return false;
  }

  private detectQuestComplete() {
    for (const q of QUESTS) {
      if (this.flags[q.doneFlag] && !this.prevFlags[q.doneFlag]) {
        this.questJuice = 1.1;
        this.audio.sfx('quest');
        this.showToast(`${q.title} complete!`);
      }
    }
    this.prevFlags = { ...this.flags };
  }

  private update(dt: number) {
    if (this.toastT > 0) this.toastT -= dt;
    if (this.nameplateT > 0) this.nameplateT -= dt;
    if (this.warpCooldown > 0) this.warpCooldown -= dt;
    if (this.questJuice > 0) this.questJuice -= dt;
    for (const d of this.stepDusts) d.age += dt;
    this.stepDusts = this.stepDusts.filter((d) => d.age < 0.28);

    // Map transition mid-point swap
    if (this.transition > 0) {
      const prev = this.transition;
      this.transition += dt / 0.55;
      if (prev < 0.5 && this.transition >= 0.5 && this.pendingWarp) {
        this.loadMap(this.pendingWarp.toMap, this.pendingWarp.toSpawn);
        this.audio.playMusic(this.map.music);
        this.pendingWarp = null;
        void this.persist();
      }
      if (this.transition >= 1) {
        this.transition = 0;
      } else if (this.mode !== 'title') {
        return; // freeze world mid-wipe
      }
    }

    // Hide d-pad during dialogue so it never blocks talk prompts
    if (this.touchUi) {
      this.touchUi.classList.toggle('hide-pad', this.mode === 'dialogue' || this.mode === 'battle' || this.mode === 'pause');
      this.layoutTouch(window.innerHeight);
    }

    if (this.mode === 'title') {
      if (this.hasSave && this.input.moveDir()) {
        const d = this.input.moveDir();
        if (d === 'left' || d === 'up') this.titleChoice = 'continue';
        if (d === 'right' || d === 'down') this.titleChoice = 'new';
      }
      if (this.input.consumeAction()) {
        void this.audio.unlock();
        this.audio.sfx('confirm');
        if (this.hasSave && this.titleChoice === 'continue') void this.beginContinue();
        else void this.beginNew();
      }
      return;
    }

    if (this.mode === 'dialogue' && this.dialogue) {
      if (this.input.consumeAction()) {
        this.audio.sfx('talk');
        this.dialogue.i++;
        if (this.dialogue.i >= this.dialogue.lines.length) {
          if (this.dialogue.name === 'Beep' && !this.flags.tutorial_done) {
            this.flags.tutorial_done = true;
            this.companion.tutorialIndex = TUTORIAL_LINES.length;
          }
          this.dialogue = null;
          this.mode = 'play';
          this.detectQuestComplete();
          void this.persist();
        }
      }
      return;
    }

    if (this.mode === 'pause') {
      this.pauseNavCool = Math.max(0, this.pauseNavCool - dt);
      if (this.input.consumeMenu()) {
        this.mode = 'play';
        this.audio.sfx('menu');
        return;
      }
      if (this.input.consumeAction()) {
        if (this.pauseTab === 'items') {
          const list = Object.entries(this.inv).filter(([, q]) => q > 0);
          const it = list[this.pauseCursor];
          if (it && it[0] === 'soda' && this.hp < this.maxHp) {
            this.inv.soda!--;
            if (this.inv.soda <= 0) delete this.inv.soda;
            this.hp = Math.min(this.maxHp, this.hp + (ITEMS.soda.heal ?? 8));
            this.audio.sfx('heal');
            this.showToast('Used Pixel Soda');
          } else this.audio.sfx('deny');
        }
      }
      const d = this.input.moveDir();
      if (d && this.pauseNavCool <= 0) {
        this.pauseNavCool = 0.2;
        if (d === 'left') this.pauseTab = this.pauseTab === 'items' ? 'party' : this.pauseTab === 'quest' ? 'items' : 'quest';
        if (d === 'right') this.pauseTab = this.pauseTab === 'items' ? 'quest' : this.pauseTab === 'quest' ? 'party' : 'items';
        if (d === 'up') this.pauseCursor = Math.max(0, this.pauseCursor - 1);
        if (d === 'down') this.pauseCursor++;
      }
      return;
    }

    if (this.mode === 'battle' && this.battle) {
      this.audio.playMusic('battle');
      battleUpdate(this.battle, dt, {
        playerHp: this.hp,
        wantAttack: this.input.consumeAction(),
        wantItem: this.input.consumeMenu(),
        onUseItem: () => {
          if ((this.inv.soda ?? 0) > 0 && this.hp < this.maxHp) {
            this.inv.soda!--;
            if (this.inv.soda <= 0) delete this.inv.soda;
            this.hp = Math.min(this.maxHp, this.hp + (ITEMS.soda.heal ?? 8));
            this.audio.sfx('heal');
            return true;
          }
          this.audio.sfx('deny');
          return false;
        },
        onPlayerHit: (dmg) => {
          this.hp = Math.max(0, this.hp - dmg);
          this.audio.sfx('hurt');
        },
      });
      if (this.battle.playerAttack && !this.hitLatch) {
        this.audio.sfx('hit');
        this.hitLatch = true;
      }
      if (!this.battle.playerAttack) this.hitLatch = false;
      const end = checkBattleEnd(this.battle, this.hp);
      if (end === 'win') {
        this.audio.sfx('win');
        this.flags.boss_dead = true;
        this.inv.chip = (this.inv.chip ?? 0) + 1;
        this.battle = null;
        this.mode = 'play';
        this.audio.playMusic('dungeon');
        this.showToast('Got Signal Chip!');
        void this.persist();
      } else if (end === 'lose' || this.hp <= 0) {
        this.hp = Math.max(1, Math.floor(this.maxHp * 0.5));
        this.battle = null;
        this.loadMap('town', 'default');
        this.mode = 'play';
        this.audio.playMusic('town');
        this.showToast('Respawned at Neon Plaza');
        void this.persist();
      }
      return;
    }

    // play
    if (this.input.consumeMenu()) {
      this.mode = 'pause';
      this.pauseCursor = 0;
      this.pauseTab = 'items';
      this.input.setStick(0, 0); // stop accidental tab cycling from held d-pad
      this.audio.sfx('menu');
      return;
    }

    this.updatePlayer(dt);
    if (this.companion) companionFollow(this.companion, this.player.tx, this.player.ty, this.player.facing, dt);

    if (!this.player.moving && this.input.consumeAction()) {
      this.tryInteract();
    }

    if (
      this.map.bossTrigger &&
      !this.flags.boss_dead &&
      this.player.tx === this.map.bossTrigger.x &&
      this.player.ty === this.map.bossTrigger.y &&
      !this.player.moving
    ) {
      this.battle = startBossBattle();
      this.mode = 'battle';
      this.audio.sfx('confirm');
    }
  }

  private updatePlayer(dt: number) {
    this.player.anim += dt;
    if (this.player.moving) {
      this.player.t += dt / MOVE_DUR;
      const u = Math.min(1, this.player.t);
      const e = u * u * (3 - 2 * u);
      this.player.x = this.player.fromX + (this.player.toX - this.player.fromX) * e;
      this.player.y = this.player.fromY + (this.player.toY - this.player.fromY) * e;
      this.player.frame = u < 0.5 ? 1 : 2;
      if (u >= 1) {
        this.player.moving = false;
        this.player.tx = Math.round(this.player.toX / TILE);
        this.player.ty = Math.round(this.player.toY / TILE);
        this.player.x = this.player.tx * TILE;
        this.player.y = this.player.ty * TILE;
        this.player.frame = 0;
        this.audio.sfx('step');
        this.stepDusts.push({ x: this.player.x, y: this.player.y, age: 0 });
        this.afterStep();
      }
      return;
    }
    // idle breath frame
    this.player.frame = Math.sin(this.player.anim * 3) > 0 ? 0 : 1;
    const dir = this.input.moveDir();
    if (!dir) return;
    this.player.facing = dir;
    const n = DIRS[dir];
    const nx = this.player.tx + n.x;
    const ny = this.player.ty + n.y;
    if (this.blocked(nx, ny)) return;
    this.player.moving = true;
    this.player.t = 0;
    this.player.fromX = this.player.x;
    this.player.fromY = this.player.y;
    this.player.toX = nx * TILE;
    this.player.toY = ny * TILE;
  }

  private startWarp(toMap: string, toSpawn: string) {
    this.pendingWarp = { toMap, toSpawn };
    this.transition = 0.001;
    this.transitionKind = 'wipe';
    this.audio.sfx('wipe');
  }

  private afterStep() {
    if (this.warpCooldown > 0) return;
    for (const p of this.map.pickups) {
      if (p.x === this.player.tx && p.y === this.player.ty && !this.flags[p.onceFlag]) {
        this.flags[p.onceFlag] = true;
        this.inv[p.item] = (this.inv[p.item] ?? 0) + p.qty;
        this.audio.sfx('pickup');
        const def = ITEMS[p.item];
        this.showToast(`Got ${def?.name ?? p.item}`);
        void this.persist();
      }
    }
    for (const w of this.map.warps) {
      if (w.x !== this.player.tx || w.y !== this.player.ty) continue;
      if (w.requireItem && !(this.inv[w.requireItem] > 0)) {
        this.showToast(w.denyText ?? 'Locked');
        this.audio.sfx('deny');
        const back = DIRS[this.player.facing];
        this.player.tx -= back.x;
        this.player.ty -= back.y;
        this.player.x = this.player.tx * TILE;
        this.player.y = this.player.ty * TILE;
        return;
      }
      if (w.requireFlag && !this.flags[w.requireFlag]) {
        this.showToast(w.denyText ?? 'Not yet');
        return;
      }
      this.startWarp(w.toMap, w.toSpawn);
      return;
    }
  }

  private tryInteract() {
    const n = DIRS[this.player.facing];
    const tx = this.player.tx + n.x;
    const ty = this.player.ty + n.y;
    if (this.companion && this.companion.tx === tx && this.companion.ty === ty) {
      this.dialogue = {
        name: 'Beep',
        portrait: 'companion',
        lines: this.flags.main_done
          ? ['Beep: Arcade feed is yellow-hot. We did it.']
          : ['Beep: Mira has the keycard. Vex wants a token. Depths are south.'],
        i: 0,
      };
      this.mode = 'dialogue';
      return;
    }
    const npc = NPCS.find((x) => x.mapId === this.map.id && x.tx === tx && x.ty === ty);
    if (!npc) return;
    const mut = npc.onTalk?.(this.flags, this.inv);
    if (mut?.flags) this.flags = mut.flags;
    if (mut?.inv) this.inv = mut.inv;
    if (mut?.heal) this.hp = Math.min(this.maxHp, this.hp + mut.heal);
    if (mut?.sfx) this.audio.sfx(mut.sfx as 'confirm');
    const lines = npc.lines(this.flags, this.inv);
    this.dialogue = { name: npc.name, portrait: npc.portrait, lines, i: 0 };
    this.mode = 'dialogue';
    this.audio.sfx('talk');
    this.detectQuestComplete();
    void this.persist();
  }

  private showToast(msg: string) {
    this.toast = msg;
    this.toastT = 2;
  }

  private async persist() {
    const blob: SaveBlob = {
      version: 1,
      timestamp: Date.now(),
      mapId: this.map.id,
      player: {
        tx: this.player.tx,
        ty: this.player.ty,
        hp: this.hp,
        maxHp: this.maxHp,
        facing: this.player.facing,
      },
      inventory: Object.entries(this.inv)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({ id, qty })),
      questFlags: { ...this.flags },
      companionUnlocked: true,
      gold: this.gold,
    };
    try {
      await saveGame(SAVE_SLOT, blob);
      this.hasSave = true;
    } catch {
      /* ignore */
    }
  }

  private draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    if (this.mode === 'title') {
      drawTitleCard(ctx, w, h, this.time, this.hasSave);
      if (this.hasSave) {
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.titleChoice === 'continue' ? '#FEDD04' : '#666';
        ctx.fillText(this.titleChoice === 'continue' ? '► CONTINUE' : '  CONTINUE', w / 2 - 70, h * 0.52);
        ctx.fillStyle = this.titleChoice === 'new' ? '#FEDD04' : '#666';
        ctx.fillText(this.titleChoice === 'new' ? '► NEW GAME' : '  NEW GAME', w / 2 + 70, h * 0.52);
      }
      return;
    }

    if (this.mode === 'battle' && this.battle) {
      drawBattleScene(ctx, w, h, this.battle, this.sprites, this.battle.playerHurt, this.battle.playerAttack);
      drawBossHud(ctx, w, this.battle);
      drawPartyHp(ctx, this.hp, this.maxHp, this.beepHp, this.beepMax, true);
      return;
    }

    const scale = this.fitScale(w, h);
    const viewW = w / scale;
    const viewH = h / scale;
    const camX = this.player.x + TILE / 2 - viewW / 2;
    const camY = this.player.y + TILE / 2 - viewH / 2;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    for (let y = 0; y < this.map.h; y++) {
      for (let x = 0; x < this.map.w; x++) {
        const ch = this.map.ground[y][x];
        this.sprites.drawTile(ctx, ch === 'C' || ch === '^' || ch === 'g' ? (ch === 'g' ? 'g' : '.') : ch, x * TILE, y * TILE, 1);
        if (ch === 'C' || ch === '^') this.sprites.drawTile(ctx, ch, x * TILE, y * TILE, 1);
        if (ch === 'g') {
          this.sprites.drawTile(ctx, 'g', x * TILE, y * TILE, 1);
          // extra gate shimmer
          const shimmer = 0.35 + Math.sin(this.time * 5) * 0.25;
          ctx.fillStyle = `rgba(254,221,4,${shimmer * 0.35})`;
          ctx.fillRect(x * TILE + 6, y * TILE + 6, 20, 20);
        }
      }
    }

    for (const p of this.map.pickups) {
      if (this.flags[p.onceFlag]) continue;
      const bob = Math.sin(this.time * 6) * 2;
      ctx.fillStyle = '#FEDD04';
      ctx.fillRect(p.x * TILE + 12, p.y * TILE + 12 + bob, 8, 8);
    }

    // Waypoint ping under actors
    const wp = questWaypoint(this.flags, this.inv, this.map.id);
    if (wp && wp.mapId === this.map.id) {
      drawWaypointPing(ctx, wp.x, wp.y, this.time);
    }

    for (const n of NPCS) {
      if (n.mapId !== this.map.id) continue;
      const breath = Math.floor(this.time * 2.2 + n.tx) % 3;
      this.sprites.drawActor(ctx, n.portrait, n.facing, breath, n.tx * TILE, n.ty * TILE, 1, 'idle');
      drawNpcNameplate(ctx, n.name, n.tx * TILE + 16, n.ty * TILE);
      if (n.questId) {
        const m = questMarker(this.flags, n.questId, this.inv);
        if (m) drawQuestMarker(ctx, m, n.tx * TILE + 16, n.ty * TILE - 10, this.time);
      }
    }

    if (this.companion) {
      this.sprites.drawActor(
        ctx,
        'companion',
        this.companion.facing,
        Math.floor(this.companion.frame) % 3,
        this.companion.x,
        this.companion.y,
        1,
      );
    }

    for (const d of this.stepDusts) drawStepDust(ctx, d.x, d.y, d.age);

    this.sprites.drawActor(
      ctx,
      'hero',
      this.player.facing,
      this.player.frame,
      this.player.x,
      this.player.y,
      1,
      this.player.moving ? 'walk' : 'idle',
    );

    ctx.restore();

    drawPartyHp(ctx, this.hp, this.maxHp, this.beepHp, this.beepMax, true);
    if (this.nameplateT > 0) drawNameplate(ctx, this.nameplate, w / 2, 56);
    if (this.toastT > 0) drawToast(ctx, w, this.toast);

    // Compass / next-step
    if (wp && this.mode === 'play') {
      const onMap = wp.mapId === this.map.id;
      const dx = onMap ? wp.x * TILE + 16 - (this.player.x + 16) : 0;
      const dy = onMap ? wp.y * TILE + 16 - (this.player.y + 16) : -1;
      drawQuestCompass(ctx, w, wp.label, dx, dy, onMap);
    }

    if (this.mode === 'dialogue' && this.dialogue) {
      const line = this.dialogue.lines[this.dialogue.i] ?? '';
      drawDialogue(ctx, w, h, this.dialogue.name, line, this.sprites, this.dialogue.portrait);
    }

    if (this.mode === 'pause') {
      const items = Object.entries(this.inv)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({ name: ITEMS[id]?.name ?? id, qty }));
      const quests = QUESTS.map((q) => {
        let status = 'locked';
        if (this.flags[q.doneFlag]) status = 'done';
        else if (this.flags[`quest_${q.id}_active`] || (q.kind === 'main' && this.flags.tutorial_done))
          status = 'active';
        else if (!q.requireFlag || this.flags[q.requireFlag]) status = 'available';
        return { title: q.title, blurb: q.blurb, status };
      });
      const hit = drawPause(
        ctx,
        w,
        h,
        this.pauseTab,
        items,
        quests,
        this.hp,
        this.maxHp,
        this.beepHp,
        this.beepMax,
        this.pauseCursor,
      );
      this.pauseTabHits = hit.tabs;
    }

    if (this.questJuice > 0) drawQuestCompleteJuice(ctx, w, h, this.questJuice);
    if (this.transition > 0) drawMapTransition(ctx, w, h, this.transition, this.transitionKind);

    ctx.fillStyle = 'rgba(254,221,4,0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Signal Lost · PG4k', w - 12, h - 10);
  }

  private fitScale(w: number, h: number): number {
    const short = Math.min(w, h);
    const want = short / (TILE * 10);
    return Math.max(1.5, Math.min(3.5, want));
  }
}

export const MAP_COUNT = Object.keys(MAPS).length;
void SCALE;
