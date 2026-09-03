import { cn } from '../../components/ui';
import type { Applicability } from '../../types/db';

/** Ticket 2.4. Order matches the workbook's "Applies?" dropdown. */
const OPTIONS: { value: Applicability; label: string; title: string }[] = [
  { value: 'required', label: 'Required', title: 'Counted in the forecast' },
  { value: 'optional', label: 'Optional', title: 'Counted in the forecast' },
  {
    value: 'not_applicable',
    label: 'N/A',
    title: 'Excluded from the forecast, but its budget still shows in the budgeted total',
  },
];

/**
 * A three-state switch rather than a checkbox, because "not applicable" is not
 * the opposite of "required" — optional lines still count towards the forecast.
 */
export function ApplicabilitySwitch({
  value,
  onChange,
  disabled,
  pending,
}: {
  value: Applicability;
  onChange: (next: Applicability) => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Applies?"
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-stone-300',
        pending && 'opacity-60',
      )}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            disabled={disabled || pending}
            onClick={() => !active && onChange(option.value)}
            className={cn(
              'px-2 py-1 text-[11px] font-medium transition-colors',
              'border-r border-stone-200 last:border-r-0',
              active && option.value === 'not_applicable' && 'bg-stone-200 text-stone-700',
              active && option.value !== 'not_applicable' && 'bg-wine-700 text-white',
              !active && 'bg-white text-stone-500 hover:bg-stone-50',
              (disabled || pending) && 'cursor-not-allowed',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
