import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Search, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import {
  useBudgetByCategory,
  useBudgetCategories,
  useBudgetLines,
  useBudgetLineTotals,
  usePayerOptions,
  useUpdateBudgetLine,
  type LineTotals,
} from './api';
import { ApplicabilitySwitch } from './ApplicabilitySwitch';
import { BudgetLineForm } from './BudgetLineForm';
import { EMPTY_FILTERS, matchesFilters, summarise, type BudgetFilters } from './filters';
import { useFilterParam } from '../../lib/filterParam';
import { useSeedWedding } from '../weddings/api';
import { currencyDecimals, formatMoney } from '../../lib/units';
import type { Applicability, BudgetLineRow, MyWedding, PaymentStage } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Input,
  Modal,
  Page,
  PageHeader,
  Select,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

export function BudgetPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const categories = useBudgetCategories(wedding.id);
  const lines = useBudgetLines(wedding.id);
  const byCategory = useBudgetByCategory(wedding.id);
  const payers = usePayerOptions(wedding.id);
  const totals = useBudgetLineTotals(wedding.id);
  const update = useUpdateBudgetLine(wedding.id);
  const seed = useSeedWedding();

  const [filters, setFilters] = useState<BudgetFilters>(EMPTY_FILTERS);

  // Ticket 7.5. Only this one filter comes from the URL — it is the one an
  // alert links to, and the rest are set by hand on the page.
  const [overParam, setOverParam] = useFilterParam<'0' | '1'>('over', '0', ['0', '1']);
  // Memoised so it is a stable dependency below; a fresh object each render
  // would defeat the memo it feeds.
  const effectiveFilters = useMemo<BudgetFilters>(
    () => ({ ...filters, overBudgetOnly: overParam === '1' }),
    [filters, overParam],
  );

  // The category rail sticks below the header, so it needs the header's real
  // height — which changes when the description wraps or the stat hints appear.
  // Measured rather than hardcoded so the two never drift apart.
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const visible = useMemo(
    () => (lines.data ?? []).filter((l) => matchesFilters(l, effectiveFilters)),
    [lines.data, effectiveFilters],
  );
  const summary = useMemo(() => summarise(visible), [visible]);
  // Looked up fresh on every render, so an edit made elsewhere — or the refetch
  // after saving — is reflected in the open modal rather than being overwritten
  // by a snapshot taken when it was opened.
  const editing = (lines.data ?? []).find((l) => l.id === editingId) ?? null;
  const money = (minor: number | null | undefined) => formatMoney(minor, decimals);

  if (lines.isLoading || categories.isLoading) {
    return (
      <Page width="wide">
        <PageHeader title="Budget" />
        <Card>
          <CardBody className="pt-5">
            <SkeletonRows rows={8} />
          </CardBody>
        </Card>
      </Page>
    );
  }

  if (lines.error) {
    return (
      <Page width="wide">
        <PageHeader title="Budget" />
        <ErrorState error={lines.error} onRetry={() => void lines.refetch()} />
      </Page>
    );
  }

  // No lines at all means the template was never copied in — quite different
  // from filters that happen to exclude everything, so it gets its own screen
  // with the action that fixes it.
  if ((lines.data ?? []).length === 0) {
    const isOwner = wedding.role === 'owner';
    return (
      <Page width="narrow">
        <PageHeader title="Budget" />
        <EmptyState
          icon={<Sparkles className="size-5" />}
          title="This wedding has no plan in it yet"
          description="The budget, tasks, countdown checklist and the editable dropdown lists all come from the template. Copying it in is safe to repeat: it never overwrites anything you have already changed."
          action={
            isOwner ? (
              <div className="space-y-2">
                <Button
                  size="lg"
                  loading={seed.isPending}
                  icon={<Sparkles className="size-4" />}
                  onClick={() => seed.mutate(wedding.id)}
                >
                  Set up the plan from the template
                </Button>
                <InlineError error={seed.error} />
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Only the owner can set the plan up. Ask them to open this page once.
              </p>
            )
          }
        />
      </Page>
    );
  }

  const activeCategory = filters.categoryId;

  return (
    <Page width="wide">
      <div
        ref={headerRef}
        className="sticky top-0 z-20 -mx-5 border-b border-stone-200/70 bg-ivory/95 px-5 pt-1 pb-4 backdrop-blur sm:-mx-8 sm:px-8"
      >
        <PageHeader
          className="mb-4"
          title="Budget"
          description="Forecast is worked out by the database — actual, else negotiated, else quoted, else budgeted. A line marked not applicable forecasts nothing but keeps its budget."
          actions={
            canEdit && (
              <Button icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
                Add line
              </Button>
            )
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label={`Budgeted (${currency})`}
            value={money(summary.budgetedMinor)}
            icon={<Wallet className="size-3.5" />}
            hint={`${summary.count} lines in view`}
          />
          <Stat
            label={`Forecast (${currency})`}
            value={money(summary.forecastMinor)}
            tone="accent"
            hint={
              summary.notApplicableCount > 0
                ? `${summary.notApplicableCount} not applicable, excluded`
                : undefined
            }
          />
          <Stat
            label={`Variance (${currency})`}
            value={money(summary.varianceMinor)}
            tone={summary.varianceMinor > 0 ? 'bad' : summary.varianceMinor < 0 ? 'good' : 'flat'}
            hint={
              summary.varianceMinor > 0 ? 'Forecast is over budget' : 'Forecast is within budget'
            }
          />
        </div>
      </div>

      {/* Ticket 7.5. Says what it is showing and offers the way out; a list
          silently missing most of its rows is alarming rather than helpful. */}
      {overParam === '1' && (
        <p className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <TrendingUp className="size-4 shrink-0" />
          <span className="flex-1">
            Showing the {visible.length} {visible.length === 1 ? 'line' : 'lines'} forecast to come
            in over what was budgeted for them.
          </span>
          <Button variant="secondary" size="sm" onClick={() => setOverParam('0')}>
            Show every line
          </Button>
        </p>
      )}

      <div className="grid items-start gap-5 pt-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Categories double as the filter, which removes a dropdown and puts
            the money where it can be scanned. */}
        <Card
          className="scroll-subtle hidden lg:sticky lg:block lg:overflow-y-auto"
          style={{ top: headerHeight + 12, maxHeight: `calc(100dvh - ${headerHeight + 36}px)` }}
        >
          <CardBody className="pt-4">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, categoryId: 'all' }))}
              className={cn(
                'focus-ring flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-sm',
                activeCategory === 'all'
                  ? 'bg-wine-50 font-medium text-wine-800'
                  : 'text-stone-600 hover:bg-stone-50',
              )}
            >
              <span>All categories</span>
              <span className="tabular text-xs text-stone-500">{(lines.data ?? []).length}</span>
            </button>

            <div className="mt-1 space-y-0.5">
              {(byCategory.data ?? []).map((row) => {
                const id = row.category_id ?? '';
                const active = activeCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({ ...f, categoryId: f.categoryId === id ? 'all' : id }))
                    }
                    className={cn(
                      'focus-ring block w-full rounded-lg px-2 py-1.5 text-left',
                      active ? 'bg-wine-50' : 'hover:bg-stone-50',
                    )}
                  >
                    <span
                      className={cn(
                        'block truncate text-[13px]',
                        active ? 'font-medium text-wine-800' : 'text-stone-700',
                      )}
                    >
                      {row.category_label}
                    </span>
                    <span className="tabular block text-[11px] text-stone-500">
                      {money(Number(row.forecast_minor ?? 0))} forecast
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          {/* Toolbar rather than a separate filter card: it belongs to the list
              it filters, and saves a whole row of vertical space. */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" />
              <Input
                className="pl-9"
                placeholder="Search a line name or code, e.g. necklace or BG077"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <Select
              className="w-40"
              value={filters.applicability}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  applicability: e.target.value as Applicability | 'all',
                }))
              }
            >
              <option value="all">Any applicability</option>
              <option value="required">Required</option>
              <option value="optional">Optional</option>
              <option value="not_applicable">Not applicable</option>
            </Select>
            {/* Category filter for narrow screens, where the rail is hidden. */}
            <Select
              className="w-44 lg:hidden"
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="all">All categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <CardBody className="px-0 pb-0">
            {visible.length === 0 ? (
              <div className="px-4 py-6">
                <EmptyState
                  title="Nothing matches those filters"
                  description="Widen the category, applicability or search and the lines will come back."
                  action={
                    <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                      Clear filters
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {visible.map((line) => (
                  <BudgetRow
                    key={line.id}
                    line={line}
                    currency={currency}
                    decimals={decimals}
                    canEdit={canEdit}
                    totals={totals.data?.get(line.id)}
                    pending={update.isPending && update.variables?.id === line.id}
                    onSelect={() => setEditingId(line.id)}
                    onApplicability={(applicability) =>
                      update.mutate({ id: line.id, patch: { applicability } })
                    }
                  />
                ))}
              </ul>
            )}
            {update.error && (
              <div className="px-4 py-3">
                <InlineError error={update.error} />
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={Boolean(editing) || creating}
        onClose={() => {
          setEditingId(null);
          setCreating(false);
        }}
        title={editing ? editing.name : 'Add a budget line'}
        subtitle={
          editing
            ? [
                editing.code,
                (categories.data ?? []).find((c) => c.id === editing.category_id)?.label,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'It joins the category you choose and counts towards its forecast.'
        }
      >
        <BudgetLineForm
          weddingId={wedding.id}
          line={editing}
          categories={categories.data ?? []}
          currency={currency}
          payerOptions={payers.data ?? []}
          canEdit={canEdit}
          onDone={() => {
            setEditingId(null);
            setCreating(false);
          }}
        />
      </Modal>
    </Page>
  );
}

/** Short enough to sit inside a badge next to "paid". */
const STAGE_SHORT: Record<PaymentStage, string> = {
  booking_deposit: 'deposit',
  advance: 'advance',
  progress_payment: 'instalment',
  final_payment: 'final',
  extra_overtime: 'extra',
  refundable_deposit: 'refundable',
  refund_received: 'refunded',
};

/**
 * Where a line stands on being paid, said in words.
 *
 * The row used to show an amount — "45,000 paid" — which answers a question
 * nobody was asking: the amount is already in the columns to the right. What
 * you want from a list of forty lines is which ones need attention, so this
 * leads with the state and with the urgency of the payments behind it. An
 * overdue instalment outranks three settled ones, because it is the only one
 * that needs doing today.
 */
function PaymentState({
  line,
  totals,
  decimals,
}: {
  line: BudgetLineRow;
  totals?: LineTotals;
  decimals: number;
}) {
  // A not-applicable line forecasts zero, so "nothing paid" would read as a
  // to-do item for something deliberately struck off.
  if (line.applicability === 'not_applicable') return null;

  const paid = totals?.paidMinor ?? 0;
  const overpaid = totals?.overpaidMinor ?? 0;
  const outstanding = totals?.outstandingMinor ?? 0;
  const urgent = totals?.urgentStatus ?? null;

  // Overpaying used to be invisible: outstanding floors at zero, so the excess
  // showed up nowhere at all.
  if (overpaid > 0) {
    return <Badge tone="stop">overpaid by {formatMoney(overpaid, decimals)}</Badge>;
  }

  // An overdue or imminent payment is the headline whatever else is true of
  // the line, including one that is otherwise fully covered.
  if (urgent === 'overdue') return <Badge tone="stop">payment overdue</Badge>;
  if (urgent === 'due') return <Badge tone="warn">payment due</Badge>;
  if (urgent === 'due_soon') return <Badge tone="gold">due within a month</Badge>;

  const lastStage = totals?.paidStages.at(-1);

  if (paid > 0 && outstanding === 0) {
    return <Badge tone="good">paid{lastStage ? ` · ${STAGE_SHORT[lastStage]}` : ''}</Badge>;
  }

  if (paid > 0) {
    return (
      <Badge tone="accent">
        {lastStage ? `${STAGE_SHORT[lastStage]} paid` : 'part paid'} ·{' '}
        {formatMoney(outstanding, decimals)} to go
      </Badge>
    );
  }

  // Nothing paid and something to pay. Quiet rather than alarming: most lines
  // look like this for most of the planning.
  if ((line.forecast_minor ?? 0) > 0) return <Badge tone="neutral">nothing paid</Badge>;
  return null;
}

function BudgetRow({
  line,
  currency,
  decimals,
  canEdit,
  pending,
  totals,
  onSelect,
  onApplicability,
}: {
  line: BudgetLineRow;
  currency: string;
  decimals: number;
  canEdit: boolean;
  pending: boolean;
  totals?: LineTotals;
  onSelect: () => void;
  onApplicability: (next: Applicability) => void;
}) {
  // Ticket 2.4: a not-applicable line is muted, and its forecast really is zero
  // — the budgeted figure stays visible so the total still reconciles.
  const muted = line.applicability === 'not_applicable';

  return (
    <li
      onClick={onSelect}
      className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/70"
    >
      <button
        type="button"
        onClick={onSelect}
        className="focus-ring min-w-0 flex-1 rounded-lg text-left"
      >
        <p
          className={cn(
            'truncate text-sm',
            muted ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-900',
          )}
        >
          {line.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-stone-500">
          {line.code && <span className="font-mono text-[11px]">{line.code}</span>}
          {line.payer && <span>· {line.payer}</span>}
          {line.status === 'completed' && <Badge tone="good">done</Badge>}
          <PaymentState line={line} totals={totals} decimals={decimals} />
        </p>
      </button>

      <div className="shrink-0 text-right">
        <p className={cn('tabular text-sm', muted ? 'text-stone-500' : 'text-stone-900')}>
          {formatMoney(line.forecast_minor, decimals)}
        </p>
        <p className="tabular text-[11px] text-stone-500">
          of {formatMoney(line.budgeted_minor, decimals)} {currency}
        </p>
      </div>

      {/* Its own control, so a click here must not also open the line. */}
      <div onClick={(e) => e.stopPropagation()}>
        <ApplicabilitySwitch
          value={line.applicability}
          disabled={!canEdit}
          pending={pending}
          onChange={onApplicability}
        />
      </div>
    </li>
  );
}
