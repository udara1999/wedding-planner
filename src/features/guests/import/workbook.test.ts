import { describe, expect, it } from 'vitest';
// Imported through Vite's ?raw rather than read with node:fs: the app's
// tsconfig has no node types, and adding them so one test can call
// readFileSync would let node globals into application code.
import csv from './fixtures/workbook-guests.csv?raw';
import { parseCsv } from '../../../lib/csv';
import { autoMapHeaders, buildImportPlan } from './plan';

/**
 * A golden fixture, in the spirit of ticket 2.9's 905,500 / 735,500 jewellery
 * assertion: known-good numbers from the real workbook, asserted end to end.
 *
 * fixtures/workbook-guests.csv was exported from the "09 Guests" sheet of
 * docs/Wedding PLanner.xlsx. That sheet carries its own totals on row 5 — 156
 * adults invited, 605,000 expected in cash gifts — which is what makes this a
 * fixture rather than just a file: if the export or the importer ever loses a
 * row or misreads a column, these numbers stop matching and something says so.
 *
 * THE HOUSEHOLD NAMES ARE REPLACED. Everything the importer's behaviour depends
 * on is byte-for-byte the workbook's — codes, groups, sides, categories, counts
 * and gift amounts, and therefore the totals — but this repository is public
 * and the real list is eighty named families. The unedited export lives in
 * docs/private/, which is gitignored.
 *
 * Note what this does NOT do: it does not put the list into the database. It is
 * one couple's guest list, not template content, so it goes into their wedding
 * through the normal import screen like anybody else's file.
 */

describe("the workbook's own guest list", () => {
  const grid = parseCsv(csv);
  const mapping = autoMapHeaders(grid[0]);
  const plan = buildImportPlan({ grid, mapping, existing: [], groups: [], decimals: 2 });

  it('maps every column the export writes', () => {
    // An unmapped column is a column of data silently dropped on import.
    expect(mapping).not.toContain(null);
  });

  it('reads all 80 households with nothing rejected', () => {
    expect(plan.fatal).toBeUndefined();
    expect(plan.summary).toMatchObject({ create: 80, update: 0, skip: 0, error: 0 });
  });

  it("agrees with the sheet's own total of 156 adults invited", () => {
    const adults = plan.rows.reduce((sum, r) => sum + (r.values.adults_invited ?? 0), 0);
    expect(adults).toBe(156);
  });

  it('has no children invited, as the sheet has none', () => {
    const children = plan.rows.reduce((sum, r) => sum + (r.values.children_invited ?? 0), 0);
    expect(children).toBe(0);
  });

  it("agrees with the sheet's own total of 605,000 in expected gifts", () => {
    const gifts = plan.rows.reduce((sum, r) => sum + (r.values.expected_gift_minor ?? 0), 0);
    // Minor units: 605,000 rupees is 60,500,000 cents.
    expect(gifts).toBe(60_500_000);
  });

  it('is entirely groom-side, which is what the workbook holds so far', () => {
    expect(new Set(plan.rows.map((r) => r.values.side))).toEqual(new Set(['groom']));
  });

  it('carries the five groups across, to be created on import', () => {
    // A set, not a list: the order is first appearance in the file, which is
    // the right behaviour but not something this fixture should pin down.
    expect(new Set(plan.groupsToCreate)).toEqual(
      new Set([
        'Family & Relatives',
        'Friends',
        'Friends - Ceyentra',
        'Friends - IFS',
        'Friends - SCL',
      ]),
    );
  });

  it('keeps the workbook codes, so a second import updates rather than duplicates', () => {
    expect(plan.rows[0].values.code).toBe('G001');
    expect(plan.rows.at(-1)?.values.code).toBe('G080');
    expect(new Set(plan.rows.map((r) => r.values.code)).size).toBe(80);
  });

  it('reads a household with four adults as four, not as "4.0"', () => {
    // Excel writes whole numbers as 4.0, which a strict count parser rejects,
    // so the export normalises them and this checks it kept doing so.
    const first = plan.rows.find((r) => r.values.code === 'G001');
    expect(first?.values.adults_invited).toBe(4);
    expect(first?.values.expected_gift_minor).toBe(1_000_000);
  });
});
