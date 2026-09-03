/**
 * Receipt object paths (ticket 2.10).
 *
 * The path is the security boundary. Storage policies read the FIRST segment as
 * the wedding id and check it against app.can_see_money / app.can_write, so a
 * file name that could introduce a slash would let an upload land under a
 * folder the caller was never authorised for. Hence the sanitising here, and
 * the same parse implemented server-side in app.wedding_from_storage_path().
 */

const MAX_NAME = 120;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reduce a user-supplied file name to something safe for an object key. */
export function safeFileName(raw: string): string {
  // Only a genuine trailing extension counts. Looking for the last dot instead
  // would find one inside a "../" prefix and split the name in the wrong place.
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(raw);
  const ext = m ? m[1].toLowerCase() : '';
  const stem = m ? raw.slice(0, m.index) : raw;

  // With the extension already separated, a dot carries no meaning, so it is
  // just another separator — which is what disposes of "..".
  const clean = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const room = ext ? MAX_NAME - ext.length - 1 : MAX_NAME;
  const cleanStem = clean(stem).slice(0, Math.max(room, 1)).replace(/-$/, '');

  if (!cleanStem) return ext ? `receipt.${ext}` : 'receipt';
  return ext ? `${cleanStem}.${ext}` : cleanStem;
}

/** `<wedding_id>/<payment_id>/<file>` — the wedding id must come first. */
export function buildReceiptPath(
  weddingId: string,
  paymentId: string,
  fileName: string,
): string {
  return `${weddingId}/${paymentId}/${safeFileName(fileName)}`;
}

/** The inverse, for checking a stored path still belongs to this wedding. */
export function weddingFromReceiptPath(path: string): string | null {
  const first = path.split('/')[0] ?? '';
  return UUID.test(first) ? first : null;
}

export const RECEIPTS_BUCKET = 'receipts';
