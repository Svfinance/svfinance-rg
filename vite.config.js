import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',       // atualiza silenciosamente, sem perguntar
      injectRegister: null,             // você registra manualmente no main.jsx
      filename: 'sw.js',               // nome do SW gerado
      includeAssets: [
        'logos/restauraglass.png',
        'icons/rg/*.png',
        'favicon.ico',
      ],
      workbox: {
        // Cacheia todos os assets gerados pelo Vite (com hash automático)
        globPatterns: ['**/*.{js,css,html,png,svg,webp,ico,webmanifest}'],
        // Stale-while-revalidate para a API
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.svfinance\.com\.br\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
        // Limpa caches antigos automaticamente
        cleanupOutdatedCaches: true,
        // SPA fallback
        navigateFallback: '/index.html',
      },
      // Seu manifest RG — plugin injeta no index.html automaticamente
      manifest: {
        name: 'Restaura Glass',
        short_name: 'Restaura Glass',
        description: 'Gestão de serviços Restaura Glass',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/rg/icon-192.png',      sizes: '192x192', type: 'image/png' },
          { src: '/icons/rg/icon-512.png',      sizes: '512x512', type: 'image/png' },
          { src: '/icons/rg/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/rg/apple-touch.png',   sizes: '180x180', type: 'image/png', purpose: 'apple touch icon' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})