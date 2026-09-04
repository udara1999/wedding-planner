import { usePaymentsForLine } from './api';
import { formatMoney } from '../../lib/units';
import type { PaymentStatus } from '../../types/db';
import { Badge, Skeleton } from '../../components/ui';

const TONE: Record<PaymentStatus, 'neutral' | 'good' | 'warn' | 'stop' | 'gold'> = {
  draft: 'neutral',
  paid: 'good',
  overdue: 'stop',
  due: 'warn',
  due_soon: 'gold',
  not_due: 'neutral',
};

const LABEL: Record<PaymentStatus, string> = {
  draft: 'draft',
  paid: 'paid',
  overdue: 'overdue',
  due: 'due',
  due_soon: 'due soon',
  not_due: 'not due',
};

/**
 * Every payment recorded against one budget line, shown where the line is
 * being edited. A line can be paid in several instalments, and until now the
 * only way to see them was the full payments list.
 */
export function LinePayments({
  weddingId,
  budgetLineId,
  forecastMinor,
  currency,
  decimals,
}: {
  weddingId: string;
  budgetLineId: string;
  forecastMinor: number | null;
  currency: string;
  decimals: number;
}) {
  const payments = usePaymentsForLine(weddingId, budgetLineId);

  if (payments.isLoading) return <Skeleton className="h-16 rounded-lg" />;

  const rows = payments.data ?? [];
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2.5 text-xs text-stone-500">
        No payments recorded against this line yet.
      </p>
    );
  }

  const paid = rows.reduce((sum, p) => sum + (p.amount_paid_minor ?? 0), 0);
  const overpaid = Math.max(paid - (forecastMinor ?? 0), 0);

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
        {rows.map((p) => {
          const status = (p.status ?? 'not_due') as PaymentStatus;
          return (
            <li key={p.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-stone-700">
                  {p.stage ? p.stage.replace(/_/g, ' ') : 'payment'}
                  {p.method ? ` · ${p.method}` : ''}
                </p>
                <p className="text-xs sm:text-[11px] text-stone-500">
                  {p.due_date ? `due ${p.due_date}` : 'no due date'}
                  {p.paid_on ? ` · paid ${p.paid_on}` : ''}
                </p>
              </div>
              <span className="tabular shrink-0 text-xs text-stone-900">
                {formatMoney(p.amount_paid_minor, decimals)}
              </span>
              <Badge tone={TONE[status]}>{LABEL[status]}</Badge>
            </li>
          );
        })}
      </ul>

      <div className="tabular flex items-center justify-between text-xs">
        <span className="text-stone-500">
          {rows.length} {rows.length === 1 ? 'payment' : 'payments'}
        </span>
        <span className={overpaid > 0 ? 'font-medium text-red-700' : 'text-stone-700'}>
          {formatMoney(paid, decimals)} {currency} paid
          {overpaid > 0 && ` · ${formatMoney(overpaid, decimals)} over forecast`}
        </span>
      </div>
    </div>
  );
}
