/* End-to-end tests drive the production build in a 360×740 touch phone, the game's target device.
   Service workers are blocked so tests always see the freshly built files (the PWA has its own spec). */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    browserName: 'chromium',
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    testIdAttribute: 'data-testid',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  // A `test`-mode build: production code plus the window.CF handle tests use to set up states.
  webServer: {
    command:
      'npx vite build --mode test --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
