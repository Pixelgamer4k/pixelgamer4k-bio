# Handover: Pixel Gamer 4k bio site

This document lets someone else (a person or another AI assistant) pick up the project from scratch. It covers what the site is, where things live, how it is published, how to update it, and what is still open.

## 1. What this project is

A single-page static website for **Pixel Gamer 4k**, the brand behind the WZM Offline (Warzone Mobile offline) project.

- **Live site:** https://pixelgamer4k.github.io/pixelgamer4k-bio/
- **Repository:** https://github.com/Pixelgamer4k/pixelgamer4k-bio
- **Branch:** `main`
- **Hosting:** GitHub Pages, "legacy" build, serving the `main` branch from the root folder. Every push to `main` triggers a rebuild that takes a few minutes.
- **No build step, no dependencies, no frameworks.** It is plain HTML, CSS and a little inline JavaScript.

## 2. Files

| Path | Purpose |
|---|---|
| `index.html` | The whole site: markup, CSS, and the small script at the bottom. |
| `assets/logo.jpg` | Pixel Gamer 4k logo (used on the page and as the favicon). |
| `assets/warzone-mobile.png` | Warzone Mobile key art shown in the download panel. |
| `update-site.sh` | Interactive script that changes the funding amount and the download link. |
| `README.md` | Short public description of the features. |
| `HANDOVER.md` | This file. |
| `.gitignore` | Standard ignores (`node_modules`, `.DS_Store`, `*.local`). |

The site used to have an intro video, background music and an animation. All of that was removed on purpose. The page now opens straight to the content.

## 3. How the page is structured

**Main page (always visible):**
1. Logo and tagline.
2. Social links (GitHub, two X accounts, business email).
3. **Funding card** (`#fund`): progress bar, "Support the project" text, and the Buy Me a Coffee button.
4. **Download button** (`#downloadTrigger`). It does not link anywhere directly.

**Download panel (`#gate`):** a full-screen panel that opens when Download is pressed. It is hidden with the `hidden` attribute until then. It contains:
1. The Warzone Mobile image.
2. The "Before you download" message about budget and support.
3. Three version cards:
   - **v1**: Completed, available now. Guns and operators unlocked, multiplayer matches with bots.
   - **v2**: Not completed. Private matches and Battle Royale modes. Development proceeds only if funding is reached. It has its own funding bar with the amount label, driven by the same numbers as the main bar.
   - **v3**: Coming soon. May include maps ported from Modern Warfare (2019), Modern Warfare 2, Modern Warfare 3 and Black Ops 6.
4. Buy Me a Coffee button.
5. **Download v1** button (`#downloadBtn`), which links to the real file.
6. Back link. Escape also closes the panel.

## 4. Values you change

All of the editable values are in `index.html`.

| What | Where | Notes |
|---|---|---|
| Amount raised | `data-raised="17"` on `<section id="fund">` | The main bar, its text and the v2 bar all read this. |
| Funding goal | `data-goal="200"` on the same element | Change only if the target changes. |
| Download link | `href="..."` on `<a id="downloadBtn">` | Currently `https://pastebin.com/HRwFBF9s`. |
| Buy Me a Coffee link | `href="https://buymeacoffee.com/pixelgamer4k"` | Appears twice: in the funding card and in the panel. |
| Version text | Inside `<div class="stages">` | Edit the `stage-desc` lines and the `stage-state` badges. |

**Easiest way to change the amount and link:** run the updater from the project folder:

```bash
./update-site.sh
```

It asks for the amount raised and the download link. Press Enter to keep the current value. It rejects non-numeric amounts and links that do not start with `http://` or `https://`.

To publish after changing things:

```bash
git add index.html
git commit -m "Update funding and download link"
git push
```

## 5. Version history (main branch)

