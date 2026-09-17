/**
 * Yellow/black UI — title, dialogue, HP strip, pause, boss bar, quest markers.
 * Phone-readable at 32×32 tile scale. No Space Junk sci-fi leftovers.
 */
import type { SpriteKit } from '../engine/sprites';
import type { BattleState } from '../combat/battle';
import { TILE } from '../engine/types';

const Y = '#FEDD04';
const INK = '#121212';
const CREAM = '#FFF8D0';

export function drawTitleCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pulse: number,
  hasSave: boolean,
) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  // yellow bars
  ctx.fillStyle = Y;
  ctx.fillRect(0, 0, w, 12);
  ctx.fillRect(0, h - 12, w, 12);
  ctx.fillStyle = Y;
  ctx.font = `bold ${Math.floor(w * 0.08)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('SIGNAL LOST', w / 2, h * 0.32);
  ctx.font = `${Math.floor(w * 0.035)}px monospace`;
  ctx.fillStyle = CREAM;
  ctx.fillText('reclaim the arcade', w / 2, h * 0.4);
  ctx.fillStyle = Y;
  const blink = Math.sin(pulse * 4) > 0;
  if (blink) ctx.fillText(hasSave ? 'ACTION — CONTINUE / NEW' : 'PRESS ACTION TO START', w / 2, h * 0.58);
  ctx.fillStyle = '#888';
  ctx.font = `${Math.floor(w * 0.028)}px monospace`;
  ctx.fillText('Pixel Gamer 4k  ·  opening slice', w / 2, h * 0.72);
  ctx.fillText('WASD move · E/Z Action · I Pause', w / 2, h * 0.78);
}

export function drawNameplate(ctx: CanvasRenderingContext2D, name: string, x: number, y: number) {
  ctx.font = 'bold 12px monospace';
  const tw = ctx.measureText(name).width;
  ctx.fillStyle = 'rgba(18,18,18,0.85)';
  ctx.fillRect(x - tw / 2 - 6, y - 14, tw + 12, 18);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - tw / 2 - 6, y - 14, tw + 12, 18);
  ctx.fillStyle = Y;
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y);
}

export function drawQuestMarker(ctx: CanvasRenderingContext2D, kind: '!' | '?', x: number, y: number, t: number) {
  const bob = Math.sin(t * 5) * 3;
  ctx.fillStyle = Y;
  ctx.beginPath();
  ctx.arc(x, y + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind, x, y + bob + 1);
  ctx.textBaseline = 'alphabetic';
}

export function drawDialogue(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  name: string,
  text: string,
  sprites: SpriteKit,
  portraitSheet: string,
) {
  const boxH = Math.min(140, h * 0.28);
  const boxY = h - boxH - 10;
  const pad = 12;
  ctx.fillStyle = INK;
  ctx.fillRect(pad, boxY, w - pad * 2, boxH);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 3;
  ctx.strokeRect(pad, boxY, w - pad * 2, boxH);
  // portrait slot
  const ps = 64;
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(pad + 8, boxY + 8, ps, ps);
  ctx.strokeStyle = Y;
  ctx.strokeRect(pad + 8, boxY + 8, ps, ps);
  const por = sprites.portrait(portraitSheet);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(por, pad + 8, boxY + 8, ps, ps);
  // name
  ctx.fillStyle = Y;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(name, pad + ps + 20, boxY + 24);
  // text
  ctx.fillStyle = CREAM;
  ctx.font = '13px monospace';
  wrapText(ctx, text, pad + ps + 20, boxY + 48, w - pad * 2 - ps - 36, 16);
  ctx.fillStyle = Y;
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('▼ Action', w - pad - 12, boxY + boxH - 10);
  ctx.textAlign = 'left';
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawPartyHp(
  ctx: CanvasRenderingContext2D,
  hp: number,
  maxHp: number,
  companion = true,
) {
  const x = 10;
  const y = 10;
  ctx.fillStyle = 'rgba(18,18,18,0.8)';
  ctx.fillRect(x, y, 150, companion ? 48 : 32);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 150, companion ? 48 : 32);
  ctx.fillStyle = Y;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('NOVA', x + 8, y + 14);
  drawHpBar(ctx, x + 48, y + 6, 90, 10, hp, maxHp);
  if (companion) {
    ctx.fillText('BEEP', x + 8, y + 34);
    drawHpBar(ctx, x + 48, y + 26, 90, 10, maxHp, maxHp); // companion cosmetic full
  }
}

function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  max: number,
) {
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);
  const pct = Math.max(0, hp / max);
  ctx.fillStyle = pct > 0.3 ? Y : '#E23B3B';
  ctx.fillRect(x, y, w * pct, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

export function drawPause(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tab: 'items' | 'quest' | 'party',
  items: { name: string; qty: number }[],
  quests: { title: string; blurb: string; status: string }[],
  hp: number,
  maxHp: number,
  cursor: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);
  const bw = Math.min(360, w - 24);
  const bh = Math.min(320, h - 40);
  const bx = (w - bw) / 2;
  const by = (h - bh) / 2;
  ctx.fillStyle = INK;
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, bh);
  const tabs: ('items' | 'quest' | 'party')[] = ['items', 'quest', 'party'];
  tabs.forEach((t, i) => {
    const tx = bx + 12 + i * 90;
    ctx.fillStyle = t === tab ? Y : '#333';
    ctx.fillRect(tx, by + 10, 80, 24);
    ctx.fillStyle = t === tab ? INK : Y;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.toUpperCase(), tx + 40, by + 27);
  });
  ctx.textAlign = 'left';
  ctx.fillStyle = CREAM;
  ctx.font = '13px monospace';
  let y = by + 56;
  if (tab === 'items') {
    if (!items.length) ctx.fillText('(empty)', bx + 20, y);
    items.forEach((it, i) => {
      ctx.fillStyle = i === cursor ? Y : CREAM;
      ctx.fillText(`${i === cursor ? '► ' : '  '}${it.name} ×${it.qty}`, bx + 16, y);
      y += 20;
    });
    ctx.fillStyle = '#888';
    ctx.fillText('Action use soda · Esc close', bx + 16, by + bh - 16);
  } else if (tab === 'quest') {
    quests.forEach((q) => {
      ctx.fillStyle = Y;
      ctx.fillText(`[${q.status}] ${q.title}`, bx + 16, y);
      y += 18;
      ctx.fillStyle = CREAM;
      wrapText(ctx, q.blurb, bx + 16, y, bw - 32, 15);
      y += 40;
    });
  } else {
    ctx.fillStyle = Y;
    ctx.fillText('NOVA — punch first, ask static later', bx + 16, y);
    y += 24;
    drawHpBar(ctx, bx + 16, y, bw - 32, 14, hp, maxHp);
    y += 36;
    ctx.fillStyle = CREAM;
    ctx.fillText(`HP ${hp}/${maxHp}`, bx + 16, y);
    y += 24;
    ctx.fillText('BEEP — companion (follows)', bx + 16, y);
  }
}

export function drawBossHud(ctx: CanvasRenderingContext2D, w: number, battle: BattleState) {
  const bw = Math.min(420, w - 40);
  const bx = (w - bw) / 2;
  const by = 16;
  ctx.fillStyle = 'rgba(18,18,18,0.9)';
  ctx.fillRect(bx, by, bw, 52);
  ctx.strokeStyle = battle.phase === 2 ? '#E23B3B' : Y;
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, bw, 52);
  ctx.fillStyle = Y;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${battle.enemyName}  ·  PHASE ${battle.phase}${battle.flash > 0 ? '  ⚡' : ''}`,
    w / 2,
    by + 18,
  );
  // chunky HP
  const hx = bx + 12;
  const hy = by + 28;
  const hw = bw - 24;
  ctx.fillStyle = '#222';
  ctx.fillRect(hx, hy, hw, 16);
  const pct = battle.enemyHp / battle.enemyMaxHp;
  ctx.fillStyle = battle.phase === 2 ? '#E23B3B' : Y;
  ctx.fillRect(hx, hy, hw * pct, 16);
  ctx.strokeStyle = INK;
  ctx.strokeRect(hx, hy, hw, 16);
  if (battle.flash > 0) {
    ctx.fillStyle = `rgba(254,221,4,${Math.min(0.55, battle.flash)})`;
    ctx.fillRect(0, 0, w, 8000);
  }
}

