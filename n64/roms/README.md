# ROMs folder

Place your own `.z64` (preferred), `.n64`, or `.v64` dumps here.

## Included samples (public domain)

| File | Description |
|------|-------------|
| `pong-pd.z64` | *Pong by Oman* — public-domain homebrew from [N64-PD-ROMS](https://github.com/DerekTurtleRoe/N64-PD-ROMS) |
| `n64probe-buttons-pd.z64` | *N64probe (Button Test) by MooglyGuy* — PD input test ROM |

These are **not** commercial games. They are redistributed as public-domain / PD-labeled scene ROMs for emulator testing.

## Adding your ROMs

1. Copy a legally obtained dump into this folder, e.g. `roms/mygame.z64`.
2. Prefer **big-endian `.z64`**. The loader also accepts `.n64` / `.v64` and converts to z64 automatically.
3. Either:
   - Open the app and use **Load ROM** / drag-and-drop, or
   - Add an optional preload entry in `js/romlist.js` (if present) / use the file picker.

## Legal

- Commercial N64 ROMs: only use dumps you personally own / are legally entitled to use. Do not redistribute commercial ROMs with this project.
- Homebrew / Pyrite Engine titles: OK when the author permits redistribution or personal use.
- Do not commit commercial dumps to a public GitHub repo.

Typical commercial ROMs are ~8–64 MB; homebrew/Pyrite builds of 20–30 MB fit fine in a repo if license allows.
