import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Ticket 8.7. Registers the shell cache so the app opens with no signal.
 *
 * Production only. In development a service worker serves stale assets over
 * Vite's own hot reload, which costs an hour the first time it happens and
 * teaches nobody anything.
 *
 * Failure is swallowed on purpose: an unsupported browser, a private window,
 * or a page served over plain HTTP all reject here, and none of them is worth
 * an error in front of somebody. The printed pack is the real mitigation for
 * R8 (see features/dayof/PackPage.tsx); this is the convenience on top.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Nothing to do and nothing worth saying.
    });
  });
}
