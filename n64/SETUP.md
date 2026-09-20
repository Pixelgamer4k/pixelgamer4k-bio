# N64 Web Emulator — Setup

Mobile-first single-page N64 emulator for the browser. Static files only (GitHub Pages ready).

## Core choice

**N64Wasm** ([nbarkhina/n64wasm](https://github.com/nbarkhina/n64wasm), MIT) — a WebAssembly port of RetroArch’s **ParaLLEl N64** core.

**Why this core**

- Pre-built `n64wasm.js` + `n64wasm.wasm` (~2.5 MB) that actually run in modern browsers (including mobile Safari/Chrome).
- Decent compatibility with many N64 titles plus open homebrew. This site only ships public-domain samples.
- Native hooks for mobile controls (`neil_send_mobile_controls`), save states (`_neil_serialize` / `_neil_unserialize`), and cart memory files.
- Alternatives considered: compiling Mupen64Plus-Next yourself is brittle under current Emscripten; older mupen64plus-web/asm.js ports lack mobile/save polish. N64Wasm is the practical vendored fit.

Vendored under `core/` (see `core/N64WASM-LICENSE.txt`).

## Requirements

- Modern browser with **WebAssembly** + **WebGL**
- Served over **http(s)** (not `file://`) so WASM + fetch work
- User gesture before audio (tap a game in the picker)

No COOP/COEP headers are required for this build (core is single-threaded). Correct MIME for `.wasm` (`application/wasm`) helps; Python’s `http.server` and `npx serve` are fine.

## How titles get into the picker

There is **no** Load ROM, file picker, or drag-and-drop. Games come only from files shipped under `roms/` plus display names in `roms/catalog.json`. See `roms/README.md`.

**Do not** add commercial N64 dumps. Public-domain / permitted homebrew only.

## How to serve (local)

From this directory:

```bash
# Option A — Python 3
python3 -m http.server 8080

# Option B — npx serve
npx --yes serve -l 8080 .
```

Then open `http://127.0.0.1:8080/` (or `http://localhost:8080/`).

On Android: use your machine’s LAN IP, e.g. `http://192.168.x.x:8080/`.

Optional helper:

```bash
./serve.sh
```

### Headers / MIME

| Need | Notes |
|------|--------|
| `application/wasm` for `.wasm` | Usually automatic |
| COOP / COEP | **Not required** for this single-thread core |
| HTTPS | Needed for some mobile features / PWA later; HTTP is OK on localhost |

## Using the app

Play is **iOS and Android phones only**. Desktop, tablet, and TV show a phones-only message and do not start the emulator.

1. Tap a title in the built-in picker (from `roms/catalog.json`).
2. Portrait layout: top ~50% canvas (**4:3 letterboxed** — black bars OK), bottom ~50% virtual pad optimized for two thumbs (D-pad + stick left; C + A/B right; L/Z/START/R along the top of the pad).
3. Primary play controls stay on the pad only. Tap **Menu** (top-right HUD) for Save/Load state, Export/Import save state, Export/Import cart save, and **Exit to bio**.
4. **Save** / **Load** (in Menu) = one IndexedDB save-state slot per ROM name (multi-MB OK).
5. Cart SRAM / EEPROM-style memory is periodically written to IndexedDB when the core creates `/game.savememory`.
6. **Export** / **Import** (in Menu) download or upload save-state (`.n64state`) and cart save (`.savememory`) files for moving between devices. No cloud sync.

### UI / graphics notes

Virtual gamepad buttons are **pure CSS** (gradients, inset/drop shadows, press scale). No third-party gamepad image assets.

## Saves (IndexedDB — not cookies)

| What | Where | Notes |
|------|--------|--------|
| Save states | IndexedDB `N64WebEmuDB` | Full gzip blobs from the core |
| Cartridge memory | IndexedDB | `/game.savememory` mirrored periodically |
| Tiny metadata (optional) | `localStorage` | e.g. last ROM name only — never full saves |
| Cookies | **Not used** | 4KB cap; unsuitable for N64 saves |
| Cross-device | Manual Export/Import files | Per browser profile isolation is automatic |

N64 save-states are often megabytes; cookies and localStorage quotas cannot hold them reliably.

Keyboard (desktop): arrows = D-pad bits / stick keys mapped in core config; Z=A, X=B, Enter=Start, A=Z, Q/E=L/R, IJKL=C.

## Limitations

- **Performance**: mid/high-end phones recommended; heavy commercial 3D titles may drop frames on low-end Android.
- **Compatibility**: ParaLLEl/GLideN64 path — many games work; some 2D / edge cases glitch (upstream N64Wasm notes).
- **Pyrite / homebrew**: generally fine if the ROM is valid z64 and within size limits; exotic cart mappers / CIC may fail.
- **Audio**: ScriptProcessor-driven loop (same approach as upstream); occasional underruns possible under tab throttle.
- **One save-state slot** per ROM filename in IndexedDB (MVP); use Export/Import for backups or sharing.
- **iOS**: may need WebGL experimental tweaks on older Safari; first tap required for audio.

## Legal

- **Never** ship or commit commercial N64 ROM dumps with this project.
- Included samples are public-domain homebrew/test ROMs from community archives.
- Emulator core: MIT (N64Wasm / ParaLLEl lineage — see license file).



## Android Chrome & iOS Safari

This SPA targets **both** Android Chrome and iOS Safari.

| Area | Approach |
|------|----------|
| Touch pad | `touch-action: none`, non-passive `touchstart`/`touchmove` + `preventDefault`, pointer events as secondary — no hover-only controls |
| Audio | `AudioContext` / `webkitAudioContext`; unlocked on first tap (`touchend`/`click`) before a catalog game starts |
| ROM loading | Fixed catalog only (`roms/catalog.json` + files in `roms/`). No file picker, no drag-and-drop |
| Saves | IndexedDB only for blobs; probed at startup. Safari **Private Browsing** may block IDB — status message shown; use Export/Import files |
| Viewport | `viewport-fit=cover` + `env(safe-area-inset-*)` for notched iPhones; `100dvh` / `-webkit-fill-available` |
| WASM MIME | Serve `.wasm` as `application/wasm` (Python `http.server` and GitHub Pages both OK) |
| WebGL | WebGL1/2 via canvas; no Chrome-only APIs |

### Known Safari vs Chrome gaps

- **iOS Safari**: Export download may open the file in a tab instead of saving to Files — long-press / Share to save. Import via file input works.
- **iOS Safari**: Background tabs heavily throttle timers/audio; keep the tab foreground while playing.
- **iOS Safari**: WebGL performance lower than desktop Chrome; mid-range+ iPhones recommended. Older iOS may need disabling experimental “GPU Process: WebGL” quirks (upstream N64Wasm note for Safari 16+).
- **Safari Private mode**: IndexedDB often unavailable — saves won’t persist; Export before closing.
- **Chrome Android**: generally best mobile path.
- **ScriptProcessorNode** audio (shared with upstream N64Wasm) is deprecated but still works on current Safari/Chrome; occasional underruns under load.

Automated local verify on this box uses **Chrome**; iOS Safari is covered by code-review / API choices above — test on a real iPhone before release.

## Project layout

```
n64/
  index.html
  SETUP.md
  serve.sh
  css/app.css
  js/app.js
  js/phone-gate.js
  js/gamepad.js
  js/rom-endian.js
  js/storage.js
  core/n64wasm.js
  core/n64wasm.wasm
  core/assets.zip
  core/N64WASM-LICENSE.txt
  roms/catalog.json
  roms/…
```

Relative paths only — suitable for GitHub Pages project sites (`https://user.github.io/repo-name/`).

## Embedded in the Pixel Gamer 4k bio

This SPA lives at `n64/` on the bio site. After the cinema intro, **Play** (below Support) opens a fullscreen overlay.

- **Phones (iOS / Android):** iframe loads `n64/index.html` (Fullscreen API when available; always a `position:fixed; inset:0` overlay for iOS Safari).
- **Desktop / tablet / TV:** overlay shows a brand “Phones only” message and does **not** run the emulator.
- Menu **Exit to bio** `postMessage`s `{ type: "pg4k-n64-exit" }` to the parent so the overlay closes and bed music mute/volume is restored.

