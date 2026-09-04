import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';
import { cn } from './index';

export interface SearchableOption {
  value: string;
  label: string;
  /** Rendered in a fixed-width column before the label — a code, a count. */
  prefix?: string | null;
  /** Rendered after the label, quietly. */
  hint?: string | null;
}

/**
 * One searchable dropdown for the whole app.
 *
 * There were two before this: the budget-line picker in the payment form, and
 * a plain `<select>` everywhere else. Both were asked to become searchable, so
 * the behaviour that matters — where focus goes, what Escape does, what Enter
 * picks, whether an empty query lists everything — is defined once here rather
 * than reinvented per screen with slightly different keyboard handling.
 *
 * Domain-specific ranking stays with the domain: pass `filter` and
 * `resolveExact`. The payment form uses them so that typing "BG077" in full
 * and pressing Enter lands on that line whatever is highlighted.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Choose one',
  searchPlaceholder = 'Search',
  emptyLabel = 'Not set',
  disabled,
  invalid,
  clearable = false,
  allowCustom = false,
  showPrefixColumn = false,
  filter,
  resolveExact,
  renderValue,
}: {
  options: readonly SearchableOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** Label for the "no value" row, shown only when `clearable`. */
  emptyLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /**
   * Lets someone commit whatever they typed. For fields whose column is free
   * text and already holds values from before there was a list — clearing them
   * to fit the list would be data loss.
   */
  allowCustom?: boolean;
  showPrefixColumn?: boolean;
  filter?: (options: readonly SearchableOption[], query: string) => SearchableOption[];
  resolveExact?: (options: readonly SearchableOption[], query: string) => SearchableOption | null;
  renderValue?: (option: SearchableOption) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? (options.find((o) => o.value === value) ?? null) : null;

  // A value held by the row but absent from the list — a category typed by
  // hand before the list existed. Shown as itself rather than as "Choose one",
  // which would suggest the field were empty.
  const orphan: SearchableOption | null = value && !selected ? { value, label: value } : null;

  const results = useMemo(() => {
    const needle = query.trim();
    if (!needle) return options.slice(0, 100);
    if (filter) return filter(options, needle);
    const lower = needle.toLowerCase();
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(lower) ||
          (o.prefix ?? '').toLowerCase().includes(lower) ||
          (o.hint ?? '').toLowerCase().includes(lower),
      )
      .slice(0, 100);
  }, [options, query, filter]);

  const typed = query.trim();
  const canUseTyped =
    allowCustom &&
    typed !== '' &&
    !results.some((o) => o.label.toLowerCase() === typed.toLowerCase());

  // Focus only: the highlight is reset by whatever opened the panel, so this
  // does not cause a second render to correct itself.
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

  function commit(next: string | null) {
    onChange(next);
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
      const exact = resolveExact?.(options, query);
      if (exact) commit(exact.value);
      else if (results[highlight]) commit(results[highlight].value);
      else if (canUseTyped) commit(typed);
    }
  }

  const shown = selected ?? orphan;

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
        {shown ? (
          renderValue ? (
            renderValue(shown)
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              {shown.prefix && (
                <span className="shrink-0 font-mono text-[11px] text-stone-400">
                  {shown.prefix}
                </span>
              )}
              <span className="truncate text-stone-900">{shown.label}</span>
            </span>
          )
        ) : (
          <span className="text-stone-400">{placeholder}</span>
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
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent pr-3 pl-9 text-sm outline-none placeholder:text-stone-400"
            />
          </div>

          <ul role="listbox" className="scroll-subtle max-h-64 overflow-y-auto py-1">
            {clearable && typed === '' && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === null}
                  onClick={() => commit(null)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-500 hover:bg-stone-50"
                >
                  <X className="size-3.5 shrink-0 text-stone-400" />
                  {emptyLabel}
                </button>
              </li>
            )}

            {results.map((option, i) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => commit(option.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                      i === highlight ? 'bg-wine-50' : 'hover:bg-stone-50',
                    )}
                  >
                    {showPrefixColumn && (
                      <span className="w-14 shrink-0 font-mono text-[11px] text-stone-400">
                        {option.prefix ?? '—'}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-stone-800">{option.label}</span>
                    {option.hint && (
                      <span className="shrink-0 text-[11px] text-stone-400">{option.hint}</span>
                    )}
                    {isSelected && <Check className="size-3.5 shrink-0 text-wine-600" />}
                  </button>
                </li>
              );
            })}

            {canUseTyped && (
              <li className={cn(results.length > 0 && 'border-t border-stone-100')}>
                <button
                  type="button"
                  onClick={() => commit(typed)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-wine-800 hover:bg-wine-50"
                >
                  <Plus className="size-3.5 shrink-0" />
                  Use “{typed}”
                </button>
              </li>
            )}

            {results.length === 0 && !canUseTyped && (
              <li className="px-3 py-2 text-xs text-stone-500">Nothing matches “{typed}”.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
