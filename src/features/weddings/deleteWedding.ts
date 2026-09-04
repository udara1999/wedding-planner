/**
 * Deleting a wedding and everything under it.
 *
 * The database half is already done and needs no SQL here: all 24 foreign keys
 * pointing at weddings(id) are `on delete cascade`, and the weddings_delete
 * policy is `using (app.is_owner(id))`. One delete of the parent row therefore
 * empties guests, budget, payments, vendors, seating, tasks, RSVPs, day-of
 * operations, members, invitations and billing.
 *
 * Storage is the half that does NOT cascade, and the ordering below is the
 * whole point of this module. See deleteWeddingCascade().
 */

export type StorageBucket = 'receipts' | 'contracts';

/**
 * The three database/storage operations this needs, injected so the ordering
 * and the failure handling can be tested without a live Supabase.
 */
export interface DeleteWeddingDeps {
  /**
   * Storage keys for the wedding, read from the columns that hold them
   * (payments.receipt_path, vendor_attachments.path) rather than by listing
   * the buckets — those columns *are* the keys, which avoids paginating and
   * walking nested prefixes.
   */
  listStoragePaths: (weddingId: string) => Promise<Record<StorageBucket, string[]>>;
  removeObjects: (bucket: StorageBucket, paths: string[]) => Promise<void>;
  /** Resolves with the ids actually deleted — empty when RLS filtered it. */
  deleteWeddingRow: (weddingId: string) => Promise<string[]>;
}

const BUCKETS: StorageBucket[] = ['receipts', 'contracts'];

export async function deleteWeddingCascade(
  weddingId: string,
  deps: DeleteWeddingDeps,
): Promise<void> {
  // Storage first, and it must stay first. The storage policies resolve
  // permission through app.can_write(app.wedding_from_storage_path(name)),
  // which reads wedding_members. The moment the weddings row cascades that
  // membership row is gone, and every receipt and contract becomes an object
  // no API caller can ever reach again — invisible, undeletable, still billed.
  const paths = await deps.listStoragePaths(weddingId);

  for (const bucket of BUCKETS) {
    // Storage rejects an empty list, and it would be a wasted round trip.
    if (paths[bucket].length > 0) await deps.removeObjects(bucket, paths[bucket]);
  }

  // Anything thrown above propagates before this line, leaving the wedding
  // whole: a half-finished purge is retryable, a deleted row is not.
  const deleted = await deps.deleteWeddingRow(weddingId);

  // RLS filters a delete the caller may not make instead of refusing it — the
  // statement succeeds having touched nothing. Without this, a partner or
  // coordinator would be told the wedding was deleted while it is still there.
  if (deleted.length === 0) {
    throw new Error('That wedding could not be deleted — only the owner can delete a wedding.');
  }
}
