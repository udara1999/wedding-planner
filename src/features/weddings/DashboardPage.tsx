import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  CalendarHeart,
  CreditCard,
  HandCoins,
  Store,
  TrendingUp,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { useBudgetByCategory, useWeddingFinancials } from '../budget/api';
import { useReadiness } from '../tasks/api';
import { useGuests } from '../guests/api';
import { countGuests } from '../guests/counts';
import { useVendors } from '../vendors/vendorsApi';
import { AlertsPanel } from '../alerts/AlertsPanel';
import { currencyDecimals, formatMoney, formatRateAsPercent } from '../../lib/units';
import type { MyWedding } from '../../types/db';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Page,
  PageHeader,
  Skeleton,
  Stat,
  cn,
} from '../../components/ui';

/**
 * Tickets 7.3, 7.4 and the home of 7.1's panel.
 *
 * The workbook's own instruction for this sheet is "read the ATTENTION
 * REQUIRED panel at the bottom every time you open the workbook". At the
 * bottom is where it went because a spreadsheet has nowhere else to put it.
 * Here it goes first, because it is the only part of this screen that asks
 * anything of you — the numbers below it are for reassurance and for
 * arguments about money, and neither is urgent.
 *
 * 7.4 says "two charts, no more", and it is right to say so. Money by category
 * answers "where is it going", readiness answers "are we going to make it",
 * and a third chart on a dashboard is decoration that costs a scroll.
 */
