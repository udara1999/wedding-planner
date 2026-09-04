import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check, CircleCheck, Clock, Hourglass } from 'lucide-react';
import { useCountdown, useSetCountdownDone, useUpdateCountdown, type CountdownRow } from './api';
import { useOwnerOptions } from '../weddings/lookups';
import { describeDue } from '../tasks/views';
import type { MyWedding } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  InlineError,
  Page,
  PageHeader,
  Select,
  SkeletonRows,
  Stat,
  cn,
} from '../../components/ui';

function todayIso(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * Ticket 5.4. The workbook's "08 Countdown" sheet: fifty-nine checks grouped
 * into windows that run from a month out to the morning after.
 *
 * Ordered by the template's own seq, never by date. The windows are a sequence
 * — thirty days, the week, the day before, the morning, the day after — and
 * sorting by due date would reorder them the moment one check had no date, or
 * two windows landed on the same day, which for the last three they nearly
 * always do.
 *
 * Nothing here is a task in the 5.1 sense. These are things to check rather
 * than work to do, they are ticked and not assigned a status, and they only
 * become relevant inside their window. So the window you are in is open and
 * the rest are folded away.
 */
export function CountdownPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const canEdit = wedding.role === 'owner' || wedding.role === 'partner';

  const checks = useCountdown(wedding.id);
  const owners = useOwnerOptions(wedding.id);
  const setDone = useSetCountdownDone(wedding.id);
  const update = useUpdateCountdown(wedding.id);

  const [hideDone, setHideDone] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string> | null>(null);

  const today = todayIso();
  const rows = useMemo(() => checks.data ?? [], [checks.data]);

  /** Windows in template order, each keeping its own first-seen position. */
  const windows = useMemo(() => {
    const buckets = new Map<string, CountdownRow[]>();
    for (const c of rows) {
      const key = c.window_label?.trim() || 'Everything else';
      const list = buckets.get(key);
      if (list) list.push(c);
      else buckets.set(key, [c]);
    }
    return [...buckets.entries()].map(([label, items]) => {
      const done = items.filter((i) => i.done).length;
      // The window's own moment, taken from the earliest date in it. Used only
      // to decide which window is the current one.
      const dates = items.map((i) => i.due_date).filter(Boolean) as string[];
      const starts = dates.length > 0 ? dates.sort()[0] : null;
      const ends = dates.length > 0 ? dates.sort().at(-1)! : null;
      return {
        label,
        items,
        done,
        total: items.length,
        starts,
        // Current once its first date has arrived and while its last has not
        // passed. Anything still unticked in a past window is overdue.
        past: Boolean(ends && ends < today),
        started: Boolean(starts && starts <= today),
      };
    });
  }, [rows, today]);

  // Default: everything folded except the window in play and anything overdue.
  // Computed lazily off the data rather than in an effect, so the page does not
  // render once wrong and then correct itself.
  const effectiveCollapsed = useMemo(() => {
    if (collapsed) return collapsed;
    const next = new Set<string>();
    for (const w of windows) {
      const relevant = w.started && (!w.past || w.done < w.total);
      if (!relevant && w.total > 0) next.add(w.label);
    }
    // If nothing is relevant yet — the wedding is a year out — open the first
    // window rather than presenting a screen of closed drawers.
    if (next.size === windows.length && windows.length > 0) next.delete(windows[0].label);
    return next;
  }, [collapsed, windows]);

  const totals = useMemo(() => {
    const done = rows.filter((c) => c.done).length;
    const late = rows.filter((c) => !c.done && c.due_date !== null && c.due_date < today).length;
    return { done, late, total: rows.length };
  }, [rows, today]);

  if (checks.isError) {
    return (
      <Page width="default">
        <PageHeader title="Countdown" />
        <ErrorState error={checks.error} onRetry={() => void checks.refetch()} />
      </Page>
    );
  }

  return (
    <Page width="default">
      <PageHeader
        title="Countdown"
        description="The last month, window by window, down to the morning after. Things to check rather than work to do."
        actions={
          <Button variant="secondary" onClick={() => setHideDone((h) => !h)}>
            {hideDone ? 'Show ticked' : 'Hide ticked'}
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Checked off"
          value={`${totals.done} of ${totals.total}`}
          icon={<CircleCheck className="size-3.5" />}
          tone={totals.total > 0 && totals.done === totals.total ? 'good' : undefined}
        />
        <Stat
          label="Past its window"
          value={totals.late}
          icon={<Clock className="size-3.5" />}
          tone={totals.late > 0 ? 'bad' : 'good'}
          hint={totals.late > 0 ? 'still unticked' : 'nothing hanging over'}
        />
        <Stat
          label="Windows"
          value={windows.length}
          icon={<Hourglass className="size-3.5" />}
          hint="thirty days out to the day after"
        />
      </div>

      {checks.isLoading ? (
        <Card>
          <CardBody className="pt-5">
            <SkeletonRows rows={10} />
          </CardBody>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardBody className="pt-5">
            <EmptyState
              icon={<Hourglass className="size-5" />}
              title="No countdown yet"
              description="Seeding the wedding brings in the workbook’s countdown checks."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {windows.map((w) => {
            const isCollapsed = effectiveCollapsed.has(w.label);
            const items = hideDone ? w.items.filter((i) => !i.done) : w.items;
            const complete = w.done === w.total;
            return (
              <Card
                key={w.label}
                className={cn(
                  w.started && !complete && !w.past && 'border-wine-300 ring-1 ring-wine-100',
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed(() => {
                      const next = new Set(effectiveCollapsed);
                      if (next.has(w.label)) next.delete(w.label);
                      else next.add(w.label);
                      return next;
                    })
                  }
                  className="focus-ring flex w-full items-center gap-3 px-5 py-3 text-left"
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                      complete
                        ? 'bg-emerald-50 text-emerald-600'
                        : w.past
                          ? 'bg-red-50 text-red-600'
                          : w.started
                            ? 'bg-wine-100 text-wine-700'
                            : 'bg-stone-100 text-stone-400',
                    )}
                  >
                    {complete ? <Check className="size-3.5" /> : `${w.total - w.done}`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {w.label}
                    </span>
                    <span className="block truncate text-xs text-stone-400">
                      {w.done} of {w.total} checked
                      {w.starts && ` · ${describeDue(w.starts, today) ?? w.starts}`}
                    </span>
                  </span>
                  {w.past && !complete && <Badge tone="stop">window passed</Badge>}
                  {w.started && !w.past && !complete && <Badge tone="accent">now</Badge>}
                  {complete && <Badge tone="good">done</Badge>}
                </button>

                {!isCollapsed && (
                  <CardBody className="border-t border-stone-100 px-0 pt-0 pb-0">
                    {items.length === 0 ? (
                      <p className="px-5 py-3 text-xs text-stone-400">
                        Everything in this window is ticked.
                      </p>
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {items.map((c) => (
                          <li key={c.id} className="flex items-start gap-3 px-5 py-2.5">
                            <button
                              type="button"
                              aria-label={c.done ? 'Untick' : 'Tick'}
                              disabled={!canEdit}
                              onClick={() => setDone.mutate({ id: c.id, done: !c.done })}
                              className={cn(
                                'focus-ring mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                c.done
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-stone-300 hover:border-emerald-500',
                              )}
                            >
                              {c.done && <Check className="size-3" />}
                            </button>
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  'block text-sm',
                                  c.done
                                    ? 'text-stone-400 line-through decoration-stone-300'
                                    : 'text-stone-800',
                                )}
                              >
                                {c.check_text}
                              </span>
                              {c.due_date && (
                                <span className="block text-[11px] text-stone-400">
                                  {describeDue(c.due_date, today)} · {c.due_date}
                                </span>
                              )}
                            </span>
                            {/* Who is checking it. A countdown item with nobody
                                against it gets done by whoever remembers. */}
                            <Select
                              className="w-32 shrink-0"
                              aria-label={`Who checks: ${c.check_text}`}
                              disabled={!canEdit}
                              value={c.owner ?? ''}
                              onChange={(e) =>
                                update.mutate({
                                  id: c.id,
                                  patch: { owner: e.target.value || null },
                                })
                              }
                            >
                              <option value="">Nobody</option>
                              {(owners.data ?? []).map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                              {c.owner && !(owners.data ?? []).includes(c.owner) && (
                                <option value={c.owner}>{c.owner}</option>
                              )}
                            </Select>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-3">
        <InlineError error={setDone.error ?? update.error} />
      </div>
    </Page>
  );
}
