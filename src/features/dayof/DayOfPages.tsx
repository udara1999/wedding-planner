import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  Phone,
  Plus,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import {
  LEVELS,
  clock,
  useContactSheet,
  useCreateTimelineEvent,
  useRisks,
  useTimeline,
  useTimelineConflicts,
  useUpdateRisk,
  useUpdateTimelineEvent,
  useVendorCheck,
  useVendorSchedule,
  type RiskRow,
  type TimelineRow,
} from './api';
import { ContactTable, RiskTable, ScheduleTable, TimelineTable } from './tables';
import { useVendors } from '../vendors/vendorsApi';
import { useOwnerOptions } from '../weddings/lookups';
import { useWedding } from '../weddings/api';
import type { Applicability, MyWedding } from '../../types/db';
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
  InlineError,
  Input,
  Modal,
  Page,
  PageHeader,
  Section,
  Select,
  SkeletonRows,
  Stat,
  Textarea,
} from '../../components/ui';

/** Everyone on the day-of pack can edit it: the couple and the coordinator. */
function useDayRole() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  return {
    wedding,
    canEdit:
      wedding.role === 'owner' || wedding.role === 'partner' || wedding.role === 'coordinator',
  };
}

/**
 * Styled as a link rather than a Button wrapping one: a <button> inside an <a>
 * is invalid HTML and browsers disagree about what it does.
 */
function PrintLink() {
  return (
    <Link
      to="../pack"
      className="focus-ring inline-flex h-9.5 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-sm hover:border-stone-300"
    >
      <Printer className="size-4" />
      Print the pack
    </Link>
  );
}

