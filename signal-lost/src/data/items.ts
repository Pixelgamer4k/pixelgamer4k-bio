/** Item registry — add new ids here; inventory stores qty by id. */
export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  heal?: number;
  key?: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  soda: { id: 'soda', name: 'Pixel Soda', desc: 'Restores 8 HP. Yellow fizz.', heal: 8 },
  token: { id: 'token', name: 'High-Score Token', desc: 'Clerk wants this back.', key: true },
  keycard: { id: 'keycard', name: 'Cabinet Keycard', desc: 'Opens the Static Depths gate.' },
  chip: { id: 'chip', name: 'Signal Chip', desc: 'Proof the boss is down. Main quest turn-in.' },
};

export type ItemId = keyof typeof ITEMS;
