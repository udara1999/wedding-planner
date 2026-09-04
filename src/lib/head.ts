import { useEffect } from 'react';

/**
 * Per-route title, description and indexability.
 *
 * WHY BOTH THIS AND robots.txt
 *
 * robots.txt (generated in vite.config.ts) is the only thing that stops a
 * crawler which does not execute JavaScript, and most do not. But robots.txt
 * asks a crawler not to *fetch* a URL; it does not remove one that is already
 * indexed, and a disallowed URL can still appear in results if something links
 * to it. `noindex` is what actually keeps a page out, and Google honours it
 * after rendering. So: robots.txt for the crawlers that never run the app,
 * noindex for the one that does.
 *
 * The route this matters for is /rsvp/:token. It is unauthenticated by design
 * and the token is the credential, so an indexed RSVP URL is a household's name
 * in a search result and a working link for whoever finds it.
 *
 * Deliberately not a library. react-helmet and friends exist to manage dozens
 * of tags across a content site; this app has one public page and a rule about
 * the rest.
 */

const DEFAULT_TITLE = 'MangalaHub';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export interface Head {
  /** Appended to the site name, unless `exact` is set. */
  title?: string;
  description?: string;
  /**
   * Private by default. Every screen in this app except the landing page holds
   * somebody's wedding, so the safe default is the one that keeps them out of
   * search, and a page has to ask to be indexed.
   */
  index?: boolean;
  /** Use `title` verbatim rather than appending the site name. */
  exact?: boolean;
}

export function useHead({ title, description, index = false, exact = false }: Head) {
  useEffect(() => {
    const previousTitle = document.title;

    if (title) document.title = exact ? title : `${title} · ${DEFAULT_TITLE}`;

    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description);
    }

    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      index
        ? 'index, follow, max-image-preview:large'
        : // nofollow as well: an RSVP page links nowhere useful, and a
          // household name is not something to pass on as a signal.
          'noindex, nofollow, noarchive',
    );

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, index, exact]);
}
