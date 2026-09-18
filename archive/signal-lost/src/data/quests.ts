/**
 * Quest graph registry.
 * status: locked → available → active → done
 * Later zones: append QuestDef entries + flag edges; Game reads flags only.
 */
export type QuestStatus = 'locked' | 'available' | 'active' | 'done';

export interface QuestDef {
  id: string;
  title: string;
  kind: 'main' | 'side';
  blurb: string;
  /** Flag that marks complete. */
  doneFlag: string;
  /** Optional flag that unlocks this quest. */
  requireFlag?: string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'main_signal',
    title: 'Reclaim the Signal',
    kind: 'main',
    blurb: 'The arcade feed went dark. Clear the Static Depths and beat the Glitch Warden.',
    doneFlag: 'main_done',
  },
  {
    id: 'side_token',
    title: 'Missing High-Score',
    kind: 'side',
    blurb: 'Clerk Vex lost a high-score token near the east crates. Return it.',
    doneFlag: 'side_token_done',
    requireFlag: 'tutorial_done',
  },
];

/** ! = available to accept · ? = ready to turn in · null = hidden / in-progress */
export function questMarker(
  flags: Record<string, string | boolean | number>,
  questId: string,
  inv: Record<string, number> = {},
): '!' | '?' | null {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return null;
  if (flags[q.doneFlag]) return null;
  if (q.requireFlag && !flags[q.requireFlag]) return null;

  if (questReadyToTurnIn(questId, flags, inv)) return '?';
  if (flags[`quest_${questId}_active`]) return null; // accepted, not ready — no spam marker
  return '!';
}

export function questReadyToTurnIn(
  questId: string,
  flags: Record<string, string | boolean | number>,
  inv: Record<string, number>,
): boolean {
  if (questId === 'side_token') return !flags.side_token_done && (inv.token ?? 0) > 0;
  if (questId === 'main_signal') return !flags.main_done && !!flags.boss_dead && (inv.chip ?? 0) > 0;
  return false;
}

export interface Waypoint {
  mapId: string;
  x: number;
  y: number;
  label: string;
}

/** Next objective tile for compass / world ping. Prefer active turn-ins, then main path. */
export function questWaypoint(
  flags: Record<string, string | boolean | number>,
  inv: Record<string, number>,
  currentMap: string,
): Waypoint | null {
  // Side turn-in first if holding token
  if (!flags.side_token_done && (inv.token ?? 0) > 0) {
    return { mapId: 'town', x: 7, y: 5, label: 'Turn in → Vex' };
  }
  // Main turn-in
  if (!flags.main_done && flags.boss_dead && (inv.chip ?? 0) > 0) {
    return { mapId: 'town', x: 12, y: 7, label: 'Turn in → Mira' };
  }
  // Side gather
  if (flags.quest_side_token_active && !flags.got_token && !flags.side_token_done) {
    return { mapId: 'town', x: 15, y: 4, label: 'Token · east crates' };
  }
  // Main path
  if (!flags.main_done) {
    if (!flags.tutorial_done) {
      return { mapId: 'town', x: 9, y: 10, label: 'Talk to Beep' };
    }
    if (!flags.has_keycard) {
      return { mapId: 'town', x: 12, y: 7, label: 'Tech Mira' };
    }
    if (!flags.boss_dead) {
      if (currentMap === 'dungeon') {
        return { mapId: 'dungeon', x: 6, y: 10, label: 'Glitch Warden' };
      }
      return { mapId: 'town', x: 9, y: 12, label: 'South gate → Depths' };
    }
  }
  return null;
}
