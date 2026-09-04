import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Clock } from 'lucide-react';
import { SEVERITY_LABEL, SEVERITY_ORDER, SEVERITY_TONE, useAlerts, type AlertRow } from './api';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  InlineError,
  SkeletonRows,
  cn,
} from '../../components/ui';

/**
 * Tickets 7.1, 7.2 and 7.5. The panel the workbook says to read every time.
 *
 * Its own header: "read this every time you open the workbook". That only
 * works if everything on it is worth reading, which is why the view gates four
 * of the alerts on time and why this shows the quiet ones behind a toggle
 * rather than in the list. A panel with twenty rows saying "0" trains people
 * to skip the panel.
 *
 * Every row is a link, and the link carries the filter (7.5). "Four tasks
 * overdue" that lands you on the whole task list has made you do the filtering
 * twice — once to read the alert and once to act on it.
 */
export function AlertsPanel({ weddingId }: { weddingId: string }) {
  const alerts = useAlerts(weddingId);
  const [showQuiet, setShowQuiet] = useState(false);

  const rows = useMemo(() => alerts.data ?? [], [alerts.data]);
  const active = useMemo(
    () =>
      rows
        .filter((a) => a.active)
        .sort(
          (a, b) =>
            SEVERITY_ORDER.indexOf(a.severity ?? 'low') -
              SEVERITY_ORDER.indexOf(b.severity ?? 'low') ||
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        ),
    [rows],
  );

  // Two different reasons a row is quiet, and the difference matters: nothing
  // to report, versus not yet time to ask.
  const clear = rows.filter((a) => !a.active && a.gate_open);
  const waiting = rows.filter((a) => !a.gate_open);

  const bySeverity = useMemo(() => {
    const map = new Map<string, AlertRow[]>();
    for (const a of active) {
      const key = a.severity ?? 'low';
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return SEVERITY_ORDER.filter((s) => map.has(s)).map((s) => ({
      severity: s,
      items: map.get(s)!,
    }));
  }, [active]);

  return (
    <Card className={cn('mb-5', active.some((a) => a.severity === 'critical') && 'border-red-200')}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>
          {active.length === 0 ? 'Nothing needs your attention' : 'Needs your attention'}
        </CardTitle>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="tabular text-xs text-stone-500">
              {active.length} of {rows.length} checks
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowQuiet((v) => !v)}
            className="focus-ring rounded text-xs text-wine-700 underline underline-offset-2"
          >
            {showQuiet ? 'Hide the quiet ones' : 'Show every check'}
          </button>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        {alerts.isError && <InlineError error={alerts.error} />}

        {alerts.isLoading ? (
          <SkeletonRows rows={4} />
        ) : active.length === 0 ? (
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <span>
              All {clear.length} checks that apply today came back clear.
              {waiting.length > 0 && ` ${waiting.length} more start once the wedding is closer.`}
            </span>
          </p>
        ) : (
          <div className="space-y-4">
            {bySeverity.map(({ severity, items }) => (
              <div key={severity}>
                <p className="mb-1.5 flex items-center gap-2 text-xs sm:text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
                  <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABEL[severity]}</Badge>
                </p>
                <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
                  {items.map((a) => (
                    <li key={a.code}>
                      <Link
                        to={a.deep_link ?? '.'}
                        className="focus-ring group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-stone-50"
                      >
                        <span
                          className={cn(
                            'tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs sm:text-[11px] font-semibold',
                            severity === 'critical'
                              ? 'bg-red-50 text-red-700'
                              : severity === 'high'
                                ? 'bg-amber-50 text-amber-700'
                                : severity === 'medium'
                                  ? 'bg-gold-50 text-gold-700'
                                  : 'bg-stone-100 text-stone-500',
                          )}
                        >
                          {a.count}
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-stone-800">{a.message}</span>
                        <ChevronRight className="size-4 shrink-0 text-stone-500 transition-colors group-hover:text-wine-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {showQuiet && (
          <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
            {clear.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs sm:text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
                  Checked, nothing to report
                </p>
                <ul className="space-y-1">
                  {clear.map((a) => (
                    <li key={a.code} className="flex items-start gap-2 text-xs text-stone-500">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      {a.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 7.2, made visible. A gated alert that simply is not shown looks
                like an alert nobody thought of. */}
            {waiting.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs sm:text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
                  Starts closer to the day
                </p>
                <ul className="space-y-1">
                  {waiting.map((a) => (
                    <li key={a.code} className="flex items-start gap-2 text-xs text-stone-500">
                      <Clock className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {a.message}
                        <span className="ml-1 text-stone-500">
                          (
                          {a.gate === 'inside_14'
                            ? 'from 14 days out'
                            : a.gate === 'inside_45'
                              ? 'from 45 days out'
                              : 'after the wedding'}
                          )
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * The same data, one line, for the top of another screen. Used nowhere yet;
 * kept because 7.5's deep links make the panel worth reaching from more than
 * the dashboard, and because it is three lines.
 */
export function AlertsSummaryLine({ weddingId }: { weddingId: string }) {
  const alerts = useAlerts(weddingId);
  const active = (alerts.data ?? []).filter((a) => a.active);
  if (active.length === 0) return null;

  const critical = active.filter((a) => a.severity === 'critical').length;

  return (
    <Link
      to="."
      className="focus-ring mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 hover:bg-amber-100"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        {active.length} {active.length === 1 ? 'thing needs' : 'things need'} your attention
        {critical > 0 && `, ${critical} of them urgently`}.
      </span>
      <ArrowRight className="size-4 shrink-0" />
    </Link>
  );
}
