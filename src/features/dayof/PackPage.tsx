import { useEffect, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowLeft, Printer, WifiOff } from 'lucide-react';
import {
  useContactSheet,
  useRisks,
  useTimeline,
  useTimelineConflicts,
  useVendorSchedule,
} from './api';
import { ContactTable, RiskTable, ScheduleTable, TimelineTable } from './tables';
import { useSeatingTables } from '../seating/api';
import { useGuests } from '../guests/api';
import { useChecklist } from '../checklists/api';
import { findModule } from '../checklists/config';
import { useVendors } from '../vendors/vendorsApi';
import { usePackSnapshot } from './snapshot';
import { useWedding } from '../weddings/api';
import type { MyWedding } from '../../types/db';
import { Spinner } from '../../components/ui';

/**
 * Ticket 8.6. The printable day-of pack.
 *
 * Plan risk R8: "Day-of failure — the venue has no signal and the coordinator
 * has nothing... Printable pack is the real mitigation; PWA cache is
 * secondary. Never let the day depend on connectivity."
 *
 * So this is a single page, laid out for A4, that prints the five things
 * somebody running the day cannot do without: the running order, when each
 * vendor arrives, who to phone, where people sit, and what is in the bags.
 * It reuses the same table components as the screens, because a print
 * stylesheet over duplicate markup is how the paper copy and the app drift —
 * and the paper copy is the one that will be in someone's hand.
 *
 * Everything interactive is dropped in print mode and replaced with a box to
 * tick with a pen.
 */
