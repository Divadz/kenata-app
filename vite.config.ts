import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// PWA minimale pour le Lot 0 : installable + service worker.
// Le cache offline complet des données est traité au Lot 5.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kenata',
        short_name: 'Kenata',
        description: 'App de gestion du groupe Kenata',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/',
        icons: [
          // Remplacer par de vraies icônes dans public/icons/
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    // En dev : le frontend appelle /api → serveur PHP local.
    // Lance l'API avec :  php -S localhost:8000 -t . api/index.php   (ou via IONOS)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
