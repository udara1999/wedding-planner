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
 * The public side of the RSVP (tickets 4.5 / 4.6).
 *
 * These two RPCs are the ONLY thing an unauthenticated caller can reach — anon
 * has no grant on `guests` or `rsvp_submissions`. A token that matches nothing
 * comes back as an empty list rather than an error, so this treats "not found"
 * as a normal outcome rather than a failure.
 */
export function useRsvpLookup(token: string | null) {
  return useQuery({
    queryKey: ['rsvp', token] as const,
    enabled: Boolean(token),
    // A wrong link will not become right by asking again.
    retry: false,
    queryFn: async (): Promise<RsvpHousehold | null> => {
      const { data, error } = await supabase.rpc('rsvp_lookup', { p_token: token! });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as RsvpHousehold[];
      return rows[0] ?? null;
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
}

export function useRsvpSubmit(token: string | null) {
  return useMutation({
    mutationFn: async (answer: RsvpAnswer) => {
      const { error } = await supabase.rpc('rsvp_submit', {
        p_token: token!,
        p_adults: answer.adults,
        p_children: answer.children,
        p_dietary: answer.dietary || undefined,
        p_needs_room: answer.needsRoom,
        p_needs_transport: answer.needsTransport,
        p_message: answer.message || undefined,
      });
      // The function raises for an invalid token or an over-count, and the
      // message is written to be safe to show a guest.
      if (error) throw new Error(error.message);
    },
  });
}
