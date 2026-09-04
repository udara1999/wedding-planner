import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type {
  BudgetByCategory,
  BudgetCategoryRow,
  BudgetLineRow,
  PaymentStage,
  PaymentStatus,
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
    // Setting this moves the line's payments to that vendor: the
    // budget_lines_vendor_cascade trigger enforces the precedence rule.
    | 'vendor_id'
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
    onSuccess: (row) => {
      // Write the returned row straight into the cache before refetching. The
      // update returns the row the database actually stored — including the
      // recomputed forecast_minor — so the list can show it immediately
      // instead of waiting on a round trip.
      qc.setQueryData<BudgetLineRow[]>(budgetKeys.lines(weddingId), (old) =>
        old?.map((l) => (l.id === row.id ? row : l)),
      );

      // forecast_minor is generated, so the category totals move with any
      // amount or applicability change — and so does whether a line now counts
      // as overpaid. Returned so the mutation does not settle until the
      // dependent queries are refreshed.
      return Promise.all([
        qc.invalidateQueries({ queryKey: budgetKeys.lines(weddingId) }),
        qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) }),
        qc.invalidateQueries({ queryKey: ['budget', weddingId, 'line-totals'] }),
        // Changing this line's vendor rewrites vendor_id on every payment made
        // against it — the cascade trigger does that in the database, so the
        // payment and vendor caches are stale even though nothing here touched
        // them. Written as literal keys rather than imported: payments/api
        // already imports budgetKeys from here.
        qc.invalidateQueries({ queryKey: ['payments', weddingId] }),
        qc.invalidateQueries({ queryKey: ['vendors', weddingId] }),
      ]);
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
  vendor_id: string | null;
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
      // A new line may already name a vendor, which changes that vendor's
      // planned totals.
      void qc.invalidateQueries({ queryKey: ['vendors', weddingId] });
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
  /** How many payments have been recorded against this line. */
  paymentCount: number;
  /**
   * The most urgent status among them, or null when there are none. A line
   * with an overdue instalment and three settled ones is an overdue line —
   * showing the settled ones would bury the only state worth acting on.
   */
  urgentStatus: PaymentStatus | null;
  /** The stages actually paid, in the order the workbook lists them. */
  paidStages: PaymentStage[];
}

/** The workbook's PayStage order, so "advance, final" never reads "final, advance". */
const STAGE_ORDER: PaymentStage[] = [
  'booking_deposit',
  'advance',
  'progress_payment',
  'final_payment',
  'extra_overtime',
  'refundable_deposit',
  'refund_received',
];

/** Most urgent first. Anything absent from this list cannot outrank a member. */
const STATUS_URGENCY: PaymentStatus[] = ['overdue', 'due', 'due_soon', 'not_due', 'draft', 'paid'];

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
      const [lines, payments] = await Promise.all([
        supabase
          .from('v_budget_lines')
          .select('id, paid_minor, outstanding_minor, overpaid_minor')
          .eq('wedding_id', weddingId),
        // Read rather than recomputed: `status` depends on current_date, so it
        // only exists in the view. Deriving it here would be a second
        // implementation of the six-state rule.
        supabase
          .from('v_payments')
          .select('budget_line_id, status, stage, amount_paid_minor')
          .eq('wedding_id', weddingId)
          .not('budget_line_id', 'is', null),
      ]);

      const byLine = new Map<string, { statuses: PaymentStatus[]; stages: PaymentStage[] }>();
      for (const p of unwrap(payments)) {
        const key = p.budget_line_id as string;
        const entry = byLine.get(key) ?? { statuses: [], stages: [] };
        if (p.status) entry.statuses.push(p.status as PaymentStatus);
        // A stage counts as paid only if money actually moved against it.
        if (p.stage && Number(p.amount_paid_minor ?? 0) > 0) {
          entry.stages.push(p.stage as PaymentStage);
        }
        byLine.set(key, entry);
      }

      return new Map(
        unwrap(lines).map((r) => {
          const id = r.id as string;
          const entry = byLine.get(id);
          const statuses = entry?.statuses ?? [];
          return [
            id,
            {
              paidMinor: Number(r.paid_minor ?? 0),
              outstandingMinor: Number(r.outstanding_minor ?? 0),
              overpaidMinor: Number(r.overpaid_minor ?? 0),
              paymentCount: statuses.length,
              urgentStatus:
                STATUS_URGENCY.find((candidate) => statuses.includes(candidate)) ?? null,
              paidStages: STAGE_ORDER.filter((stage) => entry?.stages.includes(stage)),
            },
          ];
        }),
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
