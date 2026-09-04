import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, Armchair, CircleUser, Plus, Search, Trash2, Users, X } from 'lucide-react';
import {
  useCreateSeatingTable,
  useDeleteSeatingTable,
  useSeatHousehold,
  useSeatingSummary,
  useSeatingTables,
  useUpdateSeatingTable,
  type SeatingTableRow,
} from './api';
import { useGuests, type GuestRow } from '../guests/api';
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
  InlineError,
  Input,
  Page,
  PageHeader,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

/**
 * Ticket 4.8. Seating, without drag and drop.
 *
 * Dragging is the obvious interaction and the wrong one here. This gets used on
 * a phone as often as a laptop, the lists are long, and a household is a block
 * of four to six people rather than one draggable person. So it works the way
 * a seating chart on paper works: pick the household you are placing, then
 * choose where it goes. Two taps, no precision required, and it says how many
 * seats are left on every table while you decide.
 */
export function SeatingPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const tables = useSeatingTables(wedding.id);
  const summary = useSeatingSummary(wedding.id);
  const guests = useGuests(wedding.id);
  const createTable = useCreateSeatingTable(wedding.id);
  const updateTable = useUpdateSeatingTable(wedding.id);
  const removeTable = useDeleteSeatingTable(wedding.id);
  const seat = useSeatHousehold(wedding.id);

  const [holding, setHolding] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  const byTable = useMemo(() => {
    const map = new Map<string, GuestRow[]>();
    for (const g of guests.data ?? []) {
      if (!g.table_id) continue;
      const list = map.get(g.table_id) ?? [];
      list.push(g);
      map.set(g.table_id, list);
    }
    return map;
  }, [guests.data]);

  const unseated = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (
      (guests.data ?? [])
        .filter((g) => !g.table_id)
        // A household that has declined needs no chair. Leaving them in this
        // list would make it a job that can never be finished.
        .filter((g) => g.rsvp_status !== 'declined')
        .filter((g) => !needle || g.household_name.toLowerCase().includes(needle))
    );
  }, [guests.data, search]);

  const held = (guests.data ?? []).find((g) => g.id === holding) ?? null;

  function place(tableId: string | null) {
    if (!held) return;
    seat.mutate(
      { guestId: held.id, tableId },
      // Held only until it lands somewhere: keeping it selected after a
      // successful placement invites seating the same household twice.
      { onSuccess: () => setHolding(null) },
    );
  }

  if (guests.isError || tables.isError) {
    return (
      <Page width="wide">
        <PageHeader title="Seating" />
        <ErrorState error={guests.error ?? tables.error} onRetry={() => void tables.refetch()} />
      </Page>
    );
  }

  const s = summary.data;

  return (
    <Page width="wide">
      <PageHeader
        title="Seating"
        description="One block per household, because that is how they arrive. Pick a household, then pick its table."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tables"
          value={String(s?.table_count ?? 0)}
          icon={<Armchair className="size-3.5" />}
          hint={`${s?.capacity_total ?? 0} seats in total`}
        />
        <Stat
          label="Seated"
          value={String(s?.seated_heads ?? 0)}
          icon={<Users className="size-3.5" />}
          hint={`${s?.seated_households ?? 0} households`}
        />
        <Stat
          label="Still to seat"
          value={String(s?.unseated_heads ?? 0)}
          icon={<CircleUser className="size-3.5" />}
          hint={`${s?.unseated_households ?? 0} households`}
          tone={(s?.unseated_heads ?? 0) > 0 ? 'accent' : undefined}
        />
        <Stat
          label="Over capacity"
          value={String(s?.over_capacity_tables ?? 0)}
          icon={<AlertTriangle className="size-3.5" />}
          hint={
            (s?.over_capacity_tables ?? 0) > 0
              ? 'a reply arrived after seating'
              : 'every table fits'
          }
          tone={(s?.over_capacity_tables ?? 0) > 0 ? 'bad' : undefined}
        />
      </div>

      {seat.error && (
        <div className="mb-4">
          <InlineError error={seat.error} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* Who still needs a chair. Left, and sticky, because it is the list
            you work down until it is empty. */}
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader className="flex items-baseline justify-between">
            <CardTitle>Still to seat</CardTitle>
            <span className="tabular text-xs text-stone-500">{unseated.length}</span>
          </CardHeader>
          <div className="border-b border-stone-100 px-4 pb-3">
            <div className="relative">
              <Search className="absolute top-2.5 left-3 size-4 text-stone-500" />
              <Input
                className="pl-9"
                placeholder="Find a household"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <CardBody className="pt-3">
            {guests.isLoading ? (
              <SkeletonRows rows={6} />
            ) : unseated.length === 0 ? (
              <EmptyState
                title={search ? 'Nobody matches' : 'Everyone has a seat'}
                description={
                  search
                    ? 'Clear the search to see the rest.'
                    : 'Every household that has not declined is at a table.'
                }
              />
            ) : (
              <ul className="scroll-subtle max-h-[28rem] space-y-1 overflow-y-auto">
                {unseated.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setHolding(holding === g.id ? null : g.id)}
                      className={cn(
                        'focus-ring flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                        holding === g.id
                          ? 'border-wine-500 bg-wine-50 ring-1 ring-wine-300'
                          : 'border-stone-200 bg-white hover:border-stone-300',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-stone-900">
                          {g.household_name}
                        </span>
                        <span className="block truncate text-xs text-stone-500">
                          {g.relationship ?? g.category ?? 'no relationship noted'}
                        </span>
                      </span>
                      <Badge tone={holding === g.id ? 'accent' : 'neutral'}>
                        {g.heads_to_seat} {g.heads_to_seat === 1 ? 'seat' : 'seats'}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {held && (
            <p className="flex items-center gap-2 rounded-xl bg-wine-50 px-4 py-3 text-sm text-wine-900">
              <Armchair className="size-4 shrink-0" />
              <span className="flex-1">
                Placing <span className="font-medium">{held.household_name}</span> —{' '}
                {held.heads_to_seat} {held.heads_to_seat === 1 ? 'seat' : 'seats'} needed. Choose a
                table.
              </span>
              <Button variant="ghost" size="sm" onClick={() => setHolding(null)}>
                Cancel
              </Button>
            </p>
          )}

          {canEdit && (
            <Card>
              <CardBody className="flex flex-wrap items-end gap-3 py-4">
                <Field label="Table name" className="min-w-40 flex-1">
                  <Input
                    placeholder="Top table"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </Field>
                <Field label="Seats" className="w-24">
                  <Input
                    inputMode="numeric"
                    placeholder="10"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </Field>
                <Button
                  icon={<Plus className="size-4" />}
                  loading={createTable.isPending}
                  disabled={newName.trim() === ''}
                  onClick={() =>
                    createTable.mutate(
                      {
                        name: newName.trim(),
                        // The column defaults to 10 and checks the range, so a
                        // blank or nonsense value falls back rather than
                        // failing the insert.
                        capacity: Number(newCapacity) > 0 ? Number(newCapacity) : 10,
                        sort_order: (tables.data ?? []).length,
                      },
                      {
                        onSuccess: () => {
                          setNewName('');
                          setNewCapacity('');
                        },
                      },
                    )
                  }
                >
                  Add table
                </Button>
                {createTable.error && <InlineError error={createTable.error} />}
              </CardBody>
            </Card>
          )}

          {tables.isLoading ? (
            <Card>
              <CardBody className="pt-5">
                <SkeletonRows rows={4} />
              </CardBody>
            </Card>
          ) : (tables.data ?? []).length === 0 ? (
            <Card>
              <CardBody className="pt-5">
                <EmptyState
                  title="No tables yet"
                  description="Add the tables your venue has and the households can be placed at them."
                />
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(tables.data ?? []).map((t) => (
                <TableCard
                  key={t.table_id}
                  table={t}
                  seated={byTable.get(t.table_id!) ?? []}
                  holding={held}
                  canEdit={canEdit}
                  busy={seat.isPending}
                  onPlace={() => place(t.table_id!)}
                  onUnseat={(guestId) => seat.mutate({ guestId, tableId: null })}
                  onRename={(name) => updateTable.mutate({ id: t.table_id!, patch: { name } })}
                  onCapacity={(capacity) =>
                    updateTable.mutate({ id: t.table_id!, patch: { capacity } })
                  }
                  onDelete={() => removeTable.mutate(t.table_id!)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

function TableCard({
  table,
  seated,
  holding,
  canEdit,
  busy,
  onPlace,
  onUnseat,
  onRename,
  onCapacity,
  onDelete,
}: {
  table: SeatingTableRow;
  seated: GuestRow[];
  holding: GuestRow | null;
  canEdit: boolean;
  busy: boolean;
  onPlace: () => void;
  onUnseat: (guestId: string) => void;
  onRename: (name: string) => void;
  onCapacity: (capacity: number) => void;
  onDelete: () => void;
}) {
  const free = table.seats_free ?? 0;
  const over = table.over_capacity ?? false;
  // Shown before the click rather than as an error after it: the trigger will
  // refuse this, and finding that out by trying is a worse experience than
  // seeing the button greyed with the reason on it.
  const wouldNotFit = holding ? holding.heads_to_seat! > free : false;

  return (
    <Card className={cn(over && 'ring-1 ring-red-200')}>
      <CardHeader className="flex items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <input
            className="focus-ring w-full truncate rounded-md bg-transparent text-sm font-semibold text-stone-900"
            defaultValue={table.name ?? ''}
            disabled={!canEdit}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== table.name) onRename(next);
            }}
          />
          <p className="mt-0.5 text-xs text-stone-500">
            {table.household_count} {table.household_count === 1 ? 'household' : 'households'} ·{' '}
            {table.seated_heads} of {table.capacity} seats
          </p>
        </div>
        {over ? (
          <Badge tone="stop">over by {(table.seated_heads ?? 0) - (table.capacity ?? 0)}</Badge>
        ) : (
          <Badge tone={free === 0 ? 'neutral' : 'good'}>{free} free</Badge>
        )}
      </CardHeader>

      <CardBody className="space-y-2 pt-0">
        {over && (
          <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
            A household replied with more people than expected after being seated. Move someone, or
            raise the seat count.
          </p>
        )}

        {seated.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-200 px-3 py-3 text-xs text-stone-500">
            Nobody seated here yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {seated.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-stone-800">
                  {g.household_name}
                </span>
                <span className="tabular text-xs text-stone-500">{g.heads_to_seat}</span>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Unseat ${g.household_name}`}
                    onClick={() => onUnseat(g.id)}
                    className="focus-ring rounded text-stone-500 hover:text-red-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            {holding ? (
              <Button
                size="sm"
                className="flex-1"
                loading={busy}
                disabled={wouldNotFit}
                onClick={onPlace}
              >
                {wouldNotFit ? `Only ${free} free` : 'Seat here'}
              </Button>
            ) : (
              <input
                className="focus-ring w-20 rounded-lg border border-stone-200 px-2 py-1 text-xs tabular-nums"
                inputMode="numeric"
                aria-label={`Seats at ${table.name}`}
                defaultValue={String(table.capacity ?? 0)}
                onBlur={(e) => {
                  const next = Number(e.target.value);
                  if (next > 0 && next !== table.capacity) onCapacity(next);
                }}
              />
            )}
            <button
              type="button"
              aria-label={`Delete ${table.name}`}
              onClick={onDelete}
              className="focus-ring rounded-lg p-1.5 text-stone-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
