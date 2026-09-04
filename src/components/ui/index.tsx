import { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, Loader2, X } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ==========================================================================
   Button
   ========================================================================== */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' && 'h-8 px-2.5 text-[13px]',
        size === 'md' && 'h-9.5 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-5 text-sm',
        variant === 'primary' && 'bg-wine-700 text-white shadow-sm hover:bg-wine-800',
        variant === 'secondary' &&
          'border border-stone-200 bg-white text-stone-800 shadow-sm hover:border-stone-300 hover:bg-stone-50',
        variant === 'subtle' && 'bg-stone-100 text-stone-800 hover:bg-stone-200',
        variant === 'ghost' && 'text-stone-600 hover:bg-stone-100 hover:text-stone-900',
        variant === 'danger' && 'bg-red-700 text-white shadow-sm hover:bg-red-800',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** A square button for a lone icon — keeps the 44px-ish hit area without padding hacks. */
export function IconButton({
  className,
  label,
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'focus-ring inline-flex items-center justify-center rounded-lg text-stone-500',
        'transition-colors hover:bg-stone-100 hover:text-stone-900',
        'disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'size-7' : 'size-9',
        className,
      )}
      {...props}
    />
  );
}

/* ==========================================================================
   Inputs
   ========================================================================== */
const control =
  'w-full rounded-lg border border-stone-200 bg-white text-sm text-stone-900 shadow-sm ' +
  'transition-[border-color,box-shadow] placeholder:text-stone-400 ' +
  'focus:border-wine-500 focus:ring-2 focus:ring-wine-500/25 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 ' +
  'aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-500/25';

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(control, 'h-9.5 px-3', className)} {...props} />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(control, 'min-h-20 px-3 py-2', className)} {...props} />
);

export const Select = ({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      className={cn(control, 'h-9.5 appearance-none pr-9 pl-3', className)}
      {...props}
    />
    {/* An inline SVG rather than an icon component: a pointer-events-none
        decoration should not be a React subtree that can capture clicks. */}
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-stone-400"
    >
      <path
        d="M6 8l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

/* ==========================================================================
   Field
   ========================================================================== */
export function Field({
  label,
  error,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  /** For laying the field out in a row — width, flex, grid span. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('block', className)} htmlFor={htmlFor}>
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700">{label}</span>
      {children}
      {/* Hint gives way to the error rather than stacking, so the control never
          shifts by a line when validation fires. */}
      {error ? (
        <span className="mt-1.5 flex items-center gap-1 text-xs text-red-700">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>
      ) : null}
    </label>
  );
}

/* ==========================================================================
   Card
   ========================================================================== */
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rounded-xl border border-stone-200/80 bg-white shadow-card',
      'transition-shadow',
      className,
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex items-center justify-between gap-3 px-5 pt-4 pb-3', className)}
    {...props}
  />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-sm font-semibold tracking-tight text-stone-900', className)} {...props} />
);

export const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 pb-5', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('border-t border-stone-100 px-5 py-3', className)} {...props} />
);

/* ==========================================================================
   Page scaffolding
   ========================================================================== */
/**
 * Every screen opens the same way: title, one line of orientation, actions on
 * the right. Consistency here is most of what makes an app feel designed.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Constrains and pads a screen. `wide` for data tables, default for forms. */
export function Page({
  children,
  width = 'default',
  className,
}: {
  children: React.ReactNode;
  width?: 'default' | 'wide' | 'narrow';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-5 py-7 sm:px-8',
        width === 'narrow' && 'max-w-3xl',
        width === 'default' && 'max-w-5xl',
        width === 'wide' && 'max-w-[86rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Stat
   ==========================================================================
   Was copy-pasted into three pages before it lived here.
   ========================================================================== */
export function Stat({
  label,
  value,
  hint,
  tone = 'flat',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'flat' | 'good' | 'bad' | 'accent';
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white px-4 py-3.5 shadow-card">
      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'tabular mt-1 text-[22px] leading-tight font-semibold tracking-tight',
          tone === 'flat' && 'text-stone-900',
          tone === 'good' && 'text-emerald-700',
          tone === 'bad' && 'text-red-700',
          tone === 'accent' && 'text-wine-700',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

/* ==========================================================================
   Badge
   ========================================================================== */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'good' | 'warn' | 'stop' | 'gold' | 'accent';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        'ring-1 ring-inset',
        tone === 'neutral' && 'bg-stone-50 text-stone-600 ring-stone-200',
        tone === 'good' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        tone === 'warn' && 'bg-amber-50 text-amber-700 ring-amber-200',
        tone === 'stop' && 'bg-red-50 text-red-700 ring-red-200',
        tone === 'gold' && 'bg-gold-50 text-gold-700 ring-gold-200',
        tone === 'accent' && 'bg-wine-50 text-wine-700 ring-wine-200',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ==========================================================================
   States
   ========================================================================== */
export const Spinner = ({ label = 'Loading' }: { label?: string }) => (
  <div className="flex items-center gap-2 text-sm text-stone-500" role="status">
    <Loader2 className="size-4 animate-spin text-wine-600" />
    {label}
  </div>
);

/**
 * Skeletons rather than a spinner for list-shaped content: the layout does not
 * jump when the data lands, which is most of what makes loading feel slow.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-stone-200/70', className)} />;
}

export function SkeletonRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/50 px-6 py-12 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-white text-stone-400 shadow-card">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-stone-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-red-900">Could not load this</p>
          <p className="mt-0.5 text-sm break-words text-red-700">{message}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Inline failure next to a control, for a mutation rather than a query. */
export function InlineError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Something went wrong';
  return (
    <p className="flex items-start gap-1.5 text-xs text-red-700">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/* ==========================================================================
   Modal
   ==========================================================================
   A wide centred panel for a record with several distinct panels to it — a
   vendor has identity, money, linked budget lines and documents, which is more
   than a side drawer can show without everything becoming a narrow column.
   Use Drawer for a single form, Modal when the content wants two columns.
   ========================================================================== */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  badge,
  size = 'lg',
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  size?: 'md' | 'lg' | 'full';
  children: React.ReactNode;
}) {
  // Escape closes it, which a mouse-only close button does not give you.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-pop',
          size === 'md' && 'max-w-2xl',
          size === 'lg' && 'max-w-5xl',
          size === 'full' && 'h-[90dvh] max-w-[92rem]',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-stone-900">
                {title}
              </h2>
              {badge}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-sm text-stone-500">{subtitle}</p>}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        {/* The panel scrolls, not the page behind it. */}
        <div className="scroll-subtle min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * A titled block inside a Modal. Grouping is what stops a long record reading
 * as one undifferentiated column of inputs.
 */
export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h3 className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
          {title}
        </h3>
        {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export { SearchableSelect, type SearchableOption } from './SearchableSelect';
