import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../../../lib/supabase';
import { guestKeys } from '../api';
import type { ImportPlan, PlannedRow } from './plan';

export interface ImportResult {
  created: number;
  updated: number;
  groupsCreated: number;
}

/** Chosen so a 500-row list is a handful of requests, not one enormous one. */
const CHUNK = 100;

/**
 * Applies a plan the person has already reviewed.
 *
 * This writes through PostgREST rather than a database function, so a failure
 * part-way leaves the rows written so far in place. That is survivable because
 * the plan is idempotent by construction: re-importing the same file turns
 * everything already written into a skip, and only the remainder is applied.
 * The alternative — one RPC taking the whole payload as jsonb — would be atomic
 * but would move field whitelisting out of the tested plan module and into SQL,
 * where the preview could drift from what actually gets written.
 */
export function useImportGuests(weddingId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (plan: ImportPlan): Promise<ImportResult> => {
      // Groups first: the rows that reference them need their ids.
      const groupIdByName = new Map<string, string>();
      if (plan.groupsToCreate.length > 0) {
        const rows = unwrap(
          await supabase
            .from('guest_groups')
            .insert(plan.groupsToCreate.map((name) => ({ wedding_id: weddingId, name })))
            .select('id, name'),
        );
        for (const g of rows) groupIdByName.set(g.name.toLowerCase(), g.id);
      }

      const resolve = (row: PlannedRow) => {
        const values = { ...row.values };
        if (row.groupName && !values.group_id) {
          values.group_id = groupIdByName.get(row.groupName.toLowerCase()) ?? null;
        }
        return values;
      };

      const creates = plan.rows.filter((r) => r.action === 'create');
      for (let i = 0; i < creates.length; i += CHUNK) {
        const batch = creates.slice(i, i + CHUNK).map((r) => ({
          ...resolve(r),
          wedding_id: weddingId,
          // Required by the column and guaranteed by the plan; narrowing here
          // keeps the insert type honest.
          household_name: r.values.household_name!,
        }));
        unwrap(await supabase.from('guests').insert(batch).select('id'));
      }

      // Updates go one at a time on purpose: each row sets a different subset of
      // columns, and an upsert would fill the columns a row omitted with
      // defaults — exactly the overwrite the blank-cell rule exists to prevent.
      const updates = plan.rows.filter((r) => r.action === 'update');
      for (const row of updates) {
        unwrap(
          await supabase
            .from('guests')
            .update(resolve(row))
            .eq('id', row.existingId!)
            .eq('wedding_id', weddingId)
            .select('id'),
        );
      }

      return {
        created: creates.length,
        updated: updates.length,
        groupsCreated: groupIdByName.size,
      };
    },
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: guestKeys.list(weddingId) }),
        qc.invalidateQueries({ queryKey: guestKeys.groups(weddingId) }),
      ]),
  });
}
