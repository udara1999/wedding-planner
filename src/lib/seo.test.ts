import { describe, expect, it } from 'vitest';
import appSource from '../App.tsx?raw';
import { DISALLOWED_PREFIXES, PUBLIC_PATHS, isDisallowed, robotsTxt, sitemapXml } from './seo';

/**
 * The guard this file exists for.
 *
 * Adding a route is a one-line change and forgetting robots.txt is free —
 * nothing breaks, no test fails, and a page holding somebody's guest list
 * quietly becomes crawlable. So the route table in App.tsx is read back and
 * every path checked against the policy.
 */
const routePaths = [...appSource.matchAll(/path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== '*')
  // Nested routes are relative; only the top-level ones are URLs a crawler
  // could fetch directly, and /w/ covers all their children by prefix.
  .filter((p) => p.startsWith('/'));

describe('every route is either public or disallowed', () => {
  it('found the route table', () => {
    // If the regex ever stops matching, every assertion below passes vacuously.
    expect(routePaths.length).toBeGreaterThan(5);
    expect(routePaths).toContain('/rsvp/:token');
  });

  it.each(routePaths)('%s', (path) => {
    const isPublic = (PUBLIC_PATHS as readonly string[]).includes(path);
    expect(
      isPublic || isDisallowed(path),
      `${path} is neither in PUBLIC_PATHS nor covered by a Disallow prefix`,
    ).toBe(true);
  });

  it('disallows the RSVP route specifically', () => {
    // The one that carries a household's name and a working credential.
    expect(isDisallowed('/rsvp/abc-123')).toBe(true);
  });

  it('does not disallow the landing page', () => {
    expect(isDisallowed('/')).toBe(false);
  });
});

describe('robotsTxt', () => {
  const txt = robotsTxt('https://example.com');

  it('names every disallowed prefix', () => {
    for (const prefix of DISALLOWED_PREFIXES) {
      expect(txt).toContain(`Disallow: ${prefix}`);
    }
  });

  it('points at the sitemap with an absolute URL', () => {
    // A relative Sitemap: line is ignored.
    expect(txt).toContain('Sitemap: https://example.com/sitemap.xml');
  });

  it('allows the landing page explicitly', () => {
    expect(txt).toContain('Allow: /$');
  });
});

describe('sitemapXml', () => {
  const xml = sitemapXml('https://example.com', '2026-09-04');

  it('lists only the public paths', () => {
    expect([...xml.matchAll(/<loc>/g)]).toHaveLength(PUBLIC_PATHS.length);
    expect(xml).toContain('<loc>https://example.com/</loc>');
  });

  it('never lists a private route', () => {
    // Only the <loc> values, not the whole document: the sitemap namespace URL
    // is `//www.sitemaps.org/...`, which contains "/w" and made a naive
    // substring check fail against the /w/ prefix.
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    for (const loc of locs) {
      const path = new URL(loc).pathname;
      expect(isDisallowed(path), `${loc} is in the sitemap and disallowed`).toBe(false);
    }
  });

  it('is well-formed enough to declare its namespace and lastmod', () => {
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('<lastmod>2026-09-04</lastmod>');
  });
});