export function drawBattleScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  battle: BattleState,
  sprites: SpriteKit,
  playerHurt: boolean,
  playerAttack: boolean,
) {
  ctx.fillStyle = '#140A12';
  ctx.fillRect(0, 0, w, h);
  // floor stripe
  ctx.fillStyle = Y;
  ctx.fillRect(0, h * 0.62, w, 8);
  ctx.fillStyle = INK;
  ctx.fillRect(0, h * 0.62 + 8, w, h);
  const scale = Math.max(2, Math.floor(Math.min(w, h) / 200));
  const bossX = w / 2 - TILE * scale * 0.75;
  const bossY = h * 0.22;
  sprites.drawBoss(ctx, battle.phase, Math.floor(battle.enemyFrame), bossX, bossY, scale);
  const heroX = w * 0.28 - TILE * scale * 0.5;
  const heroY = h * 0.48;
  sprites.drawActor(
    ctx,
    'hero',
    'up',
    0,
    heroX,
    heroY,
    scale,
    playerAttack ? 'attack' : playerHurt ? 'hurt' : 'walk',
  );
  // log box
  ctx.fillStyle = INK;
  ctx.fillRect(16, h - 90, w - 32, 70);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, h - 90, w - 32, 70);
  ctx.fillStyle = CREAM;
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(battle.log, 28, h - 50);
}

export function drawToast(ctx: CanvasRenderingContext2D, w: number, text: string) {
  ctx.font = 'bold 13px monospace';
  const tw = ctx.measureText(text).width;
  const x = (w - tw) / 2 - 12;
  ctx.fillStyle = INK;
  ctx.fillRect(x, 70, tw + 24, 28);
  ctx.strokeStyle = Y;
  ctx.strokeRect(x, 70, tw + 24, 28);
  ctx.fillStyle = Y;
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, 89);
}

void TILE;
