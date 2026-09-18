# Pixel Gamer 4k — Bio

Yellow brand bio site + **Lantern Reach** (3D-pixel dark fantasy opening slice).

- Live bio: GitHub Pages from `main`
- Play: `/play/` — Three.js + WebGL pixel RT pipeline (IndexedDB saves, no analytics/CDNs)
- Source: `lantern-reach/` — `npm install && npm run build` outputs to `play/`
- Archived: `archive/space-junk/`, `archive/signal-lost/` (retired from Play)

## Lantern Reach (this ship)

Opening slice — **street mood**, not a full game. Vibe reference only (Shadowglass Short); original art/audio.

- Title: night market under a red moon — *Lantern Reach*
- First-person free look + WASD walk/sprint (true 3D look up/down)
- Night market street · 2 talk NPCs · 1 door · loft stairs
- Stealth beat: slip past the watchman (light + sound only — no UI lecture)
- Player lantern: bob/sway, fuel tick, primary light gimmick
- Thin HP / stamina chrome · center reticle · soft `E · Talk / Open` in range
- Desktop + mobile move-stick + look-stick
- Ambient Web Audio · IndexedDB save

Honest scope: a walkable pixel-painted street you can finish quietly. More districts later.

### Controls
- Desktop: WASD · mouse look (click to lock) · Shift sprint · E use
- Mobile: left stick move · right stick look · Sprint · Use

## Privacy
- Client-side Pages only · IndexedDB saves · no accounts / analytics / CDNs
- Art & audio: original procedural (see `lantern-reach/public/assets/ATTRIBUTION.md`)
- Yellow/black brand chrome stays on the bio shell — never inside Play
- Future packs: CC0 / CC-BY only, vendored in-repo with LICENSE

## Dev
```bash
cd lantern-reach
npm install
npm run dev      # local
npm run build    # writes ../play for Pages
```
