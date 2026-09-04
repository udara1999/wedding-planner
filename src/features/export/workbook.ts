import type { Sheet } from '../../lib/xlsx';
import { formatMinorAsMajor } from '../../lib/units';

/**
 * Ticket 9.2. "Round-trips the workbook shape — the exit-hatch that earns
 * trust."
 *
 * The shape matters as much as the contents. Somebody exporting this is either
 * leaving, backing up, or sending figures to a parent who works in Excel, and
 * in all three cases the file should look like the workbook they started from:
 * the same sheet names, the same column order, money as plain numbers.
 *
 * MONEY IS EXPORTED AS MAJOR UNITS. Internally everything is integer minor
 * units (plan R5), and exporting 26000000 for a 260,000-rupee necklace would
 * be technically faithful and useless. Formatted with the currency's own
 * decimals, as a number rather than a string, so it still sums in Excel.
 *
 * A pure function taking already-fetched rows: the whole thing is then
 * testable, which for an export is the difference between trusting it and
 * opening it every time to check.
 */

export interface ExportInput {
  currency: string;
  decimals: number;
  wedding: {
    bride_name?: string | null;
    groom_name?: string | null;
    wedding_date?: string | null;
    venue_name?: string | null;
    total_budget_minor?: number | null;
  };
  financials?: Record<string, unknown> | null;
  reconciliation?: Record<string, unknown> | null;
  budgetLines?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  contributions?: Record<string, unknown>[];
  vendors?: Record<string, unknown>[];
  guests?: Record<string, unknown>[];
  tasks?: Record<string, unknown>[];
  timeline?: Record<string, unknown>[];
  risks?: Record<string, unknown>[];
  responsibilities?: Record<string, unknown>[];
}

/** Minor units to a number Excel will sum. Null stays blank, never zero. */
function money(minor: unknown, decimals: number): number | null {
  if (minor === null || minor === undefined || minor === '') return null;
  const n = Number(minor);
  if (!Number.isFinite(n)) return null;
  // Through the string formatter rather than dividing: the whole point of
  // integer minor units is that no money ever touches a float, and this is the
  // last place it would be tempting.
  return Number(formatMinorAsMajor(n, decimals));
}

const str = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v);

