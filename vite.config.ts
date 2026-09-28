import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 的網址是 https://<帳號>.github.io/learn_japanese/，所以正式版要加上子路徑
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/learn_japanese/') : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '日語練習帳 N5・N4',
        short_name: '日語練習帳',
        description: '從五十音之後開始：N5・N4 文法、單字、生活會話與互動練習，每天一課。',
        lang: 'zh-Hant-TW',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#FAF7F0',
        theme_color: '#B3362C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Google Fonts 也快取起來，離線時字型才不會跑掉
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
