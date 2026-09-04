import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Database, Tables } from '../../types/database.types';

export type TimelineRow = Tables<'timeline_events'>;
export type RiskRow = Tables<'risks'>;
export type ConflictRow = Database['public']['Views']['v_timeline_conflicts']['Row'];
export type ScheduleRow = Database['public']['Views']['v_vendor_schedule']['Row'];
export type ContactSheetRow = Database['public']['Views']['v_contact_sheet']['Row'];

export type TimelineInput = Partial<
  Pick<
    TimelineRow,
    | 'phase'
    | 'starts_at'
    | 'duration_minutes'
    | 'name'
    | 'who'
    | 'location'
    | 'vendor_id'
    | 'applicability'
    | 'done'
    | 'notes'
    | 'sort_order'
  >
>;

export type RiskInput = Partial<
  Pick<
    RiskRow,
    | 'area'
    | 'name'
    | 'likelihood'
    | 'impact'
    | 'prevent_by'
    | 'if_it_happens'
    | 'owner'
    | 'who_to_call'
    | 'prevention_done'
    | 'applicability'
    | 'notes'
  >
>;

export const dayKeys = {
  timeline: (weddingId: string) => ['dayof', weddingId, 'timeline'] as const,
  conflicts: (weddingId: string) => ['dayof', weddingId, 'conflicts'] as const,
  schedule: (weddingId: string) => ['dayof', weddingId, 'schedule'] as const,
  contacts: (weddingId: string) => ['dayof', weddingId, 'contacts'] as const,
  risks: (weddingId: string) => ['dayof', weddingId, 'risks'] as const,
};

/** Ordered by the clock, then by the template's sequence for the untimed. */
export function useTimeline(weddingId: string) {
  return useQuery({
    queryKey: dayKeys.timeline(weddingId),
    queryFn: async (): Promise<TimelineRow[]> => {
      const res = await supabase
        .from('timeline_events')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order');
      return unwrap(res);
    },
  });
}

export function useTimelineConflicts(weddingId: string) {
  return useQuery({
    queryKey: dayKeys.conflicts(weddingId),
    queryFn: async (): Promise<ConflictRow[]> => {
      const res = await supabase
        .from('v_timeline_conflicts')
        .select('*')
        .eq('wedding_id', weddingId);
      return unwrap(res);
    },
  });
}

export function useVendorSchedule(weddingId: string) {
  return useQuery({
    queryKey: dayKeys.schedule(weddingId),
    queryFn: async (): Promise<ScheduleRow[]> => {
      const res = await supabase
        .from('v_vendor_schedule')
        .select('*')
        .eq('wedding_id', weddingId)
        // Ticket 8.2: "sorted by arrival". Vendors with no time set go last —
        // they are the ones still to pin down, not the ones arriving first.
        .order('arrival_time', { ascending: true, nullsFirst: false });
      return unwrap(res);
    },
  });
}

export function useContactSheet(weddingId: string) {
  return useQuery({
    queryKey: dayKeys.contacts(weddingId),
    queryFn: async (): Promise<ContactSheetRow[]> => {
      const res = await supabase
        .from('v_contact_sheet')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('sort_order')
        .order('name');
      return unwrap(res);
    },
  });
}

export function useRisks(weddingId: string) {
  return useQuery({
    queryKey: dayKeys.risks(weddingId),
    queryFn: async (): Promise<RiskRow[]> => {
      const res = await supabase
        .from('risks')
        .select('*')
        .eq('wedding_id', weddingId)
        // Worst first. A risk register sorted by anything else is a list
        // nobody reads past the top of.
        .order('score', { ascending: false })
        .order('sort_order');
      return unwrap(res);
    },
  });
}

/** The conflicts view reads the same rows, so it goes stale on every edit. */
function useInvalidateTimeline(weddingId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: dayKeys.timeline(weddingId) }),
      qc.invalidateQueries({ queryKey: dayKeys.conflicts(weddingId) }),
    ]);
}

export function useUpdateTimelineEvent(weddingId: string) {
  const invalidate = useInvalidateTimeline(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TimelineInput }) => {
      const res = await supabase
        .from('timeline_events')
        .update(patch)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That event could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useCreateTimelineEvent(weddingId: string) {
  const invalidate = useInvalidateTimeline(weddingId);
  return useMutation({
    mutationFn: async (input: TimelineInput & { name: string }) => {
      const res = await supabase
        .from('timeline_events')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That event could not be created.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTimelineEvent(weddingId: string) {
  const invalidate = useInvalidateTimeline(weddingId);
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
  });
}

/**
 * Ticket 8.2's two ticks.
 *
 * A vendor has no schedule row until the first tick — the table holds only what
 * the day adds — so this writes then falls back to inserting. See the comment
 * inside for why it is not an upsert.
 */
export function useVendorCheck(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vendorId,
      field,
      value,
    }: {
      vendorId: string;
      field: 'checked_in_at' | 'checked_out_at';
      value: boolean;
    }) => {
      const stamp = value ? new Date().toISOString() : null;

      // Written as an explicit object per field rather than with a computed
      // key, which widens to an index signature the generated types reject.
      const patch =
        field === 'checked_in_at' ? { checked_in_at: stamp } : { checked_out_at: stamp };

      // Update first, insert only if there was no row. NOT an upsert: PostgREST
      // resolves a conflict by setting every column in the payload, so ticking
      // a vendor OUT through an upsert would clear the time they were ticked
      // IN. That is precisely the kind of quiet loss this table exists to
      // avoid, and it would only ever be noticed on the day.
      const updated = unwrap(
        await supabase
          .from('vendor_schedule')
          .update(patch)
          .eq('wedding_id', weddingId)
          .eq('vendor_id', vendorId)
          .select('*'),
      );
      if (updated.length > 0) return updated[0];

      const inserted = unwrap(
        await supabase
          .from('vendor_schedule')
          .insert({ wedding_id: weddingId, vendor_id: vendorId, ...patch })
          .select('*'),
      );
      if (inserted.length === 0) throw new Error('That could not be recorded.');
      return inserted[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dayKeys.schedule(weddingId) }),
  });
}

export function useUpdateRisk(weddingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RiskInput }) => {
      const res = await supabase
        .from('risks')
        .update(patch)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That risk could not be updated.');
      return rows[0];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dayKeys.risks(weddingId) }),
  });
}

export const LEVELS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Critical' },
] as const;

export const LEVEL_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

/** The workbook's own phase order, so a timeline never renders Close first. */
const PHASES = ['Setup', 'Preparation', 'Arrival', 'Ceremony', 'Reception', 'Close'];

export function phaseOrder(phase: string | null): number {
  const i = PHASES.indexOf(phase ?? '');
  return i === -1 ? PHASES.length : i;
}

/** Red for anything that would ruin the day, amber for anything that would dent it. */
export function scoreTone(score: number): 'stop' | 'warn' | 'gold' | 'neutral' {
  if (score >= 9) return 'stop';
  if (score >= 6) return 'warn';
  if (score >= 3) return 'gold';
  return 'neutral';
}

/** hh:mm from a Postgres `time`, which arrives as 'HH:MM:SS'. */
export function clock(value: string | null | undefined): string {
  return value ? String(value).slice(0, 5) : '—';
}
