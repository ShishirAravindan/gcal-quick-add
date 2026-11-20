import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'transformers': ['@xenova/transformers'],
        }
      }
    }
  },
  base: '/gcal-quick-add/',
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['../tests/**/*.{test,spec}.js'],
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'quick-add-logo.png'],
      manifest: {
        name: 'GCal Quick Add',
        short_name: 'GCal Add',
        description: 'Quickly add events to Google Calendar using natural language',
        theme_color: '#f4f3eb',
        background_color: '#f4f3eb',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
