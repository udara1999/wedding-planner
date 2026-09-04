import { useOutletContext } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateWedding, useWedding } from './api';
import { TRADITIONS } from './traditions';
import type { MyWedding } from '../../types/db';
import type { WeddingRow } from '../../types/db';
import {
  currencyDecimals,
  formatMinorForInput,
  formatRateForInput,
  parseMajorToMinor,
  parsePercentAsRate,
} from '../../lib/units';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Spinner,
} from '../../components/ui';

const nullableText = z.string().trim().max(200).optional().nullable();

/**
 * Money and percentages are held as strings here because that is what the user
 * types; they are converted at both boundaries (see toFormValues / onSubmit).
 * Validating them needs `currency`, so it happens at the object level.
 */
const schema = z
  .object({
  tradition: z.string().min(1, 'Pick a tradition'),
  currency: z.string().trim().length(3, 'Use a 3-letter code, e.g. LKR'),
  timezone: z.string().trim().min(1, 'A timezone is required for every schedule'),
  total_budget_minor: z.string(),
  contingency_pct: z.string(),
  guest_buffer_pct: z.string(),
  bride_name: nullableText,
  groom_name: nullableText,
  wedding_date: z.string().optional().nullable(),
  ceremony_time: nullableText,
  registration_time: nullableText,
  reception_time: nullableText,
  expected_finish: nullableText,
  venue_name: nullableText,
  venue_town: nullableText,
  venue_district: nullableText,
  ceremony_area: nullableText,
  reception_area: nullableText,
  venue_contact_name: nullableText,
  venue_contact_phone: nullableText,
  theme: nullableText,
  colour_palette: nullableText,
  coordinator_name: nullableText,
  coordinator_phone: nullableText,
  emergency_contact_name: nullableText,
  emergency_contact_phone: nullableText,
  })
  .superRefine((values, ctx) => {
    const decimals = currencyDecimals(values.currency);
    const check = (key: 'total_budget_minor' | 'contingency_pct' | 'guest_buffer_pct') => {
      try {
        if (key === 'total_budget_minor') parseMajorToMinor(values[key], decimals);
        else parsePercentAsRate(values[key]);
      } catch (e) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: e instanceof Error ? e.message : 'Not a valid number',
        });
      }
    };
    check('total_budget_minor');
    check('contingency_pct');
    check('guest_buffer_pct');
  });

type FormValues = z.infer<typeof schema>;

/** Row -> form. The inverse lives in onSubmit; keep the two in step. */
function toFormValues(row: WeddingRow): FormValues {
  const decimals = currencyDecimals(row.currency);
  return {
    ...(row as unknown as FormValues),
    tradition: row.tradition ?? 'poruwa',
    currency: row.currency ?? 'LKR',
    timezone: row.timezone ?? 'Asia/Colombo',
    total_budget_minor: formatMinorForInput(row.total_budget_minor, decimals),
    contingency_pct: formatRateForInput(row.contingency_pct),
    guest_buffer_pct: formatRateForInput(row.guest_buffer_pct),
  };
}

