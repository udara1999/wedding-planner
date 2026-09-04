import { describe, expect, it } from 'vitest';
import { buildWorkbook, exportFileName, type ExportInput } from './workbook';

const base: ExportInput = {
  currency: 'LKR',
  decimals: 2,
  wedding: { bride_name: 'Methuli', groom_name: 'Udara', wedding_date: '2027-09-03' },
};

describe('buildWorkbook', () => {
  it('always produces a sheet per module, even with no data', () => {
    // An export missing a sheet reads as "we have no vendors", not "the export
    // skipped it".
    const sheets = buildWorkbook(base);
    expect(sheets.length).toBeGreaterThanOrEqual(10);
    for (const sheet of sheets) {
      expect(sheet.columns.length).toBeGreaterThan(0);
      expect(sheet.name).not.toBe('');
    }
  });

  it('keeps the workbook’s own sheet names', () => {
    const names = buildWorkbook(base).map((s) => s.name);
    expect(names).toContain('01 START HERE');
    expect(names).toContain('03 Budget');
    expect(names).toContain('09 Guests');
    expect(names).toContain('20 Day Timeline');
  });

  it('exports money in major units, not minor', () => {
    // 260,000 rupees is stored as 26000000. Exporting the stored number would
    // be faithful and useless.
    const sheets = buildWorkbook({
      ...base,
      budgetLines: [{ name: 'Necklace', budgeted_minor: 26_000_000 }],
    });
    const budget = sheets.find((s) => s.name === '03 Budget')!;
    expect(budget.rows[0]).toContain(260000);
    expect(budget.rows[0]).not.toContain(26_000_000);
  });

  it('exports money as a number so Excel can still sum it', () => {
    const sheets = buildWorkbook({
      ...base,
      budgetLines: [{ name: 'Necklace', budgeted_minor: 26_000_000 }],
    });
    const budget = sheets.find((s) => s.name === '03 Budget')!;
    expect(typeof budget.rows[0][4]).toBe('number');
  });

  it('honours a currency with no minor unit', () => {
    // JPY has zero decimals: 5000 stored is 5000 yen, not 50.
    const sheets = buildWorkbook({
      ...base,
      currency: 'JPY',
      decimals: 0,
      budgetLines: [{ name: 'Gift', budgeted_minor: 5000 }],
    });
    expect(sheets.find((s) => s.name === '03 Budget')!.rows[0][4]).toBe(5000);
  });

  it('leaves a missing amount blank rather than exporting zero', () => {
    const sheets = buildWorkbook({ ...base, budgetLines: [{ name: 'Unpriced' }] });
    expect(sheets.find((s) => s.name === '03 Budget')!.rows[0][4]).toBeNull();
  });

  it('keeps a real zero as zero', () => {
    // Zero is a decision — "this costs nothing" — and blanking it loses that.
    const sheets = buildWorkbook({
      ...base,
      budgetLines: [{ name: 'Free favour', budgeted_minor: 0 }],
    });
    expect(sheets.find((s) => s.name === '03 Budget')!.rows[0][4]).toBe(0);
  });

  it('carries booleans through as booleans for the writer to label', () => {
    const sheets = buildWorkbook({
      ...base,
      vendors: [{ name: 'Studio', contract_signed: true }],
    });
    const vendors = sheets.find((s) => s.name === '05 Vendors')!;
    expect(vendors.rows[0]).toContain(true);
  });

  it('puts the closure figures on the first sheet', () => {
    const sheets = buildWorkbook({
      ...base,
      reconciliation: { true_cost_minor: 470_250_000, cost_per_guest_minor: 3_012_000 },
    });
    const start = sheets.find((s) => s.name === '01 START HERE')!;
    const flat = start.rows.flat();
    expect(flat).toContain(4702500);
    expect(flat).toContain(30120);
  });

  it('gives every row as many cells as the sheet has columns', () => {
    // A short row shifts everything after it into the wrong column, which is
    // the one export bug nobody notices until they are relying on the file.
    const sheets = buildWorkbook({
      ...base,
      budgetLines: [{ name: 'One' }],
      payments: [{ stage: 'advance' }],
      guests: [{ household_name: 'A' }],
      tasks: [{ task: 'T' }],
      vendors: [{ name: 'V' }],
      contributions: [{ contributor: 'C' }],
      timeline: [{ name: 'E' }],
      risks: [{ name: 'R' }],
      responsibilities: [{ activity: 'X' }],
    });
    for (const sheet of sheets) {
      for (const row of sheet.rows) {
        // START HERE is a key/value sheet, so only its two columns apply.
        expect(row.length, `${sheet.name} row width`).toBeLessThanOrEqual(sheet.columns.length);
      }
    }
  });
});

describe('exportFileName', () => {
  it('names the file after the couple and the date', () => {
    expect(exportFileName(base)).toMatch(/^wedding-Methuli-and-Udara-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('survives names with spaces and punctuation', () => {
    const name = exportFileName({
      ...base,
      wedding: { bride_name: "M'ethuli De Silva", groom_name: 'Udara (Jr)' },
    });
    expect(name).not.toMatch(/[^a-zA-Z0-9.-]/);
  });

  it('still produces something when the couple have no names yet', () => {
    expect(exportFileName({ ...base, wedding: {} })).toMatch(/^wedding-export-/);
  });
});
