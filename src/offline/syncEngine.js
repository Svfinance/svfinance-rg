// Dispara o sync da fila quando há rede. Idempotência garantida pelo backend
// via local_id. Seguro chamar várias vezes (não duplica).

import { getQueue, removeFromQueue } from "./offlineDB";

const API = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

let syncing = false;

export async function syncNow() {
  if (syncing) return { ok: false, reason: "já sincronizando" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };

  const queue = await getQueue();
  if (queue.length === 0) return { ok: true, synced: 0 };

  syncing = true;
  try {
    const res = await fetch(`${API}/checkin/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ eventos: queue }),
    });
    if (!res.ok) return { ok: false, reason: "backend " + res.status };

    const data = await res.json();
    let synced = 0;
    for (const r of data.results || []) {
      if (r.ok) {
        await removeFromQueue(r.local_id);
        synced++;
      }
      // Se r.ok === false, mantém na fila para retry futuro
    }
    // Notifica a app que o badge mudou
    window.dispatchEvent(new CustomEvent("sv-sync-done", { detail: { synced } }));
    return { ok: true, synced };
  } catch (e) {
    return { ok: false, reason: e.message };
  } finally {
    syncing = false;
  }
}

// Liga os gatilhos automáticos (chamar uma vez no main.jsx)
export function initSyncEngine() {
  window.addEventListener("online", syncNow);
  // tenta sincronizar a cada 60s quando online
  setInterval(() => { if (navigator.onLine) syncNow(); }, 60000);
  // tenta no carregamento
  if (navigator.onLine) syncNow();
}