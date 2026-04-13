// Document file store — persists uploaded file binary data.
// Uses IndexedDB for persistence (supports large files, hundreds of MB).
// Falls back to in-memory Map if IndexedDB is unavailable.
// Files are also kept in an in-memory Map for instant access within a session.

const DB_NAME = 'docFileStore';
const DB_VERSION = 1;
const STORE_NAME = 'files';

const memoryStore = new Map<string, string>();

// ── IndexedDB helpers ────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    } catch {
      dbPromise = null;
      reject(new Error('IndexedDB not available'));
    }
  });
  return dbPromise;
}

async function idbPut(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Migrate old localStorage entries to IndexedDB ────────────────────

const LS_PREFIX = 'doc-file:';
let migrated = false;

async function migrateFromLocalStorage(): Promise<void> {
  if (migrated) return;
  migrated = true;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const docId = key.slice(LS_PREFIX.length);
        const value = localStorage.getItem(key);
        if (value) {
          await idbPut(docId, value);
          memoryStore.set(docId, value);
          keysToRemove.push(key);
        }
      }
    }
    // Remove old localStorage entries to free space
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Migration is best-effort
  }
}

// Start migration immediately on module load
migrateFromLocalStorage();

// ── Public API ───────────────────────────────────────────────────────

export async function storeDocumentFile(docId: string, dataUrl: string): Promise<void> {
  memoryStore.set(docId, dataUrl);
  try {
    await idbPut(docId, dataUrl);
  } catch {
    // IndexedDB unavailable — file in memory only for this session
  }
}

export function getDocumentFileUrl(docId: string): string | null {
  // Check memory first (synchronous fast path)
  if (memoryStore.has(docId)) return memoryStore.get(docId)!;
  return null;
}

/**
 * Async version — checks IndexedDB if not found in memory.
 * Components should use this when the sync version returns null.
 */
export async function getDocumentFileUrlAsync(docId: string): Promise<string | null> {
  // Check memory first
  if (memoryStore.has(docId)) return memoryStore.get(docId)!;
  // Check IndexedDB
  try {
    const stored = await idbGet(docId);
    if (stored) {
      memoryStore.set(docId, stored); // Cache in memory
      return stored;
    }
  } catch {
    // IndexedDB unavailable
  }
  return null;
}

export async function deleteDocumentFile(docId: string): Promise<void> {
  memoryStore.delete(docId);
  try {
    await idbDelete(docId);
  } catch {
    // Ignore
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
