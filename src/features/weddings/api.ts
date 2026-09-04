import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase, unwrap } from '../../lib/supabase';
import { deleteWeddingCascade } from './deleteWedding';
import type { Database } from '../../types/database.types';
import type { MemberRole, MyWedding, WeddingRow, WeddingSide } from '../../types/db';

export const weddingKeys = {
  all: ['weddings'] as const,
  detail: (id: string) => ['weddings', id] as const,
  members: (id: string) => ['weddings', id, 'members'] as const,
  invitations: (id: string) => ['weddings', id, 'invitations'] as const,
};

/** Every wedding the signed-in user can see, with their role in each. */
export function useMyWeddings() {
  return useQuery({
    queryKey: weddingKeys.all,
    queryFn: async (): Promise<MyWedding[]> => {
      const res = await supabase.rpc('my_weddings');
      return unwrap(res) as MyWedding[];
    },
  });
}

export function useWedding(weddingId: string | undefined) {
  return useQuery({
    queryKey: weddingId ? weddingKeys.detail(weddingId) : ['weddings', 'none'],
    enabled: Boolean(weddingId),
    queryFn: async (): Promise<WeddingRow> => {
      const res = await supabase.from('weddings').select('*').eq('id', weddingId!).single();
      return unwrap(res);
    },
  });
}

export interface CreateWeddingInput {
  brideName: string;
  groomName: string;
  weddingDate: string | null;
  currency: string;
  timezone: string;
  tradition: string;
}

export function useCreateWedding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWeddingInput): Promise<string> => {
      const res = await supabase.rpc('create_wedding', {
        p_bride_name: input.brideName,
        p_groom_name: input.groomName,
        p_wedding_date: input.weddingDate ?? undefined,
        p_currency: input.currency,
        p_timezone: input.timezone,
        p_tradition: input.tradition,
      });
      return unwrap(res) as string;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: weddingKeys.all }),
  });
}

export function useUpdateWedding(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<WeddingRow>) => {
      const res = await supabase
        .from('weddings')
        .update(patch)
        .eq('id', weddingId)
        .select('*')
        .single();
      return unwrap(res);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: weddingKeys.detail(weddingId) });
      void qc.invalidateQueries({ queryKey: weddingKeys.all });
    },
  });
}

export function useMembers(weddingId: string) {
  return useQuery({
    queryKey: weddingKeys.members(weddingId),
    queryFn: async () => {
      const res = await supabase
        .from('wedding_members')
        .select('wedding_id, user_id, role, side, accepted_at')
        .eq('wedding_id', weddingId);
      return unwrap(res);
    },
  });
}

export function useInviteMember(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; role: MemberRole; side: WeddingSide | null }) => {
      const res = await supabase.rpc('invite_member', {
        p_wedding_id: weddingId,
        p_email: input.email,
        p_role: input.role,
        p_side: input.side ?? undefined,
      });
      return unwrap(res) as string; // invitation token
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: weddingKeys.members(weddingId) });
      void qc.invalidateQueries({ queryKey: weddingKeys.invitations(weddingId) });
    },
  });
}

/** Invitations sent but not yet accepted — the only ones that can be revoked. */
export function useInvitations(weddingId: string) {
  return useQuery({
    queryKey: weddingKeys.invitations(weddingId),
    queryFn: async () => {
      const res = await supabase
        .from('wedding_invitations')
        .select('id, email, role, side, created_at, expires_at')
        .eq('wedding_id', weddingId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      return unwrap(res);
    },
  });
}

export function useRevokeInvitation(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await supabase
        .from('wedding_invitations')
        .delete()
        .eq('id', invitationId)
        .is('accepted_at', null)
        .select('id');
      const rows = unwrap(res);
      // A delete the caller is not allowed to make is filtered by RLS, not
      // refused: the statement succeeds and touches nothing. Zero rows back
      // therefore means "not permitted", and must not look like success.
      if (rows.length === 0) {
        throw new Error(
          'That invitation could not be revoked — it may already have been accepted.',
        );
      }
      return invitationId;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: weddingKeys.invitations(weddingId) });
      void qc.invalidateQueries({ queryKey: weddingKeys.members(weddingId) });
    },
  });
}

