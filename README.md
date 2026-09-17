# Pixel Gamer 4k — Bio

Yellow brand bio site + **Signal Lost** (pixel-art RPG opening slice).

- Live bio: GitHub Pages from `main`
- Play: `/play/` — Vite + TypeScript + Canvas 2D (IndexedDB saves, no analytics/CDNs)
- Source: `signal-lost/` — `npm install && npm run build` outputs to `play/`
- Archived: `archive/space-junk/` (retired from Play)

## Signal Lost (this ship)

Opening slice — **not** a finished 30h RPG:

- Title hook: *signal lost / reclaim the arcade* (PG4k yellow/black)
- Named hero **Nova** + companion **Beep** (follows)
- Starter town **Neon Plaza** · 4 talk NPCs · 1 side quest (~30% of slice)
- Dungeon **Static Depths** · boss **Glitch Warden** with a real HP phase change
- Procedural MIDI-style beds + punch SFX (Web Audio, original)
- Inventory, HP, IndexedDB save/load · desktop + mobile D-pad/Action

### Controls
- Desktop: WASD / arrows · E / Z / Space Action · I / Esc Pause
- Mobile: virtual D-pad · Action · Menu

## Expanding toward 30h

Content is data-driven — grow hours without rewriting the engine:

| Hook | File | How to extend |
|------|------|----------------|
| Quest graph | `signal-lost/src/data/quests.ts` | Append `QuestDef` + flag edges |
| Map registry | `signal-lost/src/data/maps.ts` | Add `MapDef` + warps/pickups |
| NPC tables | `signal-lost/src/data/npcs.ts` | Append `NpcDef` rows |
| Items | `signal-lost/src/data/items.ts` | Register ids; inventory is qty map |
| Companion AI | `signal-lost/src/entities/companion.ts` | Swap `CompanionBrain` behaviors |
| Sprites | `signal-lost/src/engine/sprites.ts` | Or vendor CC0 sheets + ATTRIBUTION |

Honest scope: this PR ships a fun town → side quest → dungeon → 2-phase boss loop that can grow.

## Privacy
- Client-side Pages only · IndexedDB saves · no accounts / analytics / CDNs
- Art & audio: original procedural (see `signal-lost/public/assets/ATTRIBUTION.md`)
- Future packs: CC0 / CC-BY only, vendored in-repo with LICENSE

## Dev
```bash
cd signal-lost
npm install
npm run dev      # local
npm run build    # writes ../play for Pages
```
