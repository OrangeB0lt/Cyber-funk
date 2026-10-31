/* Entry point: create the game, expose a test handle in dev builds, mount React. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameApp } from '@app/game';
import { App } from '@ui/App';
import '@ui/styles/global.css';

const app = new GameApp();
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App app={app} />
  </StrictMode>,
);
