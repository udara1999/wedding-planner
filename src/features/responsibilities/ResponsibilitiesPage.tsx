import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Phone, Plus, UserX, Users } from 'lucide-react';
import {
  useCreateResponsibility,
  useDeleteResponsibility,
  useResponsibilities,
  useUpdateResponsibility,
  type ResponsibilityRow,
} from './api';
import { useOwnerOptions } from '../weddings/lookups';
import type { MyWedding } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

/** A role is filled if somebody's name is against it. */
function isNamed(r: ResponsibilityRow): boolean {
  return Boolean(r.person_name?.trim());
}

/**
 * Ticket 5.5. The workbook's RACI matrix, and the warning it exists for.
 *
 * The sheet says why in its own header: "Fill in real names in the 'Person'
 * column so nobody assumes someone else has it." The four RACI columns hold
 * roles — Couple, Best Man, Ushers, Gift table attendant — and a role is not a
 * person. "Ushers" is responsible for seating guests right up until the
 * morning nobody knows which ushers, and then it is nobody.
 *
 * So this screen is built around one question: which of these has a name
 * against it. Unnamed activities are counted at the top, flagged in the row,
 * and can be filtered down to on their own — because the list is only useful
 * as a way of emptying that filter.
 */
export function ResponsibilitiesPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const items = useResponsibilities(wedding.id);
  const owners = useOwnerOptions(wedding.id);
  const create = useCreateResponsibility(wedding.id);
  const update = useUpdateResponsibility(wedding.id);
  const remove = useDeleteResponsibility(wedding.id);

  const [onlyUnnamed, setOnlyUnnamed] = useState(false);
  const [areaFilter, setAreaFilter] = useState('all');

  const rows = useMemo(() => items.data ?? [], [items.data]);
  const unnamed = rows.filter((r) => !isNamed(r)).length;

  const areas = useMemo(
    () => [...new Set(rows.map((r) => r.area).filter(Boolean))] as string[],
    [rows],
  );

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (onlyUnnamed && isNamed(r)) return false;
        if (areaFilter !== 'all' && (r.area ?? '') !== areaFilter) return false;
        return true;
      }),
    [rows, onlyUnnamed, areaFilter],
  );

  // Areas keep the template's order, which groups the day roughly as it runs.
  const sections = useMemo(() => {
    const buckets = new Map<string, ResponsibilityRow[]>();
    for (const r of visible) {
      const key = r.area?.trim() || 'Everything else';
      const list = buckets.get(key);
      if (list) list.push(r);
      else buckets.set(key, [r]);
    }
    return [...buckets.entries()].map(([label, list]) => ({
      label,
      list,
      unnamed: list.filter((r) => !isNamed(r)).length,
    }));
  }, [visible]);

  if (items.isError) {
    return (
      <Page width="wide">
        <PageHeader title="Who does what" />
        <ErrorState error={items.error} onRetry={() => void items.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Who does what"
        description="R does the work, A is accountable if it goes wrong, C is consulted, I is kept informed. The column that matters is the name."
        actions={
          canEdit && (
            <Button
              icon={<Plus className="size-4" />}
              loading={create.isPending}
              onClick={() => create.mutate({ activity: 'New activity' })}
            >
              Add activity
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Activities"
          value={rows.length}
          icon={<Users className="size-3.5" />}
          hint="from the workbook, plus your own"
        />
        <Stat
          label="Nobody named"
          value={unnamed}
          icon={<UserX className="size-3.5" />}
          tone={unnamed > 0 ? 'bad' : 'good'}
          hint={unnamed > 0 ? 'a role is not a person' : 'every activity has a name'}
        />
        <Stat
          label="With a phone number"
          value={rows.filter((r) => r.phone?.trim()).length}
          icon={<Phone className="size-3.5" />}
          hint="reachable on the day"
        />
      </div>

      {unnamed > 0 && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">
            {unnamed} {unnamed === 1 ? 'activity has' : 'activities have'} a role against{' '}
            {unnamed === 1 ? 'it' : 'them'} but no named person. On the day, a role with nobody in
            it is nobody.
          </span>
          <Button variant="secondary" size="sm" onClick={() => setOnlyUnnamed(true)}>
            Show me
          </Button>
        </p>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
          <Select
            className="w-44"
            aria-label="Area"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="all">Every area</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Button
            variant={onlyUnnamed ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setOnlyUnnamed((v) => !v)}
          >
            {onlyUnnamed ? 'Showing unnamed only' : 'Only unnamed'}
          </Button>
          <span className="ml-auto text-xs text-stone-500">{visible.length} shown</span>
        </div>

        <CardBody className="px-0 pb-0">
          {items.isLoading ? (
            <div className="px-4 py-2">
              <SkeletonRows rows={8} />
            </div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState
                icon={<Users className="size-5" />}
                title={
                  rows.length === 0
                    ? 'No activities yet'
                    : onlyUnnamed
                      ? 'Everyone is named'
                      : 'Nothing in that area'
                }
                description={
                  rows.length === 0
                    ? 'Seeding the wedding brings in the workbook’s responsibility matrix.'
                    : onlyUnnamed
                      ? 'Every activity has a person against it. That is the whole job done.'
                      : 'Try another area.'
                }
              />
            </div>
          ) : (
            <div className="scroll-subtle overflow-x-auto">
              <table className="w-full min-w-5xl text-sm">
                <thead className="text-left text-xs text-stone-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Activity</th>
                    <th className="w-40 px-2 py-2 font-medium">Person</th>
                    <th className="w-32 px-2 py-2 font-medium">Phone</th>
                    <th className="w-28 px-2 py-2 font-medium">Does it</th>
                    <th className="w-28 px-2 py-2 font-medium">Owns it</th>
                    <th className="w-24 px-2 py-2 font-medium">Consulted</th>
                    <th className="w-24 px-2 py-2 font-medium">Informed</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                {sections.map((sec) => (
                  <tbody key={sec.label} className="divide-y divide-stone-100">
                    <tr className="bg-stone-50/80">
                      <td colSpan={8} className="px-4 py-1.5">
                        <span className="text-xs font-semibold tracking-wide text-stone-600 uppercase">
                          {sec.label}
                        </span>
                        {sec.unnamed > 0 && (
                          <Badge tone="warn" className="ml-2">
                            {sec.unnamed} unnamed
                          </Badge>
                        )}
                      </td>
                    </tr>
                    {sec.list.map((r) => (
                      <RaciRow
                        key={r.id}
                        item={r}
                        owners={owners.data ?? []}
                        canEdit={canEdit}
                        onSave={(patch) => update.mutate({ id: r.id, patch })}
                        onRemove={() => remove.mutate(r.id)}
                      />
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
          <div className="px-4 py-3">
            <InlineError error={create.error ?? update.error ?? remove.error} />
          </div>
        </CardBody>
      </Card>
    </Page>
  );
}

function RaciRow({
  item,
  owners,
  canEdit,
  onSave,
  onRemove,
}: {
  item: ResponsibilityRow;
  owners: string[];
  canEdit: boolean;
  onSave: (patch: Partial<ResponsibilityRow>) => void;
  onRemove: () => void;
}) {
  const named = isNamed(item);

  /** Committed on blur: one write per field finished, not one per keystroke. */
  const commit = (field: keyof ResponsibilityRow, next: string) => {
    const value = next.trim() || null;
    if (value !== ((item[field] as string | null) ?? null)) onSave({ [field]: value });
  };

  return (
    <tr className={cn(!named && 'bg-amber-50/40')}>
      <td className="px-4 py-2">
        <Input
          key={`a-${item.id}-${item.updated_at}`}
          className="border-transparent bg-transparent shadow-none"
          disabled={!canEdit}
          defaultValue={item.activity}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== item.activity) onSave({ activity: next });
          }}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          key={`p-${item.id}-${item.updated_at}`}
          placeholder="Name a person"
          className={cn(!named && 'border-amber-300 bg-white')}
          disabled={!canEdit}
          defaultValue={item.person_name ?? ''}
          onBlur={(e) => commit('person_name', e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          key={`ph-${item.id}-${item.updated_at}`}
          placeholder="—"
          disabled={!canEdit}
          defaultValue={item.phone ?? ''}
          onBlur={(e) => commit('phone', e.target.value)}
        />
      </td>
      {/* The four roles. Selects from the shared Owner list, because these are
          the same cast as everywhere else, with free text preserved when the
          template used something more specific than the list has. */}
      {(['responsible', 'accountable', 'consulted', 'informed'] as const).map((field) => (
        <td key={field} className="px-2 py-2">
          <Select
            aria-label={field}
            disabled={!canEdit}
            value={item[field] ?? ''}
            onChange={(e) => onSave({ [field]: e.target.value || null })}
          >
            <option value="">—</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {item[field] && !owners.includes(item[field]!) && (
              <option value={item[field]!}>{item[field]}</option>
            )}
          </Select>
        </td>
      ))}
      <td className="px-2 py-2 text-right">
        {canEdit && (
          <button
            type="button"
            aria-label={`Remove ${item.activity}`}
            onClick={onRemove}
            className="focus-ring rounded p-1 text-stone-500 hover:text-red-600"
          >
            <UserX className="size-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
