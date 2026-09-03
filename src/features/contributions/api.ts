import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Tables } from '../../types/database.types';

export type ContributionRow = Tables<'contributions'>;

export const contributionKeys = {
  list: (weddingId: string) => ['contributions', weddingId] as const,
};

/**
 * RLS decides what comes back: the couple get every row, a family member gets
 * only their own. The client does no filtering of its own — if it did, the
 * filter and the policy could disagree and the weaker one would win.
 */
export function useContributions(weddingId: string) {
  return useQuery({
    queryKey: contributionKeys.list(weddingId),
    queryFn: async (): Promise<ContributionRow[]> => {
      const res = await supabase
        .from('contributions')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at');
      return unwrap(res);
    },
  });
}

export type ContributionInput = Partial<
  Pick<
    ContributionRow,
    | 'code'
    | 'contributor_user_id'
    | 'contributor_name'
    | 'relationship'
    | 'purpose'
    | 'agreed_on'
    | 'agreed_minor'
    | 'received_minor'
    | 'last_received_on'
    | 'notes'
  >
>;

function useInvalidate(weddingId: string) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: contributionKeys.list(weddingId) });
}

export function useCreateContribution(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (input: ContributionInput & { contributor_name: string }) => {
      const res = await supabase
        .from('contributions')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That contribution could not be saved.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateContribution(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContributionInput }) => {
      const res = await supabase.from('contributions').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // A row belonging to another family member is filtered by RLS, not
      // refused: the update succeeds and changes nothing. Zero rows is a
      // failure and must say so.
      if (rows.length === 0) {
        throw new Error('That contribution could not be updated — it may not be yours.');
      }
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteContribution(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('contributions').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) {
        throw new Error('That contribution could not be deleted — it may not be yours.');
      }
      return id;
    },
    onSuccess: invalidate,
  });
}
