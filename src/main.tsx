import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/**
 * The landing page is rendered into #root at build time (src/prerender.tsx),
 * so a crawler and a slow connection both get a real page. It is *replaced*
 * here, not hydrated: hydration would mean shipping a second render of the
 * same markup and matching it exactly, to save mounting six static cards.
 *
 * The markup is cleared synchronously instead of leaving it to React, which
 * clears the container only when it first commits — a gap long enough to paint
 * the landing page over the app. See index.html for the same problem in the
 * window before this bundle runs.
 */
const container = document.getElementById('root')!;
container.replaceChildren();
document.documentElement.removeAttribute('data-hide-prerender');

createRoot(container).render(
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