/** Ticket 8.1. */
export function TimelinePage() {
  const { wedding, canEdit } = useDayRole();
  const events = useTimeline(wedding.id);
  const conflicts = useTimelineConflicts(wedding.id);
  // my_weddings() does not carry the ceremony time, and the whole timeline
  // hangs off it.
  const detail = useWedding(wedding.id);
  const ceremonyTime = detail.data?.ceremony_time?.slice(0, 5) ?? null;
  const vendors = useVendors(wedding.id);
  const update = useUpdateTimelineEvent(wedding.id);
  const create = useCreateTimelineEvent(wedding.id);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useMemo(() => events.data ?? [], [events.data]);
  const clashes = useMemo(() => conflicts.data ?? [], [conflicts.data]);
  const vendorName = (id: string | null) =>
    id ? (vendors.data?.find((v) => v.id === id)?.name ?? null) : null;

  const done = rows.filter((e) => e.done).length;
  const live = rows.filter((e) => e.applicability !== 'not_applicable');
  const editing = rows.find((e) => e.id === editingId) ?? null;

  if (events.isError) {
    return (
      <Page width="wide">
        <PageHeader title="Day timeline" />
        <ErrorState error={events.error} onRetry={() => void events.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Day timeline"
        description="Phase by phase, hung off the ceremony time. End times are worked out, not typed."
        actions={
          <div className="flex items-center gap-2">
            <PrintLink />
            {canEdit && (
              <Button
                icon={<Plus className="size-4" />}
                loading={create.isPending}
                onClick={() =>
                  create.mutate(
                    { name: 'New event', phase: 'Reception', sort_order: rows.length + 1 },
                    { onSuccess: (row) => setEditingId(row.id) },
                  )
                }
              >
                Add event
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Events"
          value={live.length}
          icon={<CalendarClock className="size-3.5" />}
          hint={`${rows.length - live.length} switched off`}
        />
        <Stat label="Ticked off" value={`${done} of ${live.length}`} />
        <Stat
          label="Clashes"
          value={clashes.length}
          icon={<AlertTriangle className="size-3.5" />}
          tone={clashes.length > 0 ? 'bad' : 'good'}
          hint={clashes.length > 0 ? 'same vendor, person or room' : 'nothing contends'}
        />
      </div>

      {/* Where the clock comes from. Without this the timeline looks like a
          fixed schedule somebody has to edit by hand, which is what it was. */}
      {ceremonyTime ? (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 px-4 py-2.5 text-sm text-stone-600">
          <Clock3 className="size-4 shrink-0 text-stone-500" />
          <span className="flex-1">
            Built around a <span className="font-medium text-stone-800">{ceremonyTime}</span>{' '}
            ceremony. Change that on Setup and the whole day moves with it — except any event whose
            time you have set by hand.
          </span>
          <Link
            to="../setup"
            className="focus-ring rounded text-xs text-wine-700 underline underline-offset-2"
          >
            Change the time
          </Link>
        </p>
      ) : (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <Clock3 className="size-4 shrink-0" />
          <span className="flex-1">
            No ceremony time set, so this is the template's own 19:00 running order. Set your
            ceremony time and the whole day shifts to fit.
          </span>
          <Link
            to="../setup"
            className="focus-ring rounded text-xs font-medium text-wine-700 underline underline-offset-2"
          >
            Set it on Setup
          </Link>
        </p>
      )}

      {clashes.length > 0 && (
        <Card className="mb-5 border-amber-200">
          <CardBody className="py-3">
            <p className="flex items-start gap-2 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Two events cannot both happen. Overlapping in time is normal — a wedding is many
                things at once — so these are only the ones needing the same vendor, the same person
                or the same room.
              </span>
            </p>
            <ul className="mt-2 space-y-1 pl-6">
              {clashes.map((c) => (
                <li key={`${c.event_id}-${c.clashes_with_id}`} className="text-xs text-stone-600">
                  <span className="font-medium text-stone-800">{c.contested}</span> is needed by “
                  {c.event_name}” at {clock(c.event_starts)} and “{c.clashes_with_name}” at{' '}
                  {clock(c.clashes_with_starts)} ({c.clash_on})
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="pt-5">
          {events.isLoading ? (
            <SkeletonRows rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-5" />}
              title="No timeline yet"
              description="Seeding the wedding brings in the workbook’s 56-event running order."
            />
          ) : (
            <TimelineTable
              events={rows}
              conflicts={clashes}
              vendorName={vendorName}
              onToggleDone={(e) => update.mutate({ id: e.id, patch: { done: !e.done } })}
              onOpen={canEdit ? (e) => setEditingId(e.id) : undefined}
            />
          )}
          <div className="pt-3">
            <InlineError error={update.error ?? create.error} />
          </div>
        </CardBody>
      </Card>

      {editing && (
        <TimelineModal
          event={editing}
          vendors={(vendors.data ?? []).map((v) => ({ id: v.id, name: v.name }))}
          canEdit={canEdit}
          onSave={(patch) => update.mutate({ id: editing.id, patch })}
          onClose={() => setEditingId(null)}
        />
      )}
    </Page>
  );
}

function TimelineModal({
  event,
  vendors,
  canEdit,
  onSave,
  onClose,
}: {
  event: TimelineRow;
  vendors: { id: string; name: string }[];
  canEdit: boolean;
  onSave: (
    patch: Parameters<ReturnType<typeof useUpdateTimelineEvent>['mutate']>[0]['patch'],
  ) => void;
  onClose: () => void;
}) {
  const owners = useOwnerOptions(event.wedding_id);
  const stamp = `${event.id}-${event.updated_at}`;

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={event.name}
      subtitle={`${event.phase ?? 'No phase'} · ${clock(event.starts_at)}–${clock(event.ends_at)}`}
    >
      <div className="space-y-4">
        <Section title="What happens">
          <Field label="Event">
            <Input
              key={`n-${stamp}`}
              disabled={!canEdit}
              defaultValue={event.name}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== event.name) onSave({ name: next });
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Phase">
              <Select
                disabled={!canEdit}
                value={event.phase ?? ''}
                onChange={(e) => onSave({ phase: e.target.value || null })}
              >
                <option value="">None</option>
                {['Setup', 'Preparation', 'Arrival', 'Ceremony', 'Reception', 'Close'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Starts"
              hint={
                event.starts_at_overridden
                  ? 'Pinned — it will not move if the ceremony time changes.'
                  : 'Follows the ceremony time.'
              }
            >
              <Input
                type="time"
                disabled={!canEdit}
                value={event.starts_at?.slice(0, 5) ?? ''}
                onChange={(e) =>
                  onSave({
                    starts_at: e.target.value || null,
                    // Setting a time by hand pins it, the same promise
                    // due_date_overridden makes for dates.
                    starts_at_overridden: Boolean(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Minutes" hint="The end time follows from this.">
              <Input
                key={`d-${stamp}`}
                inputMode="numeric"
                disabled={!canEdit}
                defaultValue={event.duration_minutes ?? ''}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const next = raw === '' ? null : Number(raw);
                  if (next !== event.duration_minutes && (next === null || next >= 0)) {
                    onSave({ duration_minutes: next });
                  }
                }}
              />
            </Field>
          </div>
        </Section>

        <Section title="Who and where">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who">
              <Select
                disabled={!canEdit}
                value={event.who ?? ''}
                onChange={(e) => onSave({ who: e.target.value || null })}
              >
                <option value="">Nobody set</option>
                {(owners.data ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                {event.who && !(owners.data ?? []).includes(event.who) && (
                  <option value={event.who}>{event.who}</option>
                )}
              </Select>
            </Field>
            <Field label="Where">
              <Input
                key={`l-${stamp}`}
                disabled={!canEdit}
                defaultValue={event.location ?? ''}
                onBlur={(e) => onSave({ location: e.target.value.trim() || null })}
              />
            </Field>
          </div>
          <Field label="Vendor" hint="Which booked vendor is doing it, if any.">
            <Select
              disabled={!canEdit}
              value={event.vendor_id ?? ''}
              onChange={(e) => onSave({ vendor_id: e.target.value || null })}
            >
              <option value="">Nobody</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Does it apply?">
            <Select
              disabled={!canEdit}
              value={event.applicability}
              onChange={(e) => onSave({ applicability: e.target.value as Applicability })}
            >
              <option value="required">Required</option>
              <option value="optional">Optional</option>
              <option value="not_applicable">Not happening</option>
            </Select>
          </Field>
        </Section>

        {event.starts_at_overridden && canEdit && event.offset_minutes !== null && (
          <Section
            title="This time is pinned"
            description="Everything else on the day shifts when the ceremony time changes. This event will not."
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSave({ starts_at_overridden: false })}
            >
              Let it follow the ceremony time again
            </Button>
          </Section>
        )}

        <Section title="Notes">
          <Textarea
            key={`no-${stamp}`}
            rows={3}
            disabled={!canEdit}
            defaultValue={event.notes ?? ''}
            onBlur={(e) => onSave({ notes: e.target.value.trim() || null })}
          />
        </Section>
      </div>
    </Modal>
  );
}

/** Ticket 8.2. */
export function VendorSchedulePage() {
  const { wedding } = useDayRole();
  const schedule = useVendorSchedule(wedding.id);
  const check = useVendorCheck(wedding.id);

  const rows = useMemo(() => schedule.data ?? [], [schedule.data]);
  const missing = rows.filter((v) => v.no_phone).length;
  const inNow = rows.filter((v) => v.checked_in && !v.checked_out).length;

  return (
    <Page width="wide">
      <PageHeader
        title="Vendor schedule"
        description="Sorted by arrival. Tick each one in when they turn up and out when they leave."
        actions={<PrintLink />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Vendors" value={rows.length} hint="with a booking" />
        <Stat label="On site now" value={inNow} tone={inNow > 0 ? 'accent' : undefined} />
        <Stat
          label="No phone number"
          value={missing}
          icon={<Phone className="size-3.5" />}
          tone={missing > 0 ? 'bad' : 'good'}
          hint={missing > 0 ? 'you cannot reach them' : 'everyone is reachable'}
        />
      </div>

      <Card>
        <CardBody className="scroll-subtle overflow-x-auto pt-5">
          {schedule.isLoading ? (
            <SkeletonRows rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No vendors yet"
              description="Vendors appear here as soon as they exist, with whatever arrival times they have."
            />
          ) : (
            <ScheduleTable
              rows={rows}
              onCheck={(vendorId, field, value) => check.mutate({ vendorId, field, value })}
            />
          )}
          <div className="pt-3">
            <InlineError error={check.error} />
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}

/** Ticket 8.3. */
export function ContactSheetPage() {
  const { wedding } = useDayRole();
  const contacts = useContactSheet(wedding.id);
  const rows = useMemo(() => contacts.data ?? [], [contacts.data]);
  const missing = rows.filter((r) => r.no_number).length;

  return (
    <Page width="default">
      <PageHeader
        title="Contact sheet"
        description="Everyone worth phoning on the day. Vendors appear automatically, so this cannot go stale."
        actions={<PrintLink />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Stat label="People" value={rows.length} icon={<Phone className="size-3.5" />} />
        <Stat
          label="Cannot be rung"
          value={missing}
          tone={missing > 0 ? 'bad' : 'good'}
          hint={missing > 0 ? 'no number of any kind' : 'everyone has a number'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By group</CardTitle>
          <Link
            to="../m/contacts"
            className="focus-ring ml-auto rounded text-xs text-wine-700 hover:text-wine-800"
          >
            Add someone
          </Link>
        </CardHeader>
        <CardBody className="pt-0">
          {contacts.isLoading ? (
            <SkeletonRows rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nobody yet"
              description="Add people on the contacts module, or book a vendor and they appear here."
            />
          ) : (
            <ContactTable rows={rows} />
          )}
        </CardBody>
      </Card>
    </Page>
  );
}

/** Ticket 8.4. */
export function RisksPage() {
  const { wedding, canEdit } = useDayRole();
  const risks = useRisks(wedding.id);
  const update = useUpdateRisk(wedding.id);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useMemo(() => risks.data ?? [], [risks.data]);
  const live = rows.filter((r) => r.applicability !== 'not_applicable');
  const worst = live.filter((r) => (r.score ?? 0) >= 9);
  const prevented = live.filter((r) => r.prevention_done).length;
  const editing = rows.find((r) => r.id === editingId) ?? null;

  return (
    <Page width="default">
      <PageHeader
        title="If it goes wrong"
        description="What realistically goes wrong at a Sri Lankan wedding, and who deals with it. Agree the person now, not on the night."
        actions={<PrintLink />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Risks" value={live.length} icon={<ShieldAlert className="size-3.5" />} />
        <Stat
          label="Would ruin the day"
          value={worst.length}
          tone={worst.length > 0 ? 'bad' : 'good'}
          hint="score of 9 or more"
        />
        <Stat
          label="Prevention done"
          value={`${prevented} of ${live.length}`}
          tone={live.length > 0 && prevented === live.length ? 'good' : undefined}
        />
      </div>

      <Card>
        <CardBody className="pt-5">
          {risks.isLoading ? (
            <SkeletonRows rows={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<ShieldAlert className="size-5" />}
              title="No risks listed"
              description="Seeding the wedding brings in the workbook’s 24 contingencies."
            />
          ) : (
            <RiskTable
              rows={rows}
              onPrevented={(r) =>
                update.mutate({ id: r.id, patch: { prevention_done: !r.prevention_done } })
              }
              onOpen={canEdit ? (r) => setEditingId(r.id) : undefined}
            />
          )}
          <div className="pt-3">
            <InlineError error={update.error} />
          </div>
        </CardBody>
      </Card>

      {editing && (
        <RiskModal
          risk={editing}
          canEdit={canEdit}
          onSave={(patch) => update.mutate({ id: editing.id, patch })}
          onClose={() => setEditingId(null)}
        />
      )}
    </Page>
  );
}

function RiskModal({
  risk,
  canEdit,
  onSave,
  onClose,
}: {
  risk: RiskRow;
  canEdit: boolean;
  onSave: (patch: Parameters<ReturnType<typeof useUpdateRisk>['mutate']>[0]['patch']) => void;
  onClose: () => void;
}) {
  const stamp = `${risk.id}-${risk.updated_at}`;
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={risk.name}
      subtitle={risk.area ?? undefined}
      badge={<Badge tone={(risk.score ?? 0) >= 9 ? 'stop' : 'warn'}>score {risk.score}</Badge>}
    >
      <div className="space-y-4">
        <Section
          title="How bad"
          description="The score is likelihood times impact, so it moves when either does."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Likelihood">
              <Select
                disabled={!canEdit}
                value={String(risk.likelihood)}
                onChange={(e) => onSave({ likelihood: Number(e.target.value) })}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Impact">
              <Select
                disabled={!canEdit}
                value={String(risk.impact)}
                onChange={(e) => onSave({ impact: Number(e.target.value) })}
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Section>

        <Section title="The plan">
          <Field label="Prevent it by">
            <Textarea
              key={`p-${stamp}`}
              rows={2}
              disabled={!canEdit}
              defaultValue={risk.prevent_by ?? ''}
              onBlur={(e) => onSave({ prevent_by: e.target.value.trim() || null })}
            />
          </Field>
          <Field label="If it happens">
            <Textarea
              key={`i-${stamp}`}
              rows={2}
              disabled={!canEdit}
              defaultValue={risk.if_it_happens ?? ''}
              onBlur={(e) => onSave({ if_it_happens: e.target.value.trim() || null })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Whose job">
              <Input
                key={`o-${stamp}`}
                disabled={!canEdit}
                defaultValue={risk.owner ?? ''}
                onBlur={(e) => onSave({ owner: e.target.value.trim() || null })}
              />
            </Field>
            <Field label="Who to call">
              <Input
                key={`c-${stamp}`}
                disabled={!canEdit}
                defaultValue={risk.who_to_call ?? ''}
                onBlur={(e) => onSave({ who_to_call: e.target.value.trim() || null })}
              />
            </Field>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