| Commit | What changed |
|---|---|
| `33671e2` | Replaced crypto wallets with the Buy Me a Coffee link. |
| `6a13f5f` | Removed the intro, music and animation. Added the funding bar and download link. |
| `f3c43e3` | Added `update-site.sh` and updated the README. |
| `e553301` | Moved Buy Me a Coffee below the funding bar. |
| `db6f0b3` | Moved Buy Me a Coffee inside the funding card with support text. |
| `a897128` | Download now opens the notice panel with logo, message, Buy Me a Coffee, then download. |
| `1b4d7f7` | Fixed the button width and text contrast in the panel. |
| `079000d` | Added the v1 / v2 / v3 checklist. |
| `a0b0694` | Changed the checklist to progress bars. |
| `bea682b` | Added a mini funding bar beside v2. |
| `1e0c550` | Moved the funding bar into v2's bar with an amount label. |
| `5677bbf` | Rebuilt the panel layout so nothing overlaps. |

## 6. How it was tested

- The page was checked visually by rendering it in **headless Google Chrome** from the command line, then reading the screenshot. Command shape:
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1000,1100 --screenshot=out.png "file:///path/to/index.html"
  ```
- The panel is hidden by default, so for screenshots a temporary copy was made with the `hidden` attribute removed. The real file was not changed for testing.
- Headless Chrome does not render narrower than about 500px. **Real phone widths (around 390px) were not checked.** Check on a real phone.
- The inline script was checked for syntax with Node: `node -e "new Function(...)"` on the script block.
- The updater `update-site.sh` was tested on a temporary copy: Enter keeps values, new values apply, and bad input is rejected.
- **Not yet checked:** the live GitHub Pages site after the last push. Pages rebuilds take a few minutes. Reload with a hard refresh (`Cmd+Shift+R`) to bypass the browser cache.

## 7. Known issues and decisions to revisit

1. **Download link is a placeholder.** The owner provided `https://google.com` as an example. The current value in the file is `https://pastebin.com/HRwFBF9s`. Confirm the real link with the owner before going public.
2. **Trademark risk.** The Warzone Mobile name and key art belong to Activision. Showing them on a fan project may lead to a takedown. The owner accepted this risk, but it should be reviewed.
3. **Business email on the page.** The Email icon links to `pixelgamer4kris@gmail.com`. This was already on the site before this work and was left unchanged. Remove it if it should not be public.
4. **v2 has no download.** It is not built yet. The panel shows it as not completed, with no link.
5. **Stray folder in the project.** A folder named `pixelgamer4k-bio/` sits inside the project folder. It is an untracked duplicate left by a file transfer. It is not part of the repository. It is safe to delete.
6. **Funding numbers are manual.** The $17 raised is typed in by hand. There is no payment integration. Buy Me a Coffee does not feed the number automatically.
7. **Accessibility and browser checks** are basic. The panel uses `role="dialog"`, Escape closes it, and focus returns to the trigger. This has not been checked with a screen reader.

## 8. How to continue with another AI assistant

Give the assistant this file and ask it to:

1. Read `HANDOVER.md` and `index.html` first.
2. Make changes only in `index.html` unless asked otherwise. Keep `data-raised`, `data-goal`, `id="downloadBtn"` and `id="downloadTrigger"` intact, because `update-site.sh` and the script at the bottom rely on them.
3. Keep the file as a single self-contained HTML page. Do not add a build step or frameworks unless the owner asks.
4. Check any visual change in headless Chrome at about 500px and desktop width, and say clearly that phone widths were not checked.
5. Never add personal details (full name, personal email, private contacts) to the page. Only "Pixel Gamer 4k" should be shown as the name.
6. Do not commit or push without the owner's go-ahead.

## 9. Account and access notes

- The repository is owned by the GitHub account `Pixelgamer4k`. Git commits are made as that account, using the GitHub noreply address.
- Pushing requires the GitHub CLI or git credentials to be logged in on the machine (`gh auth status` shows the active account).
- Commits made with AI help end with a `Co-Authored-By` line naming the model used.

## 10. Open tasks

- [ ] Confirm the real download link and update it with `update-site.sh`.
- [ ] Check the live site on a real phone after the next rebuild.
- [ ] Decide whether to keep the Warzone Mobile key art given the trademark risk.
- [ ] Decide whether to keep the business email on the page.
- [ ] Delete the stray `pixelgamer4k-bio/` folder inside the project.
- [ ] Update the funding amount as donations arrive.
- [ ] When v2 has a build, add its download link and change its card to completed.