const bool = (v: unknown): boolean | null => (v === null || v === undefined ? null : Boolean(v));

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function buildWorkbook(input: ExportInput): Sheet[] {
  const { decimals, currency } = input;
  const m = (v: unknown) => money(v, decimals);
  const sheets: Sheet[] = [];

  // ------------------------------------------------------------- START HERE
  // A key/value sheet rather than a table, because that is what the workbook's
  // own first sheet is and it is where anybody opening this looks first.
  const f = input.financials ?? {};
  const r = input.reconciliation ?? {};
  sheets.push({
    name: '01 START HERE',
    columns: [
      { header: 'Figure', width: 34 },
      { header: `Value (${currency})`, width: 18 },
    ],
    rows: [
      ['Bride', str(input.wedding.bride_name)],
      ['Groom', str(input.wedding.groom_name)],
      ['Wedding date', str(input.wedding.wedding_date)],
      ['Venue', str(input.wedding.venue_name)],
      [null, null],
      ['Total budget', m(input.wedding.total_budget_minor)],
      ['Forecast final cost', m(f.forecast_minor)],
      ['Paid so far', m(f.paid_minor)],
      ['Still to pay', m(f.outstanding_minor)],
      ['Left in budget', m(f.remaining_against_budget_minor)],
      [null, null],
      ['Contributions agreed', m(f.contributions_agreed_minor)],
      ['Contributions received', m(f.contributions_received_minor)],
      ['Gifts expected', m(f.expected_gifts_minor)],
      ['Gifts received', m(f.gifts_received_minor)],
      ['Net cost after gifts', m(f.net_cost_after_gifts_minor)],
      ['Shortfall still to fund', m(f.shortfall_minor)],
      [null, null],
      ['TRUE COST (spent + still owed)', m(r.true_cost_minor)],
      ['NET COST (less money received)', m(r.net_cost_minor)],
      ['Cost per guest', m(r.cost_per_guest_minor)],
      ['Guests who came', num(r.guests_attending)],
      ['Refundable deposits still out', m(r.refundable_out_minor)],
    ],
  });

  // ---------------------------------------------------------------- 03 Budget
  sheets.push({
    name: '03 Budget',
    columns: [
      { header: 'Code', width: 10 },
      { header: 'Line item', width: 40 },
      { header: 'Applies', width: 12 },
      { header: 'Who pays', width: 14 },
      { header: `Budgeted (${currency})` },
      { header: `Quoted (${currency})` },
      { header: `Negotiated (${currency})` },
      { header: `Actual (${currency})` },
      { header: `Forecast (${currency})` },
      { header: `Paid (${currency})` },
      { header: `Outstanding (${currency})` },
      { header: 'Status', width: 14 },
      { header: 'Notes', width: 40 },
    ],
    rows: (input.budgetLines ?? []).map((l) => [
      str(l.code),
      str(l.name),
      str(l.applicability),
      str(l.payer),
      m(l.budgeted_minor),
      m(l.quoted_minor),
      m(l.negotiated_minor),
      m(l.actual_minor),
      m(l.forecast_minor),
      m(l.paid_minor),
      m(l.outstanding_minor),
      str(l.status),
      str(l.notes),
    ]),
  });

  // -------------------------------------------------------------- 04 Payments
  sheets.push({
    name: '04 Payments',
    columns: [
      { header: 'Stage', width: 18 },
      { header: 'Raised on' },
      { header: `Due (${currency})` },
      { header: 'Due date' },
      { header: `Paid (${currency})` },
      { header: 'Paid on' },
      { header: 'Status', width: 12 },
      { header: 'Method', width: 14 },
      { header: 'Reference', width: 18 },
      { header: 'Paid by', width: 14 },
      { header: 'Notes', width: 30 },
    ],
    rows: (input.payments ?? []).map((p) => [
      str(p.stage),
      str(p.raised_on),
      m(p.amount_due_minor),
      str(p.due_date),
      m(p.amount_paid_minor),
      str(p.paid_on),
      str(p.status),
      str(p.method),
      str(p.reference),
      str(p.paid_by),
      str(p.notes),
    ]),
  });

  // -------------------------------------------------------- 06 Contributions
  sheets.push({
    name: '06 Contributions',
    columns: [
      { header: 'From', width: 26 },
      { header: 'Relationship', width: 18 },
      { header: `Agreed (${currency})` },
      { header: `Received (${currency})` },
      { header: 'Received on' },
      { header: 'Notes', width: 30 },
    ],
    rows: (input.contributions ?? []).map((c) => [
      str(c.contributor),
      str(c.relationship),
      m(c.agreed_minor),
      m(c.received_minor),
      str(c.received_on),
      str(c.notes),
    ]),
  });

  // ------------------------------------------------------------- 05 Vendors
  sheets.push({
    name: '05 Vendors',
    columns: [
      { header: 'Category', width: 20 },
      { header: 'Vendor', width: 26 },
      { header: 'Contact', width: 20 },
      { header: 'Phone', width: 16 },
      { header: 'Email', width: 24 },
      { header: 'Status', width: 14 },
      { header: 'Contract signed' },
      { header: `Quoted (${currency})` },
      { header: `Negotiated (${currency})` },
      { header: 'Arrival time' },
      { header: 'Notes', width: 30 },
    ],
    rows: (input.vendors ?? []).map((v) => [
      str(v.category),
      str(v.name),
      str(v.contact_name),
      str(v.phone),
      str(v.email),
      str(v.status),
      bool(v.contract_signed),
      m(v.quoted_minor),
      m(v.negotiated_minor),
      str(v.arrival_time),
      str(v.notes),
    ]),
  });

  // -------------------------------------------------------------- 09 Guests
  sheets.push({
    name: '09 Guests',
    columns: [
      { header: 'Code', width: 10 },
      { header: 'Household', width: 30 },
      { header: 'Relationship', width: 18 },
      { header: 'Side', width: 10 },
      { header: 'Category', width: 16 },
      { header: 'Adults invited' },
      { header: 'Children invited' },
      { header: 'Phone', width: 16 },
      { header: 'Email', width: 24 },
      { header: 'City', width: 16 },
      { header: 'RSVP', width: 12 },
      { header: 'Adults coming' },
      { header: 'Children coming' },
      { header: 'Dietary', width: 20 },
      { header: `Gift expected (${currency})` },
      { header: `Gift received (${currency})` },
      { header: 'Thank-you sent' },
    ],
    rows: (input.guests ?? []).map((g) => [
      str(g.code),
      str(g.household_name),
      str(g.relationship),
      str(g.side),
      str(g.category),
      num(g.adults_invited),
      num(g.children_invited),
      str(g.phone),
      str(g.email),
      str(g.city),
      str(g.rsvp_status),
      num(g.adults_attending),
      num(g.children_attending),
      str(g.dietary),
      m(g.expected_gift_minor),
      m(g.gift_received_minor),
      bool(g.thank_you_sent),
    ]),
  });

  // --------------------------------------------------------------- 07 Tasks
  sheets.push({
    name: '07 Tasks',
    columns: [
      { header: 'Area', width: 20 },
      { header: 'Task', width: 50 },
      { header: 'Owner', width: 16 },
      { header: 'Priority', width: 12 },
      { header: 'Due date' },
      { header: 'Status', width: 14 },
      { header: 'Notes', width: 30 },
    ],
    rows: (input.tasks ?? []).map((t) => [
      str(t.category),
      str(t.task),
      str(t.owner),
      str(t.priority),
      str(t.due_date),
      str(t.status),
      str(t.notes),
    ]),
  });

  // ---------------------------------------------------------- 20 Day Timeline
  sheets.push({
    name: '20 Day Timeline',
    columns: [
      { header: 'Phase', width: 14 },
      { header: 'Starts' },
      { header: 'Ends' },
      { header: 'Minutes' },
      { header: 'What happens', width: 50 },
      { header: 'Who', width: 16 },
      { header: 'Where', width: 18 },
      { header: 'Applies', width: 12 },
      { header: 'Done' },
    ],
    rows: (input.timeline ?? []).map((e) => [
      str(e.phase),
      str(e.starts_at),
      str(e.ends_at),
      num(e.duration_minutes),
      str(e.name),
      str(e.who),
      str(e.location),
      str(e.applicability),
      bool(e.done),
    ]),
  });

  // ------------------------------------------------------- 19 Responsibilities
  sheets.push({
    name: '19 Responsibilities',
    columns: [
      { header: 'Area', width: 16 },
      { header: 'Activity', width: 46 },
      { header: 'Does it', width: 16 },
      { header: 'Owns it', width: 16 },
      { header: 'Consulted', width: 16 },
      { header: 'Informed', width: 16 },
      { header: 'Person', width: 20 },
      { header: 'Phone', width: 16 },
    ],
    rows: (input.responsibilities ?? []).map((x) => [
      str(x.area),
      str(x.activity),
      str(x.responsible),
      str(x.accountable),
      str(x.consulted),
      str(x.informed),
      str(x.person_name),
      str(x.phone),
    ]),
  });

  // ------------------------------------------------------- 24 Emergency Plan
  sheets.push({
    name: '24 Emergency Plan',
    columns: [
      { header: 'Area', width: 16 },
      { header: 'What could go wrong', width: 44 },
      { header: 'Likelihood' },
      { header: 'Impact' },
      { header: 'Score' },
      { header: 'Prevent it by', width: 50 },
      { header: 'If it happens', width: 50 },
      { header: 'Whose job', width: 18 },
      { header: 'Who to call', width: 20 },
      { header: 'Prevention done' },
    ],
    rows: (input.risks ?? []).map((x) => [
      str(x.area),
      str(x.name),
      num(x.likelihood),
      num(x.impact),
      num(x.score),
      str(x.prevent_by),
      str(x.if_it_happens),
      str(x.owner),
      str(x.who_to_call),
      bool(x.prevention_done),
    ]),
  });

  return sheets;
}

/** A file name somebody can find again in six months. */
export function exportFileName(input: ExportInput): string {
  const names = [input.wedding.bride_name, input.wedding.groom_name]
    .filter(Boolean)
    .join('-and-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `wedding-${names || 'export'}-${stamp}.xlsx`;
}
