/**
 * Ticket 9.5. Somewhere for a failure to go.
 *
 * WHY THIS IS A SHIM AND NOT SENTRY
 *
 * Sentry needs a DSN that belongs to whoever runs this, and hard-coding an
 * import of @sentry/react would put 60kb into the bundle for every install
 * that never configures one. So this is the seam: everything reports through
 * `report`, and wiring Sentry is adding an initialiser here, in one file, with
 * every call site already in place.
 *
 * WHAT IS WORTH REPORTING, AND THE ONE THING THAT IS NOT
 *
 * Plan §9.5 asks specifically for an "alert on RLS-denied spikes", and that is
 * the interesting signal in a Supabase app: with no server layer, a policy
 * mistake shows up as a query that silently returns nothing. A denial is not
 * an error — the whole design relies on RLS filtering rows the caller may not
 * see — but a SPIKE in denials means either an attack or a policy that has
 * started refusing the wrong people. So they are counted separately from
 * errors and reported as a rate, never as an exception.
 *
 * The one thing deliberately not sent: row contents. A guest list, a phone
 * number and a budget figure are all things a couple gave this app and did not
 * give a monitoring vendor. Codes, counts, table names and paths only.
 */

export type Severity = 'error' | 'warning' | 'info';

export interface Report {
  severity: Severity;
  /** A short stable string, so occurrences group. */
  code: string;
  message: string;
  /** Never row data. Ids and counts are fine; names and amounts are not. */
  context?: Record<string, string | number | boolean | null>;
}

type Sink = (report: Report) => void;

const sinks: Sink[] = [];

/**
 * Register a destination. Called once at start-up when a DSN is configured;
 * with none registered, `report` falls back to the console in development and
 * does nothing in production — which is correct, because an unconfigured
 * install has nowhere to send anything and should not pretend otherwise.
 */
export function addSink(sink: Sink): void {
  sinks.push(sink);
}

export function report(r: Report): void {
  if (sinks.length === 0) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console[r.severity === 'error' ? 'error' : 'warn'](`[${r.code}] ${r.message}`, r.context);
    }
    return;
  }
  for (const sink of sinks) {
    try {
      sink(r);
    } catch {
      // A monitoring failure must never become an application failure.
    }
  }
}

/* ==========================================================================
   RLS denials
   ========================================================================== */

/** Postgres: insufficient_privilege. What a revoked grant looks like. */
const PG_DENIED = '42501';

interface DenialWindow {
  since: number;
  count: number;
}

const WINDOW_MS = 60_000;

/**
 * A handful in a minute is somebody hitting a screen their role does not cover,
 * which is ordinary. Twenty is not ordinary.
 */
const SPIKE = 20;

const denials: DenialWindow = { since: Date.now(), count: 0 };

/**
 * Records a permission denial and reports only when the rate is abnormal.
 *
 * Reporting every denial would bury the signal: a coordinator opening the
 * budget screen produces one, and that is the design working. The spike is
 * what means something.
 */
export function recordDenial(where: string): void {
  const now = Date.now();
  if (now - denials.since > WINDOW_MS) {
    denials.since = now;
    denials.count = 0;
  }
  denials.count += 1;

  if (denials.count === SPIKE) {
    report({
      severity: 'warning',
      code: 'rls.denial_spike',
      message: `${SPIKE} permission denials in under a minute`,
      context: { where, windowMs: WINDOW_MS },
    });
  }
}

/**
 * Wraps a Supabase error on its way to the UI.
 *
 * Returns the message to show. The distinction that matters: a denial is
 * expected and gets a sentence somebody can act on, while anything else is a
 * fault and gets reported.
 */
export function describeSupabaseError(
  error: { code?: string; message?: string } | null | undefined,
  where: string,
): string {
  if (!error) return 'Something went wrong.';

  if (error.code === PG_DENIED) {
    recordDenial(where);
    return 'Your role does not have access to that.';
  }

  report({
    severity: 'error',
    code: `supabase.${error.code ?? 'unknown'}`,
    message: error.message ?? 'Unknown Supabase error',
    context: { where },
  });

  return error.message ?? 'Something went wrong.';
}
