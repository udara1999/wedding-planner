import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCreatePayment,
  useDeletePayment,
  usePaymentMethods,
  usePayments,
  useUpdatePayment,
  type PaymentInput,
} from './api';
import { BudgetLinePicker } from './BudgetLinePicker';
import { ReceiptField } from './ReceiptField';
import { useBudgetLines } from '../budget/api';
import { currencyDecimals, formatMinorAsMajor, parseMajorToMinor } from '../../lib/units';
import type { MyWedding, PaymentStage, PaymentStatus, PaymentView } from '../../types/db';
import {
  Badge,
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
} from '../../components/ui';

const STAGES: { value: PaymentStage; label: string }[] = [
  { value: 'booking_deposit', label: 'Booking deposit' },
  { value: 'advance', label: 'Advance' },
  { value: 'progress_payment', label: 'Progress payment' },
  { value: 'final_payment', label: 'Final payment' },
  { value: 'extra_overtime', label: 'Extra / overtime' },
  { value: 'refundable_deposit', label: 'Refundable deposit' },
  { value: 'refund_received', label: 'Refund received' },
];

const STATUS_TONE: Record<PaymentStatus, 'neutral' | 'good' | 'warn' | 'stop' | 'gold'> = {
  draft: 'neutral',
  paid: 'good',
  overdue: 'stop',
  due: 'warn',
  due_soon: 'gold',
  not_due: 'neutral',
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  draft: 'draft',
  paid: 'paid',
  overdue: 'overdue',
  due: 'due',
  due_soon: 'due soon',
  not_due: 'not due',
};

