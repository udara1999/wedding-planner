import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type GiftSummary = Database['public']['Views']['v_gift_summary']['Row'];

export const giftKeys = {
  summary: (weddingId: string) => ['gifts', weddingId, 'summary'] as const,
};

/**
 * The wedding's gift totals, read from the same view v_wedding_financials
 * joins. The ledger screen could add these up from the household rows it
 * already has, and then the dashboard's net-cost figure and the ledger's own
 * total would be two computations of one number — which is how they end up
 * disagreeing.
 */
export function useGiftSummary(weddingId: string) {
  return useQuery({
    queryKey: giftKeys.summary(weddingId),
    queryFn: async (): Promise<GiftSummary | null> => {
      const res = await supabase
        .from('v_gift_summary')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}
