/**
 * Procedural SpriteKit — original pixel art (no ripped sheets).
 * Frames: 4-dir walk/idle/talk for hero+companion; NPC idles; combat hurt/attack; boss 2-phase.
 */
import { TILE } from './types';
import type { Dir } from './types';

export type SheetName =
  | 'hero'
  | 'companion'
  | 'npc_vex'
  | 'npc_mira'
  | 'npc_static'
  | 'npc_pip'
  | 'boss'
  | 'tiles'
  | 'ui';

type FrameGrid = HTMLCanvasElement;

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Tiny palette — PG4k yellow/black + accents. */
const P = {
  ink: '#121212',
  yellow: '#FEDD04',
  yellowDim: '#C9B003',
  cream: '#FFF6A8',
  white: '#F5F5F5',
  gray: '#3A3A3C',
  gray2: '#6E6E72',
  red: '#E23B3B',
  pink: '#FF6B8A',
  cyan: '#3DE0FF',
  purple: '#7B5CFF',
  floor: '#2A2430',
  wall: '#1A1218',
  road: '#3D3545',
  neon: '#FEDD04',
  dungeon: '#1C2230',
  bossPad: '#3A1020',
  green: '#3DDC84',
};

function drawChar(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  opts: {
    body: string;
    accent: string;
    hair: string;
    dir: Dir;
    frame: number; // 0 idle, 1-2 walk, 3 talk
    hurt?: boolean;
    attack?: boolean;
    small?: boolean;
  },
) {
  const s = opts.small ? 0.7 : 1;
  const cx = ox + 16;
  const bob = opts.frame === 1 ? -1 : opts.frame === 2 ? 1 : 0;
  const leg = opts.frame === 1 ? 2 : opts.frame === 2 ? -2 : 0;
  if (opts.hurt) {
    px(ctx, ox + 6, oy + 8, 20, 20, P.red);
  }
  // shadow
  px(ctx, cx - 8, oy + 28, 16, 3, 'rgba(0,0,0,0.35)');

  const bodyY = oy + 12 + bob;
  // legs
  px(ctx, cx - 6 + (opts.dir === 'right' ? 1 : 0), bodyY + 12, 4, 8, P.ink);
  px(ctx, cx + 2 + leg, bodyY + 12, 4, 8, P.ink);
  // body
  const bw = opts.attack ? 14 : 12;
  px(ctx, cx - bw / 2, bodyY, bw, 12, opts.body);
  px(ctx, cx - bw / 2 + 2, bodyY + 2, bw - 4, 4, opts.accent);
  // head
  px(ctx, cx - 6, bodyY - 10, 12, 10, P.cream);
  px(ctx, cx - 6, bodyY - 12, 12, 4, opts.hair);
  // eyes by dir
  if (opts.dir === 'down' || opts.frame === 3) {
    px(ctx, cx - 3, bodyY - 7, 2, 2, P.ink);
    px(ctx, cx + 1, bodyY - 7, 2, 2, P.ink);
    if (opts.frame === 3) px(ctx, cx - 2, bodyY - 3, 4, 2, P.ink); // talk mouth
  } else if (opts.dir === 'up') {
    px(ctx, cx - 4, bodyY - 10, 8, 3, opts.hair);
  } else if (opts.dir === 'left') {
    px(ctx, cx - 4, bodyY - 7, 2, 2, P.ink);
  } else {
    px(ctx, cx + 2, bodyY - 7, 2, 2, P.ink);
  }
  // attack fist
  if (opts.attack) {
    const fx = opts.dir === 'left' ? cx - 14 : opts.dir === 'right' ? cx + 8 : cx - 3;
    const fy = opts.dir === 'up' ? bodyY - 14 : opts.dir === 'down' ? bodyY + 10 : bodyY + 2;
    px(ctx, fx, fy, 6, 6, P.yellow);
    px(ctx, fx + 1, fy + 1, 4, 4, P.ink);
  }
  void s;
}

function drawBeep(ctx: CanvasRenderingContext2D, ox: number, oy: number, dir: Dir, frame: number, talk = false) {
  const bob = Math.sin(frame) * 2;
  px(ctx, ox + 10, oy + 22 + bob, 12, 4, 'rgba(0,0,0,0.3)');
  // body orb
  px(ctx, ox + 8, oy + 8 + bob, 16, 16, P.yellow);
  px(ctx, ox + 10, oy + 10 + bob, 12, 12, P.cream);
  px(ctx, ox + 12, oy + 12 + bob, 4, 4, P.ink);
  px(ctx, ox + 18, oy + 12 + bob, 4, 4, P.ink);
  if (talk) px(ctx, ox + 14, oy + 18 + bob, 4, 2, P.ink);
  // antenna
  px(ctx, ox + 15, oy + 2 + bob, 2, 6, P.ink);
  px(ctx, ox + 13, oy + bob, 6, 4, P.cyan);
  void dir;
}

