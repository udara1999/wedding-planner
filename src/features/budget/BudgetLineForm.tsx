import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateBudgetLine } from './api';
import { currencyDecimals, formatMinorAsMajor, parseMajorToMinor } from '../../lib/units';
import type { BudgetLineRow, TaskStatus } from '../../types/db';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Select } from '../../components/ui';

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

export function BudgetLineForm({
  line,
  currency,
  payerOptions,
  canEdit,
}: {
  line: BudgetLineRow;
  currency: string;
  payerOptions: string[];
  canEdit: boolean;
}) {
  const decimals = currencyDecimals(currency);
  const update = useUpdateBudgetLine(line.wedding_id);

  // Money is validated in onSubmit rather than in the schema: the number of
  // decimal places depends on the wedding's currency, which the schema cannot see.
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    form.reset({
      name: line.name,
      payer: line.payer ?? '',
      status: line.status,
      notes: line.notes ?? '',
      budgeted_minor: formatMinorAsMajor(line.budgeted_minor, decimals),
      quoted_minor: formatMinorAsMajor(line.quoted_minor, decimals),
      negotiated_minor: formatMinorAsMajor(line.negotiated_minor, decimals),
      actual_minor: formatMinorAsMajor(line.actual_minor, decimals),
      refundable_deposit_minor: formatMinorAsMajor(line.refundable_deposit_minor, decimals),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line.id, line.updated_at]);

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

    await update.mutateAsync({
      id: line.id,
      patch: {
        name: values.name,
        payer: values.payer?.trim() ? values.payer.trim() : null,
        status: values.status,
        notes: values.notes?.trim() ? values.notes.trim() : null,
        ...amounts,
      },
    });
  }

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <CardTitle>{line.code ? `${line.code} · ${line.name}` : line.name}</CardTitle>
        {line.applicability === 'not_applicable' && <Badge tone="neutral">not applicable</Badge>}
      </CardHeader>
      <CardBody>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Line item" error={form.formState.errors.name?.message}>
            <Input disabled={!canEdit} {...form.register('name')} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who pays" error={form.formState.errors.payer?.message}>
              <Select disabled={!canEdit} {...form.register('payer')}>
                <option value="">Not decided</option>
                {payerOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select disabled={!canEdit} {...form.register('status')}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {MONEY_FIELDS.map(([key, label, hint]) => (
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

          <div className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
            Forecast now:{' '}
            <strong className="text-stone-900">
              {formatMinorAsMajor(line.forecast_minor, decimals)} {currency}
            </strong>
            {line.applicability === 'not_applicable'
              ? ' — zero while this line is not applicable.'
              : ' — actual, else negotiated, else quoted, else budgeted. Computed by the database.'}
          </div>

          <Field label="Notes" error={form.formState.errors.notes?.message}>
            <Input disabled={!canEdit} {...form.register('notes')} />
          </Field>

          {update.error && (
            <p className="text-xs text-red-700">
              {update.error instanceof Error ? update.error.message : 'Could not save'}
            </p>
          )}

          {canEdit && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                {update.isPending ? 'Saving…' : 'Save line'}
              </Button>
              {update.isSuccess && !form.formState.isDirty && (
                <span className="text-sm text-green-700">Saved</span>
              )}
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
}
