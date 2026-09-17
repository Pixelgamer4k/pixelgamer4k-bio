/**
 * Pixel Gamer 4k — bio shell + game picker + bed music hooks.
 * Bed Audio is created in index.html (inline) and exposed as window.__pg4kBed.
 * Hooks:
 *   window.__pg4kSetBedVolume(to, ms)  — ramp bed.volume
 *   window.__pg4kBed                  — HTMLAudioElement | undefined
 */
import { GAMES } from './catalog.js';
import { GameShell } from './shell/game.js';

function rampVolume(bed, to, ms = 500) {
  if (!bed) return;
  const from = bed.volume;
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min(1, (now - t0) / ms);
    const e = p * p * (3 - 2 * p);
    bed.volume = from + (to - from) * e;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/** Prefer page-provided ramp; fall back to local */
function setBedVolume(to, ms = 500) {
  if (typeof window.__pg4kSetBedVolume === 'function') {
    window.__pg4kSetBedVolume(to, ms);
    return;
  }
  rampVolume(window.__pg4kBed, to, ms);
}

function buildGameList(listEl) {
  listEl.innerHTML = '';
  for (const g of GAMES) {
    const li = document.createElement('li');
    li.className = 'game-item';
    li.innerHTML = `
      <button type="button" class="game-btn" data-id="${g.id}">
        <span class="n">${g.n}</span>
        <span class="meta">
          <span class="t">${g.title}</span>
          <span class="g">${g.blurb}</span>
        </span>
        <span class="go">Play</span>
      </button>`;
    listEl.appendChild(li);
  }
}

let shell = null;

function ensureShell() {
  if (shell) return shell;
  shell = new GameShell({
    root: document.getElementById('gameRoot'),
    canvas: document.getElementById('gameCanvas'),
    hud: {
      timer: document.getElementById('hudTimer'),
      status: document.getElementById('hudStatus'),
      title: document.getElementById('hudTitle'),
      overlay: document.getElementById('resultOverlay'),
      result: document.getElementById('resultTitle'),
      detail: document.getElementById('resultDetail'),
      exitBtn: document.getElementById('exitGame'),
      againBtn: document.getElementById('againGame'),
    },
    touch: {
      stick: document.getElementById('stick'),
      knob: document.getElementById('stickKnob'),
      attack: document.getElementById('atkBtn'),
    },
    setBedVolume,
    onExit: () => {
      // return to bio; games overlay already closed when launching
      document.getElementById('bio')?.classList.add('live');
    },
  });
  return shell;
}

async function launchGame(id) {
  const entry = GAMES.find((g) => g.id === id);
  if (!entry) return;
  const overlay = document.getElementById('playOverlay');
  overlay?.classList.remove('open');
  overlay?.setAttribute('aria-hidden', 'true');

  const loading = document.getElementById('gameLoading');
  loading?.classList.add('show');
  try {
    const mod = await entry.load();
    const game = mod.default;
    loading?.classList.remove('show');
    ensureShell().start(game);
  } catch (err) {
    console.error(err);
    loading?.classList.remove('show');
    setBedVolume(1, 500);
    alert('Could not load game: ' + (err?.message || err));
  }
}

export function initGamesUI() {
  const list = document.getElementById('gameList');
  if (list) buildGameList(list);

  document.getElementById('gameList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    launchGame(btn.getAttribute('data-id'));
  });
}

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGamesUI);
} else {
  initGamesUI();
}

export { setBedVolume, GAMES };
