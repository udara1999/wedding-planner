import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { budgetKeys } from '../budget/api';
import { RECEIPTS_BUCKET, buildReceiptPath } from './receipts';
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
    // Only takes effect when the budget line names no vendor: the database
    // trigger gives the line's vendor precedence, so sending a different one
    // here is corrected rather than stored.
    | 'vendor_id'
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
    | 'receipt_path'
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
    // A payment is now attributed to a vendor, so the vendor totals move with it.
    void qc.invalidateQueries({ queryKey: ['vendors', weddingId] });
    // Paid, outstanding and overpaid per line all move with a payment.
    void qc.invalidateQueries({ queryKey: ['budget', weddingId, 'line-totals'] });
    void qc.invalidateQueries({ queryKey: ['budget', weddingId, 'line-payments'] });
    void qc.invalidateQueries({ queryKey: ['financials', weddingId] });
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

/**
 * A signed URL rather than a public one: the bucket is private, so an object
 * key becoming known is not the same as the file becoming readable. Short
 * lifetime, fetched on demand — never stored alongside the payment.
 */
export async function signedReceiptUrl(path: string, seconds = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function useUploadReceipt(weddingId: string) {
  const invalidate = useInvalidateMoney(weddingId);
  return useMutation({
    mutationFn: async ({ paymentId, file }: { paymentId: string; file: File }) => {
      const path = buildReceiptPath(weddingId, paymentId, file.name);

      const upload = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, file, { upsert: true });
      // The storage policy checks app.can_write against the wedding id in the
      // path, so a refusal surfaces here rather than as a filtered no-op.
      if (upload.error) throw new Error(upload.error.message);

      const res = await supabase
        .from('payments')
        .update({ receipt_path: path })
        .eq('id', paymentId)
        .select('id');
      const rows = unwrap(res);
      if (rows.length === 0) {
        // The object is stored but unreferenced; say so rather than implying
        // the receipt is attached.
        throw new Error('The file uploaded but could not be linked to the payment.');
      }
      return path;
    },
    onSuccess: invalidate,
  });
}

export function useRemoveReceipt(weddingId: string) {
  const invalidate = useInvalidateMoney(weddingId);
  return useMutation({
    mutationFn: async ({ paymentId, path }: { paymentId: string; path: string }) => {
      const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
      if (error) throw new Error(error.message);
      const res = await supabase
        .from('payments')
        .update({ receipt_path: null })
        .eq('id', paymentId)
        .select('id');
      unwrap(res);
      return paymentId;
    },
    onSuccess: invalidate,
  });
}