const schema = z.object({
  stage: z.enum([
    'booking_deposit',
    'advance',
    'progress_payment',
    'final_payment',
    'extra_overtime',
    'refundable_deposit',
    'refund_received',
  ]),
  amount_due: z.string(),
  amount_paid: z.string(),
  due_date: z.string().optional().nullable(),
  paid_on: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  reference: z.string().trim().max(120).optional().nullable(),
  paid_by: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

const BLANK: FormValues = {
  stage: 'final_payment',
  amount_due: '',
  amount_paid: '',
  due_date: '',
  paid_on: '',
  method: '',
  reference: '',
  paid_by: '',
  notes: '',
};

export function PaymentsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const payments = usePayments(wedding.id);
  const lines = useBudgetLines(wedding.id);
  const methods = usePaymentMethods(wedding.id);
  const create = useCreatePayment(wedding.id);
  const update = useUpdatePayment(wedding.id);
  const remove = useDeletePayment(wedding.id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [lineId, setLineId] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);

  const pickable = useMemo(
    () => (lines.data ?? []).map((l) => ({ id: l.id, code: l.code, name: l.name })),
    [lines.data],
  );

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: BLANK });

  const totals = useMemo(() => {
    let due = 0;
    let paid = 0;
    for (const p of payments.data ?? []) {
      due += p.amount_due_minor ?? 0;
      paid += p.amount_paid_minor ?? 0;
    }
    return { due, paid, outstanding: Math.max(due - paid, 0) };
  }, [payments.data]);

  const editingReceiptPath =
    (payments.data ?? []).find((p) => p.id === editingId)?.receipt_path ?? null;

  function startEdit(p: PaymentView) {
    setEditingId(p.id ?? null);
    setLineId(p.budget_line_id ?? null);
    setLineError(null);
    form.reset({
      stage: (p.stage ?? 'final_payment') as PaymentStage,
      amount_due: formatMinorAsMajor(p.amount_due_minor, decimals),
      amount_paid: formatMinorAsMajor(p.amount_paid_minor, decimals),
      due_date: p.due_date ?? '',
      paid_on: p.paid_on ?? '',
      method: p.method ?? '',
      reference: p.reference ?? '',
      paid_by: p.paid_by ?? '',
      notes: p.notes ?? '',
    });
  }

  function startNew() {
    setEditingId(null);
    setLineId(null);
    setLineError(null);
    form.reset(BLANK);
  }

  async function onSubmit(values: FormValues) {
    // 2.6: a payment must attach to a budget line, or it disappears from every
    // forecast while still being real money.
    if (!lineId) {
      setLineError('Choose the budget line this payment is against.');
      return;
    }
    setLineError(null);

    let amountDue: number;
    let amountPaid: number;
    try {
      amountDue = parseMajorToMinor(values.amount_due, decimals) ?? 0;
      amountPaid = parseMajorToMinor(values.amount_paid, decimals) ?? 0;
    } catch (e) {
      form.setError('amount_due', {
        message: e instanceof Error ? e.message : 'Not a valid amount',
      });
      return;
    }

    const patch: PaymentInput = {
      budget_line_id: lineId,
      stage: values.stage,
      amount_due_minor: amountDue,
      amount_paid_minor: amountPaid,
      due_date: values.due_date || null,
      paid_on: values.paid_on || null,
      method: values.method || null,
      reference: values.reference?.trim() || null,
      paid_by: values.paid_by?.trim() || null,
      notes: values.notes?.trim() || null,
    };

    if (editingId) await update.mutateAsync({ id: editingId, patch });
    else await create.mutateAsync(patch);
    startNew();
  }

  if (payments.isLoading) {
    return (
      <div className="p-8">
        <Spinner label="Loading payments" />
      </div>
    );
  }
  if (payments.error) {
    return (
      <div className="p-8">
        <ErrorState error={payments.error} onRetry={() => void payments.refetch()} />
      </div>
    );
  }

  const busy = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error ?? remove.error;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Payments</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Every instalment against a budget line. Whether something is due, due soon or overdue is
          worked out from today's date, so it changes on its own.
        </p>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label={`Raised (${currency})`} value={formatMinorAsMajor(totals.due, decimals)} />
        <Stat label={`Paid (${currency})`} value={formatMinorAsMajor(totals.paid, decimals)} />
        <Stat
          label={`Still to pay (${currency})`}
          value={formatMinorAsMajor(totals.outstanding, decimals)}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              {(payments.data ?? []).length} {(payments.data ?? []).length === 1 ? 'payment' : 'payments'}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {(payments.data ?? []).length === 0 ? (
              <EmptyState
                title="No payments yet"
                description="Record a deposit or instalment and it will show up here with its own status."
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {(payments.data ?? []).map((p) => {
                  const line = pickable.find((l) => l.id === p.budget_line_id);
                  const status = (p.status ?? 'not_due') as PaymentStatus;
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => startEdit(p)}
                      >
                        <p className="truncate text-sm text-stone-900">
                          {line ? line.name : 'Unattached payment'}
                        </p>
                        <p className="truncate text-xs text-stone-400">
                          {line?.code ? `${line.code} · ` : ''}
                          {p.due_date ? `due ${p.due_date}` : 'no due date'}
                          {p.method ? ` · ${p.method}` : ''}
                        </p>
                      </button>
                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums text-stone-900">
                          {formatMinorAsMajor(p.amount_paid_minor, decimals)}
                        </p>
                        <p className="text-[11px] tabular-nums text-stone-400">
                          of {formatMinorAsMajor(p.amount_due_minor, decimals)}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => p.id && remove.mutate(p.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {mutationError && (
              <p className="mt-3 text-xs text-red-700">
                {mutationError instanceof Error ? mutationError.message : 'Something went wrong'}
              </p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:sticky lg:top-6">
          <CardHeader className="flex items-baseline justify-between">
            <CardTitle>{editingId ? 'Edit payment' : 'Record a payment'}</CardTitle>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={startNew}>
                New instead
              </Button>
            )}
          </CardHeader>
          <CardBody>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Field label="Budget line" hint="Type its code or part of its name." error={lineError ?? undefined}>
                <BudgetLinePicker
                  lines={pickable}
                  value={lineId}
                  disabled={!canEdit}
                  onChange={(id) => {
                    setLineId(id);
                    if (id) setLineError(null);
                  }}
                />
              </Field>

              <Field label="Stage">
                <Select disabled={!canEdit} {...form.register('stage')}>
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`Amount due (${currency})`} error={form.formState.errors.amount_due?.message}>
                  <Input inputMode="decimal" disabled={!canEdit} {...form.register('amount_due')} />
                </Field>
                <Field label="Due date">
                  <Input type="date" disabled={!canEdit} {...form.register('due_date')} />
                </Field>
                <Field label={`Amount paid (${currency})`}>
                  <Input inputMode="decimal" disabled={!canEdit} {...form.register('amount_paid')} />
                </Field>
                <Field label="Paid on">
                  <Input type="date" disabled={!canEdit} {...form.register('paid_on')} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Method">
                  <Select disabled={!canEdit} {...form.register('method')}>
                    <option value="">Not recorded</option>
                    {(methods.data ?? []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Paid by">
                  <Input disabled={!canEdit} {...form.register('paid_by')} />
                </Field>
              </div>

              <Field label="Reference" hint="Cheque number, transfer id, receipt number.">
                <Input disabled={!canEdit} {...form.register('reference')} />
              </Field>

              <Field label="Notes">
                <Input disabled={!canEdit} {...form.register('notes')} />
              </Field>

              {editingId ? (
                <Field label="Receipt" hint="Stored privately; opened through a short-lived link.">
                  <ReceiptField
                    weddingId={wedding.id}
                    paymentId={editingId}
                    receiptPath={editingReceiptPath}
                    canEdit={canEdit}
                  />
                </Field>
              ) : (
                <p className="text-xs text-stone-500">
                  Save the payment first, then a receipt can be attached to it.
                </p>
              )}

              {canEdit && (
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save payment' : 'Add payment'}
                </Button>
              )}
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-stone-900">{value}</p>
    </div>
  );
}
