/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { robotsTxt, sitemapXml } from './src/lib/seo.ts';

/**
 * Absolute URLs are required for canonical, og:url and a sitemap — a relative
 * canonical is ignored and a relative og:url breaks every share preview. There
 * is no correct default, so it comes from the environment.
 */
const SITE_URL = (process.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

function seoAssets(): Plugin {
  return {
    name: 'seo-assets',
    apply: 'build',

    // Client build only. The SSR build (src/prerender.tsx) exists to produce
    // one string of markup; robots.txt and a sitemap in dist-ssr/ would be two
    // copies of the same files, one of which never gets deployed.
    applyToEnvironment: (environment) => environment.name === 'client',

    // %SITE_URL% in index.html, so the canonical and og:url are absolute
    // without a domain hard-coded into the repository.
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', SITE_URL);
    },

    generateBundle() {
      // The policy itself lives in src/lib/seo.ts so it can be tested: a route
      // added without a matching Disallow is a private page turned crawlable,
      // and nothing about the app breaks to tell you.
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(SITE_URL) });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml(SITE_URL, new Date().toISOString().slice(0, 10)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), seoAssets()],
  server: { port: 5173 },

  // The SSR build is a means to an end: scripts/prerender.mjs imports it,
  // reads one string out of it, and dist-ssr/ is then throwaway. Copying
  // public/ into it would duplicate every icon and the service worker.
  environments: { ssr: { build: { copyPublicDir: false } } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
