import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { BudgetByCategory, BudgetCategoryRow, BudgetLineRow } from '../../types/db';

export const budgetKeys = {
  categories: (weddingId: string) => ['budget', weddingId, 'categories'] as const,
  lines: (weddingId: string) => ['budget', weddingId, 'lines'] as const,
  byCategory: (weddingId: string) => ['budget', weddingId, 'by-category'] as const,
};

export function useBudgetCategories(weddingId: string) {
  return useQuery({
    queryKey: budgetKeys.categories(weddingId),
    queryFn: async (): Promise<BudgetCategoryRow[]> => {
      const res = await supabase
        .from('budget_categories')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

export function useBudgetLines(weddingId: string) {
  return useQuery({
    queryKey: budgetKeys.lines(weddingId),
    queryFn: async (): Promise<BudgetLineRow[]> => {
      // `*` includes forecast_minor, the generated column. It is read, never
      // recomputed here — the database owns the §4.2 precedence rule.
      const res = await supabase
        .from('budget_lines')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

/** Per-category totals, straight from v_budget_by_category. */
export function useBudgetByCategory(weddingId: string) {
  return useQuery({
    queryKey: budgetKeys.byCategory(weddingId),
    queryFn: async (): Promise<BudgetByCategory[]> => {
      const res = await supabase
        .from('v_budget_by_category')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

type BudgetLinePatch = Partial<
  Pick<
    BudgetLineRow,
    | 'name'
    | 'payer'
    | 'applicability'
    | 'status'
    | 'notes'
    | 'budgeted_minor'
    | 'quoted_minor'
    | 'negotiated_minor'
    | 'actual_minor'
    | 'refundable_deposit_minor'
  >
>;

export function useUpdateBudgetLine(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: BudgetLinePatch }) => {
      const res = await supabase.from('budget_lines').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // An update the caller may not make is filtered by RLS rather than
      // refused: the statement succeeds and touches nothing. Zero rows back is
      // therefore a failure, not a silent success.
      if (rows.length === 0) {
        throw new Error('That budget line could not be updated.');
      }
      return rows[0];
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.lines(weddingId) });
      // forecast_minor is generated, so the category totals move with any
      // amount or applicability change.
      void qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) });
    },
  });
}

/**
 * The "Who pays" values, from the per-wedding copy of the workbook's Owner
 * list. A lookup rather than an enum, so a couple can rename or add one
 * without a migration (plan §4.3).
 */
export function usePayerOptions(weddingId: string) {
  return useQuery({
    queryKey: ['budget', weddingId, 'payers'] as const,
    queryFn: async (): Promise<string[]> => {
      const res = await supabase
        .from('wedding_lookups')
        .select('value, sort_order')
        .eq('wedding_id', weddingId)
        .eq('kind', 'Owner')
        .order('sort_order');
      return unwrap(res).map((r) => r.value);
    },
  });
}
