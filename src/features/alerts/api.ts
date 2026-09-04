import { useQuery } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type AlertRow = Database['public']['Views']['v_alerts']['Row'];
export type AlertSeverity = Database['public']['Enums']['alert_severity'];

export const alertKeys = {
  list: (weddingId: string) => ['alerts', weddingId] as const,
};

/**
 * Ticket 7.1. All 23 warnings in one query.
 *
 * Ordered by the workbook's own sequence in the database, so every caller gets
 * the same order without sorting it again.
 */
export function useAlerts(weddingId: string) {
  return useQuery({
    queryKey: alertKeys.list(weddingId),
    queryFn: async (): Promise<AlertRow[]> => {
      const res = await supabase
        .from('v_alerts')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
    // The panel is what people open the app to read, and its inputs change on
    // every other screen. Cheap to refetch, expensive to be stale.
    staleTime: 30_000,
  });
}

export const SEVERITY_ORDER: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Needs doing now',
  high: 'Soon',
  medium: 'Worth a look',
  low: 'Tidying up',
};

export const SEVERITY_TONE: Record<AlertSeverity, 'stop' | 'warn' | 'gold' | 'neutral'> = {
  critical: 'stop',
  high: 'warn',
  medium: 'gold',
  low: 'neutral',
};
