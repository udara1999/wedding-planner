import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type {
  BudgetByCategory,
  BudgetCategoryRow,
  BudgetLineRow,
  WeddingFinancials,
} from '../../types/db';

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
      // amount or applicability change — and so does whether a line now counts
      // as overpaid.
      void qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) });
      void qc.invalidateQueries({ queryKey: ['budget', weddingId, 'line-totals'] });
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

export interface NewBudgetLine {
  name: string;
  category_id: string;
  code: string | null;
  applicability: BudgetLineRow['applicability'];
  payer: string | null;
  budgeted_minor: number;
}

export function useCreateBudgetLine(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewBudgetLine) => {
      // No source_template_id: a line the couple added themselves is not a
      // template copy, and leaving it null keeps re-seeding idempotent rather
      // than colliding on (wedding_id, source_template_id).
      const res = await supabase
        .from('budget_lines')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That budget line could not be created.');
      return rows[0];
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.lines(weddingId) });
      void qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) });
    },
  });
}

export function useDeleteBudgetLine(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('budget_lines').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) {
        throw new Error('That budget line could not be deleted.');
      }
      return id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: budgetKeys.lines(weddingId) });
      void qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) });
      // Payments reference budget lines (ON DELETE SET NULL), so a delete can
      // leave a payment unattached — the payments list must not keep showing
      // the old link.
      void qc.invalidateQueries({ queryKey: ['payments', weddingId] });
    },
  });
}

/**
 * The 01 START HERE money block (ticket 2.8).
 *
 * The view is guarded by app.can_see_money, so a coordinator or viewer gets no
 * row rather than an error — callers should treat "no data" as "not entitled",
 * not as "nothing spent".
 */
export function useWeddingFinancials(weddingId: string) {
  return useQuery({
    queryKey: ['financials', weddingId] as const,
    queryFn: async (): Promise<WeddingFinancials | null> => {
      const res = await supabase
        .from('v_wedding_financials')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export interface LineTotals {
  paidMinor: number;
  outstandingMinor: number;
  overpaidMinor: number;
}

/**
 * Payment totals per line, from v_budget_lines.
 *
 * Kept separate from useBudgetLines rather than switching that query to the
 * view: every column of a view is nullable in the generated types, and the
 * forms want the table's non-null guarantees. Joined by id at the call site.
 */
export function useBudgetLineTotals(weddingId: string) {
  return useQuery({
    queryKey: ['budget', weddingId, 'line-totals'] as const,
    queryFn: async (): Promise<Map<string, LineTotals>> => {
      const res = await supabase
        .from('v_budget_lines')
        .select('id, paid_minor, outstanding_minor, overpaid_minor')
        .eq('wedding_id', weddingId);
      const rows = unwrap(res);
      return new Map(
        rows.map((r) => [
          r.id as string,
          {
            paidMinor: Number(r.paid_minor ?? 0),
            outstandingMinor: Number(r.outstanding_minor ?? 0),
            overpaidMinor: Number(r.overpaid_minor ?? 0),
          },
        ]),
      );
    },
  });
}

/**
 * The payments recorded against one budget line, newest due date first.
 *
 * Queried here rather than reusing the payments feature's hook so that
 * `budget` does not import from `payments`, which already imports from
 * `budget` — a module cycle that works until it suddenly does not.
 */
export function usePaymentsForLine(weddingId: string, budgetLineId: string | null) {
  return useQuery({
    queryKey: ['budget', weddingId, 'line-payments', budgetLineId] as const,
    enabled: Boolean(budgetLineId),
    queryFn: async () => {
      const res = await supabase
        .from('v_payments')
        .select('*')
        .eq('budget_line_id', budgetLineId!)
        .order('due_date', { ascending: true, nullsFirst: false });
      return unwrap(res);
    },
  });
}
