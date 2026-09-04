import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../lib/supabase';
import type { Database, Tables } from '../../types/database.types';

export type TaskRow = Tables<'wedding_tasks'>;
export type Readiness = Database['public']['Views']['v_readiness']['Row'];

export type TaskInput = Partial<
  Pick<
    TaskRow,
    | 'task'
    | 'category'
    | 'owner'
    | 'priority'
    | 'status'
    | 'due_date'
    | 'due_date_overridden'
    | 'notes'
    | 'offset_days'
  >
>;

export const taskKeys = {
  list: (weddingId: string) => ['tasks', weddingId] as const,
  readiness: (weddingId: string) => ['tasks', weddingId, 'readiness'] as const,
};

export function useTasks(weddingId: string) {
  return useQuery({
    queryKey: taskKeys.list(weddingId),
    queryFn: async (): Promise<TaskRow[]> => {
      const res = await supabase
        .from('wedding_tasks')
        .select('*')
        // Undated tasks last: they are the ones nobody has decided about, and
        // they should not sit at the top pushing the dated work out of view.
        .eq('wedding_id', weddingId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('seq', { ascending: true });
      return unwrap(res);
    },
  });
}

/** Ticket 5.3. Completion per area, aggregated in the database. */
export function useReadiness(weddingId: string) {
  return useQuery({
    queryKey: taskKeys.readiness(weddingId),
    queryFn: async (): Promise<Readiness[]> => {
      const res = await supabase
        .from('v_readiness')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('area');
      return unwrap(res);
    },
  });
}

/**
 * Readiness is a view over the same rows, so it goes stale on every write.
 * Returned rather than fired and forgotten, so a mutation does not settle
 * before the numbers it changed have been refreshed.
 */
function useInvalidateTasks(weddingId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: taskKeys.list(weddingId) }),
      qc.invalidateQueries({ queryKey: taskKeys.readiness(weddingId) }),
    ]);
}

export function useCreateTask(weddingId: string) {
  const invalidate = useInvalidateTasks(weddingId);
  return useMutation({
    mutationFn: async (input: TaskInput & { task: string }) => {
      // No source_template_id: a task the couple added is not a template copy,
      // and leaving it null keeps re-seeding idempotent rather than colliding
      // on (wedding_id, source_template_id).
      const res = await supabase
        .from('wedding_tasks')
        .insert({ ...input, wedding_id: weddingId })
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That task could not be created.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTask(weddingId: string) {
  const invalidate = useInvalidateTasks(weddingId);
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: TaskInput }) => {
      const res = await supabase
        .from('wedding_tasks')
        .update(patch)
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      // RLS filters an update the caller may not make rather than refusing it,
      // so zero rows back is a failure and not a silent success.
      if (rows.length === 0) throw new Error('That task could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTask(weddingId: string) {
  const invalidate = useInvalidateTasks(weddingId);
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await supabase
        .from('wedding_tasks')
        .delete()
        .eq('id', id)
        .eq('wedding_id', weddingId);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: invalidate,
  });
}

/**
 * Marking a task done, or undoing it.
 *
 * completed_at is set here rather than by a trigger because it is the only
 * write that means "this happened now" — a status changed to completed by an
 * import or a bulk edit is not the same event.
 */
export function useSetTaskStatus(weddingId: string) {
  const invalidate = useInvalidateTasks(weddingId);
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TaskRow['status'] }) => {
      const res = await supabase
        .from('wedding_tasks')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('wedding_id', weddingId)
        .select('*');
      const rows = unwrap(res);
      if (rows.length === 0) throw new Error('That task could not be updated.');
      return rows[0];
    },
    onSuccess: invalidate,
  });
}
