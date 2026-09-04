import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type Reconciliation = Database['public']['Views']['v_reconciliation']['Row'];

/** Ticket 9.1. True cost, net cost and cost per guest, decided in the view. */
export function useReconciliation(weddingId: string) {
  return useQuery({
    queryKey: ['reconciliation', weddingId] as const,
    queryFn: async (): Promise<Reconciliation | null> => {
      const res = await supabase
        .from('v_reconciliation')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}
