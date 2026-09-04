import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from './features/marketing/LandingPage';

// Deliberately no CSS import. This entry produces markup, not styles: the
// class names are all that is needed, and the client build already emits the
// stylesheet that index.html links. Importing index.css here also breaks the
// SSR build outright, because Tailwind's `@import 'tailwindcss'` does not
// resolve under vite's ssr environment.

/**
 * Renders the landing page to HTML at build time.
 *
 * The problem this solves: the app is client-rendered, so `#root` shipped
 * empty and every crawler and share scraper that does not execute JavaScript —
 * Facebook, WhatsApp, LinkedIn, Slack, iMessage, and Google's own first pass —
 * saw a blank document. The previous fix was a short hand-written hero inside
 * `#root`, which worked and was a second copy of the copy, free to drift.
 *
 * This renders the real component instead, so there is exactly one landing
 * page and the built HTML cannot disagree with it.
 *
 * MemoryRouter rather than StaticRouter: react-router 7 merged the packages
 * and the four <Link>s here only need a router in context to render their
 * href. renderToStaticMarkup rather than renderToString because nothing
 * hydrates this — see main.tsx — so the hydration markers would be bytes
 * spent on nothing.
 *
 * LandingPage is deliberately free of providers: no QueryClient, no
 * AuthProvider, no session. That is what makes it renderable here at all, and
 * it is worth keeping that way.
 */
export function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <LandingPage />
    </MemoryRouter>,
  );
}
