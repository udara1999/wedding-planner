import { useEffect, useState } from 'react';
import { FileText, Paperclip, Trash2 } from 'lucide-react';
import {
  signedContractUrl,
  useDeleteAttachment,
  useUploadAttachment,
  useVendorAttachments,
  type AttachmentKind,
  type VendorInput,
} from './vendorsApi';
import { VendorBudgetLinks } from './VendorBudgetLinks';
import { formatMinorForInput, parseMajorToMinor } from '../../lib/units';
import type { VendorRow } from '../../types/db';
import {
  Badge,
  Button,
  Field,
  InlineError,
  Input,
  Section,
  Select,
  Skeleton,
  Textarea,
} from '../../components/ui';

const KINDS: AttachmentKind[] = ['quote', 'contract', 'invoice', 'other'];

const MONEY = [
  ['quoted_minor', 'Quoted'],
  ['negotiated_minor', 'Negotiated'],
  ['deposit_paid_minor', 'Deposit paid'],
] as const;

export function VendorDetail({
  vendor,
  weddingId,
  currency,
  decimals,
  canEdit,
  saving,
  onSave,
  onDelete,
}: {
  vendor: VendorRow;
  weddingId: string;
  currency: string;
  decimals: number;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: VendorInput) => void;
  onDelete: () => void;
}) {
  const build = () => ({
    name: vendor.name,
    category: vendor.category,
    contact_name: vendor.contact_name ?? '',
    phone: vendor.phone ?? '',
    email: vendor.email ?? '',
    package: vendor.package ?? '',
    quoted_minor: formatMinorForInput(vendor.quoted_minor, decimals),
    negotiated_minor: formatMinorForInput(vendor.negotiated_minor, decimals),
    deposit_paid_minor: formatMinorForInput(vendor.deposit_paid_minor, decimals),
    arrival_time: vendor.arrival_time ?? '',
    finish_time: vendor.finish_time ?? '',
    key_deliverables: vendor.key_deliverables ?? '',
    notes: vendor.notes ?? '',
  });

  const [form, setForm] = useState(build);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setForm(build());
    setConfirming(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendor.id, vendor.updated_at]);

  function set(key: keyof ReturnType<typeof build>, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setProblem(null);
  }

  function save() {
    const patch: VendorInput = {
      name: form.name.trim() || vendor.name,
      category: form.category.trim() || vendor.category,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      package: form.package.trim() || null,
      arrival_time: form.arrival_time || null,
      finish_time: form.finish_time || null,
      key_deliverables: form.key_deliverables.trim() || null,
      notes: form.notes.trim() || null,
    };
    for (const [key, label] of MONEY) {
      try {
        patch[key] = parseMajorToMinor(form[key], decimals) ?? 0;
      } catch (e) {
        setProblem(`${label}: ${e instanceof Error ? e.message : 'not a number'}`);
        return;
      }
    }
    onSave(patch);
  }

  return (
    <>
      {/* Two columns: what the vendor IS on the left, what they cost and what
          they are attached to on the right. In one column these ran together
          into a single long strip of inputs. */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Section title="Who they are">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
              <Field label="Category">
                <Input
                  value={form.category}
                  disabled={!canEdit}
                  onChange={(e) => set('category', e.target.value)}
                />
              </Field>
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
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                disabled={!canEdit}
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>
            <Field label="Package / inclusions">
              <Textarea
                rows={3}
                value={form.package}
                disabled={!canEdit}
                onChange={(e) => set('package', e.target.value)}
              />
            </Field>
          </Section>

          <Section
            title="On the day"
            description="A coordinator sees these and never the money — they read the vendor through v_vendors_ops."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Arrival time">
                <Input
                  type="time"
                  value={form.arrival_time}
                  disabled={!canEdit}
                  onChange={(e) => set('arrival_time', e.target.value)}
                />
              </Field>
              <Field label="Finish time">
                <Input
                  type="time"
                  value={form.finish_time}
                  disabled={!canEdit}
                  onChange={(e) => set('finish_time', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Key deliverables">
              <Textarea
                rows={2}
                value={form.key_deliverables}
                disabled={!canEdit}
                onChange={(e) => set('key_deliverables', e.target.value)}
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
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={vendor.contract_signed}
                disabled={!canEdit}
                onChange={(e) => onSave({ contract_signed: e.target.checked })}
              />
              Contract signed
            </label>
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="What they quoted"
            description="Their own figure for the whole package. What it actually costs comes from the budget lines below."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {MONEY.map(([key, label]) => (
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
          </Section>

          <VendorBudgetLinks
            weddingId={weddingId}
            vendorId={vendor.id}
            currency={currency}
            decimals={decimals}
            canEdit={canEdit}
          />

          <Attachments vendorId={vendor.id} weddingId={weddingId} canEdit={canEdit} />
        </div>
      </div>

      {problem && <p className="mt-4 text-xs text-red-700">{problem}</p>}

      {canEdit && (
        /* Pinned to the bottom of the scrolling panel: with this much content,
           a Save button that scrolls out of reach is a Save button nobody
           finds. */
        <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-between gap-3 border-t border-stone-100 bg-white/95 px-6 py-3 backdrop-blur">
          <Button loading={saving} onClick={save}>
            Save vendor
          </Button>
          {confirming ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Delete this vendor?</span>
              <Button size="sm" variant="danger" onClick={onDelete}>
                Delete
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
              Delete
            </Button>
          )}
        </div>
      )}
    </>
  );
}

/** Ticket 3.8. Quotes and contracts, stored privately and opened via a short link. */
function Attachments({
  vendorId,
  weddingId,
  canEdit,
}: {
  vendorId: string;
  weddingId: string;
  canEdit: boolean;
}) {
  const list = useVendorAttachments(vendorId);
  const upload = useUploadAttachment(weddingId, vendorId);
  const remove = useDeleteAttachment(vendorId);
  const [kind, setKind] = useState<AttachmentKind>('contract');
  const [problem, setProblem] = useState<string | null>(null);

  async function open(path: string) {
    setProblem(null);
    try {
      window.open(await signedContractUrl(path), '_blank', 'noopener');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Could not open that file');
    }
  }

  return (
    <div className="border-t border-stone-100 pt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-stone-700">
        <Paperclip className="size-3.5" />
        Quotes and contracts
      </p>

      {list.isLoading ? (
        <Skeleton className="h-12 rounded-lg" />
      ) : (list.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 px-3 py-2.5 text-xs text-stone-500">
          Nothing attached yet.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200">
          {(list.data ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-2 px-3 py-2">
              <FileText className="size-4 shrink-0 text-stone-400" />
              <button
                type="button"
                onClick={() => void open(a.path)}
                className="focus-ring min-w-0 flex-1 truncate rounded text-left text-xs text-stone-800 hover:text-wine-800"
              >
                {a.file_name}
              </button>
              <Badge tone="neutral">{a.kind}</Badge>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(a)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-2 flex items-center gap-2">
          <Select
            className="w-32"
            value={kind}
            onChange={(e) => setKind(e.target.value as AttachmentKind)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <input
            type="file"
            accept="image/*,application/pdf"
            disabled={upload.isPending}
            className="block w-full text-xs text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:text-stone-700 hover:file:bg-stone-200"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate({ file, kind });
            }}
          />
        </div>
      )}

      {upload.isPending && <p className="mt-1 text-xs text-stone-500">Uploading…</p>}
      <InlineError error={upload.error ?? remove.error} />
      {problem && <p className="mt-1 text-xs text-red-700">{problem}</p>}
    </div>
  );
}
