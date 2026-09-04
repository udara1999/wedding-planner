import { useMemo } from 'react';
import { resolveBudgetLine, suggestBudgetLines, type PickableLine } from './picker';
import { SearchableSelect, type SearchableOption } from '../../components/ui';

/**
 * Ticket 2.6, as a searchable dropdown.
 *
 * Choosing from a list rather than typing free text makes the AC's "unknown
 * code rejected" structural: there is nothing to reject, because nothing
 * unknown can be selected.
 *
 * The control itself is the shared SearchableSelect. What stays here is the
 * only part that is specific to budget lines: a code identifies and a name only
 * describes, so an exact code beats a substring match on somebody else's name,
 * and Enter on a code typed in full lands on that line whatever is highlighted.
 * That ranking lives in picker.ts and is unit-tested there.
 */
export function BudgetLinePicker({
  lines,
  value,
  onChange,
  disabled,
  invalid,
}: {
  lines: readonly PickableLine[];
  value: string | null;
  onChange: (lineId: string | null) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const options = useMemo<SearchableOption[]>(
    () => lines.map((l) => ({ value: l.id, label: l.name, prefix: l.code })),
    [lines],
  );

  const asLines = (opts: readonly SearchableOption[]): PickableLine[] =>
    opts.map((o) => ({ id: o.value, code: o.prefix ?? null, name: o.label }));

  const toOption = (line: PickableLine): SearchableOption => ({
    value: line.id,
    label: line.name,
    prefix: line.code,
  });

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      invalid={invalid}
      showPrefixColumn
      placeholder="Choose a budget line"
      searchPlaceholder="Search by name or code, e.g. BG077"
      filter={(opts, query) => suggestBudgetLines(asLines(opts), query, 50).map(toOption)}
      resolveExact={(opts, query) => {
        const found = resolveBudgetLine(asLines(opts), query);
        return found.status === 'found' ? toOption(found.line) : null;
      }}
    />
  );
}
