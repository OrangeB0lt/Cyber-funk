/* Vite config for the game (dev server and production build). Vitest has its own vitest.config.ts.

   In development the cloud-save API runs separately (`npm run dev:server`, or the `api` service in
   compose.dev.yaml); the dev server forwards /api to it, so the game always talks to its own origin. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { tsconfigPaths: true },
  build: { target: 'es2022', sourcemap: true },
  server: {
    proxy: { '/api': process.env.API_PROXY ?? 'http://localhost:8787' },
    // File events can fail to reach a container through a bind mount; VITE_POLL=1 falls back to polling.
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
  },
});
