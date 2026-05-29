// src/offline/syncEngine.js
// Motor de sincronização offline → online do SV Finance PWA.

import {
  getCheckins, removeCheckin,
  getMutations, updateMutation, removeMutation,
  clearOrderOverlay, isTmpId,
} from "./offlineDB";

const API   = "https://api.svfinance.com.br/api";
const token = () => localStorage.getItem("token");

let syncing = false;

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` };
}

// ── Notifica a UI que algo sincronizou (telas escutam e recarregam) ─────────
function emitSynced(detail = {}) {
  window.dispatchEvent(new CustomEvent("sv_synced", { detail }));
}

// ════════════════════════════════════════════════════════════════════════════
// CHECK-INS
// ════════════════════════════════════════════════════════════════════════════
async function syncCheckins() {
  const fila = await getCheckins();
  if (!fila.length) return 0;

  let ok = 0;
  for (const chk of fila) {
    try {
      const endpoint = chk.kind === "start"
        ? `${API}/checkin/${chk.client_id}/start`
        : `${API}/checkin/${chk.checkin_id}/finish`;

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify(chk),
      });

      // 200/201 = ok. 409 = já existe (idempotência) → também removemos.
      if (res.ok || res.status === 409) {
        await removeCheckin(chk.local_id);
        if (chk.order_id) await clearOrderOverlay(chk.order_id);
        ok++;
      }
      // outros erros: mantém na fila para a próxima tentativa
    } catch {
      // sem rede: para o loop, tenta depois
      break;
    }
  }
  return ok;
}

// ════════════════════════════════════════════════════════════════════════════
// MUTATIONS (criações offline) com reconciliação de IDs
// ════════════════════════════════════════════════════════════════════════════
async function syncMutations() {
  const fila = await getMutations(); // já ordenado por created_at
  if (!fila.length) return 0;

  // Mapa de id temporário → id real (preenchido conforme cria clientes)
  const idMap = {};
  let ok = 0;

  // 1ª passada: CLIENTES primeiro (outras entidades dependem deles)
  for (const m of fila.filter(x => x.entity === "client")) {
    try {
      const res  = await fetch(`${API}/clients`, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify(m.payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (m.tmp_ref && data.id) idMap[m.tmp_ref] = data.id;
        await removeMutation(m.local_id);
        ok++;
      } else {
        await updateMutation(m.local_id, { status: "error", last_error: data.msg || "Erro" });
      }
    } catch {
      break; // sem rede
    }
  }

  // 2ª passada: ORÇAMENTOS e O.S. (remapeando client_id temporário)
  for (const m of fila.filter(x => x.entity === "quote" || x.entity === "order")) {
    try {
      const payload = { ...m.payload };

      // Remapeia client_id temporário → id real
      if (isTmpId(payload.client_id)) {
        const real = idMap[payload.client_id];
        if (!real) {
          // cliente ainda não sincronizou (provável erro no cliente) → adia
          await updateMutation(m.local_id, { status: "error", last_error: "Cliente vinculado ainda não sincronizado" });
          continue;
        }
        payload.client_id = real;
      }

      const endpoint = m.entity === "quote" ? `${API}/quotes` : `${API}/orders`;
      const res  = await fetch(endpoint, {
        method:  "POST",
        headers: authHeaders(),
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        await removeMutation(m.local_id);
        ok++;
      } else {
        await updateMutation(m.local_id, { status: "error", last_error: data.msg || "Erro" });
      }
    } catch {
      break; // sem rede
    }
  }

  return ok;
}

// ════════════════════════════════════════════════════════════════════════════
// SYNC PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export async function syncNow() {
  if (syncing) return { ok: false, reason: "already_syncing" };
  if (!navigator.onLine) return { ok: false, reason: "offline" };
  if (!token()) return { ok: false, reason: "no_token" };

  syncing = true;
  let totalCheckins = 0, totalMutations = 0;
  try {
    totalCheckins  = await syncCheckins();
    totalMutations = await syncMutations();
    if (totalCheckins + totalMutations > 0) {
      emitSynced({ checkins: totalCheckins, mutations: totalMutations });
    }
    return { ok: true, checkins: totalCheckins, mutations: totalMutations };
  } finally {
    syncing = false;
  }
}

// ── Inicializa o motor: sincroniza ao carregar e ao voltar a rede ───────────
export function initSyncEngine() {
  // tenta ao iniciar
  if (navigator.onLine) syncNow();

  // tenta quando a rede volta
  window.addEventListener("online", () => { syncNow(); });

  // tenta periodicamente (a cada 30s) caso haja pendência
  setInterval(() => {
    if (navigator.onLine) syncNow();
  }, 30000);
}
