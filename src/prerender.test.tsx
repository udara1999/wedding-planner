import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import mainSource from './main.tsx?raw';
import { render } from './prerender';

/**
 * What this guards is parity, in two directions.
 *
 * index.html declares a FAQPage and a SoftwareApplication in JSON-LD. Google
 * treats structured data describing content a visitor cannot actually read as
 * spam, and it is a manual action rather than a ranking nudge. The FAQ answers
 * live in two files by necessity — a crawler that runs no JavaScript needs
 * them in the head, a person needs them on the page — so the only thing
 * keeping them honest is a test.
 *
 * The other direction is the injection itself. If the marker or the render
 * ever stops lining up, the build ships an empty #root: fine to a person with
 * JavaScript, blank to every crawler and every share preview.
 */

/** The FAQPage entries as index.html declares them to search engines. */
function faqFromJsonLd(): { question: string; answer: string }[] {
  const script = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  expect(script, 'no JSON-LD block in index.html').not.toBeNull();

  const graph = JSON.parse(script![1]) as {
    '@graph': { '@type': string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[];
  };
  const faq = graph['@graph'].find((node) => node['@type'] === 'FAQPage');
  expect(faq?.mainEntity, 'no FAQPage in the JSON-LD @graph').toBeDefined();

  return faq!.mainEntity!.map((entry) => ({
    question: entry.name,
    answer: entry.acceptedAnswer.text,
  }));
}

/** Visible text of the rendered page, whitespace collapsed as a browser would. */
function renderedText(): string {
  return (
    render()
      .replace(/<[^>]+>/g, ' ')
      // React escapes text nodes, so an apostrophe arrives as &#x27; and would
      // fail every comparison against the plain copy in the JSON-LD. These
      // five are the whole set renderToStaticMarkup produces; &amp; is decoded
      // last so a literal "&amp;lt;" in the copy survives as text.
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

describe('landing page prerender', () => {
  it('renders the page a crawler needs to see', () => {
    const markup = render();

    expect(markup).toContain('<h1');
    expect(markup).toContain('Plan a Sri Lankan wedding without twenty-seven spreadsheet tabs');
    // Six feature cards under one h2, plus the FAQ and closing sections: a
    // heading tree, not a wall.
    expect(markup.match(/<h2/g)).toHaveLength(3);
    expect(markup.match(/<h3/g)).toHaveLength(6);
    // Enough prose to be a page rather than a splash screen.
    expect(renderedText().length).toBeGreaterThan(2000);
  });

  it('has somewhere to inject, matching what scripts/prerender.mjs looks for', () => {
    expect(html).toContain('<div id="root"><!--prerender--></div>');
    expect(html.match(/<!--prerender-->/g)).toHaveLength(1);
  });

  it('shows every FAQ answer it declares in structured data', () => {
    const text = renderedText();
    const faq = faqFromJsonLd();

    expect(faq).toHaveLength(4);

    for (const { question, answer } of faq) {
      expect(text, `question missing from the page: ${question}`).toContain(question);

      // Compared in full, because a half-copied answer is the exact failure
      // this catches. Both sides are normalised the same way, so the wrapping
      // JSX applies to the source does not matter.
      const normalised = answer.replace(/\s+/g, ' ').trim();
      expect(text, `answer missing from the page: ${question}`).toContain(normalised);
    }
  });
});

/**
 * The paint guard spans three files — the inline script in index.html sets the
 * attribute, index.css hides #root while it is set, src/main.tsx removes it
 * once the markup is gone. Drop any one leg and the result is silent: without
 * the script, the landing hero flashes over every deep link; without the
 * removal in main.tsx, the entire app stays invisible forever.
 */
describe('the prerendered markup is hidden when it is the wrong page', () => {
  /** The inline guard, run as index.html runs it, against the real document. */
  function runGuard() {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    // Only one bare <script> in index.html; the JSON-LD block has a type.
    expect(scripts, 'expected exactly one inline guard script').toHaveLength(1);
    new Function(scripts[0][1])();
  }

  const ATTRIBUTE = 'data-hide-prerender';

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(ATTRIBUTE);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(ATTRIBUTE);
  });

  it('leaves the landing page visible for a visitor arriving at /', () => {
    history.replaceState(null, '', '/');
    runGuard();
    expect(document.documentElement.hasAttribute(ATTRIBUTE)).toBe(false);
  });

  it('hides it on a deep link, which the SPA fallback also serves this HTML for', () => {
    history.replaceState(null, '', '/w/abc-123/budget');
    runGuard();
    expect(document.documentElement.hasAttribute(ATTRIBUTE)).toBe(true);
  });

  it('hides it for someone already signed in', () => {
    history.replaceState(null, '', '/');
    // The shape supabase-js persists a session under.
    localStorage.setItem('sb-ejrsxxxvlxdarmmfgsku-auth-token', '{"access_token":"x"}');
    runGuard();
    expect(document.documentElement.hasAttribute(ATTRIBUTE)).toBe(true);
  });

  it('keeps the rule and the removal that undoes it', () => {
    // Inline in the head, so it also applies in development, where index.css
    // arrives too late to matter.
    expect(html, 'index.html no longer has a rule acting on the attribute').toMatch(
      /<style>\s*\[data-hide-prerender\]\s*#root\s*\{\s*visibility:\s*hidden;?\s*\}\s*<\/style>/,
    );
    // Without this the app is hidden for good, on every route but "/".
    expect(mainSource, 'main.tsx no longer removes the attribute').toContain(
      `removeAttribute('${ATTRIBUTE}')`,
    );
    // And the prerendered markup must be discarded, not left under the app.
    expect(mainSource).toContain('replaceChildren()');
  });
});
