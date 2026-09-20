/**
 * Persistence for cartridge saves and save-states.
 *
 * Primary: IndexedDB (multi-MB blobs — NEVER cookies; NEVER localStorage for blobs).
 * localStorage: optional tiny metadata only (e.g. last ROM name hint).
 * Isolation: per browser profile / device automatically (no cross-device sync).
 * Transfer: use Export / Import file download-upload.
 *
 * Safari private / ITP: IndexedDB may throw or quota=0 — callers get clear errors.
 */
(function (global) {
  const DB_NAME = 'N64WebEmuDB';
  const STORE = 'saves';
  const DB_VER = 1;
  const META_PREFIX = 'n64webemu:meta:';

  let idbUnavailableReason = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!global.indexedDB) {
        idbUnavailableReason = 'IndexedDB API missing';
        reject(new Error(idbUnavailableReason));
        return;
      }
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VER);
      } catch (e) {
        // Safari private mode sometimes throws synchronously
        idbUnavailableReason = 'IndexedDB blocked (Safari private mode?)';
        reject(new Error(idbUnavailableReason + ': ' + (e && e.message)));
        return;
      }
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => {
        idbUnavailableReason = null;
        resolve(req.result);
      };
      req.onerror = () => {
        idbUnavailableReason = 'IndexedDB open failed (private browsing / quota?)';
        reject(new Error(idbUnavailableReason));
      };
      // Safari: blocked request
      req.onblocked = () => {
        idbUnavailableReason = 'IndexedDB blocked';
        reject(new Error(idbUnavailableReason));
      };
    });
  }

  /** Probe IDB once; returns { ok, message }. */
  async function probe() {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(new Uint8Array([1]), '__probe__');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('probe write failed'));
      });
      return { ok: true, message: 'IndexedDB OK' };
    } catch (e) {
      return {
        ok: false,
        message: (e && e.message) || idbUnavailableReason || 'IndexedDB unavailable',
      };
    }
  }

  async function put(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IDB put failed'));
    });
  }

  async function get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function stateKey(romName) { return romName + '::savestate'; }
  function sramKey(romName) { return romName + '::sram'; }

  function setMeta(key, value) {
    try {
      if (typeof value !== 'string' || value.length > 512) return;
      localStorage.setItem(META_PREFIX + key, value);
    } catch (_) { /* private mode / quota */ }
  }

  function getMeta(key) {
    try {
      return localStorage.getItem(META_PREFIX + key);
    } catch (_) {
      return null;
    }
  }

  function downloadBytes(filename, u8, mime) {
    const blob = new Blob([u8], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // iOS Safari: must be in DOM + user gesture; download attr may open in tab
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2000);
  }

  function readFileAsUint8(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(reader.error || new Error('read failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  global.SaveStore = {
    put,
    get,
    probe,
    stateKey,
    sramKey,
    setMeta,
    getMeta,
    downloadBytes,
    readFileAsUint8,
    getUnavailableReason: () => idbUnavailableReason,
    async saveState(romName, u8) { return put(stateKey(romName), u8); },
    async loadState(romName) { return get(stateKey(romName)); },
    async saveSram(romName, u8) { return put(sramKey(romName), u8); },
    async loadSram(romName) { return get(sramKey(romName)); },
    async exportState(romName) {
      const data = await get(stateKey(romName));
      if (!data) throw new Error('No save state to export');
      const safe = String(romName).replace(/[^\w.-]+/g, '_') || 'rom';
      downloadBytes(safe + '.n64state', data, 'application/gzip');
      return data.length;
    },
    async exportSram(romName) {
      const data = await get(sramKey(romName));
      if (!data) throw new Error('No cartridge save to export');
      const safe = String(romName).replace(/[^\w.-]+/g, '_') || 'rom';
      downloadBytes(safe + '.savememory', data, 'application/octet-stream');
      return data.length;
    },
    async importState(romName, fileOrU8) {
      const u8 = fileOrU8 instanceof Uint8Array
        ? fileOrU8
        : await readFileAsUint8(fileOrU8);
      await put(stateKey(romName), u8);
      return u8.length;
    },
    async importSram(romName, fileOrU8) {
      const u8 = fileOrU8 instanceof Uint8Array
        ? fileOrU8
        : await readFileAsUint8(fileOrU8);
      await put(sramKey(romName), u8);
      return u8.length;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
