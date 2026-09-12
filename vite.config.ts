import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// قاعدة المسار: عدّل VITE_BASE عند النشر على GitHub Pages داخل مجلد فرعي.
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('dexie')) return 'db';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': لا يُطبَّق التحديث تلقائيًا حتى لا ينقطع عمل المستخدم.
      // التسجيل يتم يدويًا عبر useRegisterSW داخل UpdatePrompt.
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        id: '/',
        name: 'مصاريف',
        short_name: 'مصاريف',
        description: 'تطبيق إدارة المصاريف الشخصية — يعمل بالكامل على جهازك',
        lang: 'ar',
        dir: 'rtl',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0E0E0D',
        theme_color: '#0E0E0D',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
