/** IndexedDB save/load — no accounts, client-only. */

const DB_NAME = 'signal-lost-saves';
const STORE = 'slots';
const VERSION = 1;

export interface SaveBlob {
  version: number;
  timestamp: number;
  mapId: string;
  player: {
    tx: number;
    ty: number;
    hp: number;
    maxHp: number;
    facing: string;
  };
  inventory: { id: string; qty: number }[];
  questFlags: Record<string, string | boolean | number>;
  companionUnlocked: boolean;
  gold: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGame(slot: string, data: SaveBlob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(data, slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadGame(slot: string): Promise<SaveBlob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(slot);
    req.onsuccess = () => resolve((req.result as SaveBlob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function hasSave(slot: string): Promise<boolean> {
  return (await loadGame(slot)) != null;
}
