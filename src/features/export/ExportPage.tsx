import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Download, FileSpreadsheet } from 'lucide-react';
import { buildWorkbook, exportFileName } from './workbook';
import { downloadXlsx } from '../../lib/xlsx';
import { useBudgetLines, useWeddingFinancials } from '../budget/api';
import { usePayments } from '../payments/api';
import { useContributions } from '../contributions/api';
import { useVendors } from '../vendors/vendorsApi';
import { useGuests } from '../guests/api';
import { useTasks } from '../tasks/api';
import { useRisks, useTimeline } from '../dayof/api';
import { useResponsibilities } from '../responsibilities/api';
import { useReconciliation } from './api';
import { useWedding } from '../weddings/api';
import { currencyDecimals, formatMoney } from '../../lib/units';
import type { MyWedding } from '../../types/db';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  InlineError,
  Page,
  PageHeader,
  Section,
  Stat,
} from '../../components/ui';

/**
 * Ticket 9.2. "Round-trips the workbook shape — the exit-hatch that earns
 * trust."
 *
 * The reasoning behind putting this on its own screen rather than hiding it in
 * a settings menu: a couple who can see the export button believe they can
 * leave, and a couple who believe they can leave are the ones who stay. It is
 * also the honest answer to "what happens to my data" — this, in one click.
 */
export function ExportPage() {
  const { wedding } = useOutletContext<{ wedding: MyWedding }>();
  const currency = wedding.currency ?? 'LKR';
  const decimals = currencyDecimals(currency);

  const detail = useWedding(wedding.id);
  const financials = useWeddingFinancials(wedding.id);
  const reconciliation = useReconciliation(wedding.id);
  const budgetLines = useBudgetLines(wedding.id);
  const payments = usePayments(wedding.id);
  const contributions = useContributions(wedding.id);
  const vendors = useVendors(wedding.id);
  const guests = useGuests(wedding.id);
  const tasks = useTasks(wedding.id);
  const timeline = useTimeline(wedding.id);
  const risks = useRisks(wedding.id);
  const responsibilities = useResponsibilities(wedding.id);

  const [problem, setProblem] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const loading =
    budgetLines.isLoading ||
    payments.isLoading ||
    guests.isLoading ||
    tasks.isLoading ||
    vendors.isLoading;

  const input = {
    currency,
    decimals,
    wedding: {
      bride_name: wedding.bride_name,
      groom_name: wedding.groom_name,
      wedding_date: wedding.wedding_date,
      venue_name: detail.data?.venue_name,
      total_budget_minor: detail.data?.total_budget_minor,
    },
    financials: financials.data as Record<string, unknown> | null,
    reconciliation: reconciliation.data as Record<string, unknown> | null,
    budgetLines: budgetLines.data as unknown as Record<string, unknown>[] | undefined,
    payments: payments.data as unknown as Record<string, unknown>[] | undefined,
    contributions: contributions.data as unknown as Record<string, unknown>[] | undefined,
    vendors: vendors.data as unknown as Record<string, unknown>[] | undefined,
    guests: guests.data as unknown as Record<string, unknown>[] | undefined,
    tasks: tasks.data as unknown as Record<string, unknown>[] | undefined,
    timeline: timeline.data as unknown as Record<string, unknown>[] | undefined,
    risks: risks.data as unknown as Record<string, unknown>[] | undefined,
    responsibilities: responsibilities.data as unknown as Record<string, unknown>[] | undefined,
  };

  const sheets = buildWorkbook(input);
  const r = reconciliation.data;

  function download() {
    setProblem(null);
    try {
      downloadXlsx(exportFileName(input), sheets);
      setDone(true);
    } catch (e) {
      // Building a workbook is pure and cannot fail on data, but the browser
      // can refuse a download, and silently doing nothing is the worst
      // possible response on the one screen that is about trust.
      setProblem(e);
    }
  }

  return (
    <Page width="default">
      <PageHeader
        title="Export everything"
        description="One spreadsheet with every sheet the original workbook had. Yours to keep, whatever happens to this app."
      />

      {/* 9.1's closure figures, which are the reason most people come here. */}
      {r && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label={`True cost (${currency})`}
            value={formatMoney(Number(r.true_cost_minor ?? 0), decimals)}
            hint="spent plus still owed"
          />
          <Stat
            label={`Net cost (${currency})`}
            value={formatMoney(Number(r.net_cost_minor ?? 0), decimals)}
            hint="less money actually received"
          />
          <Stat
            label={`Per guest (${currency})`}
            value={
              r.cost_per_guest_minor === null
                ? '—'
                : formatMoney(Number(r.cost_per_guest_minor), decimals)
            }
            hint={`${r.guests_attending ?? 0} came`}
          />
          <Stat
            label={`Deposits still out (${currency})`}
            value={formatMoney(Number(r.refundable_out_minor ?? 0), decimals)}
            tone={Number(r.refundable_out_minor ?? 0) > 0 ? 'bad' : 'good'}
            hint="reported, never netted off"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>The spreadsheet</CardTitle>
          <Badge tone="neutral">{sheets.length} sheets</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {sheets.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-sm text-stone-600">
                <FileSpreadsheet className="size-3.5 shrink-0 text-stone-400" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="tabular shrink-0 text-[11px] text-stone-400">
                  {s.rows.length} {s.rows.length === 1 ? 'row' : 'rows'}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
            <Button icon={<Download className="size-4" />} disabled={loading} onClick={download}>
              {loading ? 'Gathering everything…' : 'Download the spreadsheet'}
            </Button>
            {done && <span className="text-sm text-emerald-700">Saved to your downloads.</span>}
            <InlineError error={problem} />
          </div>

          <Section title="What is in it">
            <ul className="space-y-1.5 text-sm text-stone-600">
              <li>
                <span className="font-medium text-stone-800">Amounts are real numbers</span>, in
                rupees rather than cents, so Excel still adds them up.
              </li>
              <li>
                <span className="font-medium text-stone-800">
                  The sheet names match the workbook
                </span>{' '}
                — 03 Budget, 09 Guests, 20 Day Timeline — so anybody who used that will know where
                to look.
              </li>
              <li>
                A missing amount is left blank rather than exported as zero. Nothing in the file
                claims a figure that was never entered.
              </li>
              <li>
                It is built in your browser. Nothing is uploaded to make it, and no service sees
                your guest list.
              </li>
            </ul>
          </Section>
        </CardBody>
      </Card>
    </Page>
  );
}
