import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { GuestInput, GuestRow, RsvpStatus } from './api';
import type { WeddingSide } from '../../types/db';
import { Button, Field, Input, Section, Select, Textarea } from '../../components/ui';

const STATUSES: { value: RsvpStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Coming' },
  { value: 'declined', label: 'Not coming' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no_response', label: 'No reply' },
];

export function GuestDetail({
  guest,
  canEdit,
  saving,
  onSave,
  onDelete,
}: {
  guest: GuestRow;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: GuestInput) => void;
  onDelete: () => void;
}) {
  const build = () => ({
    household_name: guest.household_name,
    relationship: guest.relationship ?? '',
    category: guest.category ?? '',
    side: (guest.side ?? '') as WeddingSide | '',
    adults_invited: String(guest.adults_invited),
    children_invited: String(guest.children_invited),
    rsvp_status: guest.rsvp_status,
    adults_attending: String(guest.adults_attending),
    children_attending: String(guest.children_attending),
    phone: guest.phone ?? '',
    email: guest.email ?? '',
    city: guest.city ?? '',
    dietary: guest.dietary ?? '',
    transport_type: guest.transport_type ?? '',
    notes: guest.notes ?? '',
  });

  const [form, setForm] = useState(build);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setForm(build());
    setConfirming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guest.id, guest.updated_at]);

  function set(key: keyof ReturnType<typeof build>, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Counts are small non-negative integers; anything else becomes zero. */
  const count = (v: string) => Math.max(0, Math.trunc(Number(v) || 0));

  function save() {
    onSave({
      household_name: form.household_name.trim() || guest.household_name,
      relationship: form.relationship.trim() || null,
      category: form.category.trim() || null,
      side: form.side === '' ? null : form.side,
      adults_invited: count(form.adults_invited),
      children_invited: count(form.children_invited),
      rsvp_status: form.rsvp_status,
      adults_attending: count(form.adults_attending),
      children_attending: count(form.children_attending),
      // Stamp the reply date when there is an answer, clear it when there is not.
      rsvp_on:
        form.rsvp_status === 'pending' || form.rsvp_status === 'no_response'
          ? null
          : (guest.rsvp_on ?? new Date().toISOString().slice(0, 10)),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      dietary: form.dietary.trim() || null,
      transport_type: form.transport_type.trim() || null,
      notes: form.notes.trim() || null,
    });
  }

  const overAttending =
    count(form.adults_attending) + count(form.children_attending) >
    count(form.adults_invited) + count(form.children_invited);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="The household">
            <Field label="Name">
              <Input
                value={form.household_name}
                disabled={!canEdit}
                onChange={(e) => set('household_name', e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Relationship">
                <Input
                  value={form.relationship}
                  disabled={!canEdit}
                  onChange={(e) => set('relationship', e.target.value)}
                />
              </Field>
              <Field label="Category">
                <Input
                  value={form.category}
                  disabled={!canEdit}
                  onChange={(e) => set('category', e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Side"
              hint="Family members only see their own side. Shared or unset is visible to both."
            >
              <Select
                value={form.side}
                disabled={!canEdit}
                onChange={(e) => set('side', e.target.value)}
              >
                <option value="">Not decided</option>
                <option value="bride">Bride</option>
                <option value="groom">Groom</option>
                <option value="both">Shared</option>
              </Select>
            </Field>
          </Section>

          <Section title="Contact">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  value={form.phone}
                  disabled={!canEdit}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
              <Field label="Town">
                <Input
                  value={form.city}
                  disabled={!canEdit}
                  onChange={(e) => set('city', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                disabled={!canEdit}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Invited" description="Adults and children, counted per household.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Adults invited">
                <Input
                  inputMode="numeric"
                  value={form.adults_invited}
                  disabled={!canEdit}
                  onChange={(e) => set('adults_invited', e.target.value)}
                />
              </Field>
              <Field label="Children invited">
                <Input
                  inputMode="numeric"
                  value={form.children_invited}
                  disabled={!canEdit}
                  onChange={(e) => set('children_invited', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Reply">
            <Field label="RSVP">
              <Select
                value={form.rsvp_status}
                disabled={!canEdit}
                onChange={(e) => set('rsvp_status', e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Adults attending">
                <Input
                  inputMode="numeric"
                  value={form.adults_attending}
                  disabled={!canEdit}
                  onChange={(e) => set('adults_attending', e.target.value)}
                />
              </Field>
              <Field label="Children attending">
                <Input
                  inputMode="numeric"
                  value={form.children_attending}
                  disabled={!canEdit}
                  onChange={(e) => set('children_attending', e.target.value)}
                />
              </Field>
            </div>
            {/* A warning rather than a block: the couple may knowingly seat an
                extra guest. The public RSVP form in 4.5 refuses it outright. */}
            {overAttending && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                More people are attending than were invited. Allowed here, but the household
                cannot do that through the public RSVP link.
              </p>
            )}
            <Field label="Dietary needs">
              <Input
                value={form.dietary}
                disabled={!canEdit}
                onChange={(e) => set('dietary', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              disabled={!canEdit}
              onChange={(e) => set('notes', e.target.value)}
            />
          </Section>
        </div>
      </div>

      {canEdit && (
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-between gap-3 border-t border-stone-100 bg-white/95 px-6 py-3 backdrop-blur">
          <Button loading={saving} onClick={save}>
            Save household
          </Button>
          {confirming ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Remove this household?</span>
              <Button size="sm" variant="danger" onClick={onDelete}>
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirming(true)}
            >
              Remove
            </Button>
          )}
        </div>
      )}
    </>
  );
}
