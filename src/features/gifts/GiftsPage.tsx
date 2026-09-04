import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Gift, HandHeart, Mail, Search, Wallet } from 'lucide-react';
import { useGiftSummary } from './api';
import { useGuests, useUpdateGuest, type GuestRow } from '../guests/api';
import { giftKeys } from './api';
import { useQueryClient } from '@tanstack/react-query';
import {
  currencyDecimals,
  formatMinorAsMajor,
  formatMinorForInput,
  parseMajorToMinor,
} from '../../lib/units';
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
  InlineError,
  Input,
  Page,
  PageHeader,
  Select,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

type Filter = 'all' | 'expected' | 'received' | 'outstanding' | 'thanks_due';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Every household' },
  { value: 'expected', label: 'A gift expected' },
  { value: 'received', label: 'A gift received' },
  { value: 'outstanding', label: 'Less than expected' },
  { value: 'thanks_due', label: 'Thank-you not sent' },
];

/**
 * Ticket 4.9. Expected against received, per household.
 *
 * A cash gift at a Sri Lankan wedding is an amount in an envelope from a named
 * household, which is why this is columns on `guests` rather than its own
 * ledger: a separate table would need reconciling against the guest list, and
 * the reconciliation would be the couple's job.
 *
 * Editing is inline. Recording gifts is a sitting-down-with-a-pile-of-envelopes
 * job — dozens of rows in one session — and a modal per household would make
 * that unbearable.
 */
