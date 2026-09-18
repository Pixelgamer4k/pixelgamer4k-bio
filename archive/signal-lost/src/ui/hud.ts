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

/** Screen-space map banner (not NPC plates). */
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

/** World-space NPC name over head (call inside camera transform). */
export function drawNpcNameplate(ctx: CanvasRenderingContext2D, name: string, cx: number, topY: number) {
  ctx.save();
  ctx.font = 'bold 7px monospace';
  const short = name.length > 10 ? name.slice(0, 9) + '…' : name;
  const tw = ctx.measureText(short).width;
  const x = cx - tw / 2 - 3;
  const y = topY - 12;
  ctx.fillStyle = 'rgba(18,18,18,0.88)';
  ctx.fillRect(x, y, tw + 6, 10);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, tw + 6, 10);
  ctx.fillStyle = Y;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(short, x + 3, y + 5);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

export function drawQuestMarker(ctx: CanvasRenderingContext2D, kind: '!' | '?', x: number, y: number, t: number) {
  const bob = Math.sin(t * 5) * 3;
  ctx.fillStyle = kind === '?' ? '#3DE0FF' : Y;
  ctx.beginPath();
  ctx.arc(x, y + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(kind, x, y + bob + 1);
  ctx.textBaseline = 'alphabetic';
}

/** World ping on objective tile. */
export function drawWaypointPing(ctx: CanvasRenderingContext2D, tx: number, ty: number, t: number) {
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  const pulse = 10 + Math.sin(t * 4) * 4;
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(254,221,4,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 6, cy - 4);
  ctx.lineTo(cx - 6, cy - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Screen compass / next-step hint. */
export function drawQuestCompass(
  ctx: CanvasRenderingContext2D,
  w: number,
  label: string,
  dx: number,
  dy: number,
  onMap: boolean,
) {
  const boxW = Math.min(220, w - 20);
  const x = w - boxW - 10;
  const y = 10;
  ctx.fillStyle = 'rgba(18,18,18,0.85)';
  ctx.fillRect(x, y, boxW, 36);
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, boxW, 36);
  const ax = x + 18;
  const ay = y + 18;
  const ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(ax, ay);
  if (onMap) ctx.rotate(ang);
  ctx.fillStyle = Y;
  ctx.beginPath();
  if (onMap) {
    ctx.moveTo(10, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-6, 7);
  } else {
    ctx.moveTo(0, -8);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 8);
    ctx.lineTo(-8, 0);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 36, y + 22);
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
  const ps = 64;
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(pad + 8, boxY + 8, ps, ps);
  ctx.strokeStyle = Y;
  ctx.strokeRect(pad + 8, boxY + 8, ps, ps);
  const por = sprites.portrait(portraitSheet);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(por, pad + 8, boxY + 8, ps, ps);
  ctx.fillStyle = Y;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(name, pad + ps + 20, boxY + 24);
  ctx.fillStyle = CREAM;
  ctx.font = '13px monospace';
  wrapText(ctx, text, pad + ps + 20, boxY + 48, w - pad * 2 - ps - 36, 16);
  ctx.fillStyle = Y;
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('▼ Action', w - pad - 12, boxY + boxH - 10);
  ctx.textAlign = 'left';
}

/** Dialogue box top Y — touch UI must stay above this. */
export function dialogueTop(h: number): number {
  const boxH = Math.min(140, h * 0.28);
  return h - boxH - 10;
}

export function drawPartyHp(
  ctx: CanvasRenderingContext2D,
  hp: number,
  maxHp: number,
  beepHp: number,
  beepMax: number,
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
    drawHpBar(ctx, x + 48, y + 26, 90, 10, beepHp, beepMax);
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
  const pct = Math.max(0, Math.min(1, hp / max));
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
  beepHp: number,
  beepMax: number,
  cursor: number,
): { tabs: { id: 'items' | 'quest' | 'party'; x: number; y: number; w: number; h: number }[]; panel: { x: number; y: number; w: number; h: number } } {
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
  const tabHits: { id: 'items' | 'quest' | 'party'; x: number; y: number; w: number; h: number }[] = [];
  tabs.forEach((t, i) => {
    const tx = bx + 12 + i * 90;
    const ty = by + 10;
    ctx.fillStyle = t === tab ? Y : '#333';
    ctx.fillRect(tx, ty, 80, 24);
    ctx.fillStyle = t === tab ? INK : Y;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.toUpperCase(), tx + 40, ty + 17);
    tabHits.push({ id: t, x: tx, y: ty, w: 80, h: 24 });
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
    if (!quests.length) ctx.fillText('(no quests)', bx + 20, y);
    quests.forEach((q) => {
      ctx.fillStyle = Y;
      ctx.fillText(`[${q.status}] ${q.title}`, bx + 16, y);
      y += 18;
      ctx.fillStyle = CREAM;
      wrapText(ctx, q.blurb, bx + 16, y, bw - 32, 15);
      y += 40;
    });
  } else if (tab === 'party') {
    // Explicit party branch — never fall through to quests
    ctx.fillStyle = Y;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('NOVA', bx + 16, y);
    y += 18;
    ctx.fillStyle = CREAM;
    ctx.font = '12px monospace';
    ctx.fillText('Punch first, ask static later', bx + 16, y);
    y += 16;
    drawHpBar(ctx, bx + 16, y, bw - 32, 16, hp, maxHp);
    y += 28;
    ctx.fillStyle = CREAM;
    ctx.fillText(`HP ${hp}/${maxHp}   ATK punch   SPD quick`, bx + 16, y);
    y += 28;
    ctx.fillStyle = Y;
    ctx.font = 'bold 14px monospace';
    ctx.fillText('BEEP', bx + 16, y);
    y += 18;
    ctx.fillStyle = CREAM;
    ctx.font = '12px monospace';
    ctx.fillText('Companion · follows · signal buddy', bx + 16, y);
    y += 16;
    drawHpBar(ctx, bx + 16, y, bw - 32, 16, beepHp, beepMax);
    y += 28;
    ctx.fillStyle = CREAM;
    ctx.fillText(`HP ${beepHp}/${beepMax}   ROLE support`, bx + 16, y);
  }
  return { tabs: tabHits, panel: { x: bx, y: by, w: bw, h: bh } };
}

export function drawBossHud(ctx: CanvasRenderingContext2D, w: number, battle: BattleState) {
  const bw = Math.min(440, w - 24);
  const bx = (w - bw) / 2;
  const by = 12;
  const barH = 68;
  ctx.fillStyle = 'rgba(18,18,18,0.92)';
  ctx.fillRect(bx, by, bw, barH);
  ctx.strokeStyle = battle.phase === 2 ? '#E23B3B' : Y;
  ctx.lineWidth = 4;
  ctx.strokeRect(bx, by, bw, barH);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx + 4, by + 4, bw - 8, barH - 8);
  ctx.fillStyle = Y;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  const flashBang = battle.flash > 0.4 ? '  ✦ PHASE ✦' : battle.flash > 0 ? '  ⚡' : '';
  ctx.fillText(`${battle.enemyName}  ·  PHASE ${battle.phase}${flashBang}`, w / 2, by + 22);
  const hx = bx + 14;
  const hy = by + 34;
  const hw = bw - 28;
  const hh = 22;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(hx, hy, hw, hh);
  const pct = Math.max(0, battle.enemyHp / battle.enemyMaxHp);
  if (battle.phase === 2) {
    ctx.fillStyle = 'rgba(226,59,59,0.25)';
    ctx.fillRect(hx, hy, hw, hh);
  }
  ctx.fillStyle = battle.phase === 2 ? '#E23B3B' : Y;
  ctx.fillRect(hx, hy, hw * pct, hh);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    const nx = hx + (hw * i) / 4;
    ctx.beginPath();
    ctx.moveTo(nx, hy);
    ctx.lineTo(nx, hy + hh);
    ctx.stroke();
  }
  ctx.strokeStyle = Y;
  ctx.lineWidth = 2;
  ctx.strokeRect(hx, hy, hw, hh);
  if (battle.mode === 'enemy_telegraph') {
    ctx.fillStyle = 'rgba(226,59,59,0.35)';
    ctx.fillRect(bx, by + barH + 4, bw, 18);
    ctx.fillStyle = '#E23B3B';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`WIND-UP ${battle.pendingDmg} — heal or brace`, w / 2, by + barH + 17);
  }
  if (battle.flash > 0) {
    const a = Math.min(0.65, battle.flash);
    ctx.fillStyle = `rgba(254,221,4,${a})`;
    ctx.fillRect(0, 0, w, 8000);
    if (battle.flash > 0.6) {
      ctx.fillStyle = INK;
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PHASE CHANGE', w / 2, 120);
    }
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
  ctx.fillStyle = Y;
  ctx.fillRect(0, h * 0.62, w, 8);
  ctx.fillStyle = INK;
  ctx.fillRect(0, h * 0.62 + 8, w, h);
  const scale = Math.max(2, Math.floor(Math.min(w, h) / 200));
  const bossX = w / 2 - TILE * scale * 0.75;
  const bossY = h * 0.22;
  sprites.drawBoss(ctx, battle.phase, Math.floor(battle.enemyFrame), bossX, bossY, scale);
  if (battle.mode === 'enemy_telegraph') {
    const pulse = 0.5 + Math.sin(battle.enemyFrame) * 0.5;
    ctx.strokeStyle = `rgba(226,59,59,${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(bossX - 8, bossY - 8, TILE * scale * 1.5 + 16, TILE * scale * 1.5 + 16);
  }
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

/** Short quest-complete juice burst. */
export function drawQuestCompleteJuice(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  if (t <= 0) return;
  const a = Math.min(1, t * 2);
  ctx.fillStyle = `rgba(254,221,4,${0.15 * a})`;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h * 0.35);
  const s = 1 + (1 - t) * 0.4;
  ctx.scale(s, s);
  ctx.fillStyle = Y;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.strokeText('QUEST COMPLETE!', 0, 0);
  ctx.fillText('QUEST COMPLETE!', 0, 0);
  ctx.restore();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + t * 6;
    const r = 40 + (1 - t) * 50;
    ctx.fillStyle = Y;
    ctx.fillRect(w / 2 + Math.cos(ang) * r, h * 0.35 + Math.sin(ang) * r * 0.5, 4, 4);
  }
}

/** Door wipe / fade between maps. progress 0→1. */
export function drawMapTransition(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  progress: number,
  kind: 'fade' | 'wipe',
) {
  if (progress <= 0 || progress >= 1) return;
  if (kind === 'fade') {
    const a = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    ctx.fillStyle = `rgba(18,18,18,${a})`;
    ctx.fillRect(0, 0, w, h);
    if (progress > 0.35 && progress < 0.65) {
      ctx.fillStyle = Y;
      ctx.fillRect(0, h / 2 - 3, w, 6);
    }
  } else {
    const p = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const door = (w / 2) * p;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, door, h);
    ctx.fillRect(w - door, 0, door, h);
    ctx.fillStyle = Y;
    ctx.fillRect(door - 3, 0, 3, h);
    ctx.fillRect(w - door, 0, 3, h);
  }
}

export function drawStepDust(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
  if (age > 0.25) return;
  const a = 1 - age / 0.25;
  ctx.fillStyle = `rgba(254,221,4,${0.5 * a})`;
  ctx.fillRect(x + 8 - age * 20, y + 26, 3, 3);
  ctx.fillRect(x + 20 + age * 16, y + 28, 3, 3);
}

void TILE;
