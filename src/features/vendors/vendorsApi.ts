import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import { buildReceiptPath } from '../payments/receipts';
import type { Tables } from '../../types/database.types';
import type { VendorRow, VendorStatus } from '../../types/db';

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
