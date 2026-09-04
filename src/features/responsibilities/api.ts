import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Tables } from '../../types/database.types';

export type ResponsibilityRow = Tables<'responsibilities'>;

export type ResponsibilityInput = Partial<
  Pick<
    ResponsibilityRow,
    | 'area'
    | 'activity'
    | 'responsible'
    | 'accountable'
    | 'consulted'
    | 'informed'
    | 'person_name'
    | 'phone'
    | 'deadline'
    | 'status'
    | 'notes'
  >
>;

export const raciKeys = {
  list: (weddingId: string) => ['responsibilities', weddingId] as const,
};

export function useResponsibilities(weddingId: string) {
  return useQuery({
    queryKey: raciKeys.list(weddingId),
    queryFn: async (): Promise<ResponsibilityRow[]> => {
      const res = await supabase
        .from('responsibilities')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order')
        .order('seq');
      return unwrap(res);
    },
  });
}

function useInvalidate(weddingId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: raciKeys.list(weddingId) });
}

export function useCreateResponsibility(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (input: ResponsibilityInput & { activity: string }) => {
      const res = await supabase
        .from('responsibilities')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That activity could not be created.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateResponsibility(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ResponsibilityInput }) => {
      const res = await supabase
        .from('responsibilities')
        .update(patch)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      // RLS filters rather than refuses, so zero rows back is a failure.
      if (rows.length === 0) throw new Error('That activity could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteResponsibility(weddingId: string) {
  const invalidate = useInvalidate(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('responsibilities')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
  });
}
