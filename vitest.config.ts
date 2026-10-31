/* Vitest config. Tests run in Node by default; component tests opt into jsdom with a
   `// @vitest-environment jsdom` comment at the top of the file.

   Two projects: `game` (everything in src/, tools/ and tests/integration; no database, seconds) and
   `server` (server/**, against a real Postgres; see server/testing/db.ts). `npm test` runs `game`,
   `npm run test:server` runs `server`. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'node',
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'game',
          include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.ts', 'tests/integration/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'server',
          include: ['server/**/*.test.ts'],
          // One database: files take turns.
          fileParallelism: false,
        },
      },
    ],
  },
});
