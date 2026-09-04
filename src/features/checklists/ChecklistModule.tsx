import { useMemo, useState } from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronDown, PackagePlus, Plus, Search, Trash2 } from 'lucide-react';
import {
  useChecklist,
  useCreateChecklistRow,
  useDeleteChecklistRow,
  useUpdateChecklistRow,
} from './api';
import { findModule, type ChecklistRow, type FieldDef, type ModuleConfig } from './config';
import { CateringSummary, CeremonySummary, JewellerySummary } from './summaries';
import { ApplicabilitySwitch } from '../budget/ApplicabilitySwitch';
import { useVendors } from '../vendors/vendorsApi';
import { useOwnerOptions } from '../weddings/lookups';
import { pendingTotal, useSeedWedding, useTemplatePending } from '../weddings/api';

import {
  currencyDecimals,
  formatMoney,
  formatMinorForInput,
  parseMajorToMinor,
} from '../../lib/units';
import type { Applicability, MyWedding, TaskStatus } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
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
  cn,
} from '../../components/ui';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Done' },
  { value: 'cancelled', label: 'Dropped' },
];

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'good' | 'warn' | 'accent'> = {
  not_started: 'neutral',
  in_progress: 'accent',
  waiting: 'warn',
  completed: 'good',
  cancelled: 'neutral',
};

/**
 * Ticket 6.1. One component, configured seventeen times.
 *
 * Plan §2 counted eighteen sheets that share a shape and said to build this
 * once. The alternative — a page per module — would have meant seventeen
 * copies of the same filtering, sectioning, applicability switch and record
 * modal, and the eighteenth would have been subtly different from the rest.
 *
 * What is NOT config-driven: the shared columns. Name, applicability, owner,
 * vendor, cost, status and notes are rendered by this component directly,
 * because they mean the same thing in every module and should look identical.
 * Config only describes what makes a module different.
 */
export function ChecklistModulePage() {
  const { slug } = useParams<{ slug: string }>();
  const config = findModule(slug);

  // A bad slug is a wrong URL, not an error state. Sending them to the
  // dashboard is more use than a page saying "not found".
  if (!config) return <Navigate to=".." replace />;

  // Keyed on the slug so every piece of state — search, filters, which record
  // is open — resets when moving between modules rather than carrying over.
  return <ModuleBody key={config.slug} config={config} />;
}

