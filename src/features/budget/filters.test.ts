import { describe, expect, it } from 'vitest';
import { EMPTY_FILTERS, matchesFilters, summarise, type BudgetLineLike } from './filters';

function line(over: Partial<BudgetLineLike> = {}): BudgetLineLike {
  return {
    id: 'x',
    code: 'BG001',
    name: 'Venue hire',
    category_id: 'cat-venue',
    applicability: 'required',
    budgeted_minor: 100,
    forecast_minor: 100,
    ...over,
  };
}

describe('matchesFilters', () => {
  it('keeps everything by default', () => {
    expect(matchesFilters(line(), EMPTY_FILTERS)).toBe(true);
  });

  it('filters by category', () => {
    const f = { ...EMPTY_FILTERS, categoryId: 'cat-venue' };
    expect(matchesFilters(line({ category_id: 'cat-venue' }), f)).toBe(true);
    expect(matchesFilters(line({ category_id: 'cat-food' }), f)).toBe(false);
  });

  it('filters by applicability', () => {
    const f = { ...EMPTY_FILTERS, applicability: 'not_applicable' as const };
    expect(matchesFilters(line({ applicability: 'not_applicable' }), f)).toBe(true);
    expect(matchesFilters(line({ applicability: 'required' }), f)).toBe(false);
  });

  it('searches the name case-insensitively', () => {
    const f = { ...EMPTY_FILTERS, search: 'VENUE' };
    expect(matchesFilters(line({ name: 'Venue hire' }), f)).toBe(true);
    expect(matchesFilters(line({ name: 'Cake' }), f)).toBe(false);
  });

  /** The workbook's codes are how people refer to a line out loud. */
  it('searches the code too', () => {
    const f = { ...EMPTY_FILTERS, search: 'bg077' };
    expect(matchesFilters(line({ code: 'BG077', name: 'Necklace' }), f)).toBe(true);
    expect(matchesFilters(line({ code: 'BG001', name: 'Necklace' }), f)).toBe(false);
  });

  it('tolerates a line with no code', () => {
    expect(matchesFilters(line({ code: null }), { ...EMPTY_FILTERS, search: 'bg' })).toBe(false);
  });

  it('requires every active filter to match, not any', () => {
    const f = { ...EMPTY_FILTERS, categoryId: 'cat-venue', applicability: 'required' as const };
    expect(matchesFilters(line({ category_id: 'cat-venue', applicability: 'required' }), f)).toBe(
      true,
    );
    expect(matchesFilters(line({ category_id: 'cat-venue', applicability: 'optional' }), f)).toBe(
      false,
    );
  });
});

describe('summarise', () => {
  it('adds up what the server already computed', () => {
    const s = summarise([
      line({ budgeted_minor: 26000000, forecast_minor: 26000000 }),
      line({ budgeted_minor: 4000000, forecast_minor: 0, applicability: 'not_applicable' }),
    ]);
    expect(s.budgetedMinor).toBe(30000000);
    expect(s.forecastMinor).toBe(26000000);
  });

  /**
   * forecast_minor is a generated column. Re-deriving it here would put the
   * §4.2 precedence rule in two places, so this asserts the total is the sum of
   * what the row already carries — even when that looks "wrong" for the inputs.
   */
  it('never re-derives forecast from the other amounts', () => {
    const s = summarise([line({ budgeted_minor: 500, forecast_minor: 7 })]);
    expect(s.forecastMinor).toBe(7);
  });

  it('counts lines and the not-applicable ones', () => {
    const s = summarise([
      line(),
      line({ applicability: 'not_applicable' }),
      line({ applicability: 'not_applicable' }),
    ]);
    expect(s.count).toBe(3);
    expect(s.notApplicableCount).toBe(2);
  });

  it('reports zeroes for an empty list rather than NaN', () => {
    expect(summarise([])).toEqual({
      budgetedMinor: 0,
      forecastMinor: 0,
      varianceMinor: 0,
      count: 0,
      notApplicableCount: 0,
    });
  });

  /**
   * forecast_minor is a generated column, and PostgREST types every generated
   * column as nullable even though this one is computed from NOT NULL inputs
   * and cannot be null in practice. Treating an absent value as zero keeps the
   * total honest rather than producing NaN.
   */
  it('treats a null forecast as zero rather than poisoning the total', () => {
    const s = summarise([
      line({ budgeted_minor: 100, forecast_minor: null }),
      line({ budgeted_minor: 100, forecast_minor: 40 }),
    ]);
    expect(s.forecastMinor).toBe(40);
    expect(s.budgetedMinor).toBe(200);
  });

  it('reports variance as forecast minus budget', () => {
    const s = summarise([line({ budgeted_minor: 100, forecast_minor: 175 })]);
    expect(s.varianceMinor).toBe(75);
  });
});
