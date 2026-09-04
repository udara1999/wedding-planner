import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile, loaded only when a site key is configured.
 *
 * The key is deliberately optional. Turnstile needs a Cloudflare account that
 * belongs to whoever runs the app, and the RSVP page has to work before that
 * exists — the Edge Function's rate limits are in force either way, and a
 * blank challenge that no guest can pass would be a worse failure than an
 * unchallenged reply. When the key is absent this hook reports
 * `enabled: false` and the form simply does not render a widget.
 */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'flexible' | 'compact';
    },
  ) => string;
  reset: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  // One shared promise: two widgets on a page must not each inject the script.
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Turnstile could not be loaded'));
    document.head.appendChild(el);
  });
  return scriptPromise;
}

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const enabled = Boolean(SITE_KEY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        if (widgetId.current) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY!,
          size: 'flexible',
          callback: (t) => setToken(t),
          // A token is good for a few minutes. Someone filling in a dietary
          // note slowly can outlast it, so an expiry clears the token and the
          // widget re-challenges rather than the submit failing later.
          'expired-callback': () => setToken(null),
          'error-callback': () => setFailed(true),
        });
      })
      .catch(() => {
        // Cloudflare unreachable. The function treats a missing token as
        // acceptable in that case rather than stranding the guest.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    enabled,
    /** Ready to submit: either no challenge is configured, or it has been passed. */
    ready: !enabled || failed || Boolean(token),
    token: token ?? undefined,
    failed,
    containerRef,
    reset: () => {
      setToken(null);
      if (window.turnstile && widgetId.current) window.turnstile.reset(widgetId.current);
    },
  };
}
