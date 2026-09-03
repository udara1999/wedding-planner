import { useOutletContext } from 'react-router-dom';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateWedding, useWedding } from './api';
import type { MyWedding } from '../../types/db';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ErrorState,
  Field,
  Input,
  Spinner,
} from '../../components/ui';

const nullableText = z.string().trim().max(200).optional().nullable();

const schema = z.object({
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
});

type FormValues = z.infer<typeof schema>;

export function SetupPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const { data, isLoading, error, refetch } = useWedding(wedding.id);
  const update = useUpdateWedding(wedding.id);
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (data) form.reset(data as unknown as FormValues);
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
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]),
    );
    await update.mutateAsync(clean);
  }

  return (
    <div className="max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-stone-900">Setup</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          The couple, the day and the venue. Dates and times entered here drive every schedule in
          the app.
        </p>
      </header>

      {!canEdit && (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          You have <strong>{wedding.role}</strong> access, so this page is read-only.
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
            <Field label="Wedding date" hint="Changing this re-dates the whole plan (Phase 1.7).">
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
          <Field label="Expected finish">
            <Input type="time" disabled={!canEdit} {...form.register('expected_finish')} />
          </Field>
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
    </div>
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