function drawBoss(ctx: CanvasRenderingContext2D, ox: number, oy: number, phase: 1 | 2, frame: number, intro = false) {
  const flash = phase === 2 && frame % 2 === 0;
  const body = flash ? P.yellow : phase === 2 ? P.purple : P.gray;
  const accent = phase === 2 ? P.red : P.cyan;
  const scale = intro ? 0.5 + frame * 0.1 : 1;
  void scale;
  px(ctx, ox + 4, oy + 26, 24, 4, 'rgba(0,0,0,0.4)');
  // cabinet body
  px(ctx, ox + 4, oy + 4, 24, 24, body);
  px(ctx, ox + 6, oy + 6, 20, 12, P.ink);
  px(ctx, ox + 8, oy + 8, 16, 8, accent);
  // eyes
  px(ctx, ox + 10, oy + 10, 4, 4, flash ? P.ink : P.yellow);
  px(ctx, ox + 18, oy + 10, 4, 4, flash ? P.ink : P.yellow);
  // mouth / glitch
  if (phase === 2) {
    px(ctx, ox + 10, oy + 20, 12, 4, P.red);
    px(ctx, ox + 2, oy + 12, 4, 4, P.yellow);
    px(ctx, ox + 26, oy + 12, 4, 4, P.yellow);
  } else {
    px(ctx, ox + 12, oy + 20, 8, 3, P.gray2);
  }
}

function buildTiles(): FrameGrid {
  const c = canvas(TILE * 10, TILE);
  const ctx = c.getContext('2d')!;
  const kinds: { i: number; draw: () => void }[] = [
    {
      i: 0,
      draw: () => {
        // floor .
        px(ctx, 0, 0, 32, 32, P.floor);
        px(ctx, 4, 4, 2, 2, '#322838');
        px(ctx, 20, 18, 2, 2, '#322838');
      },
    },
    {
      i: 1,
      draw: () => {
        // wall #
        px(ctx, 32, 0, 32, 32, P.wall);
        px(ctx, 32, 0, 32, 4, P.ink);
        px(ctx, 34, 8, 28, 2, '#2A1C24');
        px(ctx, 34, 16, 28, 2, '#2A1C24');
        px(ctx, 34, 24, 28, 2, '#2A1C24');
      },
    },
    {
      i: 2,
      draw: () => {
        // road =
        px(ctx, 64, 0, 32, 32, P.road);
        px(ctx, 64, 14, 32, 4, P.yellowDim);
      },
    },
    {
      i: 3,
      draw: () => {
        // rug ~
        px(ctx, 96, 0, 32, 32, P.floor);
        px(ctx, 100, 4, 24, 24, '#4A2030');
        px(ctx, 104, 8, 16, 16, P.yellow);
        px(ctx, 108, 12, 8, 8, P.ink);
      },
    },
    {
      i: 4,
      draw: () => {
        // crate C
        px(ctx, 128, 0, 32, 32, P.floor);
        px(ctx, 132, 8, 24, 20, '#6B4A2A');
        px(ctx, 132, 8, 24, 4, '#8A6238');
        px(ctx, 142, 14, 4, 10, P.ink);
      },
    },
    {
      i: 5,
      draw: () => {
        // neon ^
        px(ctx, 160, 0, 32, 32, P.floor);
        px(ctx, 170, 4, 12, 24, P.ink);
        px(ctx, 172, 6, 8, 8, P.yellow);
        px(ctx, 174, 16, 4, 10, P.cyan);
      },
    },
    {
      i: 6,
      draw: () => {
        // dungeon d
        px(ctx, 192, 0, 32, 32, P.dungeon);
        px(ctx, 196, 6, 2, 2, '#2A3348');
        px(ctx, 210, 20, 2, 2, '#2A3348');
      },
    },
    {
      i: 7,
      draw: () => {
        // boss pad b
        px(ctx, 224, 0, 32, 32, P.bossPad);
        px(ctx, 228, 4, 24, 24, '#5A1830');
        px(ctx, 234, 10, 12, 12, P.yellow);
        px(ctx, 238, 14, 4, 4, P.ink);
      },
    },
    {
      i: 8,
      draw: () => {
        // gate g
        px(ctx, 256, 0, 32, 32, P.road);
        px(ctx, 260, 4, 24, 24, P.ink);
        px(ctx, 264, 8, 16, 16, P.yellow);
        px(ctx, 268, 12, 8, 8, P.cyan);
      },
    },
    {
      i: 9,
      draw: () => {
        // void / unused
        px(ctx, 288, 0, 32, 32, '#0A080C');
      },
    },
  ];
  for (const k of kinds) k.draw();
  return c;
}

const DIR_ORDER: Dir[] = ['down', 'left', 'right', 'up'];

export class SpriteKit {
  sheets: Record<string, FrameGrid> = {};
  ready = false;

