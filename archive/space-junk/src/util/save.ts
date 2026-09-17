/** Client-side IndexedDB — coins + gems economy. No analytics. */

const DB_NAME = 'space-junk-salvagers';
const STORE = 'saves';
const KEY = 'zone1';

export interface Upgrades {
  hull: number;
  thruster: number;
  magnet: number;
  cargo: number;
  weapons: number;
}

export interface SaveData {
  version: 2;
  coins: number;
  gems: number;
  cargo: { id: string; rarity: string; value: number }[];
  upgrades: Upgrades;
  missionStep: number;
  bossDefeated: boolean;
  tutorialDone: boolean;
  powerCells: number;
  raresSalvaged: number;
  bestTimeSec: number;
  updatedAt: number;
}

export function defaultSave(): SaveData {
  return {
    version: 2,
    coins: 0,
    gems: 0,
    cargo: [],
    upgrades: { hull: 1, thruster: 1, magnet: 1, cargo: 1, weapons: 1 },
    missionStep: 0,
    bossDefeated: false,
    tutorialDone: false,
    powerCells: 0,
    raresSalvaged: 0,
    bestTimeSec: 0,
    updatedAt: Date.now(),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
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
        resolve(v?.version === 2 ? v : defaultSave());
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
