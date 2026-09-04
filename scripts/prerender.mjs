import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Injects the build-time-rendered landing page into dist/index.html.
 *
 * Runs after both Vite builds: the client one produces dist/index.html with
 * the hashed asset links, the SSR one produces dist-ssr/prerender.js.
 *
 * Fails loudly. A silent failure here ships an empty #root, which is exactly
 * the invisible regression the whole exercise exists to remove — the site
 * would look fine to a person and blank to every crawler.
 */
const MARKER = '<!--prerender-->';
const HTML = 'dist/index.html';
const ENTRY = 'dist-ssr/prerender.js';

function fail(message) {
  console.error(`\nprerender: ${message}\n`);
  process.exit(1);
}

if (!existsSync(HTML)) fail(`${HTML} not found — run the client build first.`);
if (!existsSync(ENTRY)) fail(`${ENTRY} not found — run the SSR build first.`);

const { render } = await import(pathToFileURL(ENTRY).href);
const html = readFileSync(HTML, 'utf8');

if (!html.includes(MARKER)) {
  fail(`${MARKER} is missing from index.html, so there is nowhere to inject.`);
}

const markup = render();
if (!markup.includes('<h1')) {
  // Cheap sanity check on the output rather than trusting that a render which
  // did not throw produced a page.
  fail('the rendered markup has no <h1> — the landing page did not render.');
}

writeFileSync(HTML, html.replace(MARKER, markup));
console.log(`prerender: injected ${markup.length.toLocaleString()} characters into ${HTML}`);
