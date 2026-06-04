import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      filename: 'sw.js',
      includeAssets: [
        'logo/restauraglass.png',
        'icons/rg/icon-192.png',
        'icons/rg/icon-512.png',
        'icons/rg/icon-maskable-512.png',
        'icons/rg/apple-touch-icon.png',
        'favicon.ico',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,ico,webmanifest}'],
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
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
      },
      manifest: {
        name: 'Restaura Glass',
        short_name: 'Restaura Glass',
        description: 'Sistema de gestão Restaura Glass — Especialista em Limpeza de Vidros',
        theme_color: '#2B5102',
        background_color: '#2B5102',
        display: 'standalone',
        start_url: '/dashboard',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/rg/icon-192.png',         sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/rg/icon-512.png',         sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/rg/icon-maskable-512.png',sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})