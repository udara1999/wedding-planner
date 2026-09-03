import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { budgetKeys } from '../budget/api';
import type { PaymentRow, PaymentView } from '../../types/db';

export const paymentKeys = {
  list: (weddingId: string) => ['payments', weddingId] as const,
  methods: (weddingId: string) => ['payments', weddingId, 'methods'] as const,
};

/** Read through the view: balance and the six-state status come from there. */
export function usePayments(weddingId: string) {
  return useQuery({
    queryKey: paymentKeys.list(weddingId),
    queryFn: async (): Promise<PaymentView[]> => {
      const res = await supabase
        .from('v_payments')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      return unwrap(res);
    },
  });
}

export function usePaymentMethods(weddingId: string) {
  return useQuery({
    queryKey: paymentKeys.methods(weddingId),
    queryFn: async (): Promise<string[]> => {
      const res = await supabase
        .from('wedding_lookups')
        .select('value, sort_order')
        .eq('wedding_id', weddingId)
        .eq('kind', 'PayMethod')
        .order('sort_order');
      return unwrap(res).map((r) => r.value);
    },
  });
}

export type PaymentInput = Partial<
  Pick<
    PaymentRow,
    | 'budget_line_id'
    | 'code'
    | 'stage'
    | 'amount_due_minor'
    | 'due_date'
    | 'amount_paid_minor'
    | 'paid_on'
    | 'method'
    | 'reference'
    | 'refundable'
    | 'receipt_location'
    | 'paid_by'
    | 'notes'
  >
>;

/**
 * Anything that changes a payment also changes the paid and outstanding
 * figures rolled up by v_budget_lines and v_budget_by_category, so those
 * queries are invalidated too rather than left to go stale.
 */
function useInvalidateMoney(weddingId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: paymentKeys.list(weddingId) });
    void qc.invalidateQueries({ queryKey: budgetKeys.lines(weddingId) });
    void qc.invalidateQueries({ queryKey: budgetKeys.byCategory(weddingId) });
  };
}

export function useCreatePayment(weddingId: string) {
  const invalidate = useInvalidateMoney(weddingId);
  return useMutation({
    mutationFn: async (input: PaymentInput) => {
      const res = await supabase
        .from('payments')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That payment could not be saved.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePayment(weddingId: string) {
  const invalidate = useInvalidateMoney(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PaymentInput }) => {
      const res = await supabase.from('payments').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // RLS filters a forbidden update rather than refusing it, so no rows back
      // means "not permitted" and must not look like success.
      if (rows.length === 0) throw new Error('That payment could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeletePayment(weddingId: string) {
  const invalidate = useInvalidateMoney(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('payments').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That payment could not be deleted.');
      return id;
    },
    onSuccess: invalidate,
  });
}
