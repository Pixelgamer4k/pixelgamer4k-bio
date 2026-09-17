/**
 * Map registry — layered tile maps (ground + collision).
 * Add MapDef entries for later 30h zones; loader stays the same.
 */
export interface MapDef {
  id: string;
  name: string;
  w: number;
  h: number;
  ground: string[];
  spawns: { default: { x: number; y: number }; [k: string]: { x: number; y: number } };
  music: 'town' | 'dungeon' | 'battle' | 'title';
  warps: {
    x: number;
    y: number;
    toMap: string;
    toSpawn: string;
    requireFlag?: string;
    requireItem?: string;
    denyText?: string;
  }[];
  pickups: { id: string; x: number; y: number; item: string; qty: number; onceFlag: string }[];
  bossTrigger?: { x: number; y: number };
}

/**
 * Legend: # wall  . floor  = road  ~ rug  C crate  ^ neon  d dungeon  b boss pad  g gate
 */
export const MAPS: Record<string, MapDef> = {
  town: {
    id: 'town',
    name: 'Neon Plaza',
    w: 18,
    h: 14,
    music: 'town',
    ground: [
      '##################',
      '#^^............^^#',
      '#^....======....^#',
      '#.....=....=.....#',
      '#..C..=....=..C..#',
      '#.....=....=.....#',
      '#.....======.....#',
      '#................#',
      '#..~~~......~~~..#',
      '#................#',
      '#....C......C....#',
      '#................#',
      '#........g.......#',
      '##################',
    ],
    spawns: {
      default: { x: 9, y: 10 },
      from_dungeon: { x: 9, y: 11 },
    },
    warps: [
      {
        x: 9,
        y: 12,
        toMap: 'dungeon',
        toSpawn: 'entrance',
        requireItem: 'keycard',
        denyText: "Gate locked. Need Mira's keycard.",
      },
    ],
    pickups: [
      { id: 'token_east', x: 15, y: 4, item: 'token', qty: 1, onceFlag: 'got_token' },
      { id: 'soda_west', x: 3, y: 8, item: 'soda', qty: 1, onceFlag: 'got_town_soda' },
    ],
  },
  dungeon: {
    id: 'dungeon',
    name: 'Static Depths',
    w: 13,
    h: 15,
    music: 'dungeon',
    ground: [
      '#############',
      '#...........#',
      '#.#########.#',
      '#.#ddddddd#.#',
      '#.#d.....#d.#',
      '#.#d.###.d#.#',
      '#.#d.....#d.#',
      '#.#ddddddd#.#',
      '#.#########.#',
      '#...........#',
      '#...bbbbb...#',
      '#...bbbbb...#',
      '#...........#',
      '#.....g.....#',
      '#############',
    ],
    spawns: {
      default: { x: 6, y: 12 },
      entrance: { x: 6, y: 12 },
    },
    warps: [{ x: 6, y: 13, toMap: 'town', toSpawn: 'from_dungeon' }],
    pickups: [{ id: 'd_soda', x: 1, y: 1, item: 'soda', qty: 2, onceFlag: 'got_d_soda' }],
    bossTrigger: { x: 6, y: 10 },
  },
};

export function buildCollision(map: MapDef): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < map.h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < map.w; x++) {
      const ch = map.ground[y]?.[x] ?? '#';
      row.push(ch === '#' || ch === 'C' || ch === '^');
    }
    grid.push(row);
  }
  for (const w of map.warps) {
    if (grid[w.y]) grid[w.y][w.x] = false;
  }
  if (map.bossTrigger && grid[map.bossTrigger.y]) {
    grid[map.bossTrigger.y][map.bossTrigger.x] = false;
  }
  return grid;
}

export function getMap(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map: ${id}`);
  return m;
}
