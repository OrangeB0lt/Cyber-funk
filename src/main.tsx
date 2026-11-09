/* Entry point: create the game, expose a test handle in dev builds, mount React. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from '@app/game';
import { CloudApi } from '@app/save/cloud';
import { App } from '@ui/App';
import '@ui/styles/global.css';

// Cloud saves need the server (compose.yaml). VITE_CLOUD=off builds a local-only game: the e2e
// suite's test mode (.env.test) and any static hosting.
const app = new GameApp({ cloud: import.meta.env.VITE_CLOUD === 'off' ? null : new CloudApi() });
app.start();
try {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    app.view.titleSettings.reduceMotion = true;
} catch {
  /* ignore */
}

// Debug handle for the dev menu, Playwright and the Playwright MCP. Not in production builds.
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  (window as unknown as { CF: unknown }).CF = app;
}

// The service worker (vite-plugin-pwa): precaches the game so it runs offline, and offers each new
// version at a hub screen instead of swapping it in mid-fight. Production builds only.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({ onNeedRefresh: () => app.offerUpdate(() => update(true)) });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App app={app} />
  </StrictMode>,
);
