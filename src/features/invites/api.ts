import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { guestKeys } from '../guests/api';

export interface InviteMessage {
  guestId: string;
  subject: string;
  body: string;
}

export interface InviteResult {
  configured: boolean;
  sent: number;
  failed: { guestId: string; reason: string }[];
  message?: string;
}

/**
 * Sends through the `invite` Edge Function, which holds the Resend key.
 *
 * It never receives an address: it is given guest ids and reads the addresses
 * itself, as the caller, so row-level security decides which households it can
 * reach. It also marks only the households whose mail actually went out.
 */
export function useSendInvites(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messages: InviteMessage[]): Promise<InviteResult> => {
      const { data, error } = await supabase.functions.invoke('invite', {
        body: { weddingId, messages },
      });
      if (error) {
        let text = 'The invitations could not be sent.';
        const res = (error as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try {
            const parsed = (await res.json()) as { error?: string };
            if (parsed?.error) text = parsed.error;
          } catch {
            // Keep the generic message rather than showing a raw body.
          }
        }
        throw new Error(text);
      }
      return data as InviteResult;
    },
    // The function marks invitation_sent, so the guest list is stale either way.
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.list(weddingId) }),
  });
}
