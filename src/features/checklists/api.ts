import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { ChecklistRow, ModuleConfig } from './config';

/**
 * One data layer for all seventeen modules.
 *
 * The typed Supabase client cannot resolve a table chosen at runtime: `from()`
 * over a union of table names yields a union of query builders that no single
 * call signature satisfies. So the table name is narrowed to one concrete
 * table for typing purposes and the values crossing that boundary are cast.
 *
 * The casts are confined to this file and are load-bearing in only one
 * direction: the SHAPE of what comes back is guaranteed by the migration
 * (every module table has the §2 columns) and the KEYS going in are guaranteed
 * by config.test.ts, which checks every configured field against the generated
 * types. Without that test these casts would be a hole; with it they are a
 * translation.
 */
type ConcreteTable = 'attire_items';

function from(config: ModuleConfig) {
  return supabase.from(config.table as ConcreteTable);
}

export const checklistKeys = {
  list: (weddingId: string, table: string) => ['checklist', weddingId, table] as const,
};

export function useChecklist(weddingId: string, config: ModuleConfig) {
  return useQuery({
    queryKey: checklistKeys.list(weddingId, config.table),
    queryFn: async (): Promise<ChecklistRow[]> => {
      const res = await from(config)
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order')
        .order('name');
      return unwrap(res) as unknown as ChecklistRow[];
    },
  });
}

/** Also refreshes the module's summary view, where it has one. */
function useInvalidate(weddingId: string, config: ModuleConfig) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: checklistKeys.list(weddingId, config.table) }),
      qc.invalidateQueries({ queryKey: ['checklist-summary', weddingId] }),
    ]);
}

export function useCreateChecklistRow(weddingId: string, config: ModuleConfig) {
  const invalidate = useInvalidate(weddingId, config);
  return useMutation({
    mutationFn: async (values: Record<string, unknown> & { name: string }) => {
      const res = await from(config)
        .insert({ ...values, wedding_id: weddingId } as never)
        .select('*');
      const rows = unwrap(res) as unknown as ChecklistRow[];
      if (rows.length === 0) throw new Error('That could not be added.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistRow(weddingId: string, config: ModuleConfig) {
  const invalidate = useInvalidate(weddingId, config);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await from(config)
        .update(patch as never)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res) as unknown as ChecklistRow[];
      // RLS filters an update the caller may not make rather than refusing it,
      // so zero rows back is a failure and not a silent success.
      if (rows.length === 0) throw new Error('That could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistRow(weddingId: string, config: ModuleConfig) {
  const invalidate = useInvalidate(weddingId, config);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await from(config).delete().eq('id', id).eq('wedding_id', weddingId);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
  });
}

/* ==========================================================================
   The three modules with a summary of their own (6.3, 6.4, 6.6)
   ========================================================================== */

export function useJewelleryCustody(weddingId: string) {
  return useQuery({
    queryKey: ['checklist-summary', weddingId, 'jewellery'] as const,
    queryFn: async () => {
      const res = await supabase
        .from('v_jewellery_custody')
        .select('*')
        .eq('wedding_id', weddingId);
      return unwrap(res);
    },
  });
}

export function useCeremonyLength(weddingId: string) {
  return useQuery({
    queryKey: ['checklist-summary', weddingId, 'ceremony'] as const,
    queryFn: async () => {
      const res = await supabase
        .from('v_ceremony_length')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useCateringHeadcount(weddingId: string) {
  return useQuery({
    queryKey: ['checklist-summary', weddingId, 'catering'] as const,
    queryFn: async () => {
      const res = await supabase
        .from('v_catering_headcount')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}
