import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useVendorFinancials, useVendorPayments } from './vendorsApi';
import { STAGE_LABEL, STATUS_LABEL, STATUS_TONE } from '../payments/status';
import { formatMoney } from '../../lib/units';
import type { PaymentStatus } from '../../types/db';
import { Badge, Section, SkeletonRows, cn } from '../../components/ui';

/**
 * What this vendor has actually been paid, and when.
 *
 * Nothing here is entered on the vendor: every figure is a payment that exists
 * on the payments screen, attributed by the same rule the database enforces.
 * The vendor screen is a view of the money, never a second place to record it.
 */
export function VendorPayments({
  weddingId,
  vendorId,
  currency,
  decimals,
}: {
  weddingId: string;
  vendorId: string;
  currency: string;
  decimals: number;
}) {
  const payments = useVendorPayments(weddingId, vendorId);
  const financials = useVendorFinancials(weddingId);
  const money = financials.data?.get(vendorId);

  const rows = payments.data ?? [];
  const paid = money?.paid_minor ?? 0;
  const due = money?.due_minor ?? 0;
  const unbudgeted = money?.unbudgeted_paid_minor ?? 0;

  return (
    <Section
      title="Payments"
      description="Recorded on the payments screen and attributed here — this panel never holds a figure of its own."
    >
      {/* Two by two rather than four across. These sit in one column of a
          modal, and at four across the amounts wrapped mid-number. */}
      <div className="grid grid-cols-2 gap-3">
        <Figure label="Paid" value={formatMoney(paid, decimals)} currency={currency} />
        <Figure
          label="Still due"
          value={formatMoney(due, decimals)}
          currency={currency}
          tone={due > 0 ? 'warn' : undefined}
        />
        <Figure
          label="Next due"
          value={money?.next_due_date ?? '—'}
          hint={money?.next_due_date ? undefined : 'nothing outstanding'}
        />
        <Figure
          label="Last paid"
          value={money?.last_paid_on ?? '—'}
          hint={money?.last_paid_on ? undefined : 'no payment yet'}
        />
      </div>

      {unbudgeted > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {currency} {formatMoney(unbudgeted, decimals)} was paid to this vendor against no budget
            line, so it is not in any forecast. Link those payments to a line, or add one.
          </span>
        </p>
      )}

      {payments.isLoading ? (
        <div className="mt-3">
          <SkeletonRows rows={3} />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-sm text-stone-500">
          <CalendarClock className="size-4 shrink-0 text-stone-500" />
          Nothing has been paid to this vendor yet. Payments recorded against their budget lines
          appear here automatically.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((p) => {
            const status = (p.status ?? 'not_due') as PaymentStatus;
            // Every column of a view is nullable in the generated types.
            const settled = (p.amount_paid_minor ?? 0) >= (p.amount_due_minor ?? 0);
            return (
              <li key={p.id} className="rounded-xl border border-stone-200 bg-white px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {p.stage ? STAGE_LABEL[p.stage] : 'Payment'}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {p.paid_on
                        ? `paid ${p.paid_on}`
                        : p.due_date
                          ? `due ${p.due_date}`
                          : 'no date set'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-base font-semibold text-stone-900">
                      <span className="mr-1 text-xs sm:text-[11px] font-normal text-stone-500">
                        {currency}
                      </span>
                      {formatMoney(p.amount_paid_minor, decimals)}
                    </p>
                    {/* Only when it differs. "of 50,000" under "50,000" is
                        noise on every settled row. */}
                    {!settled && (
                      <p className="tabular text-xs sm:text-[11px] text-stone-500">
                        of {formatMoney(p.amount_due_minor, decimals)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 pt-2 text-xs sm:text-[11px] text-stone-500">
                  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  {p.method && <span>{p.method}</span>}
                  {p.reference && <span className="font-mono">{p.reference}</span>}
                  {p.paid_by && <span>by {p.paid_by}</span>}
                  {!p.budget_line_id && <span className="text-amber-700">no budget line</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function Figure({
  label,
  value,
  currency,
  hint,
  tone,
}: {
  label: string;
  value: string;
  currency?: string;
  hint?: string;
  tone?: 'warn';
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
      <p className="text-xs sm:text-[11px] font-medium tracking-wide text-stone-500 uppercase">
        {label}
      </p>
      <p
        className={cn(
          'tabular mt-0.5 text-sm font-semibold',
          tone === 'warn' ? 'text-amber-700' : 'text-stone-900',
        )}
      >
        {currency && <span className="mr-1 text-xs font-normal text-stone-500">{currency}</span>}
        {value}
      </p>
      {hint && <p className="text-xs sm:text-[11px] text-stone-500">{hint}</p>}
    </div>
  );
}