export function DashboardPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);

  const financials = useWeddingFinancials(wedding.id);
  const categories = useBudgetByCategory(wedding.id);
  const readiness = useReadiness(wedding.id);
  const guests = useGuests(wedding.id);
  const vendors = useVendors(wedding.id);

  const money = (minor: number | null | undefined) =>
    minor === null || minor === undefined ? '—' : formatMoney(Number(minor), decimals);

  const f = financials.data;
  const days = wedding.days_to_go;
  const canSeeMoney = !financials.isLoading && f !== null && f !== undefined;

  const utilisation = f?.budget_utilisation != null ? Number(f.budget_utilisation) : null;
  const overBudget = (f?.remaining_against_budget_minor ?? 0) < 0;

  const guestCounts = useMemo(() => countGuests(guests.data ?? []), [guests.data]);

  const vendorCounts = useMemo(() => {
    const rows = vendors.data ?? [];
    return { total: rows.length, confirmed: rows.filter((v) => v.status === 'confirmed').length };
  }, [vendors.data]);

  const taskProgress = useMemo(() => {
    let done = 0;
    let relevant = 0;
    for (const r of readiness.data ?? []) {
      done += Number(r.completed ?? 0);
      relevant += Number(r.task_count ?? 0) - Number(r.cancelled ?? 0);
    }
    return { done, relevant, ratio: relevant === 0 ? 0 : done / relevant };
  }, [readiness.data]);

  /** Biggest first: the top three categories are most of any wedding budget. */
  const chartRows = useMemo(() => {
    const rows = (categories.data ?? [])
      .map((c) => ({
        label: c.category_label ?? c.category_key ?? '—',
        budgeted: Number(c.budgeted_minor ?? 0),
        forecast: Number(c.forecast_minor ?? 0),
        paid: Number(c.paid_minor ?? 0),
      }))
      .filter((c) => c.budgeted > 0 || c.forecast > 0)
      .sort((a, b) => b.forecast - a.forecast);
    const max = Math.max(1, ...rows.map((c) => Math.max(c.budgeted, c.forecast)));
    return { rows, max };
  }, [categories.data]);

  const date =
    wedding.wedding_date &&
    new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <Page width="wide">
      <PageHeader
        title={`${wedding.bride_name ?? ''} & ${wedding.groom_name ?? ''}`.trim() || 'Dashboard'}
        description={date || 'No wedding date set yet — Setup is the place to add one.'}
        actions={
          typeof days === 'number' && (
            <div className="rounded-xl border border-wine-200 bg-wine-50 px-4 py-2 text-center">
              <p className="tabular text-2xl leading-none font-semibold text-wine-800">
                {Math.abs(days)}
              </p>
              <p className="mt-0.5 text-xs sm:text-[11px] font-medium text-wine-700">
                {days >= 0 ? 'days to go' : 'days ago'}
              </p>
            </div>
          )
        }
      />

      {/* First, because it is the only thing here that asks anything of you. */}
      <AlertsPanel weddingId={wedding.id} />

      {/* The counts everyone can see, whatever their role. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Guests invited"
          value={guestCounts.invited}
          icon={<UsersRound className="size-3.5" />}
          hint={`${guestCounts.attending} confirmed so far`}
        />
        <Stat
          label="Replies in"
          value={`${Math.round(guestCounts.responseRate * 100)}%`}
          tone={guestCounts.responseRate >= 1 ? 'good' : undefined}
          hint={`${guestCounts.pending} still to answer`}
        />
        <Stat
          label="Tasks done"
          value={`${Math.round(taskProgress.ratio * 100)}%`}
          tone={taskProgress.ratio >= 1 ? 'good' : undefined}
          hint={`${taskProgress.done} of ${taskProgress.relevant}`}
        />
        <Stat
          label="Vendors confirmed"
          value={`${vendorCounts.confirmed} of ${vendorCounts.total}`}
          icon={<Store className="size-3.5" />}
          tone={
            vendorCounts.total > 0 && vendorCounts.confirmed === vendorCounts.total
              ? 'good'
              : undefined
          }
        />
      </div>

      {financials.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : canSeeMoney ? (
        <>
          {/* 7.3's six money figures, in the workbook's own order. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat
              label={`Total budget (${currency})`}
              value={money(f.total_budget_minor)}
              icon={<Wallet className="size-3.5" />}
            />
            <Stat
              label={`Forecast final cost (${currency})`}
              value={money(f.forecast_minor)}
              tone="accent"
              icon={<TrendingUp className="size-3.5" />}
              hint={
                utilisation !== null ? `${formatRateAsPercent(utilisation)}% of budget` : undefined
              }
            />
            <Stat
              label={`Paid so far (${currency})`}
              value={money(f.paid_minor)}
              icon={<CreditCard className="size-3.5" />}
            />
            <Stat label={`Still to pay (${currency})`} value={money(f.outstanding_minor)} />
            <Stat
              label={`${overBudget ? 'Over budget' : 'Left in budget'} (${currency})`}
              value={money(Math.abs(Number(f.remaining_against_budget_minor ?? 0)))}
              tone={overBudget ? 'bad' : 'good'}
            />
            <Stat
              label={`Net cost after gifts (${currency})`}
              value={money(f.net_cost_after_gifts_minor)}
              icon={<HandCoins className="size-3.5" />}
              hint={`${money(f.shortfall_minor)} shortfall`}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {/* Chart one: where the money is going. */}
            <Card>
              <CardHeader className="flex-wrap">
                <CardTitle>Where the money is going</CardTitle>
                {utilisation !== null && (
                  <Badge tone={utilisation > 1 ? 'stop' : utilisation > 0.9 ? 'warn' : 'good'}>
                    {formatRateAsPercent(utilisation)}% of budget
                  </Badge>
                )}
                <Link
                  to="../budget"
                  className="focus-ring ml-auto flex items-center gap-1 rounded text-xs text-wine-700 hover:text-wine-800"
                >
                  Budget <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardBody>
                {chartRows.rows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">No budget lines yet.</p>
                ) : (
                  <ul className="scroll-subtle max-h-80 space-y-2.5 overflow-y-auto pr-1">
                    {chartRows.rows.map((c) => (
                      <li key={c.label}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0 truncate text-stone-600">{c.label}</span>
                          <span className="tabular shrink-0 text-stone-500">
                            {formatMoney(c.forecast, decimals)}
                          </span>
                        </div>
                        {/* Budgeted as a faint track, forecast on top of it, and
                            paid darker still. One bar carrying three numbers,
                            because three bars per category is a wall. */}
                        <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-stone-200"
                            style={{ width: `${(c.budgeted / chartRows.max) * 100}%` }}
                          />
                          <div
                            className={cn(
                              'absolute inset-y-0 left-0 rounded-full',
                              c.forecast > c.budgeted ? 'bg-red-400' : 'bg-wine-300',
                            )}
                            style={{ width: `${(c.forecast / chartRows.max) * 100}%` }}
                          />
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-wine-700"
                            style={{ width: `${(c.paid / chartRows.max) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-100 pt-2.5 text-xs sm:text-[11px] text-stone-500">
                  <Swatch className="bg-stone-200" label="budgeted" />
                  <Swatch className="bg-wine-300" label="forecast" />
                  <Swatch className="bg-wine-700" label="paid" />
                  <Swatch className="bg-red-400" label="over its budget" />
                </div>
              </CardBody>
            </Card>

            {/* Chart two: are we going to make it. */}
            <Card>
              <CardHeader>
                <CardTitle>Readiness</CardTitle>
                <Badge tone={taskProgress.ratio >= 1 ? 'good' : 'neutral'}>
                  {Math.round(taskProgress.ratio * 100)}%
                </Badge>
                <Link
                  to="../tasks"
                  className="focus-ring ml-auto flex items-center gap-1 rounded text-xs text-wine-700 hover:text-wine-800"
                >
                  Tasks <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardBody>
                {(readiness.data ?? []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-500">No tasks yet.</p>
                ) : (
                  <ul className="scroll-subtle max-h-80 space-y-2.5 overflow-y-auto pr-1">
                    {(readiness.data ?? [])
                      // Least ready first: the point of this chart is finding
                      // the area nobody has started.
                      .slice()
                      .sort((a, b) => Number(a.ratio ?? 0) - Number(b.ratio ?? 0))
                      .map((r) => {
                        const ratio = r.ratio === null ? null : Number(r.ratio);
                        const late = Number(r.overdue ?? 0);
                        return (
                          <li key={r.area}>
                            <div className="flex items-baseline justify-between gap-2 text-xs">
                              <span className="min-w-0 truncate text-stone-600">{r.area}</span>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {late > 0 && <Badge tone="stop">{late} late</Badge>}
                                <span className="tabular text-stone-500">
                                  {ratio === null ? '—' : `${Math.round(ratio * 100)}%`}
                                </span>
                              </span>
                            </div>
                            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-stone-100">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  ratio === null
                                    ? 'bg-stone-200'
                                    : ratio >= 1
                                      ? 'bg-emerald-500'
                                      : late > 0
                                        ? 'bg-amber-500'
                                        : 'bg-wine-500',
                                )}
                                style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<CalendarHeart className="size-5" />}
          title="No money figures for your role"
          description="Budgets, payments and contributions are visible to the couple and to family. Your access covers the plan and the day itself."
        />
      )}
    </Page>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-block size-2 rounded-full', className)} />
      {label}
    </span>
  );
}
