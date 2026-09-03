import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { MemberRole, MyWedding, WeddingRow, WeddingSide } from '../../types/database.types';

export const weddingKeys = {
  all: ['weddings'] as const,
  detail: (id: string) => ['weddings', id] as const,
  members: (id: string) => ['weddings', id, 'members'] as const,
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
}

export function useCreateWedding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWeddingInput): Promise<string> => {
      const res = await supabase.rpc('create_wedding', {
        p_bride_name: input.brideName,
        p_groom_name: input.groomName,
        p_wedding_date: input.weddingDate,
        p_currency: input.currency,
        p_timezone: input.timezone,
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
        p_side: input.side,
      });
      return unwrap(res) as string; // invitation token
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: weddingKeys.members(weddingId) }),
  });
}
