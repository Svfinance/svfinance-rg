// src/offline/registerSW.js
export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        })

        setInterval(() => registration.update(), 60 * 1000)

        registration.addEventListener('updatefound', () => {
          const newSW = registration.installing
          if (!newSW) return
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // Avisa o OfflineBar que tem versão nova
              window.dispatchEvent(new CustomEvent('sv-update-ready', { detail: { reg: registration } }))
            }
          })
        })

        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) { refreshing = true; window.location.reload() }
        })

      } catch (err) {
        console.warn('[SW] Registro falhou:', err)
      }
    })
  }
}

// Chamado pelo OfflineBar quando usuário clica "Recarregar"
export function applyUpdate(registration) {
  if (registration?.waiting) {
    registration.waiting.postMessage('SKIP_WAITING')
  }
}