export function GiftsPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);

  const guests = useGuests(wedding.id);
  const summary = useGiftSummary(wedding.id);
  const update = useUpdateGuest(wedding.id);
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (guests.data ?? [])
      .filter((g) => {
        switch (filter) {
          case 'expected':
            return g.expected_gift_minor > 0;
          case 'received':
            return g.gift_received_minor > 0;
          case 'outstanding':
            return g.expected_gift_minor > g.gift_received_minor;
          case 'thanks_due':
            return g.gift_received_minor > 0 && !g.thank_you_sent;
          default:
            return true;
        }
      })
      .filter(
        (g) =>
          !needle ||
          g.household_name.toLowerCase().includes(needle) ||
          (g.gift_description ?? '').toLowerCase().includes(needle),
      );
  }, [guests.data, filter, search]);

  /** The summary lives in a view, so it has to be refetched after an edit. */
  function save(id: string, patch: Parameters<typeof update.mutate>[0]['patch']) {
    update.mutate(
      { id, patch },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: giftKeys.summary(wedding.id) }) },
    );
  }

  if (guests.isError) {
    return (
      <Page width="wide">
        <PageHeader title="Gifts" />
        <ErrorState error={guests.error} onRetry={() => void guests.refetch()} />
      </Page>
    );
  }

  const s = summary.data;

  return (
    <Page width="wide">
      <PageHeader
        title="Gifts"
        description="What each household is expected to give, and what arrived. Feeds the net cost on the dashboard."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Expected (${currency})`}
          value={formatMinorAsMajor(s?.expected_minor ?? 0, decimals)}
          icon={<Gift className="size-3.5" />}
          hint={`${s?.households_expected ?? 0} households`}
        />
        <Stat
          label={`Received (${currency})`}
          value={formatMinorAsMajor(s?.received_minor ?? 0, decimals)}
          icon={<Wallet className="size-3.5" />}
          hint={`${s?.households_received ?? 0} households`}
          tone="good"
        />
        <Stat
          label={`Still expected (${currency})`}
          value={formatMinorAsMajor(s?.still_expected_minor ?? 0, decimals)}
          icon={<HandHeart className="size-3.5" />}
          hint="summed per household, never netted"
        />
        <Stat
          label="Thank-yous due"
          value={String(s?.thank_yous_pending ?? 0)}
          icon={<Mail className="size-3.5" />}
          hint={(s?.thank_yous_pending ?? 0) === 0 ? 'all sent' : 'a gift arrived, nobody thanked'}
          tone={(s?.thank_yous_pending ?? 0) > 0 ? 'accent' : undefined}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>The ledger</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute top-2.5 left-3 size-4 text-stone-400" />
              <Input
                className="w-56 pl-9"
                placeholder="Find a household"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              className="w-52"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardBody className="pt-4">
          {update.error && (
            <div className="mb-3">
              <InlineError error={update.error} />
            </div>
          )}

          {guests.isLoading ? (
            <SkeletonRows rows={8} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={
                (guests.data ?? []).length === 0 ? 'No households yet' : 'Nothing matches that'
              }
              description={
                (guests.data ?? []).length === 0
                  ? 'Add households on the Guests screen and their gifts can be recorded here.'
                  : 'Widen the filter or clear the search.'
              }
            />
          ) : (
            <div className="scroll-subtle -mx-2 overflow-x-auto">
              <table className="w-full min-w-4xl text-sm">
                <thead className="text-left text-xs text-stone-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Household</th>
                    <th className="w-32 px-2 py-1.5 text-right font-medium">Expected</th>
                    <th className="w-32 px-2 py-1.5 text-right font-medium">Received</th>
                    <th className="w-28 px-2 py-1.5 text-right font-medium">Difference</th>
                    <th className="px-2 py-1.5 font-medium">What it was</th>
                    <th className="w-28 px-2 py-1.5 font-medium">Thank-you</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((g) => (
                    <GiftRow
                      key={g.id}
                      guest={g}
                      decimals={decimals}
                      canEdit={canEdit}
                      onSave={(patch) => save(g.id, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </Page>
  );
}

function GiftRow({
  guest,
  decimals,
  canEdit,
  onSave,
}: {
  guest: GuestRow;
  decimals: number;
  canEdit: boolean;
  onSave: (patch: Parameters<ReturnType<typeof useUpdateGuest>['mutate']>[0]['patch']) => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const difference = guest.gift_received_minor - guest.expected_gift_minor;
  const shortfall = guest.expected_gift_minor > guest.gift_received_minor;

  /**
   * Committed on blur rather than per keystroke: one write per field the person
   * finished, instead of one per character. Keyed inputs stay uncontrolled so
   * the value they show is whatever was typed until the row refetches.
   */
  function commitMoney(field: 'expected_gift_minor' | 'gift_received_minor', raw: string) {
    let minor: number;
    try {
      minor = parseMajorToMinor(raw, decimals) ?? 0;
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'Not an amount');
      return;
    }
    setProblem(null);
    if (minor !== guest[field]) onSave({ [field]: minor });
  }

  return (
    <tr className={cn(shortfall && guest.gift_received_minor > 0 && 'bg-amber-50/40')}>
      <td className="px-2 py-1.5">
        <p className="truncate text-stone-900">{guest.household_name}</p>
        <p className="truncate text-[11px] text-stone-400">
          {guest.relationship ?? guest.category ?? '—'}
        </p>
        {problem && <p className="text-[11px] text-red-700">{problem}</p>}
      </td>
      <td className="px-2 py-1.5">
        <Input
          key={`e-${guest.expected_gift_minor}`}
          className="text-right tabular-nums"
          inputMode="decimal"
          placeholder="0.00"
          disabled={!canEdit}
          defaultValue={formatMinorForInput(guest.expected_gift_minor, decimals)}
          onBlur={(e) => commitMoney('expected_gift_minor', e.target.value)}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          key={`r-${guest.gift_received_minor}`}
          className="text-right tabular-nums"
          inputMode="decimal"
          placeholder="0.00"
          disabled={!canEdit}
          defaultValue={formatMinorForInput(guest.gift_received_minor, decimals)}
          onBlur={(e) => commitMoney('gift_received_minor', e.target.value)}
        />
      </td>
      <td className="px-2 py-1.5 text-right">
        {guest.expected_gift_minor === 0 && guest.gift_received_minor === 0 ? (
          <span className="text-stone-300">—</span>
        ) : (
          <span
            className={cn(
              'tabular text-xs',
              difference < 0
                ? 'text-amber-700'
                : difference > 0
                  ? 'text-emerald-700'
                  : 'text-stone-400',
            )}
          >
            {difference > 0 ? '+' : ''}
            {formatMinorAsMajor(difference, decimals)}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5">
        <Input
          key={`d-${guest.gift_description ?? ''}`}
          placeholder="Cash, a gift, jewellery…"
          disabled={!canEdit}
          defaultValue={guest.gift_description ?? ''}
          onBlur={(e) => {
            const next = e.target.value.trim() || null;
            if (next !== (guest.gift_description ?? null)) onSave({ gift_description: next });
          }}
        />
      </td>
      <td className="px-2 py-1.5">
        {guest.gift_received_minor === 0 ? (
          // Nothing arrived, so there is nothing to thank anyone for. Offering
          // the tick would invite marking it and losing the follow-up list.
          <span className="text-[11px] text-stone-300">nothing yet</span>
        ) : guest.thank_you_sent ? (
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => onSave({ thank_you_sent: false })}
          >
            <Badge tone="good">sent</Badge>
          </button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={!canEdit}
            onClick={() => onSave({ thank_you_sent: true })}
          >
            Mark sent
          </Button>
        )}
      </td>
    </tr>
  );
}
