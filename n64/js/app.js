/**
 * N64 Web Emulator SPA — wraps N64Wasm (ParaLLEl) core.
 * Relative paths for GitHub Pages project sites.
 * Built-in catalog only — no user ROM loading.
 */
(function () {
  'use strict';

  function showPhoneGate() {
    const gate = document.getElementById('phoneGate');
    const app = document.getElementById('app');
    if (app) app.classList.add('hidden');
    document.querySelectorAll('.menu-sheet, .menu-backdrop').forEach((el) => {
      el.classList.add('hidden');
    });
    if (gate) {
      gate.classList.remove('hidden');
      gate.setAttribute('aria-hidden', 'false');
    }
  }

  if (!(window.isPhonePlayDevice && window.isPhonePlayDevice())) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showPhoneGate);
    } else {
      showPhoneGate();
    }
    return;
  }

  const AUDIOBUFFSIZE = 1024;

  // Default keyboard / gamepad mappings matching N64Wasm defaults (config.txt).
  const DEFAULT_MAP = {
    Joy_Up: 12, Joy_Down: 13, Joy_Left: 14, Joy_Right: 15,
    Joy_A: 0, Joy_B: 2, Joy_Start: 9, Joy_Z: 4, Joy_L: 6, Joy_R: 5, Joy_Menu: 11,
    Joy_CLeft: -1, Joy_CRight: -1, Joy_CUp: -1, Joy_CDown: -1,
    Key_Left: 'b', Key_Right: 'n', Key_Up: 'y', Key_Down: 'h',
    Key_Start: 'Enter', Key_CUp: 'i', Key_CDown: 'k', Key_CLeft: 'j', Key_CRight: 'l',
    Key_Z: 'a', Key_L: 'q', Key_R: 'e', Key_B: 's', Key_A: 'd', Key_Menu: '`',
    Key_AnalogUp: 'ArrowUp', Key_AnalogDown: 'ArrowDown',
    Key_AnalogLeft: 'ArrowLeft', Key_AnalogRight: 'ArrowRight',
  };

  const ui = {
    canvas: document.getElementById('canvas'),
    boot: document.getElementById('bootOverlay'),
    status: document.getElementById('statusText'),
    menuStatus: document.getElementById('menuStatus'),
    hudBadge: document.getElementById('hudBadge'),
    romLabel: document.getElementById('romLabel'),
    padPane: document.getElementById('padPane'),
    gameList: document.getElementById('gameList'),
    btnMenu: document.getElementById('btnMenu'),
    btnMenuClose: document.getElementById('btnMenuClose'),
    menuSheet: document.getElementById('menuSheet'),
    menuBackdrop: document.getElementById('menuBackdrop'),
    btnSave: document.getElementById('btnSaveState'),
    btnLoad: document.getElementById('btnLoadState'),
    btnExport: document.getElementById('btnExportState'),
    btnImport: document.getElementById('btnImportState'),
    btnExportSram: document.getElementById('btnExportSram'),
    btnImportSram: document.getElementById('btnImportSram'),
    importStateInput: document.getElementById('importStateInput'),
    importSramInput: document.getElementById('importSramInput'),
    btnExitHost: document.getElementById('btnExitHost'),
  };

  const embeddedInBio = window.parent && window.parent !== window;

  let romName = '';
  let emulatorStarted = false;
  let audioInited = false;
  let audioContext = null;
  let audioBufferResampled = null;
  let audioWritePosition = 0;
  let audioReadPosition = 0;
  let audioThreadLock = false;
  let moduleReady = false;
  let loadQueued = null; // Uint8Array pending after module init

  function emuFS() {
    const fs = globalThis.FS;
    if (!fs || typeof fs.writeFile !== 'function') {
      throw new Error('Emscripten FS not available');
    }
    return fs;
  }

  function setStatus(msg) {
    if (ui.status) ui.status.textContent = msg;
    if (ui.menuStatus) ui.menuStatus.textContent = msg;
    // Minimal HUD badge for transient play status (not during boot)
    if (ui.hudBadge && emulatorStarted) {
      const brief = String(msg || '');
      if (/paused/i.test(brief)) {
        ui.hudBadge.textContent = 'PAUSED';
        ui.hudBadge.classList.remove('hidden');
      } else if (/Running:|Save state|Load state|Exported|Imported|Restored/i.test(brief)) {
        ui.hudBadge.textContent = brief.length > 42 ? brief.slice(0, 40) + '…' : brief;
        ui.hudBadge.classList.remove('hidden');
        clearTimeout(setStatus._hide);
        setStatus._hide = setTimeout(() => {
          if (ui.hudBadge && !/PAUSED/i.test(ui.hudBadge.textContent || '')) {
            ui.hudBadge.classList.add('hidden');
          }
        }, 2800);
      }
    }
    console.log('[N64]', msg);
  }

  function openMenu() {
    if (!ui.menuSheet || !ui.menuBackdrop) return;
    ui.menuSheet.classList.remove('hidden');
    ui.menuBackdrop.classList.remove('hidden');
    ui.menuSheet.setAttribute('aria-hidden', 'false');
    ui.menuBackdrop.setAttribute('aria-hidden', 'false');
    if (ui.btnMenu) ui.btnMenu.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    if (!ui.menuSheet || !ui.menuBackdrop) return;
    ui.menuSheet.classList.add('hidden');
    ui.menuBackdrop.classList.add('hidden');
    ui.menuSheet.setAttribute('aria-hidden', 'true');
    ui.menuBackdrop.setAttribute('aria-hidden', 'true');
    if (ui.btnMenu) ui.btnMenu.setAttribute('aria-expanded', 'false');
  }

  function exitToHost() {
    closeMenu();
    if (embeddedInBio) {
      try {
        window.parent.postMessage({ type: 'pg4k-n64-exit' }, window.location.origin);
      } catch (_) {
        try { window.parent.postMessage({ type: 'pg4k-n64-exit' }, '*'); } catch (__) {}
      }
      return;
    }
    try { window.location.href = '../'; } catch (_) {}
  }

  // --- myApp shim required by EM_ASM mobile hook in the core ---
  window.myApp = {
    rivetsData: {
      inputController: {
        updateMobileControls: function () {
          if (window.VirtualPad) window.VirtualPad.updateMobileControls();
        },
        KeyMappings: {},
        VectorX: 0,
        VectorY: 0,
      },
      useZasCMobile: false,
      beforeEmulatorStarted: true,
    },
    sendMobileControls: null, // filled after callMain via cwrap
    setupInputController: function () {},
    // Called from WASM via EM_ASM after _neil_serialize writes /savestate.gz
    SaveStateEvent: async function () {
      try {
        const compressed = emuFS().readFile('/savestate.gz');
        await window.SaveStore.saveState(romName, compressed);
        setStatus('Save state stored (IndexedDB, ' + compressed.length + ' bytes)');
      } catch (e) {
        console.error(e);
        setStatus('Save state capture failed: ' + (e && e.message));
      }
    },
  };

  function buildConfigTxt() {
    const m = DEFAULT_MAP;
    const lines = [
      // gamepad
      m.Joy_Up, m.Joy_Down, m.Joy_Left, m.Joy_Right,
      m.Joy_A, m.Joy_B, m.Joy_Start, m.Joy_Z, m.Joy_L, m.Joy_R, m.Joy_Menu,
      m.Joy_CLeft, m.Joy_CRight, m.Joy_CUp, m.Joy_CDown,
      // keyboard
      m.Key_Left, m.Key_Right, m.Key_Up, m.Key_Down,
      m.Key_Start, m.Key_CUp, m.Key_CDown, m.Key_CLeft, m.Key_CRight,
      m.Key_Z, m.Key_L, m.Key_R, m.Key_B, m.Key_A, m.Key_Menu,
      m.Key_AnalogUp, m.Key_AnalogDown, m.Key_AnalogLeft, m.Key_AnalogRight,
      // eep/sra/fla load flags
      '0', '0', '0',
      // show FPS
      '0',
      // swap sticks
      '0',
      // disable audio sync (0 = audio-driven — preferred)
      '0',
      // invert 2P/3P/4P
      '0', '0', '0',
      // mobile mode ON — enables neil_send_mobile_controls path
      '1',
      // angrylion
      '0',
      // mouse
      '0',
      // use VBO (helpful on iOS)
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '1' : '0',
      // rice plugin
      '0',
    ];
    return lines.join('\r\n') + '\r\n';
  }

  function fetchBinary(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error('Failed to fetch ' + url + ' (' + r.status + ')');
      return r.arrayBuffer();
    }).then((ab) => new Uint8Array(ab));
  }

  async function writeAssets() {
    const data = await fetchBinary('core/assets.zip');
    emuFS().writeFile('assets.zip', data);
    setStatus('Assets loaded (' + data.length + ' bytes)');
  }

  async function initAudio() {
    if (audioInited) {
      if (audioContext && audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch (_) {}
      }
      return;
    }
    audioInited = true;
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 44100,
      });
    }
    const gain = audioContext.createGain();
    gain.gain.value = 0.5;
    gain.connect(audioContext.destination);

    audioBufferResampled = new Int16Array(
      Module.HEAP16.buffer,
      Module._neilGetSoundBufferResampledAddress(),
      64000
    );
    audioWritePosition = 0;
    audioReadPosition = 0;

    const pcm = audioContext.createScriptProcessor(AUDIOBUFFSIZE, 2, 2);
    pcm.onaudioprocess = onAudioProcess;
    pcm.connect(gain);

    try { await audioContext.resume(); } catch (_) {}
  }

  function onAudioProcess(ev) {
    if (audioThreadLock || !emulatorStarted) return;
    audioThreadLock = true;
    try {
      const outL = ev.outputBuffer.getChannelData(0);
      const outR = ev.outputBuffer.getChannelData(1);

      Module._runMainLoop();
      audioWritePosition = Module._neilGetAudioWritePosition();

      // Re-bind buffer if HEAP grew
      try {
        audioBufferResampled = new Int16Array(
          Module.HEAP16.buffer,
          Module._neilGetSoundBufferResampledAddress(),
          64000
        );
      } catch (_) {}

      for (let i = 0; i < AUDIOBUFFSIZE; i++) {
        if (audioWritePosition !== audioReadPosition) {
          outL[i] = audioBufferResampled[audioReadPosition] / 32768;
          outR[i] = audioBufferResampled[audioReadPosition + 1] / 32768;
          audioReadPosition += 2;
          if (audioReadPosition >= 64000) audioReadPosition = 0;
        } else {
          outL[i] = 0;
          outR[i] = 0;
        }
      }

      if (typeof Module._neil_set_buffer_remaining === 'function') {
        let rem = 0;
        let rp = audioReadPosition;
        for (let i = 0; i < 64000 && rp !== audioWritePosition; i++) {
          rp = (rp + 2) % 64000;
          rem += 2;
        }
        Module._neil_set_buffer_remaining(rem);
      }
    } catch (err) {
      console.error('audio', err);
    }
    audioThreadLock = false;
  }

  async function startWithRomBytes(bytes, name) {
    const converted = window.RomEndian.toZ64(bytes);
    const data = converted.data;
    romName = name || 'rom.z64';
    setStatus(
      'Loading ' + romName +
      ' (detected ' + converted.format + ' → z64, ' + data.length + ' bytes)'
    );

    await writeAssets();
    emuFS().writeFile('custom.v64', data);
    emuFS().writeFile('config.txt', buildConfigTxt());
    emuFS().writeFile('cheat.txt', '');

    // Restore cart SRAM if present
    try {
      const sram = await window.SaveStore.loadSram(romName);
      if (sram) {
        emuFS().writeFile('/game.savememory', sram);
        setStatus('Restored cart save for ' + romName);
      }
    } catch (e) {
      console.warn('SRAM load', e);
    }

    await initAudio();

    Module.callMain(['custom.v64']);

    // Bind exported helpers
    window.myApp.sendMobileControls = Module.cwrap(
      'neil_send_mobile_controls',
      null,
      ['string', 'string', 'string']
    );

    emulatorStarted = true;
    window.myApp.rivetsData.beforeEmulatorStarted = false;

    const appEl = document.getElementById('app');
    if (appEl) appEl.classList.remove('selecting');
    ui.boot.classList.add('hidden');
    if (ui.romLabel) ui.romLabel.textContent = romName;
    ui.canvas.focus();
    setStatus('Running: ' + romName);
    try { window.SaveStore.setMeta('lastRom', romName); } catch (_) {}

    // Periodic cart-save persistence → IndexedDB (not cookies / not localStorage blobs)
    setInterval(persistSramSafe, 15000);
  }

  function persistSramSafe() {
    if (!emulatorStarted || !romName) return;
    try {
      if (typeof globalThis.FS === 'undefined' || !globalThis.FS) return;
      // File may not exist until game writes save
      try {
        const data = emuFS().readFile('/game.savememory');
        window.SaveStore.saveSram(romName, data);
      } catch (_) { /* no save yet */ }
    } catch (e) {
      console.warn('SRAM persist', e);
    }
  }

  async function saveState() {
    if (!emulatorStarted) return;
    setStatus('Saving state…');
    // Core writes /savestate.gz then invokes myApp.SaveStateEvent via EM_ASM
    Module._neil_serialize();
    // Fallback poll if EM_ASM hook misses
    setTimeout(async () => {
      try {
        const compressed = emuFS().readFile('/savestate.gz');
        const existing = await window.SaveStore.loadState(romName);
        if (!existing || existing.length !== compressed.length) {
          await window.SaveStore.saveState(romName, compressed);
          setStatus('Save state stored (IndexedDB, ' + compressed.length + ' bytes)');
        }
      } catch (_) { /* SaveStateEvent may have already handled */ }
    }, 400);
  }

  async function loadState() {
    if (!emulatorStarted) return;
    try {
      const data = await window.SaveStore.loadState(romName);
      if (!data) {
        setStatus('No save state for this ROM');
        return;
      }
      emuFS().writeFile('/savestate.gz', data);
      Module._neil_unserialize();
      setStatus('Save state loaded');
    } catch (e) {
      console.error(e);
      setStatus('Load state failed: ' + e.message);
    }
  }


  async function exportStateFile() {
    if (!romName) { setStatus('Pick a game first'); return; }
    try {
      const n = await window.SaveStore.exportState(romName);
      setStatus('Exported save state (' + n + ' bytes)');
    } catch (e) {
      setStatus('Export state: ' + e.message);
    }
  }

  async function exportSramFile() {
    if (!romName) { setStatus('Pick a game first'); return; }
    persistSramSafe();
    try {
      // Prefer live FS cart save if present
      try {
        const live = emuFS().readFile('/game.savememory');
        await window.SaveStore.saveSram(romName, live);
      } catch (_) {}
      const n = await window.SaveStore.exportSram(romName);
      setStatus('Exported cartridge save (' + n + ' bytes)');
    } catch (e) {
      setStatus('Export cart: ' + e.message);
    }
  }

  async function importStateFile(file) {
    if (!romName) { setStatus('Pick a game first'); return; }
    if (!file) return;
    try {
      await window.SaveStore.importState(romName, file);
      setStatus('Imported save state — tap Load to apply');
      // Auto-apply if emulator running
      if (emulatorStarted) await loadState();
    } catch (e) {
      setStatus('Import state: ' + e.message);
    }
  }

  async function importSramFile(file) {
    if (!romName) { setStatus('Pick a game first'); return; }
    if (!file) return;
    try {
      const u8 = await window.SaveStore.readFileAsUint8(file);
      await window.SaveStore.importSram(romName, u8);
      if (emulatorStarted && typeof globalThis.FS !== 'undefined' && globalThis.FS) {
        emuFS().writeFile('/game.savememory', u8);
      }
      setStatus('Imported cartridge save (' + u8.length + ' bytes). Restart ROM if game already booted.');
    } catch (e) {
      setStatus('Import cart: ' + e.message);
    }
  }

  async function handleRomArrayBuffer(ab, name) {
    const u8 = ab instanceof Uint8Array ? ab : new Uint8Array(ab);
    if (!moduleReady) {
      loadQueued = { u8, name };
      setStatus('Core still loading… queued');
      return;
    }
    await startWithRomBytes(u8, name);
  }

  function displayName(game) {
    if (game && game.title) return game.title;
    return String((game && game.file) || '')
      .replace(/\.(z64|n64|v64)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }

  async function shippedFileExists(url) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) return true;
    } catch (_) {}
    try {
      const get = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      return get.ok;
    } catch (_) {
      return false;
    }
  }

  async function loadShippedGames() {
    let listed = [];
    try {
      const res = await fetch('roms/catalog.json');
      if (res.ok) {
        const data = await res.json();
        listed = Array.isArray(data.games) ? data.games : (Array.isArray(data) ? data : []);
      }
    } catch (_) {}
    if (!listed.length) {
      listed = [
        { file: 'pong-pd.z64', title: 'Pong', subtitle: 'Public-domain homebrew' },
        { file: 'n64probe-buttons-pd.z64', title: 'N64probe', subtitle: 'Button test' }
      ];
    }
    const games = [];
    for (let i = 0; i < listed.length; i++) {
      const g = listed[i];
      if (!g || !g.file) continue;
      if (/readme/i.test(g.file)) continue;
      if (!/\.(z64|n64|v64)$/i.test(g.file)) continue;
      const file = String(g.file).replace(/^roms\//, '');
      const url = 'roms/' + file;
      if (await shippedFileExists(url)) {
        games.push({
          file: file,
          url: url,
          title: g.title || '',
          subtitle: g.subtitle || file
        });
      }
    }
    return games;
  }

  function renderGameList(games) {
    const list = ui.gameList;
    if (!list) return;
    list.textContent = '';
    if (!games.length) {
      setStatus('No games available');
      return;
    }
    games.forEach((game) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'game-card';
      const title = document.createElement('span');
      title.className = 'game-card-title';
      title.textContent = displayName(game);
      const sub = document.createElement('span');
      sub.className = 'game-card-sub';
      sub.textContent = game.subtitle || game.file;
      btn.appendChild(title);
      btn.appendChild(sub);
      btn.addEventListener('click', () => pickGame(game));
      list.appendChild(btn);
    });
    setStatus('Tap a game to play');
  }

  async function pickGame(game) {
    if (emulatorStarted) return;
    await initAudioEarly();
    setStatus('Loading ' + displayName(game) + '…');
    try {
      const u8 = await fetchBinary(game.url || ('roms/' + game.file));
      await handleRomArrayBuffer(u8, game.file);
    } catch (e) {
      setStatus('Could not load game: ' + (e && e.message));
    }
  }

  // --- Module bootstrap (must set window.Module BEFORE loading n64wasm.js) ---
  function ensureWebGL(canvas) {
    const attrs = {
      alpha: false,
      depth: true,
      stencil: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'default',
    };
    try {
      return canvas.getContext('webgl2', attrs) ||
             canvas.getContext('webgl', attrs) ||
             canvas.getContext('experimental-webgl', attrs) ||
             null;
    } catch (_) {
      return null;
    }
  }

  const _preGL = ensureWebGL(ui.canvas);
  window.Module = {
    canvas: ui.canvas,
    print: function (text) {
      console.log('[WASM]', text);
    },
    printErr: function (text) { console.error('[WASM]', text); },
    onRuntimeInitialized: async function () {
      moduleReady = true;
      // n64wasm.js is a classic script: top-level `var FS` is on globalThis.
      // Do NOT assign Module.FS (not exported / undefined) or it wipes the real FS.
      if (typeof globalThis.FS === 'undefined' || !globalThis.FS) {
        setStatus('FS missing after core init');
        return;
      }
      setStatus('Emulator core ready — tap a game');
      if (loadQueued) {
        const q = loadQueued;
        loadQueued = null;
        await startWithRomBytes(q.u8, q.name);
      }
    },
  };


  if (_preGL) {
    window.Module.preinitializedWebGLContext = _preGL;
  } else {
    console.warn('[N64] WebGL not available at Module setup; Emscripten will try later');
  }

  function loadCoreScript() {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'core/n64wasm.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load core/n64wasm.js'));
      document.head.appendChild(s);
    });
  }

  // --- UI wiring ---
  function preventGestures() {
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.body.addEventListener('touchmove', (e) => {
      if (emulatorStarted) e.preventDefault();
    }, { passive: false });
  }

  async function init() {
    preventGestures();
    if (window.VirtualPad) window.VirtualPad.bindUI(ui.padPane);

    const unlockOnce = async () => {
      await initAudioEarly();
      document.removeEventListener('touchend', unlockOnce);
      document.removeEventListener('click', unlockOnce);
    };
    document.addEventListener('touchend', unlockOnce, { once: true, passive: true });
    document.addEventListener('click', unlockOnce, { once: true });

    if (window.SaveStore && SaveStore.probe) {
      SaveStore.probe().then((r) => {
        if (!r.ok) {
          setStatus('Saves limited: ' + r.message + ' — use Export when possible, or leave Private Browsing');
        }
      });
    }

    try {
      const games = await loadShippedGames();
      renderGameList(games);
    } catch (e) {
      setStatus('Could not load game list');
    }

    if (ui.btnMenu) ui.btnMenu.addEventListener('click', openMenu);
    if (ui.btnMenuClose) ui.btnMenuClose.addEventListener('click', closeMenu);
    if (ui.menuBackdrop) ui.menuBackdrop.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    ui.btnSave.addEventListener('click', () => { saveState(); });
    ui.btnLoad.addEventListener('click', () => { loadState(); });
    ui.btnExport.addEventListener('click', () => { exportStateFile(); });
    ui.btnExportSram.addEventListener('click', () => { exportSramFile(); });
    ui.btnImport.addEventListener('click', () => ui.importStateInput.click());
    ui.btnImportSram.addEventListener('click', () => ui.importSramInput.click());
    ui.importStateInput.addEventListener('change', () => {
      const f = ui.importStateInput.files && ui.importStateInput.files[0];
      importStateFile(f);
      ui.importStateInput.value = '';
    });
    ui.importSramInput.addEventListener('change', () => {
      const f = ui.importSramInput.files && ui.importSramInput.files[0];
      importSramFile(f);
      ui.importSramInput.value = '';
    });
    if (ui.btnExitHost) {
      ui.btnExitHost.classList.remove('hidden');
      ui.btnExitHost.addEventListener('click', exitToHost);
    }

    setStatus('Loading emulator core…');
    try {
      await loadCoreScript();
    } catch (e) {
      setStatus(e.message);
    }
  }

  // Unlock audio on first tap (iOS / Chrome autoplay policy)
  async function initAudioEarly() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!audioContext) {
        audioContext = new AC({ latencyHint: 'interactive', sampleRate: 44100 });
      }
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (e) {
      console.warn('[N64] audio unlock', e);
    }
  }

  // Override initAudio to reuse early context if created
  const _initAudio = initAudio;
  // (initAudio already handles resume; early context is separate — recreate after Module ready)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
