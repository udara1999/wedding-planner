import { useEffect, useState } from 'react';
import { Award, Check, Star, Store, Trash2 } from 'lucide-react';
import type { VendorOptionInput } from './api';
import { formatMinorForInput, parseMajorToMinor } from '../../lib/units';
import type { VendorOptionRow } from '../../types/db';
import { Badge, Button, Card, CardBody, Field, Input, cn } from '../../components/ui';

const MONEY: { key: 'quoted_minor' | 'negotiated_minor' | 'deposit_minor'; label: string }[] = [
  { key: 'quoted_minor', label: 'Quoted' },
  { key: 'negotiated_minor', label: 'Negotiated' },
  { key: 'deposit_minor', label: 'Deposit' },
];

/**
 * One shortlisted option: the profile half of the comparison (05a's rows above
 * "QUESTIONS TO CONFIRM BEFORE YOU BOOK"). The questions themselves are rows
 * across these same options in the grid below.
 *
 * Saved explicitly, unlike the answer grid's autosave. These are a handful of
 * fields edited deliberately, not forty cells filled in while on the phone to a
 * vendor, and an explicit Save makes the money fields feel deliberate too.
 */
export function VendorOptionCard({
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
    <Card
      className={cn(
        'flex flex-col',
        dirty && 'border-wine-200',
        chosen && 'border-wine-400 ring-1 ring-wine-200',
      )}
    >
      <CardBody className="flex-1 space-y-3 pt-4">
        {chosen && (
          <div className="-mt-1 flex items-center gap-1.5">
            <Badge tone="accent">
              <Award className="size-3" />
              chosen
            </Badge>
            {recorded && (
              <Badge tone="good">
                <Store className="size-3" />
                in vendors
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            value={form.label}
            disabled={!canEdit}
            onChange={(e) => set('label', e.target.value)}
            className="focus-ring min-w-0 flex-1 rounded-md bg-transparent text-sm font-semibold tracking-tight text-stone-900 outline-none"
          />
          <button
            type="button"
            disabled={!canEdit}
            title={option.met_or_visited ? 'Met or visited' : 'Not met yet'}
            onClick={() => onSave({ met_or_visited: !option.met_or_visited })}
            className={cn(
              'focus-ring flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
              option.met_or_visited
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200',
            )}
          >
            <Check className="size-3" />
            met
          </button>
        </div>

        <Field label="Vendor">
          <Input
            value={form.vendor_name}
            disabled={!canEdit}
            placeholder="Studio Lanka"
            onChange={(e) => set('vendor_name', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
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

        <Field label="Package">
          <Input
            value={form.package}
            disabled={!canEdit}
            onChange={(e) => set('package', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          {MONEY.map(({ key, label }) => (
            <Field key={key} label={`${label} (${currency})`}>
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
                  'size-4',
                  (option.rating ?? 0) >= n
                    ? 'fill-gold-400 text-gold-400'
                    : 'text-stone-300 hover:text-stone-400',
                )}
              />
            </button>
          ))}
        </div>

        {problem && <p className="text-xs text-red-700">{problem}</p>}
      </CardBody>

      {canEdit && (
        <div className="space-y-2 border-t border-stone-100 px-5 py-2.5">
          {/* Ticket 3.6: choosing is reversible, recording is the one click
              that creates the vendor row. */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={chosen ? 'subtle' : 'secondary'}
              className="flex-1"
              disabled={deciding}
              icon={<Award className="size-3.5" />}
              onClick={onChoose}
            >
              {chosen ? 'Chosen' : 'Choose'}
            </Button>
            {chosen && !recorded && (
              <Button
                size="sm"
                className="flex-1"
                loading={deciding}
                icon={<Store className="size-3.5" />}
                onClick={onRecord}
              >
                Record as vendor
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
          <Button size="sm" variant={dirty ? 'primary' : 'secondary'} loading={saving} onClick={save}>
            {dirty ? 'Save' : 'Saved'}
          </Button>
          {confirming ? (
            <span className="flex items-center gap-1.5">
              <Button size="sm" variant="danger" loading={removing} onClick={onRemove}>
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
              icon={<Trash2 className="size-3.5" />}
              onClick={() => setConfirming(true)}
            >
              Remove
            </Button>
          )}
          </div>
        </div>
      )}
    </Card>
  );
}
