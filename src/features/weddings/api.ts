import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
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
        throw new Error('That invitation could not be revoked — it may already have been accepted.');
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
