/**
 * NPC data table — portraitId keys into SpriteKit.
 * Extension: append NpcDef rows; Game spawns from mapId.
 */
export interface NpcDef {
  id: string;
  name: string;
  mapId: string;
  tx: number;
  ty: number;
  facing: 'down' | 'up' | 'left' | 'right';
  portrait: string;
  questId?: string;
  lines: (flags: Record<string, string | boolean | number>, inv: Record<string, number>) => string[];
  onTalk?: (
    flags: Record<string, string | boolean | number>,
    inv: Record<string, number>,
  ) => {
    flags?: Record<string, string | boolean | number>;
    inv?: Record<string, number>;
    heal?: number;
    sfx?: string;
  };
}

export const NPCS: NpcDef[] = [
  {
    id: 'vex',
    name: 'Clerk Vex',
    mapId: 'town',
    tx: 7,
    ty: 5,
    facing: 'down',
    portrait: 'npc_vex',
    questId: 'side_token',
    lines: (f, inv) => {
      if (f.side_token_done) return ['Token logged. Board is yellow again.', 'Go punch that Glitch Warden.'];
      if ((inv.token ?? 0) > 0) return ['That token! High-score saved.', 'Soda — on the house. Yellow fizz.'];
      if (f.quest_side_token_active) return ['Still missing. East crates by the neon fence.'];
      if (f.tutorial_done) {
        return [
          'Signal dropped last night.',
          'My high-score token vanished near the east crates.',
          'Bring it back — I owe you a soda.',
        ];
      }
      return ['Boot up first. Talk to Beep.'];
    },
    onTalk: (f, inv) => {
      if (f.side_token_done) return {};
      if ((inv.token ?? 0) > 0) {
        return {
          flags: { ...f, side_token_done: true, quest_side_token_active: false },
          inv: { ...inv, token: 0, soda: (inv.soda ?? 0) + 1 },
          sfx: 'confirm',
        };
      }
      if (f.tutorial_done && !f.quest_side_token_active) {
        return { flags: { ...f, quest_side_token_active: true }, sfx: 'menu' };
      }
      return {};
    },
  },
  {
    id: 'mira',
    name: 'Tech Mira',
    mapId: 'town',
    tx: 12,
    ty: 7,
    facing: 'left',
    portrait: 'npc_mira',
    questId: 'main_signal',
    lines: (f, inv) => {
      if (f.main_done) return ['Feed is live. Pixel Gamer 4k is back.', 'Nice punches.'];
      if (f.boss_dead && (inv.chip ?? 0) > 0) {
        return ['Signal chip received. Arcade reclaim: complete.', 'Opening slice cleared.'];
      }
      if (f.has_keycard) return ['Depths gate is south. Phase two flashes yellow — stay sharp.'];
      if (f.tutorial_done) {
        return [
          'Cabinets went dark — signal lost.',
          'Take this keycard. Static Depths: south gate.',
          'Beat the Glitch Warden. Reclaim the arcade.',
        ];
      }
      return ['Talk to Beep first. Yellow blink = listen.'];
    },
    onTalk: (f, inv) => {
      if (f.main_done) return {};
      if (f.boss_dead && (inv.chip ?? 0) > 0) {
        return {
          flags: { ...f, main_done: true, quest_main_signal_active: false },
          inv: { ...inv, chip: 0 },
          sfx: 'win',
        };
      }
      if (f.tutorial_done && !f.has_keycard) {
        return {
          flags: { ...f, has_keycard: true, quest_main_signal_active: true },
          inv: { ...inv, keycard: (inv.keycard ?? 0) + 1 },
          sfx: 'pickup',
        };
      }
      return {};
    },
  },
  {
    id: 'static',
    name: 'Guard Static',
    mapId: 'town',
    tx: 11,
    ty: 11,
    facing: 'left',
    portrait: 'npc_static',
    lines: (f) => {
      if (f.main_done) return ['Gate\'s clear. You reclaimed the feed.'];
      if (f.has_keycard) return ['Keycard accepted. South to the Depths.', 'Punch hard. Phase two hates yellow.'];
      return ['No keycard, no Depths. Find Tech Mira.'];
    },
  },
  {
    id: 'pip',
    name: 'Kid Pip',
    mapId: 'town',
    tx: 5,
    ty: 9,
    facing: 'right',
    portrait: 'npc_pip',
    lines: (f) => {
      if (f.side_token_done) return ['Vex is smiling. Rare.'];
      if (f.quest_side_token_active) return ['Shiny thing by the east crates!', 'I wasn\'t climbing. Promise.'];
      return ['Cabinets used to sing. Now it\'s static.'];
    },
  },
];
