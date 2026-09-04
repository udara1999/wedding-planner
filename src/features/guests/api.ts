import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Tables } from '../../types/database.types';

export type GuestRow = Tables<'guests'>;
export type GuestGroupRow = Tables<'guest_groups'>;
export type RsvpStatus = GuestRow['rsvp_status'];

export const guestKeys = {
  list: (weddingId: string) => ['guests', weddingId] as const,
  groups: (weddingId: string) => ['guests', weddingId, 'groups'] as const,
};

/**
 * What comes back is already side-scoped by RLS: a family member sees their own
 * side, plus households marked 'both' or with no side set. The client does no
 * filtering of its own, so the list and the policy cannot disagree.
 */
export function useGuests(weddingId: string) {
  return useQuery({
    queryKey: guestKeys.list(weddingId),
    queryFn: async (): Promise<GuestRow[]> => {
      const res = await supabase
        .from('guests')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('household_name');
      return unwrap(res);
    },
  });
}

export function useGuestGroups(weddingId: string) {
  return useQuery({
    queryKey: guestKeys.groups(weddingId),
    queryFn: async (): Promise<GuestGroupRow[]> => {
      const res = await supabase
        .from('guest_groups')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

export type GuestInput = Partial<
  Pick<
    GuestRow,
    | 'group_id'
    | 'code'
    | 'household_name'
    | 'relationship'
    | 'side'
    | 'category'
    | 'vip'
    | 'adults_invited'
    | 'children_invited'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'city'
    | 'invitation_type'
    | 'invitation_sent'
    | 'invitation_sent_on'
    | 'rsvp_status'
    | 'rsvp_on'
    | 'adults_attending'
    | 'children_attending'
    | 'dietary'
    | 'needs_room'
    | 'needs_transport'
    | 'transport_type'
    | 'expected_gift_minor'
    | 'gift_received_minor'
    | 'notes'
  >
>;

function useInvalidate(weddingId: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: guestKeys.list(weddingId) });
}

export function useCreateGuest(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (input: GuestInput & { household_name: string }) => {
      const res = await supabase
        .from('guests')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That household could not be added.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateGuest(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: GuestInput }) => {
      const res = await supabase.from('guests').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // Family can read their side but not write, so a refused update is a
      // filtered one — zero rows means "not allowed", not "no change".
      if (rows.length === 0) throw new Error('That household could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteGuest(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('guests').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That household could not be removed.');
      return id;
    },
    onSuccess: invalidate,
  });
}
