import { describe, expect, it } from 'vitest';
import { buildReceiptPath, safeFileName, weddingFromReceiptPath } from './receipts';

const W = '11111111-1111-1111-1111-111111111111';
const P = '22222222-2222-2222-2222-222222222222';

describe('safeFileName', () => {
  it('keeps an ordinary name intact', () => {
    expect(safeFileName('receipt.pdf')).toBe('receipt.pdf');
  });

  it('replaces spaces, which break signed URLs in practice', () => {
    expect(safeFileName('gold house receipt.pdf')).toBe('gold-house-receipt.pdf');
  });

  /**
   * The first path segment is the wedding id, and the storage policies read it
   * to decide access. A name containing a slash could otherwise plant an object
   * under a different folder from the one the caller was authorised for.
   */
  it('strips path separators so a name cannot climb out of its folder', () => {
    expect(safeFileName('../../etc/passwd')).toBe('etc-passwd');
    expect(safeFileName('a/b/c.pdf')).toBe('a-b-c.pdf');
    expect(safeFileName('..')).toBe('receipt');
  });

  it('strips characters that are awkward in a URL', () => {
    expect(safeFileName('in#voice?v=2.pdf')).toBe('in-voice-v-2.pdf');
  });

  it('collapses runs of separators rather than leaving gaps', () => {
    expect(safeFileName('a   b___c.pdf')).toBe('a-b-c.pdf');
  });

  it('falls back to a usable name when nothing survives', () => {
    expect(safeFileName('///')).toBe('receipt');
    expect(safeFileName('')).toBe('receipt');
  });

  it('keeps the name short enough for object storage', () => {
    expect(safeFileName('x'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(120);
  });

  it('preserves the extension so the file still opens', () => {
    expect(safeFileName('x'.repeat(300) + '.pdf').endsWith('.pdf')).toBe(true);
  });
});

describe('buildReceiptPath', () => {
  it('puts the wedding id first, because the policy reads that segment', () => {
    expect(buildReceiptPath(W, P, 'receipt.pdf')).toBe(`${W}/${P}/receipt.pdf`);
  });

  it('sanitises the file name on the way in', () => {
    expect(buildReceiptPath(W, P, '../oops.pdf')).toBe(`${W}/${P}/oops.pdf`);
  });
});

describe('weddingFromReceiptPath', () => {
  it('reads the wedding id back out', () => {
    expect(weddingFromReceiptPath(`${W}/${P}/receipt.pdf`)).toBe(W);
  });

  it('returns null for a path that is not scoped to a wedding', () => {
    expect(weddingFromReceiptPath('receipt.pdf')).toBeNull();
    expect(weddingFromReceiptPath('not-a-uuid/x/receipt.pdf')).toBeNull();
    expect(weddingFromReceiptPath('')).toBeNull();
  });
});
