import { describe, expect, it, vi } from 'vitest';
import { deleteWeddingCascade, type DeleteWeddingDeps } from './deleteWedding';

const W = '11111111-1111-1111-1111-111111111111';

/**
 * A deps double that records the order of the calls it receives. Order is the
 * thing under test here, not the individual calls: see the ordering test below.
 */
function harness(overrides: Partial<DeleteWeddingDeps> = {}) {
  const calls: string[] = [];
  const deps: DeleteWeddingDeps = {
    listStoragePaths: vi.fn(async () => {
      calls.push('list');
      return { receipts: [`${W}/p1/receipt.pdf`], contracts: [`${W}/v1/contract.pdf`] };
    }),
    removeObjects: vi.fn(async (bucket: string) => {
      calls.push(`remove:${bucket}`);
    }),
    deleteWeddingRow: vi.fn(async () => {
      calls.push('deleteRow');
      return [W];
    }),
    ...overrides,
  };
  return { deps, calls };
}

describe('deleteWeddingCascade', () => {
  /**
   * The storage policies resolve permission through wedding_members. Once the
   * weddings row cascades that membership is gone, and the objects can never be
   * deleted by anyone again. So the purge has to happen while access still
   * exists — before the row delete, never after.
   */
  it('removes storage objects before deleting the wedding row', async () => {
    const { deps, calls } = harness();

    await deleteWeddingCascade(W, deps);

    expect(calls).toEqual(['list', 'remove:receipts', 'remove:contracts', 'deleteRow']);
  });

  /**
   * RLS filters a delete the caller may not make rather than refusing it: the
   * statement succeeds and touches nothing. A partner (not owner) clicking
   * delete must not be told the wedding is gone while it is still there.
   */
  it('throws when the row delete touches nothing, rather than reporting success', async () => {
    const { deps } = harness({ deleteWeddingRow: vi.fn(async () => []) });

    await expect(deleteWeddingCascade(W, deps)).rejects.toThrow(/only the owner/i);
  });

  /** An empty remove([]) is a wasted round trip, and Storage rejects it. */
  it('skips a bucket with no objects', async () => {
    const { deps, calls } = harness({
      listStoragePaths: vi.fn(async () => ({ receipts: [], contracts: [`${W}/v1/c.pdf`] })),
    });

    await deleteWeddingCascade(W, deps);

    expect(calls).toEqual(['remove:contracts', 'deleteRow']);
  });

  /**
   * Failing closed. If the purge breaks halfway the wedding must survive, so
   * the files are still reachable and the user can retry. Deleting the row
   * anyway would strand whatever was left.
   */
  it('leaves the wedding intact when storage removal fails', async () => {
    const { deps } = harness({
      removeObjects: vi.fn(async () => {
        throw new Error('storage unreachable');
      }),
    });

    await expect(deleteWeddingCascade(W, deps)).rejects.toThrow(/storage unreachable/);
    expect(deps.deleteWeddingRow).not.toHaveBeenCalled();
  });
});