function ModuleBody({ config }: { config: ModuleConfig }) {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);

  const rowsQuery = useChecklist(wedding.id, config);
  const create = useCreateChecklistRow(wedding.id, config);
  const update = useUpdateChecklistRow(wedding.id, config);
  const remove = useDeleteChecklistRow(wedding.id, config);
  const vendors = useVendors(wedding.id);
  const owners = useOwnerOptions(wedding.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all' | 'open'>('all');
  const [hideDropped, setHideDropped] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => rowsQuery.data ?? [], [rowsQuery.data]);

  // Risk R4: content added to the template after this wedding was created has
  // never reached it. Offered here as well as on Setup, because this is where
  // somebody actually notices.
  const pending = useTemplatePending(wedding.id);
  const seed = useSeedWedding();
  const pendingCount = pendingTotal(pending.data);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (hideDropped && r.applicability === 'not_applicable') return false;
      if (statusFilter === 'open' && (r.status === 'completed' || r.status === 'cancelled')) {
        return false;
      }
      if (statusFilter !== 'all' && statusFilter !== 'open' && r.status !== statusFilter) {
        return false;
      }
      if (needle) {
        const hay = [r.name, r.owner, r.notes, ...config.fields.map((f) => r[f.key])]
          .filter((v) => typeof v === 'string')
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, search, statusFilter, hideDropped, config.fields]);

  const sections = useMemo(() => {
    if (!config.groupBy) {
      return visible.length === 0 ? [] : [{ key: 'all', label: '', rows: visible }];
    }
    const buckets = new Map<string, ChecklistRow[]>();
    const leftovers: ChecklistRow[] = [];
    for (const r of visible) {
      const raw = r[config.groupBy];
      const key = typeof raw === 'string' ? raw.trim() : '';
      if (!key) {
        leftovers.push(r);
        continue;
      }
      const list = buckets.get(key);
      if (list) list.push(r);
      else buckets.set(key, [r]);
    }
    const out = [...buckets.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ key, label: key, rows: buckets.get(key)! }));
    if (leftovers.length > 0) {
      out.push({ key: 'ungrouped', label: 'Everything else', rows: leftovers });
    }
    return out;
  }, [visible, config.groupBy]);

  const counts = useMemo(() => {
    const live = rows.filter((r) => r.applicability !== 'not_applicable');
    return {
      total: live.length,
      done: live.filter((r) => r.status === 'completed').length,
      dropped: rows.length - live.length,
      cost: live.reduce((sum, r) => sum + (r.cost_minor ?? 0), 0),
    };
  }, [rows]);

  const editing = rows.find((r) => r.id === editingId) ?? null;
  const listFields = config.fields.filter((f) => f.inList);

  if (rowsQuery.isError) {
    return (
      <Page width="wide">
        <PageHeader title={config.title} />
        <ErrorState error={rowsQuery.error} onRetry={() => void rowsQuery.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          canEdit && (
            <Button
              icon={<Plus className="size-4" />}
              loading={create.isPending}
              onClick={() =>
                create.mutate(
                  { name: `New ${config.nameLabel.toLowerCase()}`, sort_order: rows.length },
                  { onSuccess: (row) => setEditingId(row.id) },
                )
              }
            >
              Add {config.nameLabel.toLowerCase()}
            </Button>
          )
        }
      />

      {/* The three modules that answer a question the list itself cannot. */}
      {config.summary === 'jewellery' && (
        <JewellerySummary weddingId={wedding.id} currency={currency} decimals={decimals} />
      )}
      {config.summary === 'ceremony' && <CeremonySummary weddingId={wedding.id} />}
      {config.summary === 'catering' && <CateringSummary weddingId={wedding.id} />}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`${config.nameLabel}s`} value={counts.total} hint="that still apply" />
        <Stat
          label="Done"
          value={`${counts.done} of ${counts.total}`}
          tone={counts.total > 0 && counts.done === counts.total ? 'good' : undefined}
        />
        <Stat label="Switched off" value={counts.dropped} hint="kept, not deleted" />
        {config.showCost && (
          <Stat label={`Cost (${currency})`} value={formatMoney(counts.cost, decimals)} />
        )}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" />
            <Input
              className="pl-9"
              placeholder={`Search ${config.title.toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-40"
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all' | 'open')}
          >
            <option value="all">Any status</option>
            <option value="open">Still to do</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" onClick={() => setHideDropped((v) => !v)}>
            {hideDropped ? 'Show switched off' : 'Hide switched off'}
          </Button>
        </div>

        <CardBody className="px-0 pb-0">
          {rowsQuery.isLoading ? (
            <div className="px-4 py-2">
              <SkeletonRows rows={8} />
            </div>
          ) : sections.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState
                title={
                  rows.length === 0
                    ? `No ${config.nameLabel.toLowerCase()}s yet`
                    : 'Nothing matches'
                }
                description={
                  rows.length === 0
                    ? pendingCount > 0
                      ? `The template has a list ready for this — ${pendingCount} items across the modules, waiting to be brought in.`
                      : canEdit
                        ? 'Add the first one, or bring in the template list.'
                        : 'Nothing here yet.'
                    : 'Widen the status filter or clear the search.'
                }
                /* The old copy said "seed the wedding to bring in the
                   workbook's list" and offered no way to do it, which is the
                   dead end that produced this report. */
                action={
                  rows.length === 0 && canEdit ? (
                    <Button
                      icon={<PackagePlus className="size-4" />}
                      loading={seed.isPending}
                      onClick={() =>
                        seed.mutate(wedding.id, { onSuccess: () => void pending.refetch() })
                      }
                    >
                      {pendingCount > 0
                        ? `Bring in ${pendingCount} template items`
                        : 'Bring in the template list'}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div>
              {sections.map((sec) => {
                const isCollapsed = collapsed.has(sec.key);
                const done = sec.rows.filter((r) => r.status === 'completed').length;
                return (
                  <section key={sec.key}>
                    {sec.label && (
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(sec.key)) next.delete(sec.key);
                            else next.add(sec.key);
                            return next;
                          })
                        }
                        className="focus-ring sticky top-0 z-10 flex w-full items-center gap-2 border-y border-stone-100 bg-stone-50/95 px-4 py-2 text-left backdrop-blur"
                      >
                        <ChevronDown
                          className={cn(
                            'size-3.5 shrink-0 text-stone-500 transition-transform',
                            isCollapsed && '-rotate-90',
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-stone-600 uppercase">
                          {sec.label}
                        </span>
                        <span className="tabular shrink-0 text-[11px] text-stone-500">
                          {done} of {sec.rows.length} done
                        </span>
                      </button>
                    )}
                    {!isCollapsed && (
                      <ul className="divide-y divide-stone-100">
                        {sec.rows.map((row) => (
                          <ChecklistRowItem
                            key={row.id}
                            row={row}
                            config={config}
                            listFields={listFields}
                            decimals={decimals}
                            canEdit={canEdit}
                            vendorName={
                              vendors.data?.find((v) => v.id === row.vendor_id)?.name ?? null
                            }
                            onOpen={() => setEditingId(row.id)}
                            onApplicability={(applicability) =>
                              update.mutate({ id: row.id, patch: { applicability } })
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          <div className="px-4 py-3">
            <InlineError error={create.error ?? update.error ?? remove.error} />
          </div>
        </CardBody>
      </Card>

      {editing && (
        <RecordModal
          row={editing}
          config={config}
          currency={currency}
          decimals={decimals}
          canEdit={canEdit}
          saving={update.isPending}
          removing={remove.isPending}
          vendors={(vendors.data ?? []).map((v) => ({ id: v.id, name: v.name }))}
          owners={owners.data ?? []}
          onSave={(patch) => update.mutate({ id: editing.id, patch })}
          onRemove={() => remove.mutate(editing.id, { onSuccess: () => setEditingId(null) })}
          onClose={() => setEditingId(null)}
        />
      )}
    </Page>
  );
}

/** How a value reads in a list row, by kind. */
function formatValue(field: FieldDef, value: unknown, decimals: number): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (field.kind === 'money') return formatMoney(Number(value), decimals);
  if (field.kind === 'boolean') return value ? field.label.toLowerCase() : null;
  if (field.kind === 'time') return String(value).slice(0, 5);
  return String(value);
}

function ChecklistRowItem({
  row,
  config,
  listFields,
  decimals,
  canEdit,
  vendorName,
  onOpen,
  onApplicability,
}: {
  row: ChecklistRow;
  config: ModuleConfig;
  listFields: FieldDef[];
  decimals: number;
  canEdit: boolean;
  vendorName: string | null;
  onOpen: () => void;
  onApplicability: (next: Applicability) => void;
}) {
  const muted = row.applicability === 'not_applicable';

  return (
    <li
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/70"
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            muted ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-900',
          )}
        >
          {row.name}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 truncate text-xs text-stone-500">
          {listFields.map((f) => {
            const text = formatValue(f, row[f.key], decimals);
            return text ? <span key={f.key}>{text}</span> : null;
          })}
          {vendorName && <span>· {vendorName}</span>}
          {row.owner && <span>· {row.owner}</span>}
        </p>
      </div>

      {config.showCost && (row.cost_minor ?? 0) > 0 && (
        <p className="tabular shrink-0 text-sm text-stone-700">
          {formatMoney(row.cost_minor, decimals)}
        </p>
      )}

      <Badge tone={STATUS_TONE[row.status]}>
        {STATUSES.find((s) => s.value === row.status)?.label ?? row.status}
      </Badge>

      {/* Stops the row's own click, so switching something off does not also
          open it. */}
      <div onClick={(e) => e.stopPropagation()}>
        <ApplicabilitySwitch
          value={row.applicability}
          disabled={!canEdit}
          onChange={onApplicability}
        />
      </div>
    </li>
  );
}

function RecordModal({
  row,
  config,
  currency,
  decimals,
  canEdit,
  saving,
  removing,
  vendors,
  owners,
  onSave,
  onRemove,
  onClose,
}: {
  row: ChecklistRow;
  config: ModuleConfig;
  currency: string;
  decimals: number;
  canEdit: boolean;
  saving: boolean;
  removing: boolean;
  vendors: { id: string; name: string }[];
  owners: string[];
  onSave: (patch: Record<string, unknown>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Committed on blur or change, one field at a time. A Save button over
   * seventeen different field sets would need a form schema per module, which
   * is the thing this design exists to avoid.
   */
  function commit(key: string, kind: FieldDef['kind'], raw: string | boolean) {
    setProblem(null);

    if (kind === 'boolean') {
      if (raw !== row[key]) onSave({ [key]: raw });
      return;
    }

    const text = String(raw).trim();

    if (kind === 'money') {
      try {
        const minor = parseMajorToMinor(text, decimals) ?? 0;
        if (minor !== Number(row[key] ?? 0)) onSave({ [key]: minor });
      } catch (e) {
        setProblem(e instanceof Error ? e.message : 'Not an amount');
      }
      return;
    }

    if (kind === 'number') {
      if (text === '') {
        if (row[key] !== null) onSave({ [key]: null });
        return;
      }
      if (!/^\d+$/.test(text)) {
        setProblem('That needs to be a whole number');
        return;
      }
      if (Number(text) !== Number(row[key])) onSave({ [key]: Number(text) });
      return;
    }

    const next = text === '' ? null : text;
    if (next !== ((row[key] as string | null) ?? null)) onSave({ [key]: next });
  }

  function renderField(field: FieldDef) {
    const value = row[field.key];
    const stamp = `${row.id}-${row.updated_at}`;

    if (field.kind === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={Boolean(value)}
            onChange={(e) => commit(field.key, 'boolean', e.target.checked)}
          />
          {field.label}
        </label>
      );
    }

    if (field.kind === 'select' || field.kind === 'owner') {
      const options = field.kind === 'owner' ? owners : (field.options ?? []);
      const current = typeof value === 'string' ? value : '';
      return (
        <Field key={field.key} label={field.label} hint={field.hint}>
          <Select
            disabled={!canEdit}
            value={current}
            onChange={(e) => commit(field.key, 'select', e.target.value)}
          >
            <option value="">Not set</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {/* A value the list no longer offers still shows as itself. */}
            {current && !options.includes(current) && <option value={current}>{current}</option>}
          </Select>
        </Field>
      );
    }

    if (field.kind === 'textarea') {
      return (
        <Field key={field.key} label={field.label} hint={field.hint}>
          <Textarea
            key={`${field.key}-${stamp}`}
            rows={3}
            disabled={!canEdit}
            defaultValue={typeof value === 'string' ? value : ''}
            onBlur={(e) => commit(field.key, 'textarea', e.target.value)}
          />
        </Field>
      );
    }

    const type = field.kind === 'date' ? 'date' : field.kind === 'time' ? 'time' : 'text';
    const defaultValue =
      field.kind === 'money'
        ? formatMinorForInput(Number(value ?? 0), decimals)
        : value === null || value === undefined
          ? ''
          : String(value);

    return (
      <Field
        key={field.key}
        label={field.kind === 'money' ? `${field.label} (${currency})` : field.label}
        hint={field.hint}
      >
        <Input
          key={`${field.key}-${stamp}`}
          type={type}
          inputMode={field.kind === 'money' ? 'decimal' : undefined}
          placeholder={field.kind === 'money' ? '0.00' : undefined}
          disabled={!canEdit}
          defaultValue={defaultValue}
          onBlur={(e) => commit(field.key, field.kind, e.target.value)}
        />
      </Field>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={row.name}
      subtitle={config.title}
      badge={
        row.applicability === 'not_applicable' ? (
          <Badge tone="neutral">switched off</Badge>
        ) : (
          <Badge tone={STATUS_TONE[row.status]}>
            {STATUSES.find((s) => s.value === row.status)?.label}
          </Badge>
        )
      }
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {/* The shared shape, rendered the same way in every module. */}
          <Section title="The basics">
            <Field label={config.nameLabel}>
              <Input
                key={`name-${row.id}-${row.updated_at}`}
                disabled={!canEdit}
                defaultValue={row.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== row.name) onSave({ name: next });
                }}
              />
            </Field>

            <Field label="Does this apply?">
              <div className="pt-1">
                <ApplicabilitySwitch
                  value={row.applicability}
                  disabled={!canEdit}
                  onChange={(applicability) => onSave({ applicability })}
                />
              </div>
            </Field>

            <Field label="Status">
              <Select
                disabled={!canEdit}
                value={row.status}
                onChange={(e) => onSave({ status: e.target.value as TaskStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Who is looking after it">
              <Select
                disabled={!canEdit}
                value={row.owner ?? ''}
                onChange={(e) => onSave({ owner: e.target.value || null })}
              >
                <option value="">Nobody yet</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
                {row.owner && !owners.includes(row.owner) && (
                  <option value={row.owner}>{row.owner}</option>
                )}
              </Select>
            </Field>

            {config.showVendor && (
              <Field label="Vendor" hint="Who supplies it, if anyone.">
                <Select
                  disabled={!canEdit}
                  value={row.vendor_id ?? ''}
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
            )}

            {config.showCost && (
              <Field label={`Cost (${currency})`}>
                <Input
                  key={`cost-${row.id}-${row.updated_at}`}
                  inputMode="decimal"
                  placeholder="0.00"
                  disabled={!canEdit}
                  defaultValue={formatMinorForInput(row.cost_minor, decimals)}
                  onBlur={(e) => commit('cost_minor', 'money', e.target.value)}
                />
              </Field>
            )}
          </Section>

          <Section title="Notes">
            <Textarea
              key={`notes-${row.id}-${row.updated_at}`}
              rows={3}
              disabled={!canEdit}
              defaultValue={row.notes ?? ''}
              onBlur={(e) => commit('notes', 'textarea', e.target.value)}
            />
          </Section>
        </div>

        <div className="space-y-4">
          <Section title={`About this ${config.nameLabel.toLowerCase()}`}>
            <div className="space-y-4">{config.fields.map(renderField)}</div>
          </Section>

          {canEdit && (
            <Section title="Remove">
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="danger" loading={removing} onClick={onRemove}>
                    Delete it
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirming(true)}
                  >
                    Delete
                  </Button>
                  <p className="text-xs text-stone-500">
                    If you are simply not having it, switch it off above instead. That keeps the row
                    and stops it counting.
                  </p>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>

      {problem && <p className="mt-4 text-xs text-red-700">{problem}</p>}
      {saving && <p className="mt-4 text-xs text-stone-500">Saving…</p>}
    </Modal>
  );
}
