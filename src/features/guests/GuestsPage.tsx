import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileUp, Plus, Search, Send, UsersRound } from 'lucide-react';
import {
  useCreateGuest,
  useDeleteGuest,
  useGuests,
  useUpdateGuest,
  type GuestRow,
  type RsvpStatus,
} from './api';
import { countGuests } from './counts';
import { GuestDetail } from './GuestDetail';
import { ImportGuestsModal } from './import/ImportGuestsModal';
import { InvitesModal } from '../invites/InvitesModal';
import type { MyWedding, WeddingSide } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Input,
  Modal,
  Page,
  PageHeader,
  Select,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

const RSVP_TONE: Record<RsvpStatus, 'neutral' | 'good' | 'warn' | 'stop' | 'gold'> = {
  pending: 'neutral',
  accepted: 'good',
  declined: 'stop',
  maybe: 'warn',
  no_response: 'neutral',
};

const RSVP_LABEL: Record<RsvpStatus, string> = {
  pending: 'pending',
  accepted: 'coming',
  declined: 'not coming',
  maybe: 'maybe',
  no_response: 'no reply',
};

export function GuestsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';
  const isFamily = wedding.role === 'family';

  const guests = useGuests(wedding.id);
  const create = useCreateGuest(wedding.id);
  const update = useUpdateGuest(wedding.id);
  const remove = useDeleteGuest(wedding.id);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RsvpStatus | 'all'>('all');
  const [sideFilter, setSideFilter] = useState<WeddingSide | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState(false);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (guests.data ?? []).filter((g) => {
      if (statusFilter !== 'all' && g.rsvp_status !== statusFilter) return false;
      if (sideFilter !== 'all' && g.side !== sideFilter) return false;
      if (needle) {
        const hay = [g.household_name, g.relationship, g.category, g.phone, g.city]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [guests.data, search, statusFilter, sideFilter]);

  const counts = useMemo(() => countGuests(visible), [visible]);
  const selected = (guests.data ?? []).find((g) => g.id === selectedId) ?? null;

  if (guests.isLoading) {
    return (
      <Page width="wide">
        <PageHeader title="Guests" />
        <Card>
          <CardBody className="pt-5">
            <SkeletonRows rows={8} />
          </CardBody>
        </Card>
      </Page>
    );
  }
  if (guests.error) {
    return (
      <Page width="wide">
        <PageHeader title="Guests" />
        <ErrorState error={guests.error} onRetry={() => void guests.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Guests"
        description={
          isFamily
            ? 'Households on your side of the family, plus anyone shared. One row per household, not per person.'
            : 'One row per household, with adults and children counted — the way the workbook does it.'
        }
        actions={
          canEdit && (
            <div className="flex items-center gap-2">
              {/* Ticket 4.2. Retyping a guest list is the single most tedious
                  part of setting up, so the import sits next to Add rather
                  than being buried in a settings screen. */}
              <Button
                variant="secondary"
                icon={<FileUp className="size-4" />}
                onClick={() => setImporting(true)}
              >
                Import
              </Button>
              {/* Ticket 4.10. Sending the invitations is a guest-list job, so
                  it lives here rather than on a screen of its own. */}
              <Button
                variant="secondary"
                icon={<Send className="size-4" />}
                onClick={() => setInviting(true)}
              >
                Invitations
              </Button>
              <Button
                icon={<Plus className="size-4" />}
                loading={create.isPending}
                onClick={() =>
                  create.mutate(
                    { household_name: 'New household', adults_invited: 2 },
                    { onSuccess: (row) => setSelectedId(row.id) },
                  )
                }
              >
                Add household
              </Button>
            </div>
          )
        }
      />

      <ImportGuestsModal
        weddingId={wedding.id}
        open={importing}
        onClose={() => setImporting(false)}
      />

      <InvitesModal weddingId={wedding.id} open={inviting} onClose={() => setInviting(false)} />

      {/* Ticket 4.4. Households and heads side by side, because they answer
          different questions and are easy to confuse. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Households"
          value={counts.households}
          icon={<UsersRound className="size-3.5" />}
          hint={`${counts.invited} people invited`}
        />
        <Stat
          label="Coming"
          value={counts.attending}
          tone="good"
          hint={`${counts.accepted} households accepted`}
        />
        <Stat
          label="Still to reply"
          value={counts.pending}
          tone={counts.pending > 0 ? 'bad' : 'good'}
          hint={`${counts.declined} declined`}
        />
        <Stat
          label="Response rate"
          value={`${Math.round(counts.responseRate * 100)}%`}
          hint={`${counts.responded} of ${counts.households} answered`}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9"
              placeholder="Search a household, relationship or town"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RsvpStatus | 'all')}
          >
            <option value="all">Any reply</option>
            {(Object.keys(RSVP_LABEL) as RsvpStatus[]).map((s) => (
              <option key={s} value={s}>
                {RSVP_LABEL[s]}
              </option>
            ))}
          </Select>
          {/* A family member only ever receives their own side, so the filter
              would be a control with one useful position. */}
          {!isFamily && (
            <Select
              className="w-32"
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as WeddingSide | 'all')}
            >
              <option value="all">Both sides</option>
              <option value="bride">Bride</option>
              <option value="groom">Groom</option>
              <option value="both">Shared</option>
            </Select>
          )}
        </div>

        <CardBody className="px-0 pb-0">
          {visible.length === 0 ? (
            <div className="px-4 py-6">
              <EmptyState
                icon={<UsersRound className="size-5" />}
                title={
                  (guests.data ?? []).length === 0
                    ? 'No households yet'
                    : 'Nothing matches those filters'
                }
                description={
                  (guests.data ?? []).length === 0
                    ? 'Add the first household, or import the list from a spreadsheet once 4.2 lands.'
                    : 'Widen the search, reply status or side.'
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {visible.map((g) => (
                <GuestRowItem key={g.id} guest={g} onOpen={() => setSelectedId(g.id)} />
              ))}
            </ul>
          )}
          <div className="px-4 py-3">
            <InlineError error={create.error ?? update.error ?? remove.error} />
          </div>
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.household_name ?? ''}
        subtitle={selected?.relationship ?? undefined}
        badge={
          selected && (
            <Badge tone={RSVP_TONE[selected.rsvp_status]}>{RSVP_LABEL[selected.rsvp_status]}</Badge>
          )
        }
      >
        {selected && (
          <GuestDetail
            guest={selected}
            canEdit={canEdit}
            saving={update.isPending}
            onSave={(patch) => update.mutate({ id: selected.id, patch })}
            onDelete={() => {
              remove.mutate(selected.id);
              setSelectedId(null);
            }}
          />
        )}
      </Modal>
    </Page>
  );
}

function GuestRowItem({ guest, onOpen }: { guest: GuestRow; onOpen: () => void }) {
  return (
    <li
      onClick={onOpen}
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stone-50/70"
    >
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring min-w-0 flex-1 rounded-lg text-left"
      >
        <p className="flex items-center gap-1.5 truncate text-sm text-stone-900">
          {guest.household_name}
          {guest.vip && <Badge tone="gold">VIP</Badge>}
        </p>
        <p className="truncate text-xs text-stone-400">
          {[guest.relationship, guest.category, guest.city].filter(Boolean).join(' · ') || '—'}
        </p>
      </button>

      <div className="shrink-0 text-right">
        <p className="tabular text-sm text-stone-900">
          {guest.rsvp_status === 'accepted' ? guest.total_attending : '—'}
        </p>
        <p className="tabular text-[11px] text-stone-400">of {guest.total_invited} invited</p>
      </div>

      {guest.side && (
        <span className={cn('shrink-0 text-[11px]', 'text-stone-400')}>{guest.side}</span>
      )}
      <Badge tone={RSVP_TONE[guest.rsvp_status]}>{RSVP_LABEL[guest.rsvp_status]}</Badge>
    </li>
  );
}
