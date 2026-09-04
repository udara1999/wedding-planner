import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Tables } from '../../types/database.types';

export type CountdownRow = Tables<'wedding_countdown_checks'>;

export type CountdownInput = Partial<
  Pick<CountdownRow, 'check_text' | 'window_label' | 'owner' | 'done' | 'notes' | 'due_date'>
>;

export const countdownKeys = {
  list: (weddingId: string) => ['countdown', weddingId] as const,
};

export function useCountdown(weddingId: string) {
  return useQuery({
    queryKey: countdownKeys.list(weddingId),
    queryFn: async (): Promise<CountdownRow[]> => {
      const res = await supabase
        .from('wedding_countdown_checks')
        .select('*')
        // seq, not due_date. The workbook's order is the order the windows run
        // in — thirty days out, then the week, then the day, then the morning —
        // and it survives a row whose date was never set.
        .eq('wedding_id', weddingId)
        .order('seq');
      return unwrap(res);
    },
  });
}

function useInvalidate(weddingId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: countdownKeys.list(weddingId) });
}

export function useSetCountdownDone(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) => {
      const res = await supabase
        .from('wedding_countdown_checks')
        .update({ done })
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That check could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCountdown(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: CountdownInput }) => {
      const res = await supabase
        .from('wedding_countdown_checks')
        .update(patch)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That check could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}
