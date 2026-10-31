/* Entry point. Mounts the React app. The real shell arrives with the vertical slice (P2). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@ui/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
