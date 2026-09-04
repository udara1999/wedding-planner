import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useContributions,
  useCreateContribution,
  useDeleteContribution,
  useUpdateContribution,
  type ContributionInput,
  type ContributionRow,
} from './api';
import { useAuth } from '../auth/AuthProvider';
import {
  currencyDecimals,
  formatMinorAsMajor,
  formatMinorForInput,
  parseMajorToMinor,
} from '../../lib/units';
import type { MyWedding } from '../../types/db';
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
  Page,
  PageHeader,
  Spinner,
  Stat,
} from '../../components/ui';

const schema = z.object({
  contributor_name: z.string().trim().min(1, 'Who is contributing?'),
  relationship: z.string().trim().max(80).optional().nullable(),
  purpose: z.string().trim().max(120).optional().nullable(),
  agreed_on: z.string().optional().nullable(),
  agreed: z.string(),
  received: z.string(),
  last_received_on: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  mine: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const BLANK: FormValues = {
  contributor_name: '',
  relationship: '',
  purpose: '',
  agreed_on: '',
  agreed: '',
  received: '',
  last_received_on: '',
  notes: '',
  mine: false,
};

export function ContributionsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const { user } = useAuth();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);

  const isCouple = wedding.role === 'owner' || wedding.role === 'partner';
  const isFamily = wedding.role === 'family';
  const canAdd = isCouple || isFamily;

  const list = useContributions(wedding.id);
  const create = useCreateContribution(wedding.id);
  const update = useUpdateContribution(wedding.id);
  const remove = useDeleteContribution(wedding.id);

  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    // A family member can only ever write their own row, so the choice is not
    // theirs to make — it is forced on and disabled below.
    defaultValues: { ...BLANK, mine: isFamily },
  });

  const totals = useMemo(() => {
    let agreed = 0;
    let received = 0;
    for (const c of list.data ?? []) {
      agreed += c.agreed_minor;
      received += c.received_minor;
    }
    return { agreed, received, outstanding: Math.max(agreed - received, 0) };
  }, [list.data]);

  function startNew() {
    setEditingId(null);
    form.reset({ ...BLANK, mine: isFamily });
  }

  function startEdit(c: ContributionRow) {
    setEditingId(c.id);
    form.reset({
      contributor_name: c.contributor_name,
      relationship: c.relationship ?? '',
      purpose: c.purpose ?? '',
      agreed_on: c.agreed_on ?? '',
      agreed: formatMinorForInput(c.agreed_minor, decimals),
      received: formatMinorForInput(c.received_minor, decimals),
      last_received_on: c.last_received_on ?? '',
      notes: c.notes ?? '',
      mine: c.contributor_user_id !== null && c.contributor_user_id === user?.id,
    });
  }

  async function onSubmit(values: FormValues) {
    let agreedMinor: number;
    let receivedMinor: number;
    try {
      agreedMinor = parseMajorToMinor(values.agreed, decimals) ?? 0;
      receivedMinor = parseMajorToMinor(values.received, decimals) ?? 0;
    } catch (e) {
      form.setError('agreed', { message: e instanceof Error ? e.message : 'Not a valid amount' });
      return;
    }

    const patch: ContributionInput & { contributor_name: string } = {
      contributor_name: values.contributor_name.trim(),
      relationship: values.relationship?.trim() || null,
      purpose: values.purpose?.trim() || null,
      agreed_on: values.agreed_on || null,
      agreed_minor: agreedMinor,
      received_minor: receivedMinor,
      last_received_on: values.last_received_on || null,
      notes: values.notes?.trim() || null,
      // Only ever the signed-in user's own id. Nobody can attribute a row to
      // somebody else from here, and the policy's WITH CHECK enforces the same
      // thing server-side for a family member.
      contributor_user_id: values.mine ? (user?.id ?? null) : null,
    };

    if (editingId) await update.mutateAsync({ id: editingId, patch });
    else await create.mutateAsync(patch);
    startNew();
  }

  if (list.isLoading) {
    return (
      <div className="p-8">
        <Spinner label="Loading contributions" />
      </div>
    );
  }
  if (list.error) {
    return (
      <div className="p-8">
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      </div>
    );
  }

  const busy = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error ?? remove.error;

  return (
    <Page width="wide">
      <PageHeader
        title="Contributions"
        description="Who has agreed to fund what, and how much has actually arrived."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label={`Agreed (${currency})`} value={formatMinorAsMajor(totals.agreed, decimals)} />
        <Stat
          label={`Received (${currency})`}
          value={formatMinorAsMajor(totals.received, decimals)}
        />
        <Stat
          label={`Still to come (${currency})`}
          value={formatMinorAsMajor(totals.outstanding, decimals)}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              {(list.data ?? []).length}{' '}
              {(list.data ?? []).length === 1 ? 'contribution' : 'contributions'}
            </CardTitle>
          </CardHeader>
          <CardBody>
            {(list.data ?? []).length === 0 ? (
              <EmptyState
                title="Nothing pledged yet"
                description={
                  isFamily
                    ? 'Add what you have agreed to contribute and it will appear here.'
                    : 'Record what each family has agreed to fund.'
                }
              />
            ) : (
              <ul className="divide-y divide-stone-100">
                {(list.data ?? []).map((c) => (
                  <li
                    key={c.id}
                    onClick={() => startEdit(c)}
                    className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-stone-50/70"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => startEdit(c)}
                    >
                      <p className="truncate text-sm text-stone-900">{c.contributor_name}</p>
                      <p className="truncate text-xs text-stone-400">
                        {[c.relationship, c.purpose].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </button>
                    <div className="shrink-0 text-right">
                      <p className="text-sm tabular-nums text-stone-900">
                        {formatMinorAsMajor(c.received_minor, decimals)}
                      </p>
                      <p className="text-[11px] tabular-nums text-stone-400">
                        of {formatMinorAsMajor(c.agreed_minor, decimals)} {currency}
                      </p>
                    </div>
                    {c.still_to_come_minor === 0 && c.agreed_minor > 0 ? (
                      <Badge tone="good">complete</Badge>
                    ) : (
                      <Badge tone="neutral">
                        {formatMinorAsMajor(c.still_to_come_minor, decimals)} to come
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove.mutate(c.id);
                      }}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {mutationError && (
              <p className="mt-3 text-xs text-red-700">
                {mutationError instanceof Error ? mutationError.message : 'Something went wrong'}
              </p>
            )}
          </CardBody>
        </Card>

        {canAdd && (
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="flex items-baseline justify-between">
              <CardTitle>{editingId ? 'Edit contribution' : 'Add a contribution'}</CardTitle>
              {editingId && (
                <Button variant="ghost" size="sm" onClick={startNew}>
                  New instead
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <Field label="Contributor" error={form.formState.errors.contributor_name?.message}>
                  <Input placeholder="Groom's family" {...form.register('contributor_name')} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Relationship">
                    <Input placeholder="Groom's parents" {...form.register('relationship')} />
                  </Field>
                  <Field label="Purpose">
                    <Input placeholder="General wedding fund" {...form.register('purpose')} />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={`Agreed (${currency})`}
                    error={form.formState.errors.agreed?.message}
                  >
                    <Input inputMode="decimal" placeholder="0.00" {...form.register('agreed')} />
                  </Field>
                  <Field label="Agreed on">
                    <Input type="date" {...form.register('agreed_on')} />
                  </Field>
                  <Field label={`Received (${currency})`}>
                    <Input inputMode="decimal" placeholder="0.00" {...form.register('received')} />
                  </Field>
                  <Field label="Last received on">
                    <Input type="date" {...form.register('last_received_on')} />
                  </Field>
                </div>

                <label className="flex items-start gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    disabled={isFamily}
                    {...form.register('mine')}
                  />
                  <span>
                    This is my own contribution
                    <span className="block text-xs text-stone-500">
                      {isFamily
                        ? 'Always on: you can only add a contribution of your own.'
                        : 'Links the row to your account so you keep access to it.'}
                    </span>
                  </span>
                </label>

                <Field label="Notes">
                  <Input {...form.register('notes')} />
                </Field>

                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save contribution' : 'Add contribution'}
                </Button>
              </form>
            </CardBody>
          </Card>
        )}
      </div>
    </Page>
  );
}