/**
 * Copy the template into this wedding: budget categories and lines, tasks,
 * countdown checks and the editable lookup lists.
 *
 * Idempotent server-side (every insert is ON CONFLICT DO NOTHING), so running
 * it twice adds nothing and cannot overwrite edits already made. Owner-only, by
 * the RPC's own guard.
 */
export function useSeedWedding() {
  const qc = useQueryClient();
  return useMutation({
    // The id is the mutation's argument, not the hook's: a caller that has just
    // created a wedding has the id in hand before any re-render, and a hook
    // parameter would still be holding the previous value.
    mutationFn: async (weddingId: string): Promise<number> => {
      const res = await supabase.rpc('seed_wedding', { p_wedding_id: weddingId });
      return unwrap(res) as number;
    },
    onSuccess: () => {
      // Touches nearly everything, so invalidate broadly rather than trying to
      // enumerate what a seed affects.
      void qc.invalidateQueries();
    },
  });
}

/**
 * Ticket 9.3. Creates a wedding with plausible data already in it.
 *
 * Navigates straight into it on success: the requirement is a populated
 * dashboard in under two minutes, and leaving somebody on a list with one new
 * row spends most of that on them working out what happened.
 */
export function useCreateDemoWedding() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_demo_wedding');
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: async (weddingId) => {
      await qc.invalidateQueries({ queryKey: ['my-weddings'] });
      navigate(`/w/${weddingId}`);
    },
  });
}

export type TemplatePending = Database['public']['Views']['v_template_pending']['Row'];

export const PENDING_SOURCES: { key: keyof TemplatePending; label: string }[] = [
  { key: 'checklists', label: 'Checklist items' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'countdown', label: 'Countdown checks' },
  { key: 'timeline', label: 'Timeline events' },
  { key: 'ceremony', label: 'Ceremony components' },
  { key: 'legal', label: 'Registration requirements' },
  { key: 'risks', label: 'Contingencies' },
  { key: 'responsibilities', label: 'Responsibilities' },
  { key: 'budget_lines', label: 'Budget lines' },
];

/** Risk R4. What this wedding has not got from the template yet. */
export function useTemplatePending(weddingId: string) {
  return useQuery({
    queryKey: ['template-pending', weddingId] as const,
    queryFn: async (): Promise<TemplatePending | null> => {
      const res = await supabase
        .from('v_template_pending')
        .select('*')
        .eq('wedding_id', weddingId)
        .maybeSingle();
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function pendingTotal(row: TemplatePending | null | undefined): number {
  if (!row) return 0;
  return PENDING_SOURCES.reduce((sum, s) => sum + Number(row[s.key] ?? 0), 0);
}

/**
 * Delete a wedding and everything under it (see ./deleteWedding for why the
 * storage purge has to come first, and why zero rows back is a refusal).
 *
 * Owner-only, enforced by the weddings_delete policy — the guard below turns
 * RLS's silent filtering into an error the user actually sees.
 */
export function useDeleteWedding() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (weddingId: string) =>
      deleteWeddingCascade(weddingId, {
        async listStoragePaths(id) {
          // Both columns hold the exact storage key, so this is authoritative
          // and needs no bucket listing. Read as the owner, before the delete.
          const [receipts, contracts] = await Promise.all([
            supabase.from('payments').select('receipt_path').eq('wedding_id', id),
            supabase.from('vendor_attachments').select('path').eq('wedding_id', id),
          ]);
          return {
            receipts: unwrap(receipts)
              .map((r) => r.receipt_path)
              .filter((p): p is string => Boolean(p)),
            contracts: unwrap(contracts).map((r) => r.path),
          };
        },
        async removeObjects(bucket, paths) {
          const { error } = await supabase.storage.from(bucket).remove(paths);
          if (error) throw new Error(`Could not delete the ${bucket}: ${error.message}`);
        },
        async deleteWeddingRow(id) {
          const res = await supabase.from('weddings').delete().eq('id', id).select('id');
          return unwrap(res).map((r) => r.id);
        },
      }),
    onSuccess: () => {
      // Every cached query for this wedding now points at rows that are gone,
      // so the whole cache goes rather than a list of invalidations that would
      // need updating each time a feature is added.
      qc.clear();
      navigate('/', { replace: true });
    },
  });
}
