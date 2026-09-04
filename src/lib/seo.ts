/**
 * Which URLs may be indexed, in one place.
 *
 * This lives in src rather than in vite.config.ts so it can be tested. The
 * failure it guards against is quiet and specific: somebody adds a route,
 * robots.txt is not updated, and a private page becomes crawlable. Nothing
 * about the app breaks, so nothing tells you.
 *
 * The route that makes this worth doing is /rsvp/:token. It is unauthenticated
 * by design and the token IS the credential, so an indexed RSVP URL is both a
 * household's name in a search result and a working link for anyone who finds
 * it. Guests paste those into group chats.
 */

/** The only paths a crawler should ever fetch. Everything else is private. */
export const PUBLIC_PATHS = ['/'] as const;

/**
 * Prefixes robots.txt disallows. A prefix rather than an exact path, so
 * /w/:id/budget is covered by /w/ without listing forty screens.
 */
export const DISALLOWED_PREFIXES = [
  '/rsvp/', // tokenised invitations — see above
  '/w/', // every authenticated wedding screen
  '/new',
  '/invite',
  '/signin',
  '/auth/',
] as const;

/** True when robots.txt already forbids this route. */
export function isDisallowed(path: string): boolean {
  return DISALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function robotsTxt(siteUrl: string): string {
  return [
    '# Everything here is private except the landing page. See src/lib/seo.ts',
    '# for why /rsvp/ in particular must never be indexed.',
    'User-agent: *',
    ...DISALLOWED_PREFIXES.map((path) => `Disallow: ${path}`),
    'Allow: /$',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * One URL, because one page is public. A sitemap listing app routes would be
 * inviting exactly what robots.txt forbids.
 */
export function sitemapXml(siteUrl: string, lastmod: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_PATHS.flatMap((path) => [
      '  <url>',
      `    <loc>${siteUrl}${path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>monthly</changefreq>',
      '    <priority>1.0</priority>',
      '  </url>',
    ]),
    '</urlset>',
    '',
  ].join('\n');
}
