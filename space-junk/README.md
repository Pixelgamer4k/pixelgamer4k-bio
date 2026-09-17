# Space Junk: Salvagers — Zone 1

True 6DOF salvage flight for the Pixelgamer4k bio storefront.

## Controls
See [docs/CONTROLS.md](docs/CONTROLS.md).

- **Desktop:** WASD thrust/strafe · mouse look (pitch/yaw) · LMB Fire · RMB Magnet · Space Boost · Q Scan
- **Touch:** Left stick move · Right stick look · Magnet · Boost · Fire · Scan = HUD Pulse

## Assets
Vendored CC0 Kenney Space Kit under `public/assets/kenney-space-kit/` — see `public/assets/ATTRIBUTION.md`.

VFX roots: `shipRoot`, `thrusterRoot`, `magnetRoot`, `debrisRoot`, `salvageRoot`, `hitchOverlay`.

## Build
```bash
npm ci
npm run build   # → ../play for GitHub Pages
```

Saves: IndexedDB only. No analytics / CDN hotlinks.
