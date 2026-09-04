import type { Applicability } from '../../types/db';

/**
 * The subset of a budget line these helpers need. Narrower than the row type so
 * the tests can build one without inventing twenty money columns.
 */
export interface BudgetLineLike {
  id: string;
  code: string | null;
  name: string;
  category_id: string | null;
  applicability: Applicability;
  budgeted_minor: number;
  /**
   * Nullable because PostgREST types every generated column that way, even
   * though this one is computed from NOT NULL inputs and never is null.
   */
  forecast_minor: number | null;
}

export interface BudgetFilters {
  categoryId: string | 'all';
  applicability: Applicability | 'all';
  search: string;
  /**
   * Ticket 7.5. Lines forecast to come in above what was budgeted for them —
   * the question the "budget lines are over" alert links here to ask.
   */
  overBudgetOnly: boolean;
}

export const EMPTY_FILTERS: BudgetFilters = {
  categoryId: 'all',
  applicability: 'all',
  search: '',
  overBudgetOnly: false,
};

/** Every active filter must match. */
export function matchesFilters(line: BudgetLineLike, filters: BudgetFilters): boolean {
  if (filters.categoryId !== 'all' && line.category_id !== filters.categoryId) return false;
  if (filters.applicability !== 'all' && line.applicability !== filters.applicability) return false;

  // A not-applicable line forecasts zero, so it can never be over — including
  // it would put struck-off rows in a list of problems.
  if (filters.overBudgetOnly) {
    if (line.applicability === 'not_applicable') return false;
    if ((line.forecast_minor ?? 0) <= line.budgeted_minor) return false;
  }

  const needle = filters.search.trim().toLowerCase();
  if (needle) {
    // Code as well as name: the workbook's BG077 is how a line gets referred to.
    const haystack = `${line.code ?? ''} ${line.name}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export interface BudgetSummary {
  budgetedMinor: number;
  forecastMinor: number;
  varianceMinor: number;
  count: number;
  notApplicableCount: number;
}

/**
 * Totals for whatever is currently on screen.
 *
 * `forecast_minor` is read, never recomputed. It is a stored generated column,
 * and re-deriving the §4.2 precedence here would put that rule in two places
 * where they could drift apart — the database is the only definition of it.
 */
export function summarise(lines: readonly BudgetLineLike[]): BudgetSummary {
  let budgetedMinor = 0;
  let forecastMinor = 0;
  let notApplicableCount = 0;

  for (const line of lines) {
    budgetedMinor += line.budgeted_minor;
    forecastMinor += line.forecast_minor ?? 0;
    if (line.applicability === 'not_applicable') notApplicableCount += 1;
  }

  return {
    budgetedMinor,
    forecastMinor,
    varianceMinor: forecastMinor - budgetedMinor,
    count: lines.length,
    notApplicableCount,
  };
}
