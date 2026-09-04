import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  BedDouble,
  Car,
  ChevronDown,
  FileUp,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import {
  useCreateGuest,
  useDeleteGuest,
  useGuestGroups,
  useGuests,
  useUpdateGuest,
  type GuestRow,
  type RsvpStatus,
} from './api';
import { countGuests } from './counts';
import { groupGuests, type GroupMode } from './grouping';
import { useFilterParam } from '../../lib/filterParam';
import { currencyDecimals } from '../../lib/units';
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
  const groupRefs = useGuestGroups(wedding.id);
  const create = useCreateGuest(wedding.id);
  const update = useUpdateGuest(wedding.id);
  const remove = useDeleteGuest(wedding.id);

  const [search, setSearch] = useState('');
  // Ticket 7.5. Both live in the URL so an alert lands on the filtered list.
  const [statusFilter, setStatusFilter] = useFilterParam<RsvpStatus | 'all'>('status', 'all');
  const [sideFilter, setSideFilter] = useFilterParam<WeddingSide | 'all' | 'none'>('side', 'all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>('group');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState(false);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (guests.data ?? []).filter((g) => {
      if (statusFilter !== 'all' && g.rsvp_status !== statusFilter) return false;
      // 'none' is its own question — households nobody has assigned a side
      // to — and is what the alert links here for.
      if (sideFilter === 'none' && g.side !== null) return false;
      if (sideFilter !== 'all' && sideFilter !== 'none' && g.side !== sideFilter) return false;
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

  const sections = useMemo(
    () =>
      groupGuests(
        visible,
        (groupRefs.data ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          sort_order: g.sort_order,
        })),
        groupMode,
      ),
    [visible, groupRefs.data, groupMode],
  );
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
        decimals={currencyDecimals(wedding.currency)}
        open={importing}
        onClose={() => setImporting(false)}
      />

      <InvitesModal weddingId={wedding.id} open={inviting} onClose={() => setInviting(false)} />

      {/* Ticket 4.4. Households and heads side by side, because they answer
          different questions and are easy to confuse. */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* The total guest count first. It is the number everyone asks for —
            the caterer, the venue, the couple's parents — and it used to be a
            hint under the household count. */}
        <Stat
          label="Guests invited"
          value={counts.invited}
          icon={<UsersRound className="size-3.5" />}
          hint={`${counts.households} ${counts.households === 1 ? 'household' : 'households'}`}
        />
        <Stat
          label="Coming"
          value={counts.attending}
          icon={<UserCheck className="size-3.5" />}
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
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" />
            <Input
              className="pl-9"
              placeholder="Search a household, relationship or town"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="w-full sm:w-36"
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
          <Select
            className="w-full sm:w-40"
            aria-label="Group the list by"
            value={groupMode}
            onChange={(e) => {
              setGroupMode(e.target.value as GroupMode);
              // Section keys mean something different in each mode, so a
              // collapsed set carried across would collapse the wrong things.
              setCollapsed(new Set());
            }}
          >
            <option value="group">By group</option>
            <option value="category">By category</option>
            <option value="side">By side</option>
            <option value="none">One flat list</option>
          </Select>
          {/* A family member only ever receives their own side, so the filter
              would be a control with one useful position. */}
          {!isFamily && (
            <Select
              className="w-full sm:w-32"
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as WeddingSide | 'all')}
            >
              <option value="all">Both sides</option>
              <option value="none">No side set</option>
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
            <div>
              {sections.map((sec) => {
                const isCollapsed = collapsed.has(sec.key);
                return (
                  <section key={sec.key}>
                    {/* One flat list needs no heading; it would be a header
                        saying "All households" above all the households. */}
                    {groupMode !== 'none' && (
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
                        <span className="tabular shrink-0 text-xs sm:text-[11px] text-stone-500">
                          {sec.households} {sec.households === 1 ? 'household' : 'households'} ·{' '}
                          {sec.invited} invited
                          {sec.attending > 0 && ` · ${sec.attending} coming`}
                        </span>
                      </button>
                    )}
                    {!isCollapsed && (
                      <ul className="divide-y divide-stone-100">
                        {sec.guests.map((g) => (
                          <GuestRowItem key={g.id} guest={g} onOpen={() => setSelectedId(g.id)} />
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

/** Two letters from the household name, so a long list has something to scan by. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIDE_SHORT: Record<string, string> = { bride: 'bride', groom: 'groom', both: 'shared' };

function GuestRowItem({ guest, onOpen }: { guest: GuestRow; onOpen: () => void }) {
  const accepted = guest.rsvp_status === 'accepted';
  const invited = guest.total_invited ?? 0;
  const attending = guest.total_attending ?? 0;
  // Only worth pointing out when they are actually coming with fewer people
  // than were invited; before a reply it is not information.
  const fewer = accepted && attending < invited;

  return (
    <li
      onClick={onOpen}
      className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50/70"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wine-50 text-xs sm:text-[11px] font-semibold text-wine-700 ring-1 ring-wine-100"
      >
        {initials(guest.household_name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-stone-900">
          {guest.household_name}
          {guest.vip && <Badge tone="gold">VIP</Badge>}
        </p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-stone-500">
          {[guest.relationship, guest.category, guest.city].filter(Boolean).join(' · ') ||
            'no details yet'}
          {/* Icons rather than words: they are secondary facts, and spelling
              them out crowded out the name. */}
          {guest.phone && <Phone className="size-3 shrink-0 text-stone-500" />}
          {guest.email && <Mail className="size-3 shrink-0 text-stone-500" />}
          {guest.needs_room && <BedDouble className="size-3 shrink-0 text-stone-500" />}
          {guest.needs_transport && <Car className="size-3 shrink-0 text-stone-500" />}
        </p>
      </div>

      {guest.side && (
        <span className="hidden shrink-0 text-xs sm:text-[11px] text-stone-500 sm:inline">
          {SIDE_SHORT[guest.side] ?? guest.side}
        </span>
      )}

      {/* Heads, given the emphasis. Everything on this screen is eventually a
          question about how many people are coming. */}
      <div className="w-20 shrink-0 text-right">
        <p className="tabular text-sm font-semibold text-stone-900">
          {accepted ? attending : invited}
          <span className="ml-1 text-xs sm:text-[11px] font-normal text-stone-500">
            {accepted ? 'coming' : 'invited'}
          </span>
        </p>
        {fewer && (
          <p className="tabular text-xs sm:text-[11px] text-stone-500">of {invited} invited</p>
        )}
      </div>

      <Badge tone={RSVP_TONE[guest.rsvp_status]}>{RSVP_LABEL[guest.rsvp_status]}</Badge>
    </li>
  );
}
