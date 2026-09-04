import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  CalendarHeart,
  CreditCard,
  HandCoins,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useWeddingFinancials } from '../budget/api';
import { currencyDecimals, formatMinorAsMajor, formatRateAsPercent } from '../../lib/units';
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
 * The money half is live from v_wedding_financials (ticket 2.8). Guests, tasks
 * and the Attention Required panel arrive with Phases 4, 5 and 7 — shown as
 * explicit "not built yet" tiles rather than dashes, so an empty number is
 * never mistaken for a real zero.
 */
export function DashboardPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const financials = useWeddingFinancials(wedding.id);

  const money = (minor: number | null | undefined) =>
    minor === null || minor === undefined ? '—' : formatMinorAsMajor(Number(minor), decimals);

  const f = financials.data;
  const days = wedding.days_to_go;
  const canSeeMoney = !financials.isLoading && f !== null && f !== undefined;

  const utilisation = f?.budget_utilisation != null ? Number(f.budget_utilisation) : null;
  const overBudget = (f?.remaining_against_budget_minor ?? 0) < 0;

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
              <p className="mt-0.5 text-[11px] font-medium text-wine-700">
                {days >= 0 ? 'days to go' : 'days ago'}
              </p>
            </div>
          )
        }
      />

      {financials.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : canSeeMoney ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              hint={utilisation !== null ? `${formatRateAsPercent(utilisation)}% of budget` : undefined}
            />
            <Stat
              label={`Paid so far (${currency})`}
              value={money(f.paid_minor)}
              icon={<CreditCard className="size-3.5" />}
              hint={`${money(f.outstanding_minor)} still to pay`}
            />
            <Stat
              label={`${overBudget ? 'Over budget' : 'Left in budget'} (${currency})`}
              value={money(Math.abs(Number(f.remaining_against_budget_minor ?? 0)))}
              tone={overBudget ? 'bad' : 'good'}
            />
          </div>

          <Card className="mt-5">
            <CardHeader>
              <CardTitle>Budget used</CardTitle>
              {utilisation !== null && (
                <Badge tone={utilisation > 1 ? 'stop' : utilisation > 0.9 ? 'warn' : 'good'}>
                  {formatRateAsPercent(utilisation)}%
                </Badge>
              )}
            </CardHeader>
            <CardBody>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    utilisation !== null && utilisation > 1
                      ? 'bg-red-600'
                      : utilisation !== null && utilisation > 0.9
                        ? 'bg-amber-500'
                        : 'bg-wine-600',
                  )}
                  // Capped at 100% so an overrun does not overflow the track;
                  // the badge above carries the real figure.
                  style={{ width: `${Math.min((utilisation ?? 0) * 100, 100)}%` }}
                />
              </div>
              <div className="tabular mt-2 flex justify-between text-xs text-stone-500">
                <span>{money(f.forecast_minor)} forecast</span>
                <span>{money(f.total_budget_minor)} budget</span>
              </div>
            </CardBody>
          </Card>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Where the money comes from</CardTitle>
                <Link
                  to="../contributions"
                  className="focus-ring flex items-center gap-1 rounded text-xs text-wine-700 hover:text-wine-800"
                >
                  Contributions <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardBody className="space-y-2.5">
                <Row
                  icon={<HandCoins className="size-4 text-stone-400" />}
                  label="Contributions agreed"
                  value={money(f.contributions_agreed_minor)}
                />
                <Row label="Contributions received" value={money(f.contributions_received_minor)} />
                <Row
                  label="Net cost after contributions"
                  value={money(f.net_cost_after_gifts_minor)}
                  strong
                />
                <Row label="Shortfall still to fund" value={money(f.shortfall_minor)} strong />
                <p className="pt-1 text-[11px] leading-relaxed text-stone-400">
                  Cash gifts from guests join these figures in Phase 4. If you are family rather
                  than the couple, these show your own pledge only.
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Still to come</CardTitle>
              </CardHeader>
              <CardBody className="space-y-2.5">
                <Row label="Guests confirmed" value="Phase 4" muted />
                <Row label="Tasks complete" value="Phase 5" muted />
                <Row label="Attention required" value="Phase 7" muted />
                <p className="pt-1 text-[11px] leading-relaxed text-stone-400">
                  These are shown as unbuilt rather than as zero, so an empty panel is never read
                  as good news.
                </p>
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

function Row({
  label,
  value,
  icon,
  strong,
  muted,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-stone-600">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'tabular text-sm',
          muted ? 'text-stone-300' : strong ? 'font-semibold text-stone-900' : 'text-stone-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}
