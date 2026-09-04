import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface RsvpHousehold {
  household_name: string;
  adults_invited: number;
  children_invited: number;
  rsvp_status: string;
  adults_attending: number;
  children_attending: number;
  dietary: string | null;
  needs_room: boolean;
  needs_transport: boolean;
  wedding_display: string;
  wedding_date: string | null;
}

/**
 * The public side of the RSVP (tickets 4.5 / 4.6, guarded by 4.7).
 *
 * Everything goes through the `rsvp` Edge Function. It is not a convenience
 * wrapper: as of migration 20260904000200 `anon` has no EXECUTE on
 * `rsvp_lookup` or `rsvp_submit`, so this is the only route in. That is what
 * makes the rate limits mandatory rather than advisory — there is no longer a
 * way round them from a browser.
 *
 * A token that matches nothing comes back as `{ household: null }` with a 200,
 * the same as a token that matches a household with nothing to show. "Not
 * found" is therefore a normal outcome here, not a failure.
 */
async function callRsvp<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('rsvp', { body });

  // A non-2xx reply carries a message written to be shown to a guest — an
  // over-count, a rate limit — so it is surfaced rather than replaced. The
  // response has to be read out of the error to get at it.
  if (error) {
    let message = 'Something went wrong. Please try again.';
    const res = (error as { context?: Response }).context;
    if (res && typeof res.json === 'function') {
      try {
        const parsed = (await res.json()) as { error?: string };
        if (parsed?.error) message = parsed.error;
      } catch {
        // Keep the generic message rather than showing a raw body.
      }
    }
    throw new Error(message);
  }

  return data as T;
}

export function useRsvpLookup(token: string | null) {
  return useQuery({
    queryKey: ['rsvp', token] as const,
    enabled: Boolean(token),
    // A wrong link will not become right by asking again — and retrying spends
    // the household's rate-limit budget on a request that cannot succeed.
    retry: false,
    queryFn: async (): Promise<RsvpHousehold | null> => {
      const data = await callRsvp<{ household: RsvpHousehold | null }>({
        action: 'lookup',
        token,
      });
      return data.household ?? null;
    },
  });
}

export interface RsvpAnswer {
  adults: number;
  children: number;
  dietary: string;
  needsRoom: boolean;
  needsTransport: boolean;
  message: string;
  /** Present only when a Turnstile site key is configured; see turnstile.ts. */
  turnstileToken?: string;
}

export function useRsvpSubmit(token: string | null) {
  return useMutation({
    mutationFn: async (answer: RsvpAnswer) => {
      await callRsvp<{ ok: boolean }>({
        action: 'submit',
        token,
        adults: answer.adults,
        children: answer.children,
        dietary: answer.dietary || null,
        needsRoom: answer.needsRoom,
        needsTransport: answer.needsTransport,
        message: answer.message || null,
        turnstileToken: answer.turnstileToken,
      });
    },
  });
}
