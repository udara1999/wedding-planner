import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useVendorFinancials, useVendorPayments } from './vendorsApi';
import { STAGE_LABEL, STATUS_LABEL, STATUS_TONE } from '../payments/status';
import { formatMinorAsMajor } from '../../lib/units';
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Paid" value={formatMinorAsMajor(paid, decimals)} currency={currency} />
        <Figure
          label="Still due"
          value={formatMinorAsMajor(due, decimals)}
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
            {currency} {formatMinorAsMajor(unbudgeted, decimals)} was paid to this vendor against no
            budget line, so it is not in any forecast. Link those payments to a line, or add one.
          </span>
        </p>
      )}

      {payments.isLoading ? (
        <div className="mt-3">
          <SkeletonRows rows={3} />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-sm text-stone-500">
          <CalendarClock className="size-4 shrink-0 text-stone-400" />
          Nothing has been paid to this vendor yet. Payments recorded against their budget lines
          appear here automatically.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 rounded-xl border border-stone-200">
          {rows.map((p) => {
            const status = (p.status ?? 'not_due') as PaymentStatus;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-stone-900">
                    {p.stage ? STAGE_LABEL[p.stage] : 'Payment'}
                  </p>
                  <p className="truncate text-xs text-stone-400">
                    {p.paid_on
                      ? `paid ${p.paid_on}`
                      : p.due_date
                        ? `due ${p.due_date}`
                        : 'no date set'}
                    {p.method ? ` · ${p.method}` : ''}
                    {p.reference ? ` · ${p.reference}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm text-stone-900">
                    {formatMinorAsMajor(p.amount_paid_minor, decimals)}
                  </p>
                  <p className="tabular text-[11px] text-stone-400">
                    of {formatMinorAsMajor(p.amount_due_minor, decimals)}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
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
      <p className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 text-sm font-semibold',
          tone === 'warn' ? 'text-amber-700' : 'text-stone-900',
        )}
      >
        {currency && <span className="mr-1 text-xs font-normal text-stone-400">{currency}</span>}
        {value}
      </p>
      {hint && <p className="text-[11px] text-stone-400">{hint}</p>}
    </div>
  );
}
