import { useEffect, useState } from 'react';
import { Award, Check, Star, Store, Trash2 } from 'lucide-react';
import type { VendorOptionInput } from './api';
import { formatMinorForInput, parseMajorToMinor } from '../../lib/units';
import type { VendorOptionRow } from '../../types/db';
import { Badge, Button, Field, Input, Modal, Section, cn } from '../../components/ui';

const MONEY: {
  key: 'quoted_minor' | 'negotiated_minor' | 'deposit_minor';
  label: string;
  hint: string;
}[] = [
  { key: 'quoted_minor', label: 'Quoted', hint: 'The first number they gave.' },
  { key: 'negotiated_minor', label: 'Negotiated', hint: 'What you talked them down to.' },
  { key: 'deposit_minor', label: 'Deposit', hint: 'What they want up front.' },
];

/**
 * The full profile of one shortlisted option.
 *
 * This was the card itself, rendered three to a row, which meant three money
 * inputs about sixty pixels wide. Saved explicitly, unlike the answer grid's
 * autosave: these are a handful of fields edited deliberately, not forty cells
 * filled in while on the phone to a vendor.
 */
export function VendorOptionModal({
  option,
  currency,
  decimals,
  canEdit,
  saving,
  removing,
  chosen,
  recorded,
  deciding,
  onSave,
  onRemove,
  onChoose,
  onRecord,
  onClose,
}: {
  option: VendorOptionRow;
  currency: string;
  decimals: number;
  canEdit: boolean;
  saving: boolean;
  removing: boolean;
  chosen: boolean;
  recorded: boolean;
  deciding: boolean;
  onSave: (patch: VendorOptionInput) => void;
  onRemove: () => void;
  onChoose: () => void;
  onRecord: () => void;
  onClose: () => void;
}) {
  const blank = () => ({
    label: option.label,
    vendor_name: option.vendor_name ?? '',
    contact_name: option.contact_name ?? '',
    phone: option.phone ?? '',
    package: option.package ?? '',
    quoted_minor: formatMinorForInput(option.quoted_minor, decimals),
    negotiated_minor: formatMinorForInput(option.negotiated_minor, decimals),
    deposit_minor: formatMinorForInput(option.deposit_minor, decimals),
  });

  const [form, setForm] = useState(blank);
  const [dirty, setDirty] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Re-sync when the row changes underneath, but never while there are unsaved
  // edits — that would silently discard what someone is typing.
  useEffect(() => {
    if (!dirty) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.id, option.updated_at]);

  function set(key: keyof ReturnType<typeof blank>, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setProblem(null);
  }

  function save() {
    const patch: VendorOptionInput = {
      label: form.label.trim() || option.label,
      vendor_name: form.vendor_name.trim() || null,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      package: form.package.trim() || null,
    };
    for (const { key, label } of MONEY) {
      try {
        patch[key] = parseMajorToMinor(form[key], decimals) ?? 0;
      } catch (e) {
        setProblem(`${label}: ${e instanceof Error ? e.message : 'not a number'}`);
        return;
      }
    }
    onSave(patch);
    setDirty(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={option.vendor_name || option.label}
      subtitle={option.vendor_name ? option.label : 'One of the options you are comparing'}
      badge={
        chosen ? (
          <Badge tone="accent">
            <Award className="size-3" />
            chosen
          </Badge>
        ) : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Who they are">
            <Field label="Label" hint="How this option is referred to in the comparison — A, B, C.">
              <Input
                value={form.label}
                disabled={!canEdit}
                onChange={(e) => set('label', e.target.value)}
              />
            </Field>
            <Field label="Vendor">
              <Input
                value={form.vendor_name}
                disabled={!canEdit}
                placeholder="Studio Lanka"
                onChange={(e) => set('vendor_name', e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact">
                <Input
                  value={form.contact_name}
                  disabled={!canEdit}
                  onChange={(e) => set('contact_name', e.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  disabled={!canEdit}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Package" hint="What is actually included for that price.">
              <Input
                value={form.package}
                disabled={!canEdit}
                onChange={(e) => set('package', e.target.value)}
              />
            </Field>
          </Section>

          <Section title="How they seemed">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={!canEdit}
                    aria-label={`Rate ${n} out of 5`}
                    onClick={() => onSave({ rating: option.rating === n ? null : n })}
                    className="focus-ring rounded p-0.5"
                  >
                    <Star
                      className={cn(
                        'size-5',
                        (option.rating ?? 0) >= n
                          ? 'fill-gold-400 text-gold-400'
                          : 'text-stone-300 hover:text-stone-400',
                      )}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onSave({ met_or_visited: !option.met_or_visited })}
                className={cn(
                  'focus-ring flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium',
                  option.met_or_visited
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
                )}
              >
                <Check className="size-3.5" />
                {option.met_or_visited ? 'Met or visited' : 'Not met yet'}
              </button>
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            title="What they cost"
            description="The negotiated price wins where there is one — the same precedence a budget line uses."
          >
            <div className="space-y-4">
              {MONEY.map(({ key, label, hint }) => (
                <Field key={key} label={`${label} (${currency})`} hint={hint}>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form[key]}
                    disabled={!canEdit}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </Section>

          {canEdit && (
            <Section title="Deciding">
              {/* Ticket 3.6: choosing is reversible, recording is the one click
                  that creates the vendor row. */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={chosen ? 'subtle' : 'secondary'}
                  disabled={deciding}
                  icon={<Award className="size-4" />}
                  onClick={onChoose}
                >
                  {chosen ? 'Chosen — click to undo' : 'Choose this option'}
                </Button>
                {chosen && !recorded && (
                  <Button loading={deciding} icon={<Store className="size-4" />} onClick={onRecord}>
                    Record as vendor
                  </Button>
                )}
                {recorded && (
                  <Badge tone="good">
                    <Store className="size-3" />
                    already in vendors
                  </Badge>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>

      {problem && <p className="mt-4 text-xs text-red-700">{problem}</p>}

      {canEdit && (
        /* Pinned to the bottom of the scrolling panel, as every other record
           modal in the app does it. */
        <div className="sticky bottom-0 -mx-6 -mb-5 mt-6 flex items-center justify-between gap-3 border-t border-stone-100 bg-white/95 px-6 py-3 backdrop-blur">
          {confirming ? (
            <span className="flex items-center gap-2">
              <Button variant="danger" loading={removing} onClick={onRemove}>
                Remove this option
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
              {/* Said at the point of deciding, not as a note on the page
                  behind: the answers are the expensive part to lose. */}
              <span className="text-xs text-stone-500">Its answers in the comparison go too.</span>
            </span>
          ) : (
            <Button
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirming(true)}
            >
              Remove
            </Button>
          )}
          <Button variant={dirty ? 'primary' : 'secondary'} loading={saving} onClick={save}>
            {dirty ? 'Save changes' : 'Saved'}
          </Button>
        </div>
      )}
    </Modal>
  );
}
