/* Vite config for the game (dev server and production build). Vitest has its own vitest.config.ts. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { tsconfigPaths: true },
  build: { target: 'es2022', sourcemap: true },
});
