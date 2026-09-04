import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { guestKeys } from '../guests/api';
import type { Database, Tables } from '../../types/database.types';

export type SeatingTableRow = Database['public']['Views']['v_seating_tables']['Row'];
export type SeatingSummary = Database['public']['Views']['v_seating_summary']['Row'];
export type SeatingTableInput = Partial<
  Pick<
    Tables<'seating_tables'>,
    'name' | 'capacity' | 'shape' | 'location' | 'notes' | 'sort_order'
  >
>;

export const seatingKeys = {
  tables: (weddingId: string) => ['seating', weddingId, 'tables'] as const,
  summary: (weddingId: string) => ['seating', weddingId, 'summary'] as const,
};

export function useSeatingTables(weddingId: string) {
  return useQuery({
    queryKey: seatingKeys.tables(weddingId),
    queryFn: async (): Promise<SeatingTableRow[]> => {
      const res = await supabase
        .from('v_seating_tables')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order')
        .order('name');
      return unwrap(res);
    },
  });
}

export function useSeatingSummary(weddingId: string) {
  return useQuery({
    queryKey: seatingKeys.summary(weddingId),
    queryFn: async (): Promise<SeatingSummary | null> => {
      const res = await supabase
        .from('v_seating_summary')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}

/**
 * Seating counts and guest counts move together: seating a household changes
 * both, and so does an RSVP arriving. Everything here invalidates both sets
 * rather than leaving one screen to go quietly stale.
 */
function useInvalidateSeating(weddingId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: seatingKeys.tables(weddingId) }),
      qc.invalidateQueries({ queryKey: seatingKeys.summary(weddingId) }),
      qc.invalidateQueries({ queryKey: guestKeys.list(weddingId) }),
    ]);
}

export function useCreateSeatingTable(weddingId: string) {
  const invalidate = useInvalidateSeating(weddingId);
  return useMutation({
    mutationFn: async (input: SeatingTableInput & { name: string }) => {
      const res = await supabase
        .from('seating_tables')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That table could not be created.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSeatingTable(weddingId: string) {
  const invalidate = useInvalidateSeating(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: SeatingTableInput }) => {
      const res = await supabase.from('seating_tables').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // RLS filters an update the caller may not make rather than refusing it,
      // so zero rows back is a failure and not a silent success.
      if (rows.length === 0) throw new Error('That table could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSeatingTable(weddingId: string) {
  const invalidate = useInvalidateSeating(weddingId);
  return useMutation({
    // The households are unseated, not deleted — that is what the foreign
    // key's `on delete set null` is for.
    mutationFn: async (id: string) => {
      const res = await supabase.from('seating_tables').delete().eq('id', id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
  });
}

/**
 * Seat or unseat one household.
 *
 * A refusal here is expected, not exceptional: the capacity trigger raises when
 * the household will not fit, with a message written to be read by a person —
 * "Top table seats 8 and Top table already has 6 seated, so 4 more will not
 * fit". That message is passed through untouched.
 */
export function useSeatHousehold(weddingId: string) {
  const invalidate = useInvalidateSeating(weddingId);
  return useMutation({
    mutationFn: async ({ guestId, tableId }: { guestId: string; tableId: string | null }) => {
      const res = await supabase
        .from('guests')
        .update({ table_id: tableId })
        .eq('id', guestId)
        .eq('wedding_id', weddingId)
        .select('id, table_id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That household could not be seated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}