export function PackPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  // my_weddings() carries no venue, and a pack without the address is less use
  // to somebody trying to find the place.
  const detail = useWedding(wedding.id);
  const venue = [detail.data?.venue_name, detail.data?.venue_town].filter(Boolean).join(', ');

  const timeline = useTimeline(wedding.id);
  const conflicts = useTimelineConflicts(wedding.id);
  const schedule = useVendorSchedule(wedding.id);
  const contacts = useContactSheet(wedding.id);
  const risks = useRisks(wedding.id);
  const tables = useSeatingTables(wedding.id);
  const guests = useGuests(wedding.id);
  const vendors = useVendors(wedding.id);

  const packing = useChecklist(wedding.id, findModule('procurement')!);

  // Ticket 8.7. Written to storage whenever it loads, read back when there is
  // no network. See snapshot.ts.
  const snapshot = usePackSnapshot(wedding.id, {
    timeline: timeline.data,
    conflicts: conflicts.data,
    schedule: schedule.data,
    contacts: contacts.data,
    risks: risks.data,
    tables: tables.data,
    guests: guests.data,
    packing: packing.data,
    vendors: vendors.data,
  });

  const data = snapshot.data;

  const seated = useMemo(() => {
    const byTable = new Map<string, string[]>();
    for (const g of data.guests) {
      if (!g.table_id) continue;
      const list = byTable.get(g.table_id) ?? [];
      list.push(`${g.household_name} (${g.heads_to_seat ?? 0})`);
      byTable.set(g.table_id, list);
    }
    return byTable;
  }, [data.guests]);

  const packItems = useMemo(
    () => data.packing.filter((p) => p.needed_on_day && p.applicability !== 'not_applicable'),
    [data.packing],
  );

  const vendorName = (id: string | null) =>
    id ? (data.vendors.find((v) => v.id === id)?.name ?? null) : null;

  // Nothing cached and nothing loading means a genuinely empty pack.
  const loading = timeline.isLoading && !snapshot.fromCache;

  const date =
    wedding.wedding_date &&
    new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  useEffect(() => {
    document.title = `Day-of pack — ${wedding.bride_name ?? ''} & ${wedding.groom_name ?? ''}`;
    return () => {
      document.title = 'Wedding planner';
    };
  }, [wedding.bride_name, wedding.groom_name]);

  if (loading) {
    return (
      <div className="py-16">
        <Spinner label="Building the pack" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 print:max-w-none print:px-0 print:py-0">
      {/* Screen-only controls. */}
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link
          to=".."
          className="focus-ring inline-flex items-center gap-1.5 rounded text-sm text-wine-700 hover:text-wine-800"
        >
          <ArrowLeft className="size-4" />
          Back to the dashboard
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="focus-ring ml-auto inline-flex items-center gap-2 rounded-lg bg-wine-700 px-3 py-2 text-sm font-medium text-white hover:bg-wine-800"
        >
          <Printer className="size-4" />
          Print
        </button>
      </div>

      {snapshot.fromCache && (
        <p className="no-print mb-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <span>
            No connection, so this is the copy saved on this device
            {snapshot.savedAt && ` on ${new Date(snapshot.savedAt).toLocaleString()}`}. Anything
            changed since then is not in it — which is exactly why the printed pack is the one to
            rely on.
          </span>
        </p>
      )}

      <header className="mb-6 border-b-2 border-stone-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight text-stone-900">
          Day-of pack — {wedding.bride_name} &amp; {wedding.groom_name}
        </h1>
        <p className="text-sm text-stone-600">
          {date}
          {venue && ` · ${venue}`}
        </p>
        <p className="mt-1 text-[11px] text-stone-400">
          Printed {new Date().toLocaleString()}. Check the app for anything agreed after this.
        </p>
      </header>

      <PackSection title="1 · Running order" count={`${data.timeline.length} events`}>
        <TimelineTable
          events={data.timeline}
          conflicts={data.conflicts}
          vendorName={vendorName}
          print
        />
      </PackSection>

      <PackSection title="2 · Vendor arrivals" count={`${data.schedule.length} vendors`}>
        <ScheduleTable rows={data.schedule} print />
      </PackSection>

      <PackSection title="3 · Who to call" count={`${data.contacts.length} people`}>
        <ContactTable rows={data.contacts} print />
      </PackSection>

      <PackSection title="4 · Seating" count={`${data.tables.length} tables`}>
        {data.tables.length === 0 ? (
          <p className="text-xs text-stone-400">No tables set.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 print:grid-cols-3">
            {data.tables.map((t) => (
              <div
                key={t.table_id}
                className="break-inside-avoid rounded border border-stone-300 px-2.5 py-2"
              >
                <p className="text-xs font-semibold text-stone-800">
                  {t.name}
                  <span className="ml-1 font-normal text-stone-500">
                    {t.seated_heads}/{t.capacity}
                  </span>
                </p>
                <ul className="mt-1 space-y-0.5">
                  {(seated.get(t.table_id ?? '') ?? []).map((name) => (
                    <li key={name} className="text-[10px] text-stone-600">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </PackSection>

      <PackSection title="5 · In the bags" count={`${packItems.length} items`}>
        {packItems.length === 0 ? (
          <p className="text-xs text-stone-400">Nothing marked as needed on the day.</p>
        ) : (
          <table className="w-full text-left">
            <tbody>
              {packItems.map((p) => (
                <tr key={p.id} className="border-b border-stone-100">
                  <td className="w-28 py-1 text-[11px] text-stone-500">
                    {String(p.container ?? '')}
                  </td>
                  <td className="py-1 text-[11px] text-stone-800">{p.name}</td>
                  <td className="w-10 py-1 text-right text-[11px] text-stone-500">
                    {String(p.qty ?? '')}
                  </td>
                  <td className="w-8 py-1 text-right">
                    <span className="inline-block size-3.5 border border-stone-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PackSection>

      <PackSection title="6 · If it goes wrong" count={`${data.risks.length} contingencies`}>
        <RiskTable rows={data.risks.filter((r) => (r.score ?? 0) >= 4)} print />
        <p className="mt-2 text-[10px] text-stone-400">
          Only the ones scoring 4 or more are printed. The full list is in the app.
        </p>
      </PackSection>
    </div>
  );
}

function PackSection({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    // break-before so each section starts on its own page when printed; a
    // running order split across a page boundary is the one thing worse than
    // no running order.
    <section className="mb-8 print:mb-4 print:break-before-page print:first:break-before-auto">
      <h2 className="mb-2 flex items-baseline justify-between border-b border-stone-400 pb-1">
        <span className="text-sm font-semibold tracking-wide text-stone-800 uppercase">
          {title}
        </span>
        <span className="text-[10px] text-stone-400">{count}</span>
      </h2>
      {children}
    </section>
  );
}