export function SetupPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const { data, isLoading, error, refetch } = useWedding(wedding.id);
  const update = useUpdateWedding(wedding.id);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) form.reset(toFormValues(data));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading)
    return (
      <div className="p-8">
        <Spinner />
      </div>
    );
  if (error)
    return (
      <div className="p-8">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );

  async function onSubmit(values: FormValues) {
    const {
      total_budget_minor,
      contingency_pct,
      guest_buffer_pct,
      currency,
      ...rest
    } = values;
    const decimals = currencyDecimals(currency);

    // Blank text means "not set"; blank money means zero, because these three
    // columns are NOT NULL with a default rather than nullable.
    const clean = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, v === '' ? null : v]),
    );

    await update.mutateAsync({
      ...clean,
      currency: currency.toUpperCase(),
      total_budget_minor: parseMajorToMinor(total_budget_minor, decimals) ?? 0,
      contingency_pct: parsePercentAsRate(contingency_pct) ?? 0,
      guest_buffer_pct: parsePercentAsRate(guest_buffer_pct) ?? 0,
    });
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Setup"
        description="The couple, the day and the venue. Dates and times entered here drive every schedule in the app."
      />

      {!canEdit && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          You have <strong>{wedding.role}</strong> access, so this page is read-only.
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="lg:columns-2 lg:gap-5 [&>*]:mb-5 [&>*]:break-inside-avoid">
        <Section title="The couple &amp; the day">
          <Two>
            <Field label="Bride's name">
              <Input disabled={!canEdit} {...form.register('bride_name')} />
            </Field>
            <Field label="Groom's name">
              <Input disabled={!canEdit} {...form.register('groom_name')} />
            </Field>
          </Two>
          <Two>
            <Field label="Wedding date" hint="Changing this re-dates every task and countdown check, except any you moved yourself.">
              <Input type="date" disabled={!canEdit} {...form.register('wedding_date')} />
            </Field>
            <Field label="Ceremony / Poruwa time">
              <Input type="time" disabled={!canEdit} {...form.register('ceremony_time')} />
            </Field>
          </Two>
          <Two>
            <Field label="Registration (signing) time">
              <Input type="time" disabled={!canEdit} {...form.register('registration_time')} />
            </Field>
            <Field label="Reception start">
              <Input type="time" disabled={!canEdit} {...form.register('reception_time')} />
            </Field>
          </Two>
          <Two>
            <Field label="Expected finish">
              <Input type="time" disabled={!canEdit} {...form.register('expected_finish')} />
            </Field>
            <Field label="Days to go" hint="Derived from the wedding date, never stored.">
              <Input
                readOnly
                disabled
                value={wedding.days_to_go ?? ''}
                aria-label="Days to go"
              />
            </Field>
          </Two>
        </Section>
        <Section title="Venue">
          <Two>
            <Field label="Venue name">
              <Input disabled={!canEdit} {...form.register('venue_name')} />
            </Field>
            <Field label="Town">
              <Input disabled={!canEdit} {...form.register('venue_town')} />
            </Field>
          </Two>
          <Two>
            <Field label="District">
              <Input disabled={!canEdit} {...form.register('venue_district')} />
            </Field>
            <Field label="Ceremony area">
              <Input disabled={!canEdit} {...form.register('ceremony_area')} />
            </Field>
          </Two>
          <Two>
            <Field label="Reception area">
              <Input disabled={!canEdit} {...form.register('reception_area')} />
            </Field>
            <Field label="Venue contact">
              <Input disabled={!canEdit} {...form.register('venue_contact_name')} />
            </Field>
          </Two>
          <Field label="Venue phone">
            <Input disabled={!canEdit} {...form.register('venue_contact_phone')} />
          </Field>
        </Section>
        <Section title="Tradition &amp; locale">
          <Field
            label="Tradition"
            error={form.formState.errors.tradition?.message}
            hint="Which template the plan is seeded from."
          >
            <Select disabled={!canEdit} {...form.register('tradition')}>
              {TRADITIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Two>
            <Field label="Currency" error={form.formState.errors.currency?.message}>
              <Input maxLength={3} disabled={!canEdit} {...form.register('currency')} />
            </Field>
            <Field
              label="Timezone"
              error={form.formState.errors.timezone?.message}
              hint="Every time on this page is read in this zone."
            >
              <Input disabled={!canEdit} {...form.register('timezone')} />
            </Field>
          </Two>
        </Section>
        <Section title="Budget control">
          <Field
            label="Total budget"
            error={form.formState.errors.total_budget_minor?.message}
            hint="The ceiling every forecast is measured against."
          >
            <Input inputMode="decimal"
                placeholder="0.00" disabled={!canEdit} {...form.register('total_budget_minor')} />
          </Field>
          <Two>
            <Field
              label="Contingency %"
              error={form.formState.errors.contingency_pct?.message}
              hint="Held back for overruns. Max 50."
            >
              <Input inputMode="decimal"
                placeholder="0" disabled={!canEdit} {...form.register('contingency_pct')} />
            </Field>
            <Field
              label="Guest buffer %"
              error={form.formState.errors.guest_buffer_pct?.message}
              hint="Extra head count catered for. Max 50."
            >
              <Input inputMode="decimal"
                placeholder="0" disabled={!canEdit} {...form.register('guest_buffer_pct')} />
            </Field>
          </Two>
        </Section>
        <Section title="Style &amp; key people">
          <Two>
            <Field label="Theme">
              <Input disabled={!canEdit} {...form.register('theme')} />
            </Field>
            <Field label="Colour palette">
              <Input disabled={!canEdit} {...form.register('colour_palette')} />
            </Field>
          </Two>
          <Two>
            <Field label="Coordinator">
              <Input disabled={!canEdit} {...form.register('coordinator_name')} />
            </Field>
            <Field label="Coordinator phone">
              <Input disabled={!canEdit} {...form.register('coordinator_phone')} />
            </Field>
          </Two>
          <Two>
            <Field label="Emergency contact">
              <Input disabled={!canEdit} {...form.register('emergency_contact_name')} />
            </Field>
            <Field label="Emergency phone">
              <Input disabled={!canEdit} {...form.register('emergency_contact_phone')} />
            </Field>
          </Two>
        </Section>

        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {update.isSuccess && !form.formState.isDirty && (
              <span className="text-sm text-green-700">Saved</span>
            )}
            {update.error && (
              <span className="text-sm text-red-700">
                {update.error instanceof Error ? update.error.message : 'Save failed'}
              </span>
            )}
          </div>
        )}
      </form>
    </Page>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardBody className="space-y-4">{children}</CardBody>
  </Card>
);

const Two = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-4 sm:grid-cols-2">{children}</div>
);
