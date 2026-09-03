import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  useBudgetByCategory,
  useBudgetCategories,
  useBudgetLines,
  usePayerOptions,
  useUpdateBudgetLine,
} from './api';
import { ApplicabilitySwitch } from './ApplicabilitySwitch';
import { BudgetLineForm } from './BudgetLineForm';
import { EMPTY_FILTERS, matchesFilters, summarise, type BudgetFilters } from './filters';
import { currencyDecimals, formatMinorAsMajor } from '../../lib/units';
import { useSeedWedding } from '../weddings/api';
import type { Applicability, BudgetLineRow, MyWedding } from '../../types/db';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
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
  const update = useUpdateBudgetLine(wedding.id);
  const seed = useSeedWedding();

  const [filters, setFilters] = useState<BudgetFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = useMemo(
    () => (lines.data ?? []).filter((l) => matchesFilters(l, filters)),
    [lines.data, filters],
  );
  const summary = useMemo(() => summarise(visible), [visible]);
  const selected = visible.find((l) => l.id === selectedId) ?? null;

  const money = (minor: number | null | undefined) => formatMinorAsMajor(minor, decimals);

  if (lines.isLoading || categories.isLoading) {
    return (
      <div className="p-8">
        <Spinner label="Loading the budget" />
      </div>
    );
  }
  if (lines.error) {
    return (
      <div className="p-8">
        <ErrorState error={lines.error} onRetry={() => void lines.refetch()} />
      </div>
    );
  }

  // No lines at all means the template was never copied in — quite different
  // from filters that happen to exclude everything, so it gets its own screen
  // with the action that fixes it.
  if ((lines.data ?? []).length === 0) {
    const isOwner = wedding.role === 'owner';
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>This wedding has no plan in it yet</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-stone-600">
              The budget, tasks, countdown checklist and the editable dropdown lists all come
              from the template. Copying it in is safe to repeat: it never overwrites anything
              you have already changed.
            </p>
            {isOwner ? (
              <>
                <Button disabled={seed.isPending} onClick={() => seed.mutate(wedding.id)}>
                  {seed.isPending ? 'Setting up…' : 'Set up the plan from the template'}
                </Button>
                {seed.error && (
                  <p className="text-xs text-red-700">
                    {seed.error instanceof Error ? seed.error.message : 'Could not set it up'}
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Only the owner can set the plan up. Ask them to open this page once.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Budget</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Every line the plan knows about. The forecast is worked out by the database — actual,
          else negotiated, else quoted, else budgeted — and a line marked not applicable forecasts
          nothing.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label={`Budgeted (${currency})`} value={money(summary.budgetedMinor)} />
        <Stat label={`Forecast (${currency})`} value={money(summary.forecastMinor)} />
        <Stat
          label={`Variance (${currency})`}
          value={money(summary.varianceMinor)}
          tone={summary.varianceMinor > 0 ? 'bad' : summary.varianceMinor < 0 ? 'good' : 'flat'}
        />
      </div>

      <Card className="mb-5">
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Category">
            <Select
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
          </Field>
          <Field label="Applies?">
            <Select
              value={filters.applicability}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  applicability: e.target.value as Applicability | 'all',
                }))
              }
            >
              <option value="all">Any</option>
              <option value="required">Required</option>
              <option value="optional">Optional</option>
              <option value="not_applicable">Not applicable</option>
            </Select>
          </Field>
          <Field label="Search" hint="By line name or its workbook code.">
            <Input
              placeholder="necklace, or BG077"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex items-baseline justify-between">
            <CardTitle>
              {summary.count} {summary.count === 1 ? 'line' : 'lines'}
            </CardTitle>
            {summary.notApplicableCount > 0 && (
              <span className="text-xs text-stone-400">
                {summary.notApplicableCount} not applicable
              </span>
            )}
          </CardHeader>
          <CardBody>
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                description="Widen the category, applicability or search and the lines will come back."
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {visible.map((line) => (
                  <BudgetRow
                    key={line.id}
                    line={line}
                    currency={currency}
                    decimals={decimals}
                    selected={line.id === selectedId}
                    canEdit={canEdit}
                    pending={update.isPending && update.variables?.id === line.id}
                    onSelect={() => setSelectedId(line.id === selectedId ? null : line.id)}
                    onApplicability={(applicability) =>
                      update.mutate({ id: line.id, patch: { applicability } })
                    }
                  />
                ))}
              </ul>
            )}
            {update.error && (
              <p className="mt-3 text-xs text-red-700">
                {update.error instanceof Error ? update.error.message : 'Could not update'}
              </p>
            )}
          </CardBody>
        </Card>

        <div className="lg:sticky lg:top-6">
          {selected ? (
            <BudgetLineForm
              line={selected}
              currency={currency}
              payerOptions={payers.data ?? []}
              canEdit={canEdit}
            />
          ) : (
            <Card>
              <CardBody>
                <EmptyState
                  title="Pick a line"
                  description="Choose a budget line to see and edit its quoted, negotiated and actual amounts."
                />
              </CardBody>
            </Card>
          )}

          {byCategory.data && byCategory.data.length > 0 && (
            <Card className="mt-5">
              <CardHeader>
                <CardTitle>By category</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-1.5 text-sm">
                  {byCategory.data.map((row) => (
                    <li key={row.category_id} className="flex items-baseline justify-between gap-3">
                      <button
                        type="button"
                        className={cn(
                          'truncate text-left hover:text-wine-800',
                          filters.categoryId === row.category_id
                            ? 'font-medium text-wine-800'
                            : 'text-stone-600',
                        )}
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            categoryId:
                              f.categoryId === row.category_id ? 'all' : (row.category_id ?? 'all'),
                          }))
                        }
                      >
                        {row.category_label}
                      </button>
                      <span className="shrink-0 tabular-nums text-stone-900">
                        {money(Number(row.forecast_minor ?? 0))}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'flat',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'flat';
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'bad' && 'text-red-700',
          tone === 'good' && 'text-green-700',
          tone === 'flat' && 'text-stone-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BudgetRow({
  line,
  currency,
  decimals,
  selected,
  canEdit,
  pending,
  onSelect,
  onApplicability,
}: {
  line: BudgetLineRow;
  currency: string;
  decimals: number;
  selected: boolean;
  canEdit: boolean;
  pending: boolean;
  onSelect: () => void;
  onApplicability: (next: Applicability) => void;
}) {
  // Ticket 2.4: a not-applicable line is muted, and its forecast really is zero
  // — the budgeted figure stays visible so the total still reconciles.
  const muted = line.applicability === 'not_applicable';

  return (
    <li
      className={cn(
        'flex items-center gap-3 py-2.5',
        selected && 'bg-wine-50/60',
        muted && 'opacity-55',
      )}
    >
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className={cn('truncate text-sm', muted ? 'text-stone-500' : 'text-stone-900')}>
          {line.name}
        </p>
        <p className="truncate text-xs text-stone-400">
          {line.code ?? '—'}
          {line.payer ? ` · ${line.payer}` : ''}
        </p>
      </button>

      <div className="shrink-0 text-right">
        <p className={cn('text-sm tabular-nums', muted ? 'text-stone-400' : 'text-stone-900')}>
          {formatMinorAsMajor(line.forecast_minor, decimals)}
        </p>
        <p className="text-[11px] tabular-nums text-stone-400">
          of {formatMinorAsMajor(line.budgeted_minor, decimals)} {currency}
        </p>
      </div>

      <ApplicabilitySwitch
        value={line.applicability}
        disabled={!canEdit}
        pending={pending}
        onChange={onApplicability}
      />
    </li>
  );
}
