import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { resolveBudgetLine, suggestBudgetLines, type PickableLine } from './picker';
import { cn } from '../../components/ui';

/**
 * Ticket 2.6, as a searchable dropdown.
 *
 * Choosing from a list rather than typing free text makes the AC's "unknown
 * code rejected" structural: there is nothing to reject, because nothing
 * unknown can be selected. Typing still resolves a code directly — Enter on an
 * exact match picks it — because "BG077" is how a line gets referred to.
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? (lines.find((l) => l.id === value) ?? null) : null;

  // An empty query lists everything, so the control behaves like a dropdown
  // before it behaves like a search.
  const results = useMemo(
    () => (query.trim() ? suggestBudgetLines(lines, query, 50) : lines.slice(0, 50)),
    [lines, query],
  );

  // Focus only: the highlight is reset by whatever opened the panel, so this
  // effect does not start a second render.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function choose(line: PickableLine) {
    onChange(line.id);
    setOpen(false);
    setQuery('');
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // An exact code wins over whatever happens to be highlighted, so typing
      // a code in full and pressing Enter always lands on that line.
      const exact = resolveBudgetLine(lines, query);
      if (exact.status === 'found') choose(exact.line);
      else if (results[highlight]) choose(results[highlight]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setHighlight(0);
          setOpen((o) => !o);
        }}
        className={cn(
          'focus-ring flex h-9.5 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm shadow-sm',
          'disabled:cursor-not-allowed disabled:bg-stone-50',
          invalid ? 'border-red-400' : 'border-stone-200 hover:border-stone-300',
        )}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {selected.code && (
              <span className="shrink-0 font-mono text-[11px] text-stone-400">{selected.code}</span>
            )}
            <span className="truncate text-stone-900">{selected.name}</span>
          </span>
        ) : (
          <span className="text-stone-400">Choose a budget line</span>
        )}
        <ChevronsUpDown className="size-3.5 shrink-0 text-stone-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-pop">
          <div className="relative border-b border-stone-100">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-stone-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search by name or code, e.g. BG077"
              className="h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-stone-400"
            />
          </div>

          <ul role="listbox" className="scroll-subtle max-h-64 overflow-y-auto py-1">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-xs text-stone-500">
                Nothing matches “{query.trim()}”.
              </li>
            ) : (
              results.map((line, i) => {
                const isSelected = line.id === value;
                return (
                  <li key={line.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => choose(line)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                        i === highlight ? 'bg-wine-50' : 'hover:bg-stone-50',
                      )}
                    >
                      <span className="w-14 shrink-0 font-mono text-[11px] text-stone-400">
                        {line.code ?? '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-stone-800">{line.name}</span>
                      {isSelected && <Check className="size-3.5 shrink-0 text-wine-600" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
