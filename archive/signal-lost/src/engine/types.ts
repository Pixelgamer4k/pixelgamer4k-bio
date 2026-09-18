/** Shared engine types — extend freely as content grows. */

export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Room brief: 32×32 tiles, phone-readable. */
export const TILE = 32;
export const SCALE = 2;

export const DIRS: Record<Dir, Vec2> = {
  down: { x: 0, y: 1 },
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function opposite(d: Dir): Dir {
  if (d === 'up') return 'down';
  if (d === 'down') return 'up';
  if (d === 'left') return 'right';
  return 'left';
}
