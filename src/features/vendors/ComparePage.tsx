import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Star, Trash2 } from 'lucide-react';
import {
  useCreateVendorOption,
  useDeleteVendorOption,
  useUpdateVendorOption,
  useVendorCategories,
  useVendorOptions,
  useVendorQuestions,
} from './api';
import { VendorOptionCard } from './VendorOptionCard';
import { ComparisonGrid } from './ComparisonGrid';
import { useWedding } from '../weddings/api';
import { currencyDecimals } from '../../lib/units';
import type { MyWedding } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Page,
  PageHeader,
  Skeleton,
  cn,
} from '../../components/ui';

/** The letters the workbook used, continued past C rather than stopping there. */
function nextLabel(count: number): string {
  if (count < 26) return String.fromCharCode(65 + count);
  return `${String.fromCharCode(65 + Math.floor(count / 26) - 1)}${String.fromCharCode(65 + (count % 26))}`;
}

export function ComparePage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  // my_weddings() carries no tradition, so the locale comes from the row.
  const detail = useWedding(wedding.id);
  const locale = detail.data?.tradition ?? 'poruwa';
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const categories = useVendorCategories(locale);

  // Every column of a view is nullable in the generated types, so narrow once
  // here rather than coalescing at each use.
  const cats = useMemo(
    () =>
      (categories.data ?? []).flatMap((c) =>
        c.category_key
          ? [
              {
                key: c.category_key,
                label: c.category_label ?? c.category_key,
                questionCount: Number(c.question_count ?? 0),
              },
            ]
          : [],
      ),
    [categories.data],
  );

  const [chosen, setChosen] = useState<string | null>(null);
  // Derived rather than set from an effect: defaulting in state would need a
  // render just to correct itself once the categories arrive.
  const categoryKey = chosen ?? cats[0]?.key ?? null;
  const active = cats.find((c) => c.key === categoryKey) ?? null;

  const options = useVendorOptions(wedding.id, categoryKey);
  const questions = useVendorQuestions(locale, categoryKey);
  const create = useCreateVendorOption(wedding.id, categoryKey);
  const update = useUpdateVendorOption(wedding.id, categoryKey);
  const remove = useDeleteVendorOption(wedding.id, categoryKey);

  if (categories.isLoading) {
    return (
      <Page width="wide">
        <PageHeader title="Compare vendors" />
        <Skeleton className="h-64 rounded-xl" />
      </Page>
    );
  }
  if (categories.error) {
    return (
      <Page width="wide">
        <PageHeader title="Compare vendors" />
        <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
      </Page>
    );
  }

  const rows = options.data ?? [];

  return (
    <Page width="wide">
      <PageHeader
        title="Compare vendors"
        description="Shortlist as many options per category as you like, then answer the same questions for each. The workbook stopped at three; this does not."
        actions={
          canEdit &&
          categoryKey && (
            <Button
              icon={<Plus className="size-4" />}
              loading={create.isPending}
              onClick={() =>
                create.mutate({
                  label: `Option ${nextLabel(rows.length)}`,
                  sort_order: rows.length,
                })
              }
            >
              Add option
            </Button>
          )
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <Card className="hidden lg:block">
          <CardBody className="pt-4">
            <div className="space-y-0.5">
              {cats.map((c) => {
                const isActive = c.key === categoryKey;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setChosen(c.key)}
                    className={cn(
                      'focus-ring flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left',
                      isActive ? 'bg-wine-50' : 'hover:bg-stone-50',
                    )}
                  >
                    <span
                      className={cn(
                        'truncate text-[13px]',
                        isActive ? 'font-medium text-wine-800' : 'text-stone-700',
                      )}
                    >
                      {c.label}
                    </span>
                    <span className="tabular shrink-0 text-[11px] text-stone-400">
                      {c.questionCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            <select
              className="h-9.5 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm"
              value={categoryKey ?? ''}
              onChange={(e) => setChosen(e.target.value)}
            >
              {cats.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-stone-900">
              {active?.label ?? '—'}
            </h2>
            <Badge tone="neutral">
              {questions.data?.length ?? active?.questionCount ?? 0} questions
            </Badge>
            <Badge tone={rows.length > 0 ? 'accent' : 'neutral'}>
              {rows.length} {rows.length === 1 ? 'option' : 'options'}
            </Badge>
          </div>

          <InlineError error={create.error ?? update.error ?? remove.error} />

          {options.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Star className="size-5" />}
              title="No options shortlisted yet"
              description="Add the vendors you are considering for this category. Each one becomes a column to compare, and you answer the same questions for all of them."
              action={
                canEdit && (
                  <Button
                    icon={<Plus className="size-4" />}
                    loading={create.isPending}
                    onClick={() => create.mutate({ label: 'Option A', sort_order: 0 })}
                  >
                    Add the first option
                  </Button>
                )
              }
            />
          ) : (
            /* Cards rather than a table here: 3.4 turns the questions into rows
               across these same options, and this is the profile half of it. */
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((option) => (
                <VendorOptionCard
                  key={option.id}
                  option={option}
                  currency={currency}
                  decimals={decimals}
                  canEdit={canEdit}
                  saving={update.isPending && update.variables?.id === option.id}
                  onSave={(patch) => update.mutate({ id: option.id, patch })}
                  onRemove={() => remove.mutate(option.id)}
                  removing={remove.isPending && remove.variables === option.id}
                />
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <p className="flex items-center gap-1.5 text-xs text-stone-400">
                <Trash2 className="size-3.5" />
                Removing an option also removes its answers.
              </p>

              <ComparisonGrid
                weddingId={wedding.id}
                options={rows}
                questions={questions.data ?? []}
                loading={questions.isLoading}
                canEdit={canEdit}
              />
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
