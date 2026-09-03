/**
 * Resolving a typed budget line for ticket 2.6.
 *
 * The workbook has the user type a Budget ID into the payment row — "BG077" is
 * how a line is referred to in conversation — so the picker accepts either the
 * code or the name. An input matching nothing is REJECTED rather than ignored:
 * a payment silently attached to no budget line is money that vanishes from
 * every forecast.
 */

export interface PickableLine {
  id: string;
  code: string | null;
  name: string;
}

export type PickResult =
  | { status: 'empty' }
  | { status: 'found'; line: PickableLine }
  | { status: 'ambiguous'; matches: PickableLine[] }
  | { status: 'unknown' };

export function resolveBudgetLine(
  lines: readonly PickableLine[],
  query: string,
): PickResult {
  const needle = query.trim().toLowerCase();
  if (!needle) return { status: 'empty' };

  // A code identifies; a name only describes. An exact code therefore wins even
  // when the same text appears inside some other line's name.
  const byCode = lines.filter((l) => (l.code ?? '').toLowerCase() === needle);
  if (byCode.length === 1) return { status: 'found', line: byCode[0] };
  if (byCode.length > 1) return { status: 'ambiguous', matches: byCode };

  const byName = lines.filter((l) => l.name.toLowerCase().includes(needle));
  if (byName.length === 1) return { status: 'found', line: byName[0] };
  if (byName.length > 1) return { status: 'ambiguous', matches: byName };

  return { status: 'unknown' };
}

/** Suggestions while typing. Ordered so exact-code hits come first. */
export function suggestBudgetLines(
  lines: readonly PickableLine[],
  query: string,
  limit = 8,
): PickableLine[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const scored = lines
    .map((line) => {
      const code = (line.code ?? '').toLowerCase();
      if (code === needle) return { line, rank: 0 };
      if (code.startsWith(needle)) return { line, rank: 1 };
      if (line.name.toLowerCase().includes(needle)) return { line, rank: 2 };
      return null;
    })
    .filter((x): x is { line: PickableLine; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank);
  return scored.slice(0, limit).map((s) => s.line);
}
