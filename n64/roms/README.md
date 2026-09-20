# ROMs folder

Built-in titles for the Pixel Gamer 4k N64 player. The app **does not** accept user-uploaded ROMs (no file picker, no drag-and-drop).

## Shipped samples (public domain only)

| File | Display name | Notes |
|------|----------------|-------|
| `pong-pd.z64` | Pong | *Pong by Oman* — PD homebrew from [N64-PD-ROMS](https://github.com/DerekTurtleRoe/N64-PD-ROMS) |
| `n64probe-buttons-pd.z64` | N64probe | *N64probe (Button Test) by MooglyGuy* — PD input test |

These are **not** commercial games.

## Adding more homebrew later

1. Place a redistributable `.z64` (preferred) in this folder.
2. Add a display-name entry to `catalog.json`:

```json
{ "file": "my-homebrew.z64", "title": "My Homebrew", "subtitle": "Optional blurb" }
```

3. Do **not** add commercial N64 dumps (Super Mario 64, Zelda, etc.). Never commit those binaries.

The picker reads `catalog.json` and only shows files that are actually present (README is ignored).
