import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { buildReceiptPath } from '../payments/receipts';
import type { Database, Tables } from '../../types/database.types';
import type { PaymentView, VendorRow, VendorStatus } from '../../types/db';

export type VendorAttachmentRow = Tables<'vendor_attachments'>;
export type AttachmentKind = VendorAttachmentRow['kind'];

export const CONTRACTS_BUCKET = 'contracts';

export const vendorListKeys = {
  list: (weddingId: string) => ['vendors', weddingId, 'list'] as const,
  attachments: (vendorId: string) => ['vendors', 'attachments', vendorId] as const,
};

export function useVendors(weddingId: string) {
  return useQuery({
    queryKey: vendorListKeys.list(weddingId),
    queryFn: async (): Promise<VendorRow[]> => {
      const res = await supabase
        .from('vendors')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('category')
        .order('name');
      return unwrap(res);
    },
  });
}

export type VendorInput = Partial<
  Pick<
    VendorRow,
    | 'category'
    | 'name'
    | 'contact_name'
    | 'phone'
    | 'whatsapp'
    | 'email'
    | 'package'
    | 'quoted_minor'
    | 'negotiated_minor'
    | 'deposit_paid_minor'
    | 'status'
    | 'contract_signed'
    | 'arrival_time'
    | 'setup_done_by'
    | 'finish_time'
    | 'key_deliverables'
    | 'final_confirmation_date'
    | 'rating'
    | 'notes'
  >
>;

function useInvalidateVendors(weddingId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: vendorListKeys.list(weddingId) });
    void qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'decisions'] });
  };
}

export function useCreateVendor(weddingId: string) {
  const invalidate = useInvalidateVendors(weddingId);
  return useMutation({
    mutationFn: async (input: VendorInput & { name: string; category: string }) => {
      const res = await supabase
        .from('vendors')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That vendor could not be created.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateVendor(weddingId: string) {
  const invalidate = useInvalidateVendors(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: VendorInput }) => {
      const res = await supabase.from('vendors').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // A refusal is a filtered update, not an error, so zero rows means "not
      // allowed" rather than "nothing to change".
      if (rows.length === 0) throw new Error('That vendor could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteVendor(weddingId: string) {
  const invalidate = useInvalidateVendors(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('vendors').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That vendor could not be deleted.');
      return id;
    },
    onSuccess: invalidate,
  });
}

/** Moving a card along the pipeline is the one edit made straight from the board. */
export function useSetVendorStatus(weddingId: string) {
  const update = useUpdateVendor(weddingId);
  return (id: string, status: VendorStatus) => update.mutate({ id, patch: { status } });
}

/* ------------------------------------------------------------- attachments */

export function useVendorAttachments(vendorId: string | null) {
  return useQuery({
    queryKey: vendorListKeys.attachments(vendorId ?? ''),
    enabled: Boolean(vendorId),
    queryFn: async (): Promise<VendorAttachmentRow[]> => {
      const res = await supabase
        .from('vendor_attachments')
        .select('*')
        .eq('vendor_id', vendorId!)
        .order('created_at', { ascending: false });
      return unwrap(res);
    },
  });
}

export async function signedContractUrl(path: string, seconds = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function useUploadAttachment(weddingId: string, vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: AttachmentKind }) => {
      // Same key shape and sanitising as receipts: the first segment is the
      // tenancy boundary the storage policies read.
      const path = buildReceiptPath(weddingId, vendorId, file.name);

      const upload = await supabase.storage
        .from(CONTRACTS_BUCKET)
        .upload(path, file, { upsert: true });
      if (upload.error) throw new Error(upload.error.message);

      const res = await supabase
        .from('vendor_attachments')
        .upsert(
          {
            wedding_id: weddingId,
            vendor_id: vendorId,
            kind,
            file_name: file.name,
            path,
            size_bytes: file.size,
          },
          { onConflict: 'path' },
        )
        .select('id');
      const rows = unwrap(res);
      if (rows.length === 0) {
        // The object is stored but unreferenced; say that rather than implying
        // the attachment is listed.
        throw new Error('The file uploaded but could not be attached to the vendor.');
      }
      return path;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorListKeys.attachments(vendorId) });
    },
  });
}

export function useDeleteAttachment(vendorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachment: VendorAttachmentRow) => {
      const { error } = await supabase.storage
        .from(CONTRACTS_BUCKET)
        .remove([attachment.path]);
      if (error) throw new Error(error.message);
      const res = await supabase
        .from('vendor_attachments')
        .delete()
        .eq('id', attachment.id)
        .select('id');
      unwrap(res);
      return attachment.id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vendorListKeys.attachments(vendorId) });
    },
  });
}

/* ------------------------------------------------- money, and linked lines */

export type VendorFinancials = Database['public']['Views']['v_vendor_financials']['Row'];

/**
 * A vendor's totals, derived from the budget lines it fulfils rather than
 * typed a second time on the vendor itself.
 */
export function useVendorFinancials(weddingId: string) {
  return useQuery({
    queryKey: ['vendors', weddingId, 'financials'] as const,
    queryFn: async (): Promise<Map<string, VendorFinancials>> => {
      const res = await supabase
        .from('v_vendor_financials')
        .select('*')
        .eq('wedding_id', weddingId);
      return new Map(unwrap(res).map((r) => [r.vendor_id as string, r]));
    },
  });
}

/** Every budget line, with whichever vendor it is currently pointed at. */
export function useLinkableBudgetLines(weddingId: string) {
  return useQuery({
    queryKey: ['vendors', weddingId, 'linkable-lines'] as const,
    queryFn: async () => {
      const res = await supabase
        .from('budget_lines')
        .select('id, code, name, vendor_id, budgeted_minor, forecast_minor')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

/**
 * Point a budget line at a vendor, or clear it.
 *
 * The link lives on the budget line — one vendor fulfils many lines — so this
 * is an update to the line rather than to anything on the vendor.
 */
export function useLinkBudgetLine(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lineId, vendorId }: { lineId: string; vendorId: string | null }) => {
      const res = await supabase
        .from('budget_lines')
        .update({ vendor_id: vendorId })
        .eq('id', lineId)
        .select('id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That budget line could not be linked.');
      return rows[0];
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'financials'] });
      void qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'linkable-lines'] });
      void qc.invalidateQueries({ queryKey: ['budget', weddingId, 'lines'] });
    },
  });
}

/**
 * Every payment attributed to one vendor, newest first.
 *
 * Read through v_payments so the six-state status is the same one the payments
 * screen shows. Attribution is the vendor_id column, which the database keeps
 * equal to the budget line's vendor whenever the line names one — so this
 * includes payments made against the vendor's lines without anyone having
 * tagged them by hand, and payments on lines with no vendor that were tagged
 * deliberately.
 */
export function useVendorPayments(weddingId: string, vendorId: string | null) {
  return useQuery({
    queryKey: ['vendors', weddingId, 'payments', vendorId] as const,
    enabled: Boolean(vendorId),
    queryFn: async (): Promise<PaymentView[]> => {
      const res = await supabase
        .from('v_payments')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('vendor_id', vendorId!)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('paid_on', { ascending: false, nullsFirst: false });
      return unwrap(res);
    },
  });
}
