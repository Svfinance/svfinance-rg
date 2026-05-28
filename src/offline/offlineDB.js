// Camada de persistência offline via IndexedDB (sem dependências).
// 2 stores: "queue" (check-ins pendentes) e "snapshot" (dados do dia).

const DB_NAME = "sv_finance_offline";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "local_id" });
      }
      if (!db.objectStoreNames.contains("snapshot")) {
        db.createObjectStore("snapshot", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── FILA DE CHECK-INS PENDENTES ─────────────────────────────────────────────
export async function enqueueCheckin(evento) {
  const db = await openDB();
  const item = { ...evento, local_id: evento.local_id || uuid(), enqueued_at: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put(item);
    tx.oncomplete = () => resolve(item);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readonly");
    const req = tx.objectStore("queue").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(localId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueCount() {
  const q = await getQueue();
  return q.length;
}

// ── SNAPSHOT DE DADOS (OS, clientes, produtos) ──────────────────────────────
export async function saveSnapshot(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshot", "readwrite");
    tx.objectStore("snapshot").put({ key, data, ts: Date.now() });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function readSnapshot(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("snapshot", "readonly");
    const req = tx.objectStore("snapshot").get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export { uuid };