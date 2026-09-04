import { AlertTriangle, Clock, Gem, UtensilsCrossed } from 'lucide-react';
import { useCateringHeadcount, useCeremonyLength, useJewelleryCustody } from './api';
import { formatMoney } from '../../lib/units';
import { Badge, Card, CardBody, Stat, cn } from '../../components/ui';

/**
 * The three modules that answer a question their own list cannot.
 *
 * Everything else in Phase 6 is a list you read. These three have a number or
 * an alert that only makes sense across the whole list — what is still out on
 * loan, how long the ceremony runs, how many people to cook for — so each gets
 * a panel above it. Kept here rather than in ChecklistModule so that component
 * stays about the shape all seventeen share.
 */

/** Ticket 6.3. The unreturned-rental alert the ticket asks for by name. */
export function JewellerySummary({
  weddingId,
  currency,
  decimals,
}: {
  weddingId: string;
  currency: string;
  decimals: number;
}) {
  const custody = useJewelleryCustody(weddingId);
  const rows = custody.data ?? [];

  const overdue = rows.filter((r) => r.overdue_return);
  const awaiting = rows.filter((r) => r.awaiting_return);
  const unattended = rows.filter((r) => r.no_custodian && r.applicability !== 'not_applicable');
  const insuredValue = rows
    .filter((r) => r.insured)
    .reduce((sum, r) => sum + Number(r.value_minor ?? 0), 0);
  const totalValue = rows.reduce((sum, r) => sum + Number(r.value_minor ?? 0), 0);

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={`Total value (${currency})`}
          value={formatMoney(totalValue, decimals)}
          icon={<Gem className="size-3.5" />}
          hint={`${formatMoney(insuredValue, decimals)} insured`}
        />
        <Stat label="Out on loan" value={awaiting.length} hint="rented or borrowed, not yet back" />
        <Stat
          label="Overdue back"
          value={overdue.length}
          tone={overdue.length > 0 ? 'bad' : 'good'}
          hint={overdue.length > 0 ? 'past its return date' : 'nothing outstanding'}
        />
        <Stat
          label="In nobody’s hands"
          value={unattended.length}
          tone={unattended.length > 0 ? 'bad' : 'good'}
          hint="no custodian named"
        />
      </div>

      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardBody className="py-3">
            <p className="flex items-start gap-2 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-medium">
                  {overdue.length} {overdue.length === 1 ? 'piece has' : 'pieces have'} not been
                  returned.
                </span>{' '}
                A rented piece with no return date counts here too — nobody having decided when it
                goes back is the same problem, later.
              </span>
            </p>
            <ul className="mt-2 space-y-1 pl-6">
              {overdue.map((r) => (
                <li key={r.item_id} className="text-xs text-stone-600">
                  <span className="font-medium text-stone-800">{r.name}</span>
                  {r.custodian ? ` — with ${r.custodian}` : ' — nobody named'}
                  {r.return_by ? `, due back ${r.return_by}` : ', no return date set'}
                  {Number(r.deposit_minor ?? 0) > 0 &&
                    `, ${currency} ${formatMoney(Number(r.deposit_minor), decimals)} deposit at stake`}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/** Ticket 6.4. Durations summed over the components that still apply. */
export function CeremonySummary({ weddingId }: { weddingId: string }) {
  const length = useCeremonyLength(weddingId);
  const s = length.data;

  const minutes = Number(s?.minutes ?? 0);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const holes = Number(s?.steps_without_duration ?? 0);

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Stat
        label="Runs for"
        value={minutes === 0 ? '—' : hours > 0 ? `${hours}h ${rest}m` : `${rest}m`}
        icon={<Clock className="size-3.5" />}
        hint={`${s?.active_steps ?? 0} components`}
      />
      <Stat
        label="Starts at"
        value={s?.starts_at ? String(s.starts_at).slice(0, 5) : 'not set'}
        hint="earliest component with a time"
      />
      {/* A sum over a list with holes in it reads as authoritative and is not. */}
      <Stat
        label="Without a duration"
        value={holes}
        tone={holes > 0 ? 'bad' : 'good'}
        hint={holes > 0 ? 'so the total is short' : 'the total is complete'}
      />
    </div>
  );
}

/** Ticket 6.6. Confirmed + crew + buffer, live from the guest list. */
export function CateringSummary({ weddingId }: { weddingId: string }) {
  const head = useCateringHeadcount(weddingId);
  const h = head.data;

  const caterFor = Number(h?.cater_for ?? 0);
  const ifAll = Number(h?.cater_for_if_all_accept ?? 0);
  const awaiting = Number(h?.awaiting_reply ?? 0);
  const buffer = Number(h?.guest_buffer_pct ?? 0);

  return (
    <div className="mb-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cater for"
          value={caterFor}
          icon={<UtensilsCrossed className="size-3.5" />}
          tone="accent"
          hint={`confirmed + ${Math.round(buffer * 100)}% + ${h?.crew_count ?? 0} crew`}
        />
        <Stat label="Confirmed" value={Number(h?.confirmed ?? 0)} hint="heads, from the RSVPs" />
        <Stat
          label="Still to reply"
          value={awaiting}
          tone={awaiting > 0 ? 'bad' : 'good'}
          hint={awaiting > 0 ? 'heads not yet accounted for' : 'everyone has answered'}
        />
        <Stat
          label="If everyone comes"
          value={ifAll}
          hint={ifAll > caterFor ? `${ifAll - caterFor} more than quoted` : 'same as quoted'}
        />
      </div>

      {awaiting > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-stone-50 px-4 py-2.5 text-xs text-stone-600">
          <Badge tone="neutral">the gap</Badge>
          <span>
            Quote the caterer <span className="font-medium">{caterFor}</span> and you are covered
            for who has actually replied. If everyone outstanding says yes it becomes{' '}
            <span className="font-medium">{ifAll}</span> — that difference is the risk you are
            carrying, not a number to order on yet.
          </span>
        </p>
      )}

      {(h?.crew_count ?? 0) === 0 && (
        <p className={cn('px-4 text-xs text-amber-700')}>
          No crew counted. The photographer, the band and the coordinator eat too, and they are not
          on the guest list — set a crew count on the Setup screen.
        </p>
      )}
    </div>
  );
}
