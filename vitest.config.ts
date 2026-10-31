/* Vitest config. Tests run in Node by default; component tests opt into jsdom with a
   `// @vitest-environment jsdom` comment at the top of the file. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts', 'tests/integration/**/*.test.{ts,tsx}'],
    environment: 'node',
    testTimeout: 30_000,
  },
});
