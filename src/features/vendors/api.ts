import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Database, VendorOptionRow } from '../../types/db';

export type VendorCategory = Database['public']['Views']['v_vendor_categories']['Row'];
export type VendorQuestion = Database['public']['Views']['v_vendor_questions']['Row'];

export const vendorKeys = {
  categories: (locale: string) => ['vendors', 'categories', locale] as const,
  questions: (locale: string, categoryKey: string) =>
    ['vendors', 'questions', locale, categoryKey] as const,
  options: (weddingId: string, categoryKey: string) =>
    ['vendors', weddingId, 'options', categoryKey] as const,
};

/**
 * The 16 vendor categories. Read through a view in `public`, because the
 * questions live in the unexposed `template` schema and are global rather than
 * copied per wedding (plan §4.4).
 */
export function useVendorCategories(locale: string) {
  return useQuery({
    queryKey: vendorKeys.categories(locale),
    queryFn: async (): Promise<VendorCategory[]> => {
      const res = await supabase
        .from('v_vendor_categories')
        .select('*')
        .eq('locale', locale)
        .order('category_label');
      return unwrap(res);
    },
    // Global reference data: it cannot change while the app is open.
    staleTime: Infinity,
  });
}

export function useVendorQuestions(locale: string, categoryKey: string | null) {
  return useQuery({
    queryKey: vendorKeys.questions(locale, categoryKey ?? ''),
    enabled: Boolean(categoryKey),
    queryFn: async (): Promise<VendorQuestion[]> => {
      const res = await supabase
        .from('v_vendor_questions')
        .select('*')
        .eq('locale', locale)
        .eq('category_key', categoryKey!)
        .order('seq');
      return unwrap(res);
    },
    staleTime: Infinity,
  });
}

export function useVendorOptions(weddingId: string, categoryKey: string | null) {
  return useQuery({
    queryKey: vendorKeys.options(weddingId, categoryKey ?? ''),
    enabled: Boolean(categoryKey),
    queryFn: async (): Promise<VendorOptionRow[]> => {
      const res = await supabase
        .from('vendor_options')
        .select('*')
        .eq('wedding_id', weddingId)
        .eq('category_key', categoryKey!)
        .order('sort_order')
        .order('created_at');
      return unwrap(res);
    },
  });
}

export type VendorOptionInput = Partial<
  Pick<
    VendorOptionRow,
    | 'label'
    | 'vendor_name'
    | 'contact_name'
    | 'phone'
    | 'package'
    | 'quoted_minor'
    | 'negotiated_minor'
    | 'deposit_minor'
    | 'met_or_visited'
    | 'rating'
    | 'sort_order'
  >
>;

function useInvalidateOptions(weddingId: string, categoryKey: string | null) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: vendorKeys.options(weddingId, categoryKey ?? '') });
    // The decision index counts options, so it moves whenever they do.
    void qc.invalidateQueries({ queryKey: ['vendors', weddingId, 'decisions'] });
  };
}

export function useCreateVendorOption(weddingId: string, categoryKey: string | null) {
  const invalidate = useInvalidateOptions(weddingId, categoryKey);
  return useMutation({
    mutationFn: async (input: VendorOptionInput & { label: string }) => {
      const res = await supabase
        .from('vendor_options')
        .insert({ ...input, wedding_id: weddingId, category_key: categoryKey! })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That option could not be added.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateVendorOption(weddingId: string, categoryKey: string | null) {
  const invalidate = useInvalidateOptions(weddingId, categoryKey);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: VendorOptionInput }) => {
      const res = await supabase.from('vendor_options').update(patch).eq('id', id).select('*');
      const rows = unwrap(res);
      // RLS filters an update the caller may not make, so zero rows is a
      // refusal rather than a no-op success.
      if (rows.length === 0) throw new Error('That option could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteVendorOption(weddingId: string, categoryKey: string | null) {
  const invalidate = useInvalidateOptions(weddingId, categoryKey);
  return useMutation({
    mutationFn: async (id: string) => {
      // vendor_answers cascade with the option, so removing a column removes
      // its answers too rather than orphaning them.
      const res = await supabase.from('vendor_options').delete().eq('id', id).select('id');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That option could not be removed.');
      return id;
    },
    onSuccess: invalidate,
  });
}
