// Service Worker manual — app shell + stale-while-revalidate para dados.
// VERSÃO: incremente a cada deploy para forçar atualização do cache.
const SW_VERSION = "sv-v1";
const SHELL_CACHE = `${SW_VERSION}-shell`;
const DATA_CACHE  = `${SW_VERSION}-data`;

// Arquivos do app shell (cacheados na instalação)
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

// Instala: cacheia o shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Ativa: limpa caches de versões antigas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(SW_VERSION)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Mensagem para ativar nova versão imediatamente (botão "recarregar")
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só GET é cacheável; POST/PUT/PATCH/DELETE passam direto
  if (request.method !== "GET") return;

  // Chamadas à API → stale-while-revalidate (mostra cache, atualiza em background)
  if (url.href.includes("api.svfinance.com.br")) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
          .catch(() => cached); // sem rede → devolve cache
        return cached || network;
      })
    );
    return;
  }

  // Navegação / assets do app → cache-first com fallback à rede
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((res) => {
        // Cacheia assets do próprio domínio (JS/CSS com hash do Vite)
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => caches.match("/index.html")); // SPA fallback
    })
  );
});