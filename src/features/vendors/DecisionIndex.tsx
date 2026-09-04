import { useMemo } from 'react';
import { Check, CircleDashed, Store } from 'lucide-react';
import { useVendorDecisions } from './api';
import { formatMoney } from '../../lib/units';
import { Badge, Card, CardBody, CardHeader, CardTitle, Skeleton, cn } from '../../components/ui';

interface CategoryRef {
  key: string;
  label: string;
}

/**
 * Ticket 3.7. The 05a index: per category, how many options were entered, what
 * was decided, which vendor, at what price, and whether it has been written
 * back into `vendors` yet.
 *
 * Built from all 16 categories rather than from the decisions view alone —
 * v_vendor_decisions only has rows where options exist, and a category nobody
 * has started is exactly the thing this table should make obvious.
 */
export function DecisionIndex({
  weddingId,
  categories,
  currency,
  decimals,
  activeKey,
  onPick,
}: {
  weddingId: string;
  categories: CategoryRef[];
  currency: string;
  decimals: number;
  activeKey: string | null;
  onPick: (categoryKey: string) => void;
}) {
  const decisions = useVendorDecisions(weddingId);

  const rows = useMemo(() => {
    const byKey = new Map(
      (decisions.data ?? []).map((d) => [d.category_key ?? '', d] as const),
    );
    return categories.map((c) => ({ category: c, decision: byKey.get(c.key) ?? null }));
  }, [categories, decisions.data]);

  const decided = rows.filter((r) => r.decision?.chosen_option_id).length;
  const recorded = rows.filter((r) => r.decision?.recorded_in_vendors).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decision index</CardTitle>
        <span className="text-xs text-stone-500">
          {decided} of {categories.length} decided · {recorded} recorded
        </span>
      </CardHeader>
      <CardBody className="px-0 pb-0">
        {decisions.isLoading ? (
          <div className="px-5 pb-5">
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : (
          <div className="scroll-subtle max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                  <th className="px-5 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-right">Options</th>
                  <th className="px-2 py-2 text-left">Decision</th>
                  <th className="px-2 py-2 text-right">Agreed</th>
                  <th className="px-5 py-2 text-right">Recorded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ category, decision }) => {
                  const options = Number(decision?.options_entered ?? 0);
                  const chosen = decision?.chosen_vendor_name || decision?.chosen_label;
                  return (
                    <tr
                      key={category.key}
                      onClick={() => onPick(category.key)}
                      className={cn(
                        'cursor-pointer border-t border-stone-100 transition-colors hover:bg-stone-50',
                        activeKey === category.key && 'bg-wine-50/60',
                      )}
                    >
                      <td className="px-5 py-2">
                        <span
                          className={cn(
                            'text-[13px]',
                            activeKey === category.key
                              ? 'font-medium text-wine-800'
                              : 'text-stone-800',
                          )}
                        >
                          {category.label}
                        </span>
                      </td>
                      <td className="tabular px-2 py-2 text-right text-stone-500">
                        {options || '—'}
                      </td>
                      <td className="px-2 py-2">
                        {chosen ? (
                          <span className="text-[13px] text-stone-800">{chosen}</span>
                        ) : (
                          <span className="text-xs text-stone-500">Not decided</span>
                        )}
                      </td>
                      <td className="tabular px-2 py-2 text-right text-stone-800">
                        {decision?.agreed_price_minor
                          ? `${formatMoney(Number(decision.agreed_price_minor), decimals)} ${currency}`
                          : '—'}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {decision?.recorded_in_vendors ? (
                          <Badge tone="good">
                            <Check className="size-3" />
                            yes
                          </Badge>
                        ) : chosen ? (
                          <Badge tone="warn">
                            <CircleDashed className="size-3" />
                            not yet
                          </Badge>
                        ) : (
                          <span className="text-stone-500">
                            <Store className="inline size-3.5" />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
