/**
 * Companion AI hooks — Beep follows Nova on a short trail queue.
 * Later: swap behaviors via CompanionBrain without rewriting Game.
 */
import type { Dir, Vec2 } from '../engine/types';
import { TILE } from '../engine/types';

export interface CompanionBrain {
  name: string;
  tx: number;
  ty: number;
  x: number;
  y: number;
  facing: Dir;
  frame: number;
  trail: Vec2[];
  unlocked: boolean;
  tutorialIndex: number;
}

export const TUTORIAL_LINES = [
  'Beep: I\'m Beep — your signal buddy.',
  'Beep: Move with WASD or the D-pad. Action to talk / punch.',
  'Beep: Yellow ! means a quest. ? means turn-in.',
  'Beep: Talk to Tech Mira when you\'re ready to reclaim the arcade.',
];

export function createCompanion(tx: number, ty: number): CompanionBrain {
  return {
    name: 'Beep',
    tx,
    ty,
    x: tx * TILE,
    y: ty * TILE,
    facing: 'down',
    frame: 0,
    trail: [],
    unlocked: true,
    tutorialIndex: 0,
  };
}

/** Call when hero finishes a tile step — push trail and follow. */
export function companionFollow(c: CompanionBrain, heroTx: number, heroTy: number, heroFacing: Dir, dt: number) {
  c.frame += dt * 6;
  const target = c.trail.length > 0 ? c.trail[0] : { x: heroTx, y: heroTy };
  // keep trail of hero tile centers
  const last = c.trail[c.trail.length - 1];
  if (!last || last.x !== heroTx || last.y !== heroTy) {
    c.trail.push({ x: heroTx, y: heroTy });
    if (c.trail.length > 3) c.trail.shift();
  }
  if (c.trail.length > 1) {
    const follow = c.trail[0];
    const dx = follow.x - c.tx;
    const dy = follow.y - c.ty;
    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) > Math.abs(dy)) c.facing = dx > 0 ? 'right' : 'left';
      else c.facing = dy > 0 ? 'down' : 'up';
      c.tx = follow.x;
      c.ty = follow.y;
      c.trail.shift();
    }
  }
  // smooth pixel pos toward tile
  const px = c.tx * TILE;
  const py = c.ty * TILE;
  c.x += (px - c.x) * Math.min(1, dt * 10);
  c.y += (py - c.y) * Math.min(1, dt * 10);
  void target;
  void heroFacing;
}
