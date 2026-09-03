import { useMemo, useState } from 'react';
import { resolveBudgetLine, suggestBudgetLines, type PickableLine } from './picker';
import { Input, cn } from '../../components/ui';

/**
 * Ticket 2.6. Type a workbook code (BG077) or part of a name.
 *
 * The rejection is the point: an unresolved input reports itself instead of
 * quietly leaving the payment attached to nothing, which would take the money
 * out of every forecast without anybody noticing.
 */
export function BudgetLinePicker({
  lines,
  value,
  onChange,
  disabled,
}: {
  lines: readonly PickableLine[];
  value: string | null;
  onChange: (lineId: string | null) => void;
  disabled?: boolean;
}) {
  const selected = value ? lines.find((l) => l.id === value) ?? null : null;
  const [query, setQuery] = useState(() =>
    selected ? `${selected.code ?? ''} ${selected.name}`.trim() : '',
  );
  const [touched, setTouched] = useState(false);

  const result = useMemo(() => resolveBudgetLine(lines, query), [lines, query]);
  const suggestions = useMemo(
    () => (result.status === 'found' ? [] : suggestBudgetLines(lines, query)),
    [lines, query, result.status],
  );

  function choose(line: PickableLine) {
    setQuery(`${line.code ?? ''} ${line.name}`.trim());
    onChange(line.id);
  }

  // Keep the parent in step with what the text currently resolves to.
  function handleQuery(next: string) {
    setQuery(next);
    const r = resolveBudgetLine(lines, next);
    onChange(r.status === 'found' ? r.line.id : null);
  }

  const problem =
    touched && query.trim() !== ''
      ? result.status === 'unknown'
        ? `Nothing matches “${query.trim()}”. Use a budget code like BG077, or part of the line name.`
        : result.status === 'ambiguous'
          ? `“${query.trim()}” matches ${result.matches.length} lines — pick one.`
          : null
      : null;

  return (
    <div className="space-y-1.5">
      <Input
        placeholder="BG077, or “necklace”"
        value={query}
        disabled={disabled}
        onChange={(e) => handleQuery(e.target.value)}
        onBlur={() => setTouched(true)}
        aria-invalid={problem ? true : undefined}
        className={cn(problem && 'border-red-400')}
      />

      {result.status === 'found' && (
        <p className="text-xs text-green-700">
          {result.line.code ? `${result.line.code} · ` : ''}
          {result.line.name}
        </p>
      )}

      {problem && <p className="text-xs text-red-700">{problem}</p>}

      {suggestions.length > 0 && (
        <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
          {suggestions.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-stone-50"
                onClick={() => choose(line)}
              >
                <span className="font-mono text-stone-400">{line.code ?? '—'}</span>{' '}
                <span className="text-stone-800">{line.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
