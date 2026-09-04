import { AlertTriangle, Check, PhoneOff } from 'lucide-react';
import {
  LEVEL_LABEL,
  clock,
  phaseOrder,
  scoreTone,
  type ConflictRow,
  type ContactSheetRow,
  type RiskRow,
  type ScheduleRow,
  type TimelineRow,
} from './api';
import { Badge, cn } from '../../components/ui';

/**
 * The day-of tables, as components used by both the screens and the printable
 * pack (8.6).
 *
 * Written once rather than twice on purpose. A print stylesheet over a
 * duplicate set of markup is how the printed pack and the screen drift, and
 * the printed one is the copy that matters — R8 says so: "Printable pack is
 * the real mitigation; PWA cache is secondary."
 *
 * `print` mode drops the interactive controls and tightens the spacing. It
 * does not change what is shown, because a coordinator holding paper needs
 * more of the detail, not less.
 */

export function TimelineTable({
  events,
  conflicts,
  vendorName,
  print,
  onToggleDone,
  onOpen,
}: {
  events: TimelineRow[];
  conflicts: ConflictRow[];
  vendorName: (id: string | null) => string | null;
  print?: boolean;
  onToggleDone?: (event: TimelineRow) => void;
  onOpen?: (event: TimelineRow) => void;
}) {
  const clashing = new Set<string>();
  for (const c of conflicts) {
    if (c.event_id) clashing.add(c.event_id);
    if (c.clashes_with_id) clashing.add(c.clashes_with_id);
  }

  const phases = [...new Set(events.map((e) => e.phase ?? 'Other'))].sort(
    (a, b) => phaseOrder(a) - phaseOrder(b),
  );

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const rows = events
          .filter((e) => (e.phase ?? 'Other') === phase)
          .sort(
            (a, b) =>
              (a.starts_at ?? '99').localeCompare(b.starts_at ?? '99') ||
              a.sort_order - b.sort_order,
          );
        return (
          <section key={phase} className="break-inside-avoid">
            <h3
              className={cn(
                'mb-1 border-b border-stone-200 pb-1 text-xs font-semibold tracking-wide text-stone-600 uppercase',
                print && 'text-[10px]',
              )}
            >
              {phase}
              <span className="ml-2 font-normal text-stone-500">
                {clock(rows[0]?.starts_at)}–{clock(rows.at(-1)?.ends_at)}
              </span>
            </h3>
            <table className="w-full text-left">
              <tbody>
                {rows.map((e) => {
                  const muted = e.applicability === 'not_applicable';
                  return (
                    <tr
                      key={e.id}
                      onClick={onOpen ? () => onOpen(e) : undefined}
                      className={cn(
                        'border-b border-stone-100 align-top',
                        onOpen && 'cursor-pointer hover:bg-stone-50/70',
                        muted && 'text-stone-500',
                        clashing.has(e.id) && !muted && 'bg-amber-50/60',
                      )}
                    >
                      <td
                        className={cn(
                          'tabular w-24 py-1.5 whitespace-nowrap',
                          print ? 'text-[11px]' : 'text-xs',
                        )}
                      >
                        <span className="font-medium text-stone-800">{clock(e.starts_at)}</span>
                        {e.ends_at && <span className="text-stone-500">–{clock(e.ends_at)}</span>}
                      </td>
                      <td className={cn('py-1.5 pr-2', print ? 'text-[11px]' : 'text-sm')}>
                        <span className={cn(muted && 'line-through decoration-stone-300')}>
                          {e.name}
                        </span>
                        {clashing.has(e.id) && !muted && (
                          <AlertTriangle
                            className="ml-1 inline size-3 text-amber-600"
                            aria-label="Clashes with another event"
                          />
                        )}
                        {e.notes && !print && (
                          <span className="block text-[11px] text-stone-500">{e.notes}</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'w-28 py-1.5 pr-2 text-stone-500',
                          print ? 'text-[11px]' : 'text-xs',
                        )}
                      >
                        {e.who}
                      </td>
                      <td
                        className={cn(
                          'w-32 py-1.5 pr-2 text-stone-500',
                          print ? 'text-[11px]' : 'text-xs',
                        )}
                      >
                        {e.location}
                        {vendorName(e.vendor_id) && (
                          <span className="block text-stone-500">{vendorName(e.vendor_id)}</span>
                        )}
                      </td>
                      <td className="w-10 py-1.5 text-right">
                        {print ? (
                          // A box to tick with a pen. The whole point of the
                          // printed pack is that it works without a device.
                          <span className="inline-block size-3.5 border border-stone-400" />
                        ) : (
                          <button
                            type="button"
                            aria-label={e.done ? 'Mark not done' : 'Mark done'}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              onToggleDone?.(e);
                            }}
                            className={cn(
                              'focus-ring flex size-5 items-center justify-center rounded border',
                              e.done
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-stone-300 hover:border-emerald-500',
                            )}
                          >
                            {e.done && <Check className="size-3" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}

export function ScheduleTable({
  rows,
  print,
  onCheck,
}: {
  rows: ScheduleRow[];
  print?: boolean;
  onCheck?: (vendorId: string, field: 'checked_in_at' | 'checked_out_at', value: boolean) => void;
}) {
  const text = print ? 'text-[11px]' : 'text-xs';
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-stone-200 text-[10px] tracking-wide text-stone-500 uppercase">
          <th className="py-1 pr-2 font-semibold">Arrives</th>
          <th className="py-1 pr-2 font-semibold">Vendor</th>
          <th className="py-1 pr-2 font-semibold">Where</th>
          <th className="py-1 pr-2 font-semibold">Phone</th>
          <th className="py-1 pr-2 font-semibold">Setup by</th>
          <th className="py-1 pr-2 font-semibold">Leaves</th>
          <th className="py-1 text-center font-semibold">In</th>
          <th className="py-1 text-center font-semibold">Out</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => (
          <tr key={v.vendor_id} className="border-b border-stone-100 align-top">
            <td className={cn('tabular w-16 py-1.5 pr-2 font-medium text-stone-800', text)}>
              {clock(v.arrival_time)}
            </td>
            <td className={cn('py-1.5 pr-2', print ? 'text-[11px]' : 'text-sm')}>
              <span className="text-stone-900">{v.name}</span>
              <span className="block text-[11px] text-stone-500">{v.category}</span>
            </td>
            <td className={cn('py-1.5 pr-2 text-stone-500', text)}>{v.where_in_venue}</td>
            <td className={cn('tabular py-1.5 pr-2', text)}>
              {v.no_phone ? (
                <span className="inline-flex items-center gap-1 text-red-700">
                  <PhoneOff className="size-3" /> none
                </span>
              ) : print ? (
                <span className="text-stone-700">{v.phone}</span>
              ) : (
                <a href={`tel:${v.phone}`} className="text-wine-700 hover:underline">
                  {v.phone}
                </a>
              )}
              {v.contact_name && (
                <span className="block text-[11px] text-stone-500">{v.contact_name}</span>
              )}
            </td>
            <td className={cn('tabular w-16 py-1.5 pr-2 text-stone-500', text)}>
              {clock(v.setup_done_by)}
            </td>
            <td className={cn('tabular w-16 py-1.5 pr-2 text-stone-500', text)}>
              {clock(v.finish_time)}
            </td>
            {(['checked_in_at', 'checked_out_at'] as const).map((field) => {
              const on = field === 'checked_in_at' ? v.checked_in : v.checked_out;
              const at = field === 'checked_in_at' ? v.checked_in_at : v.checked_out_at;
              return (
                <td key={field} className="w-12 py-1.5 text-center">
                  {print ? (
                    <span className="inline-block size-3.5 border border-stone-400" />
                  ) : (
                    <button
                      type="button"
                      aria-label={`${field === 'checked_in_at' ? 'Check in' : 'Check out'} ${v.name}`}
                      title={at ? new Date(at).toLocaleTimeString() : undefined}
                      onClick={() => v.vendor_id && onCheck?.(v.vendor_id, field, !on)}
                      className={cn(
                        'focus-ring mx-auto flex size-5 items-center justify-center rounded border',
                        on
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-stone-300 hover:border-emerald-500',
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ContactTable({ rows, print }: { rows: ContactSheetRow[]; print?: boolean }) {
  const groups = [...new Set(rows.map((r) => r.group_label ?? 'Other'))];
  const text = print ? 'text-[11px]' : 'text-xs';

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section key={group} className="break-inside-avoid">
          <h3 className="mb-1 border-b border-stone-200 pb-1 text-xs font-semibold tracking-wide text-stone-600 uppercase">
            {group}
          </h3>
          <table className="w-full text-left">
            <tbody>
              {rows
                .filter((r) => (r.group_label ?? 'Other') === group)
                .map((r) => (
                  <tr key={`${r.source}-${r.source_id}`} className="border-b border-stone-100">
                    <td className={cn('py-1.5 pr-2', print ? 'text-[11px]' : 'text-sm')}>
                      <span className="text-stone-900">{r.name}</span>
                      {r.role && <span className="block text-[11px] text-stone-500">{r.role}</span>}
                    </td>
                    <td className={cn('tabular w-36 py-1.5 pr-2', text)}>
                      {r.no_number ? (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <PhoneOff className="size-3" /> no number
                        </span>
                      ) : print ? (
                        <span className="text-stone-800">{r.phone}</span>
                      ) : (
                        <a href={`tel:${r.phone}`} className="text-wine-700 hover:underline">
                          {r.phone}
                        </a>
                      )}
                    </td>
                    <td className={cn('tabular w-32 py-1.5 text-stone-500', text)}>
                      {r.backup_phone}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

export function RiskTable({
  rows,
  print,
  onPrevented,
  onOpen,
}: {
  rows: RiskRow[];
  print?: boolean;
  onPrevented?: (risk: RiskRow) => void;
  onOpen?: (risk: RiskRow) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          onClick={onOpen ? () => onOpen(r) : undefined}
          className={cn(
            'break-inside-avoid rounded-xl border border-stone-200 px-3 py-2.5',
            onOpen && 'cursor-pointer hover:bg-stone-50/70',
            r.applicability === 'not_applicable' && 'opacity-50',
          )}
        >
          <div className="flex items-start gap-2">
            <Badge tone={scoreTone(r.score ?? 0)}>{r.score}</Badge>
            <div className="min-w-0 flex-1">
              <p className={cn('text-stone-900', print ? 'text-[11px]' : 'text-sm')}>{r.name}</p>
              <p className="text-[11px] text-stone-500">
                {r.area} · {LEVEL_LABEL[r.likelihood]} likelihood · {LEVEL_LABEL[r.impact]} impact
                {r.owner && ` · ${r.owner}`}
              </p>
            </div>
            {print ? (
              <span className="mt-0.5 inline-block size-3.5 shrink-0 border border-stone-400" />
            ) : (
              <button
                type="button"
                aria-label={r.prevention_done ? 'Mark prevention not done' : 'Mark prevention done'}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrevented?.(r);
                }}
                className={cn(
                  'focus-ring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
                  r.prevention_done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-stone-300 hover:border-emerald-500',
                )}
              >
                {r.prevention_done && <Check className="size-3" />}
              </button>
            )}
          </div>

          <dl className={cn('mt-1.5 space-y-0.5', print ? 'text-[10px]' : 'text-xs')}>
            {r.prevent_by && (
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-medium text-stone-500">Prevent:</dt>
                <dd className="min-w-0 text-stone-600">{r.prevent_by}</dd>
              </div>
            )}
            {r.if_it_happens && (
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-medium text-stone-500">If it happens:</dt>
                <dd className="min-w-0 text-stone-600">{r.if_it_happens}</dd>
              </div>
            )}
            {r.who_to_call && (
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-medium text-stone-500">Call:</dt>
                <dd className="min-w-0 text-stone-600">{r.who_to_call}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