  build() {
    // tiles
    this.sheets.tiles = buildTiles();

    // hero: 4 dirs × 4 frames (idle, walk1, walk2, talk) + hurt + attack per dir
    const hero = canvas(TILE * 6, TILE * 4);
    const hctx = hero.getContext('2d')!;
    DIR_ORDER.forEach((dir, row) => {
      for (let f = 0; f < 4; f++) {
        drawChar(hctx, f * TILE, row * TILE, {
          body: P.ink,
          accent: P.yellow,
          hair: '#2A2A2A',
          dir,
          frame: f,
        });
      }
      drawChar(hctx, 4 * TILE, row * TILE, {
        body: P.ink,
        accent: P.yellow,
        hair: '#2A2A2A',
        dir,
        frame: 0,
        hurt: true,
      });
      drawChar(hctx, 5 * TILE, row * TILE, {
        body: P.ink,
        accent: P.yellow,
        hair: '#2A2A2A',
        dir,
        frame: 0,
        attack: true,
      });
    });
    this.sheets.hero = hero;

    // companion Beep
    const comp = canvas(TILE * 4, TILE * 4);
    const cctx = comp.getContext('2d')!;
    DIR_ORDER.forEach((dir, row) => {
      for (let f = 0; f < 3; f++) drawBeep(cctx, f * TILE, row * TILE, dir, f);
      drawBeep(cctx, 3 * TILE, row * TILE, dir, 0, true);
    });
    this.sheets.companion = comp;

    // NPCs
    const npcPalettes: Record<string, { body: string; accent: string; hair: string }> = {
      npc_vex: { body: P.gray, accent: P.yellow, hair: '#5A4030' },
      npc_mira: { body: P.cyan, accent: P.ink, hair: '#1A3040' },
      npc_static: { body: P.gray2, accent: P.red, hair: '#202020' },
      npc_pip: { body: P.pink, accent: P.yellow, hair: '#804020' },
    };
    for (const [id, pal] of Object.entries(npcPalettes)) {
      const sheet = canvas(TILE * 2, TILE * 4);
      const ctx = sheet.getContext('2d')!;
      DIR_ORDER.forEach((dir, row) => {
        drawChar(ctx, 0, row * TILE, { ...pal, dir, frame: 0 });
        drawChar(ctx, TILE, row * TILE, { ...pal, dir, frame: 3 }); // talk pose
      });
      this.sheets[id] = sheet;
    }

    // boss: phase1, phase2, intro, outro frames
    const boss = canvas(TILE * 4, TILE * 2);
    const bctx = boss.getContext('2d')!;
    for (let f = 0; f < 4; f++) {
      drawBoss(bctx, f * TILE, 0, 1, f);
      drawBoss(bctx, f * TILE, TILE, 2, f);
    }
    this.sheets.boss = boss;

    this.ready = true;
  }

  tileIndex(ch: string): number {
    switch (ch) {
      case '.':
        return 0;
      case '#':
        return 1;
      case '=':
        return 2;
      case '~':
        return 3;
      case 'C':
        return 4;
      case '^':
        return 5;
      case 'd':
        return 6;
      case 'b':
        return 7;
      case 'g':
        return 8;
      default:
        return 0;
    }
  }

  drawTile(ctx: CanvasRenderingContext2D, ch: string, dx: number, dy: number, scale: number) {
    const i = this.tileIndex(ch);
    ctx.drawImage(this.sheets.tiles, i * TILE, 0, TILE, TILE, dx, dy, TILE * scale, TILE * scale);
  }

  drawActor(
    ctx: CanvasRenderingContext2D,
    sheet: string,
    dir: Dir,
    frame: number,
    dx: number,
    dy: number,
    scale: number,
    pose: 'walk' | 'talk' | 'hurt' | 'attack' = 'walk',
  ) {
    const img = this.sheets[sheet];
    if (!img) return;
    const row = DIR_ORDER.indexOf(dir);
    let col = frame % 3;
    if (pose === 'talk') col = sheet.startsWith('npc') ? 1 : 3;
    if (pose === 'hurt') col = 4;
    if (pose === 'attack') col = 5;
    if (sheet === 'companion') {
      col = pose === 'talk' ? 3 : frame % 3;
    }
    ctx.drawImage(img, col * TILE, row * TILE, TILE, TILE, dx, dy, TILE * scale, TILE * scale);
  }

  drawBoss(ctx: CanvasRenderingContext2D, phase: 1 | 2, frame: number, dx: number, dy: number, scale: number) {
    const img = this.sheets.boss;
    const row = phase === 1 ? 0 : 1;
    const col = frame % 4;
    ctx.drawImage(img, col * TILE, row * TILE, TILE, TILE, dx, dy, TILE * scale * 1.5, TILE * scale * 1.5);
  }

  portrait(sheet: string): HTMLCanvasElement {
    const c = canvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    const img = this.sheets[sheet] ?? this.sheets.hero;
    ctx.drawImage(img, 0, 0, TILE, TILE, 0, 0, TILE, TILE);
    return c;
  }
}
