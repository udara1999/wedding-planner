import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { useCreateBudgetLine, useDeleteBudgetLine, useUpdateBudgetLine } from './api';
import { ApplicabilitySwitch } from './ApplicabilitySwitch';
import { currencyDecimals, formatMinorAsMajor, parseMajorToMinor } from '../../lib/units';
import type { Applicability, BudgetCategoryRow, BudgetLineRow, TaskStatus } from '../../types/db';
import { Button, Field, InlineError, Input, Select, Textarea } from '../../components/ui';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const MONEY_FIELDS = [
  ['budgeted_minor', 'Budgeted', 'What you planned to spend.'],
  ['quoted_minor', 'Quoted', 'The first number the vendor gave.'],
  ['negotiated_minor', 'Negotiated', 'What you talked them down to.'],
  ['actual_minor', 'Actual', 'What it really cost. Wins over everything else.'],
  ['refundable_deposit_minor', 'Refundable deposit', 'Expected back after the day.'],
] as const;

type MoneyField = (typeof MONEY_FIELDS)[number][0];

const schema = z.object({
  name: z.string().trim().min(1, 'A line needs a name'),
  category_id: z.string().min(1, 'Pick a category'),
  code: z.string().trim().max(20).optional().nullable(),
  payer: z.string().trim().max(60).optional().nullable(),
  status: z.enum(['not_started', 'in_progress', 'waiting', 'completed', 'cancelled']),
  notes: z.string().trim().max(2000).optional().nullable(),
  budgeted_minor: z.string(),
  quoted_minor: z.string(),
  negotiated_minor: z.string(),
  actual_minor: z.string(),
  refundable_deposit_minor: z.string(),
});

type FormValues = z.infer<typeof schema>;

const BLANK: FormValues = {
  name: '',
  category_id: '',
  code: '',
  payer: '',
  status: 'not_started',
  notes: '',
  budgeted_minor: '',
  quoted_minor: '',
  negotiated_minor: '',
  actual_minor: '',
  refundable_deposit_minor: '',
};

/**
 * One form for creating and editing. A separate "new line" form would drift
 * from this one the first time a column is added, and they share every rule
 * about money parsing and applicability.
 */
export function BudgetLineForm({
  weddingId,
  line,
  categories,
  currency,
  payerOptions,
  canEdit,
  onDone,
}: {
  weddingId: string;
  /** null puts the form in create mode. */
  line: BudgetLineRow | null;
  categories: BudgetCategoryRow[];
  currency: string;
  payerOptions: string[];
  canEdit: boolean;
  onDone: () => void;
}) {
  const decimals = currencyDecimals(currency);
  const create = useCreateBudgetLine(weddingId);
  const update = useUpdateBudgetLine(weddingId);
  const remove = useDeleteBudgetLine(weddingId);

  const [applicability, setApplicability] = useState<Applicability>(
    line?.applicability ?? 'required',
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Money is validated on submit rather than in the schema: the number of
  // decimal places depends on the wedding's currency, which the schema cannot see.
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: BLANK });

  useEffect(() => {
    setConfirmingDelete(false);
    setApplicability(line?.applicability ?? 'required');
    form.reset(
      line
        ? {
            name: line.name,
            category_id: line.category_id ?? '',
            code: line.code ?? '',
            payer: line.payer ?? '',
            status: line.status,
            notes: line.notes ?? '',
            budgeted_minor: formatMinorAsMajor(line.budgeted_minor, decimals),
            quoted_minor: formatMinorAsMajor(line.quoted_minor, decimals),
            negotiated_minor: formatMinorAsMajor(line.negotiated_minor, decimals),
            actual_minor: formatMinorAsMajor(line.actual_minor, decimals),
            refundable_deposit_minor: formatMinorAsMajor(line.refundable_deposit_minor, decimals),
          }
        : { ...BLANK, category_id: categories[0]?.id ?? '' },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line?.id, line?.updated_at, categories.length]);

  async function onSubmit(values: FormValues) {
    const amounts: Partial<Record<MoneyField, number>> = {};
    for (const [key] of MONEY_FIELDS) {
      try {
        amounts[key] = parseMajorToMinor(values[key], decimals) ?? 0;
      } catch (e) {
        form.setError(key, { message: e instanceof Error ? e.message : 'Not a number' });
        return;
      }
    }

    if (line) {
      await update.mutateAsync({
        id: line.id,
        patch: {
          name: values.name,
          payer: values.payer?.trim() || null,
          status: values.status,
          notes: values.notes?.trim() || null,
          applicability,
          ...amounts,
        },
      });
    } else {
      await create.mutateAsync({
        name: values.name.trim(),
        category_id: values.category_id,
        code: values.code?.trim() || null,
        applicability,
        payer: values.payer?.trim() || null,
        budgeted_minor: amounts.budgeted_minor ?? 0,
      });
    }
    onDone();
  }

  const busy = create.isPending || update.isPending;
  const error = create.error ?? update.error ?? remove.error;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Line item" error={form.formState.errors.name?.message}>
        <Input
          disabled={!canEdit}
          placeholder="Bridal necklace set"
          {...form.register('name')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={form.formState.errors.category_id?.message}>
          {/* Locked after creation: moving a line between categories silently
              rewrites two category totals, which deserves its own action. */}
          <Select disabled={!canEdit || Boolean(line)} {...form.register('category_id')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Code"
          hint={line ? undefined : 'Optional. Yours to choose for a line you add.'}
        >
          <Input disabled={!canEdit || Boolean(line)} placeholder="BG200" {...form.register('code')} />
        </Field>
      </div>

      <Field label="Applies?" hint="A not-applicable line keeps its budget but forecasts nothing.">
        <div className="pt-0.5">
          <ApplicabilitySwitch
            value={applicability}
            disabled={!canEdit}
            onChange={setApplicability}
          />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Who pays">
          <Select disabled={!canEdit} {...form.register('payer')}>
            <option value="">Not decided</option>
            {payerOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        {line && (
          <Field label="Status">
            <Select disabled={!canEdit} {...form.register('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(line ? MONEY_FIELDS : MONEY_FIELDS.slice(0, 1)).map(([key, label, hint]) => (
          <Field
            key={key}
            label={`${label} (${currency})`}
            hint={hint}
            error={form.formState.errors[key]?.message}
          >
            <Input inputMode="decimal" disabled={!canEdit} {...form.register(key)} />
          </Field>
        ))}
      </div>

      {line && (
        <div className="rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
          Forecast now{' '}
          <strong className="tabular text-stone-900">
            {formatMinorAsMajor(line.forecast_minor, decimals)} {currency}
          </strong>
          {applicability === 'not_applicable'
            ? ' — zero while this line is not applicable.'
            : ' — actual, else negotiated, else quoted, else budgeted. Worked out by the database.'}
        </div>
      )}

      {line && (
        <Field label="Notes" error={form.formState.errors.notes?.message}>
          <Textarea disabled={!canEdit} rows={2} {...form.register('notes')} />
        </Field>
      )}

      <InlineError error={error} />

      {canEdit && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button type="submit" loading={busy}>
            {line ? 'Save changes' : 'Add line'}
          </Button>

          {line &&
            (confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">Delete this line?</span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() => void remove.mutateAsync(line.id).then(onDone)}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" />}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </Button>
            ))}
        </div>
      )}
    </form>
  );
}
