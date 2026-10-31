/* End-to-end tests drive the production build in a 360×740 touch phone, the game's target device.
   Service workers are blocked so tests always see the freshly built files (the PWA has its own spec).

   Two suites:
   - local (default, `npm run e2e`): a `test`-mode build with no server (cloud saves off), served by
     vite preview, with the window.CF handle tests use to set up states.
   - stack (E2E_STACK_URL=http://localhost:8080 npx playwright test): tests/e2e/stack against the
     running Docker stack (docker compose up): the production image, the API and Postgres. */
import { defineConfig } from '@playwright/test';

const stackUrl = process.env.E2E_STACK_URL;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: stackUrl ?? 'http://localhost:4173',
    browserName: 'chromium',
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    testIdAttribute: 'data-testid',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: stackUrl
    ? [{ name: 'stack', testMatch: 'stack/**/*.spec.ts', timeout: 120_000 }]
    : [{ name: 'local', testIgnore: 'stack/**' }],
  // A `test`-mode build: production code plus the window.CF handle tests use to set up states.
  webServer: stackUrl
    ? undefined
    : {
        command:
          'npx vite build --mode test --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
