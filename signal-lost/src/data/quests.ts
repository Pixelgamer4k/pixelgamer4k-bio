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

export function questMarker(
  flags: Record<string, string | boolean | number>,
  questId: string,
): '!' | '?' | null {
  const q = QUESTS.find((x) => x.id === questId);
  if (!q) return null;
  if (flags[q.doneFlag]) return null;
  if (q.requireFlag && !flags[q.requireFlag]) return null;
  if (flags[`quest_${questId}_active`]) return '?';
  return '!';
}
