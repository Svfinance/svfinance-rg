// src/hooks/useCache.js
// Cache simples com sessionStorage para acelerar carregamento de páginas.
// TTL padrão: 60s. Invalida ao fazer mutations (criar/editar/deletar).

const DEFAULT_TTL = 60000; // 60 segundos

export function cacheGet(key, ttl = DEFAULT_TTL) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

export function cacheSet(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function cacheInvalidate(...keys) {
  keys.forEach(key => {
    try { sessionStorage.removeItem(key); } catch {}
  });
}

export function cacheInvalidateAll() {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith("sv_"));
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch {}
}

// Hook para usar em componentes React
import { useState, useEffect, useCallback } from "react";

export function useCachedFetch(key, fetcher, deps = []) {
  const [data, setData]       = useState(() => cacheGet(key) || null);
  const [loading, setLoading] = useState(!cacheGet(key));
  const [error, setError]     = useState(null);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = cacheGet(key);
      if (cached) { setData(cached); setLoading(false); return; }
    }
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      cacheSet(key, result);
      setError(null);
    } catch (e) {
      setError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [key, ...deps]);

  useEffect(() => { load(); }, []);

  return { data, loading, error, reload: () => load(true) };
}
