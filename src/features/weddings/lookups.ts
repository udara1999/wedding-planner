import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';

/**
 * The per-wedding pick lists, seeded from `template.lookups`.
 *
 * One hook for every kind. There were two before this — one for payment
 * methods, one for payers — differing only in a string, and Phase 5 needed a
 * third for task owners. Three copies of the same query is how the fourth ends
 * up sorting differently.
 *
 * `kind` values in use: 'Owner' (people who can be responsible for something)
 * and 'PayMethod'.
 */
export function useWeddingLookup(weddingId: string, kind: string) {
  return useQuery({
    queryKey: ['lookups', weddingId, kind] as const,
    queryFn: async (): Promise<string[]> => {
      const res = await supabase
        .from('wedding_lookups')
        .select('value, sort_order')
        .eq('wedding_id', weddingId)
        .eq('kind', kind)
        .order('sort_order');
      return unwrap(res).map((r) => r.value);
    },
  });
}

/**
 * Who can own a task, pay for a line, or be named on a payment.
 *
 * Bride, Groom, Couple, the two families, Coordinator, Vendor, Shared. The
 * workbook uses one list for all of these, and so does this: fields naming the
 * same set of people must not offer different answers.
 */
export function useOwnerOptions(weddingId: string) {
  return useWeddingLookup(weddingId, 'Owner');
}
