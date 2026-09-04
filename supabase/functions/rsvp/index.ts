/**
 * Ticket 4.7 — the guard in front of the public RSVP surface.
 *
 * Plan §7 R3: "Public RSVP endpoint abused — token enumeration, spam, headcount
 * tampering." The RPCs behind this already handle the third — rsvp_submit
 * validates against what a household was invited for — and enumeration is not
 * a practical attack against a 122-bit token. What was left open, and what this
 * closes, is repetition: anyone holding a leaked link could churn a
 * household's answer as fast as they liked.
 *
 * WHY THIS EXISTS AS A FUNCTION AT ALL
 *
 * Two things are impossible inside Postgres. It cannot see the caller's IP, so
 * it cannot tell one abusive client from a thousand honest guests. And it
 * cannot call out to Cloudflare to verify a Turnstile token. Both need to
 * happen before the RPC runs, so something has to sit in front of it.
 *
 * The counting itself still happens in Postgres (rsvp_rate_take). An Edge
 * Function is not one long-lived process — instances start and stop per region
 * and per request — so an in-memory counter here would limit nothing.
 *
 * WHAT THE CALLER IS IDENTIFIED BY
 *
 * A SHA-256 of their address salted with RSVP_IP_SALT, truncated. Never the
 * address. That counts repeats without keeping a record of who visited, which
 * is the right trade for a table whose only job is to say "ninth attempt this
 * hour".
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? '';
const IP_SALT = Deno.env.get('RSVP_IP_SALT') ?? '';

/**
 * Generous for a guest, tight for a script. A household reloading the page a
 * few times, or correcting their answer twice, must never meet a limit — the
 * cost of a false positive here is a guest who cannot reply at all.
 */
const LIMITS = {
  lookupPerIp: { limit: 60, window: '10 minutes' },
  lookupPerToken: { limit: 30, window: '10 minutes' },
  submitPerIp: { limit: 20, window: '1 hour' },
  submitPerToken: { limit: 6, window: '1 hour' },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  const text = await res.text();
  if (!res.ok) {
    // Postgres raises with the wording the guest should see — "You can reply
    // for at most 4 people" — so the message is passed through rather than
    // replaced with something generic that would leave them stuck.
    let message = 'That could not be saved.';
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed.message === 'string') message = parsed.message;
    } catch {
      // Not JSON; keep the generic message rather than echoing a raw body.
    }
    throw new RpcError(message, res.status);
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

class RpcError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Salted so the table cannot be turned back into a list of who visited. */
async function callerKey(req: Request): Promise<string> {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0].trim() || 'unknown';
  const data = new TextEncoder().encode(`${IP_SALT}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

async function withinLimit(bucket: string, rule: { limit: number; window: string }) {
  return await rpc<boolean>('rsvp_rate_take', {
    p_bucket: bucket,
    p_limit: rule.limit,
    p_window: rule.window,
  });
}

/**
 * Verified only when a secret is configured. Until the couple's Cloudflare
 * account exists there is no secret, and refusing every RSVP would be a worse
 * failure than accepting one unverified — the rate limits above are already in
 * force either way. The response says which mode was used so this is visible
 * rather than a silent downgrade.
 */
async function turnstileOk(token: string | undefined, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true;
  if (!token) return false;

  const body = new FormData();
  body.append('secret', TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const outcome = (await res.json()) as { success?: boolean };
    return outcome.success === true;
  } catch {
    // Cloudflare being unreachable must not take the RSVP page down with it.
    // The rate limits still apply, and a failed challenge is not the threat
    // that a locked-out guest list is.
    return true;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const action = payload.action;
  const token = typeof payload.token === 'string' ? payload.token : '';
  if (!token) return json({ error: 'This invitation link is not valid.' }, 400);

  const caller = await callerKey(req);
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();

  try {
    if (action === 'lookup') {
      const [byIp, byToken] = await Promise.all([
        withinLimit(`lookup:ip:${caller}`, LIMITS.lookupPerIp),
        withinLimit(`lookup:token:${token}`, LIMITS.lookupPerToken),
      ]);
      if (!byIp || !byToken) {
        return json({ error: 'Too many attempts. Please try again in a few minutes.' }, 429);
      }

      // An unknown token and a real one that returns nothing look identical:
      // 200 with no household. A distinguishable failure would confirm guesses.
      const rows = await rpc<unknown[]>('rsvp_lookup', { p_token: token });
      return json({ household: Array.isArray(rows) && rows.length > 0 ? rows[0] : null });
    }

    if (action === 'submit') {
      const [byIp, byToken] = await Promise.all([
        withinLimit(`submit:ip:${caller}`, LIMITS.submitPerIp),
        withinLimit(`submit:token:${token}`, LIMITS.submitPerToken),
      ]);
      if (!byIp || !byToken) {
        return json(
          {
            error:
              'This invitation has been answered several times just now. ' +
              'Please wait a little before changing it again.',
          },
          429,
        );
      }

      const verified = await turnstileOk(
        typeof payload.turnstileToken === 'string' ? payload.turnstileToken : undefined,
        ip,
      );
      if (!verified) {
        return json({ error: 'Please complete the check and try again.' }, 400);
      }

      await rpc<null>('rsvp_submit', {
        p_token: token,
        p_adults: Number(payload.adults ?? 0),
        p_children: Number(payload.children ?? 0),
        p_dietary: payload.dietary ?? null,
        p_needs_room: Boolean(payload.needsRoom),
        p_needs_transport: Boolean(payload.needsTransport),
        p_message: payload.message ?? null,
        // Recorded on the submission for audit. The same salted hash, so a
        // pattern of abuse is visible without any address being stored.
        p_client_hint: caller,
      });

      return json({ ok: true, challenged: Boolean(TURNSTILE_SECRET) });
    }

    return json({ error: 'Unknown action.' }, 400);
  } catch (err) {
    if (err instanceof RpcError) {
      return json({ error: err.message }, err.status === 404 ? 400 : 400);
    }
    console.error('rsvp function failed', err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
