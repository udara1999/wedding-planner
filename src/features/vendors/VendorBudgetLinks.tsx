import { useMemo, useState } from 'react';
import { Link2, Search, Unlink } from 'lucide-react';
import { useLinkBudgetLine, useLinkableBudgetLines, useVendorFinancials } from './vendorsApi';
import { formatMinorAsMajor } from '../../lib/units';
import { Badge, Button, InlineError, Input, Skeleton, Stat, cn } from '../../components/ui';

/**
 * Which budget items this vendor is being hired to fulfil.
 *
 * The link lives on the budget line (one vendor, many lines), so linking is an
 * update to the line. Optional throughout: a vendor with nothing linked is a
 * perfectly good vendor you have not budgeted for yet, and the allocation gap
 * says so rather than treating it as an error.
 */
export function VendorBudgetLinks({
  weddingId,
  vendorId,
  currency,
  decimals,
  canEdit,
}: {
  weddingId: string;
  vendorId: string;
  currency: string;
  decimals: number;
  canEdit: boolean;
}) {
  const lines = useLinkableBudgetLines(weddingId);
  const financials = useVendorFinancials(weddingId);
  const link = useLinkBudgetLine(weddingId);
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);

  const linked = useMemo(
    () => (lines.data ?? []).filter((l) => l.vendor_id === vendorId),
    [lines.data, vendorId],
  );

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (lines.data ?? [])
      .filter((l) => l.vendor_id !== vendorId)
      .filter((l) =>
        needle ? `${l.code ?? ''} ${l.name}`.toLowerCase().includes(needle) : true,
      )
      .slice(0, 30);
  }, [lines.data, vendorId, query]);

  const money = financials.data?.get(vendorId);
  const gap = Number(money?.allocation_gap_minor ?? 0);

  if (lines.isLoading) return <Skeleton className="h-32 rounded-lg" />;

  return (
    <div className="space-y-3 border-t border-stone-100 pt-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-stone-700">
          <Link2 className="size-3.5" />
          Budget items this vendor covers
        </p>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setPicking((p) => !p)}>
            {picking ? 'Done' : 'Link an item'}
          </Button>
        )}
      </div>

      {money && (
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={`Forecast from lines (${currency})`}
            value={formatMinorAsMajor(Number(money.forecast_minor ?? 0), decimals)}
            hint={`${Number(money.budget_line_count ?? 0)} linked`}
          />
          <Stat
            label={`Paid (${currency})`}
            value={formatMinorAsMajor(Number(money.paid_minor ?? 0), decimals)}
            hint={`${formatMinorAsMajor(Number(money.outstanding_minor ?? 0), decimals)} outstanding`}
            tone={Number(money.overpaid_minor ?? 0) > 0 ? 'bad' : 'flat'}
          />
        </div>
      )}

      {/* The gap between what the couple allocated and what the vendor quoted:
          a question worth asking, not an error. */}
      {money && Number(money.vendor_price_minor ?? 0) > 0 && gap !== 0 && (
        <p
          className={cn(
            'rounded-lg px-3 py-2 text-xs',
            gap > 0 ? 'bg-amber-50 text-amber-800' : 'bg-stone-50 text-stone-600',
          )}
        >
          {gap > 0 ? (
            <>
              Your budget lines add up to{' '}
              <strong>{formatMinorAsMajor(gap, decimals)} {currency}</strong> more than this
              vendor quoted.
            </>
          ) : (
            <>
              This vendor quoted{' '}
              <strong>{formatMinorAsMajor(Math.abs(gap), decimals)} {currency}</strong> more than
              the lines you have linked. Something they will charge for may not be budgeted yet.
            </>
          )}
        </p>
      )}

      {linked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2.5 text-xs text-stone-500">
          No budget items linked. That is fine — the vendor still exists, its costs just are not
          in the budget yet.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
          {linked.map((l) => (
            <li key={l.id} className="flex items-center gap-2 px-3 py-2">
              <span className="w-14 shrink-0 font-mono text-[11px] text-stone-400">
                {l.code ?? '—'}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-stone-800">{l.name}</span>
              <span className="tabular shrink-0 text-xs text-stone-700">
                {formatMinorAsMajor(l.forecast_minor, decimals)}
              </span>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={link.isPending}
                  icon={<Unlink className="size-3.5" />}
                  onClick={() => link.mutate({ lineId: l.id, vendorId: null })}
                >
                  <span className="sr-only">Unlink</span>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {picking && canEdit && (
        <div className="rounded-lg border border-stone-200">
          <div className="relative border-b border-stone-100">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-stone-400" />
            <Input
              className="border-0 pl-9 shadow-none focus:ring-0"
              placeholder="Search a budget line by name or code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul className="scroll-subtle max-h-56 overflow-y-auto py-1">
            {candidates.length === 0 ? (
              <li className="px-3 py-2 text-xs text-stone-500">Nothing matches.</li>
            ) : (
              candidates.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={link.isPending}
                    onClick={() => link.mutate({ lineId: l.id, vendorId })}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-stone-50"
                  >
                    <span className="w-14 shrink-0 font-mono text-[11px] text-stone-400">
                      {l.code ?? '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-stone-800">{l.name}</span>
                    {l.vendor_id && <Badge tone="warn">linked elsewhere</Badge>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <InlineError error={link.error} />
    </div>
  );
}
