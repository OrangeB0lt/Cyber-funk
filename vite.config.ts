/* Vite config for the game (dev server and production build). Vitest has its own vitest.config.ts.

   In development the cloud-save API runs separately (`npm run dev:server`, or the `api` service in
   compose.dev.yaml); the dev server forwards /api to it, so the game always talks to its own origin. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [
    react(),
    // The PWA (ADR-0001): a manifest, icons (tools/icons.ts), and a service worker that precaches the
    // build. The cloud API is never cached or served from the cache: saves must reach the server or
    // fail loudly, and CloudSync retries.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'CYBER FUNK',
        short_name: 'CYBER FUNK',
        description: 'A Neon Orleans jazz-punk RPG. Fight with music. Play it on your phone.',
        theme_color: '#0b0218',
        background_color: '#0b0218',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        // /oauth2/ is the optional Google sign-in gateway (compose.auth.yaml): it must reach the network.
        navigateFallbackDenylist: [/^\/api\//, /^\/oauth2\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { tsconfigPaths: true },
  build: { target: 'es2022', sourcemap: true },
  server: {
    proxy: { '/api': process.env.API_PROXY ?? 'http://localhost:8787' },
    // File events can fail to reach a container through a bind mount; VITE_POLL=1 falls back to polling.
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
  },
});
