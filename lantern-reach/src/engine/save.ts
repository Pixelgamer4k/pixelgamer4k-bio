const DB_NAME = 'lantern-reach';
const STORE = 'saves';
const KEY = 'slice1';

export interface SaveData {
  version: 1;
  talkedAsh: boolean;
  talkedMira: boolean;
  doorOpened: boolean;
  reachedLoft: boolean;
  fuel: number;
  hp: number;
  updatedAt: number;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    talkedAsh: false,
    talkedMira: false,
    doorOpened: false,
    reachedLoft: false,
    fuel: 1,
    hp: 1,
    updatedAt: Date.now(),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSave(): Promise<SaveData> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const v = req.result as SaveData | undefined;
        resolve(v?.version === 1 ? v : defaultSave());
      };
      req.onerror = () => resolve(defaultSave());
    });
  } catch {
    return defaultSave();
  }
}

export async function writeSave(data: SaveData): Promise<void> {
  data.updatedAt = Date.now();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}
