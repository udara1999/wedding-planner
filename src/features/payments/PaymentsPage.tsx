import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
import { STAGES, STATUS_LABEL, STATUS_TONE } from './status';
import { useBudgetLines, usePayerOptions } from '../budget/api';
import { useVendors } from '../vendors/vendorsApi';
import {
  currencyDecimals,
  formatMinorAsMajor,
  formatMinorForInput,
  parseMajorToMinor,
} from '../../lib/units';
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
  Page,
  PageHeader,
  Spinner,
  Stat,
} from '../../components/ui';

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
  // The same list the budget line's "Who pays" uses — Bride, Groom, Couple,
  // the two families. Two fields naming the same set of people should not
  // offer different answers, and a free-text one drifts into "Bride's family"
  // beside "Brides Family" within a week.
  const payers = usePayerOptions(wedding.id);
  const create = useCreatePayment(wedding.id);
  const update = useUpdatePayment(wedding.id);
  const remove = useDeletePayment(wedding.id);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [lineId, setLineId] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [stageFilter, setStageFilter] = useState<PaymentStage | 'all'>('all');
  const [search, setSearch] = useState('');

  const pickable = useMemo(
    () => (lines.data ?? []).map((l) => ({ id: l.id, code: l.code, name: l.name })),
    [lines.data],
  );

  const vendors = useVendors(wedding.id);
  const vendorName = useMemo(
    () => new Map((vendors.data ?? []).map((v) => [v.id, v.name])),
    [vendors.data],
  );

  // The same precedence the database enforces, so the form never offers a
  // choice that would be silently overruled on save.
  const lineVendorId = (lines.data ?? []).find((l) => l.id === lineId)?.vendor_id ?? null;


  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: BLANK });
  // Derived from the stored row rather than from form.watch, which the React
  // Compiler cannot memoise. It only ever matters for a value already saved:
  // one entered before this field was a list, or seeded by a tradition whose
  // lookups have since changed.
  const editingPaidBy =
    (payments.data ?? []).find((p) => p.id === editingId)?.paid_by ?? null;
  const paidByOrphan =
    editingPaidBy && !(payers.data ?? []).includes(editingPaidBy) ? editingPaidBy : null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (payments.data ?? []).filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (stageFilter !== 'all' && p.stage !== stageFilter) return false;
      if (needle) {
        const line = pickable.find((l) => l.id === p.budget_line_id);
        const haystack = [line?.code, line?.name, p.reference, p.method, p.paid_by]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [payments.data, statusFilter, stageFilter, search, pickable]);

  // Totals follow what is on screen, so filtering answers "how much is
  // overdue" rather than always restating the whole plan.
  const totals = useMemo(() => {
    let due = 0;
    let paid = 0;
    for (const p of filtered) {
      due += p.amount_due_minor ?? 0;
      paid += p.amount_paid_minor ?? 0;
    }
    return { due, paid, outstanding: Math.max(due - paid, 0) };
  }, [filtered]);

  const editingReceiptPath =
    (payments.data ?? []).find((p) => p.id === editingId)?.receipt_path ?? null;

  function startEdit(p: PaymentView) {
    setEditingId(p.id ?? null);
    setLineId(p.budget_line_id ?? null);
    setVendorId(p.vendor_id ?? null);
    setLineError(null);
    form.reset({
      stage: (p.stage ?? 'final_payment') as PaymentStage,
      amount_due: formatMinorForInput(p.amount_due_minor, decimals),
      amount_paid: formatMinorForInput(p.amount_paid_minor, decimals),
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
    setVendorId(null);
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
      // Sent for the case the line names no vendor. When it does, the database
      // overrides this with the line's vendor, so the two cannot disagree.
      vendor_id: lineVendorId ?? vendorId,
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
    <Page width="wide">
      <PageHeader
        title="Payments"
        description="Every instalment against a budget line. Whether something is due, due soon or overdue is worked out from today's date, so it changes on its own."
      />

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
              {filtered.length} of {(payments.data ?? []).length}{' '}
              {(payments.data ?? []).length === 1 ? 'payment' : 'payments'}
            </CardTitle>
            {(statusFilter !== 'all' || stageFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setStageFilter('all');
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
            )}
          </CardHeader>

          <div className="flex flex-wrap items-center gap-2 border-y border-stone-100 px-4 py-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
              <Input
                className="pl-9"
                placeholder="Search a line, reference or method"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="w-36"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
            >
              <option value="all">Any status</option>
              {(Object.keys(STATUS_LABEL) as PaymentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            <Select
              className="w-44"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as PaymentStage | 'all')}
            >
              <option value="all">Any stage</option>
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>

          <CardBody className="pt-4">
            {filtered.length === 0 ? (
              <EmptyState
                title={
                  (payments.data ?? []).length === 0
                    ? 'No payments yet'
                    : 'Nothing matches those filters'
                }
                description={
                  (payments.data ?? []).length === 0
                    ? 'Record a deposit or instalment and it will show up here with its own status.'
                    : 'Widen the status, stage or search and the payments will come back.'
                }
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {filtered.map((p) => {
                  const line = pickable.find((l) => l.id === p.budget_line_id);
                  const status = (p.status ?? 'not_due') as PaymentStatus;
                  return (
                    <li
                      key={p.id}
                      onClick={() => startEdit(p)}
                      className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-stone-50/70"
                    >
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
                          {p.vendor_id && vendorName.has(p.vendor_id)
                            ? `${vendorName.get(p.vendor_id)} · `
                            : ''}
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
                          onClick={(e) => {
                            // Deleting must not also open the row behind it.
                            e.stopPropagation();
                            if (p.id) remove.mutate(p.id);
                          }}
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
              <Field
                label="Budget line"
                hint="Type its code or part of its name."
                error={lineError ?? undefined}
              >
                <BudgetLinePicker
                  lines={pickable}
                  value={lineId}
                  disabled={!canEdit}
                  invalid={Boolean(lineError)}
                  onChange={(id) => {
                    setLineId(id);
                    // A vendor chosen for the previous line does not carry over
                    // to a new one.
                    setVendorId(null);
                    if (id) setLineError(null);
                  }}
                />
              </Field>

              {/* Who was paid. The budget line answers this whenever it names a
                  vendor, so the field shows that answer and locks — one fact,
                  one place. It opens up only when the line has no vendor, which
                  is the case that was previously unattributable. */}
              <Field
                label="Paid to"
                hint={
                  lineVendorId
                    ? 'Taken from the budget line. Change it on the line to change it here.'
                    : 'Optional. This budget line has no vendor, so the payment can name one.'
                }
              >
                <Select
                  disabled={!canEdit || Boolean(lineVendorId)}
                  value={lineVendorId ?? vendorId ?? ''}
                  onChange={(e) => setVendorId(e.target.value || null)}
                >
                  <option value="">Not recorded</option>
                  {(vendors.data ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.category ? ` · ${v.category}` : ''}
                    </option>
                  ))}
                </Select>
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
                <Field
                  label={`Amount due (${currency})`}
                  error={form.formState.errors.amount_due?.message}
                >
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={!canEdit}
                    {...form.register('amount_due')}
                  />
                </Field>
                <Field label="Due date">
                  <Input type="date" disabled={!canEdit} {...form.register('due_date')} />
                </Field>
                <Field label={`Amount paid (${currency})`}>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    disabled={!canEdit}
                    {...form.register('amount_paid')}
                  />
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
                  <Select disabled={!canEdit} {...form.register('paid_by')}>
                    <option value="">Not recorded</option>
                    {(payers.data ?? []).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {/* A value saved before this was a list, or seeded from a
                        tradition whose lookups have since changed, must still
                        show as itself rather than snapping to "Not recorded". */}
                    {paidByOrphan && <option value={paidByOrphan}>{paidByOrphan}</option>}
                  </Select>
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
    </Page>
  );
}
