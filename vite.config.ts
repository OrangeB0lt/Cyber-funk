/* Vite config for the game (dev server and production build). Vitest has its own vitest.config.ts. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  build: { target: 'es2022', sourcemap: true },
});
