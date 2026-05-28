// Registra o Service Worker e detecta nova versão disponível.
// Dispara evento "sv-update-ready" quando há atualização esperando.

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Detecta atualização
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            // Há uma nova versão esperando
            window.dispatchEvent(new CustomEvent("sv-update-ready", { detail: { reg } }));
          }
        });
      });
    }).catch(() => {});

    // Quando o novo SW assume, recarrega
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

export function applyUpdate(reg) {
  if (reg?.waiting) reg.waiting.postMessage("SKIP_WAITING");
}