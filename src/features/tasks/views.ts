import type { TaskStatus } from '../../types/db';

export type TaskView =
  'all' | 'open' | 'overdue' | 'today' | 'this_week' | 'next_month' | 'unscheduled' | 'done';

/** Only what the view logic reads, so the tests need no full row. */
export interface TaskLike {
  status: TaskStatus;
  due_date: string | null;
}

export const TASK_VIEWS: { value: TaskView; label: string }[] = [
  { value: 'open', label: 'Still to do' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'this_week', label: 'This week' },
  { value: 'next_month', label: 'Next 30 days' },
  { value: 'unscheduled', label: 'No date set' },
  { value: 'done', label: 'Finished' },
  { value: 'all', label: 'Everything' },
];

/**
 * Ticket 5.2's views.
 *
 * `today` is passed in rather than read from the clock so that these are
 * ordinary functions with ordinary tests — a date-dependent filter that reads
 * `new Date()` internally can only be tested by mocking time, and gets quietly
 * wrong at midnight and in another timezone.
 *
 * The dates involved are `date` columns, not timestamps: comparing the ISO
 * strings directly is exact, and avoids the timezone shift that
 * `new Date('2026-09-04')` introduces by parsing as UTC midnight.
 */
export function matchesView(task: TaskLike, view: TaskView, today: string): boolean {
  const finished = task.status === 'completed' || task.status === 'cancelled';
  const due = task.due_date;

  switch (view) {
    case 'all':
      return true;
    case 'done':
      return finished;
    case 'open':
      return !finished;
    case 'unscheduled':
      return !finished && !due;
    case 'overdue':
      return !finished && Boolean(due) && due! < today;
    case 'today':
      return !finished && due === today;
    // Both windows include what is already late. Work that slipped is this
    // week's problem whatever the calendar says, and a view that hides it is
    // the one place someone would look and be reassured wrongly.
    case 'this_week':
      return !finished && Boolean(due) && due! <= addDays(today, 7);
    case 'next_month':
      return !finished && Boolean(due) && due! <= addDays(today, 30);
    default:
      return true;
  }
}

/** One pass for every view, so the picker can show counts without eight filters. */
export function countByView(tasks: readonly TaskLike[], today: string): Record<TaskView, number> {
  const counts = Object.fromEntries(TASK_VIEWS.map((v) => [v.value, 0])) as Record<
    TaskView,
    number
  >;
  for (const task of tasks) {
    for (const { value } of TASK_VIEWS) {
      if (matchesView(task, value, today)) counts[value] += 1;
    }
  }
  return counts;
}

/** '2026-09-04' + 7 -> '2026-09-11'. UTC throughout, so no day is skipped. */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * "in 5 days", "3 weeks ago". Relative, because that is the question being
 * asked: an exact date means counting on your fingers to find out whether it
 * matters yet. The exact date is still shown beside it.
 */
export function describeDue(due: string | null, today: string): string | null {
  if (!due) return null;
  const days = daysBetween(today, due);
  if (days === null) return null;

  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';

  const ahead = days > 0;
  const n = Math.abs(days);
  const phrase = (value: number, unit: string) => `${value} ${unit}${value === 1 ? '' : 's'}`;

  // Thresholds at a week and a month, so "in 1 week" and "in 1 month" are
  // reachable. Wider ones read worse and make the singular branch dead code —
  // at a 14-day threshold the smallest week value is 2.
  let text: string;
  if (n < 7) text = phrase(n, 'day');
  else if (n < 30) text = phrase(Math.round(n / 7), 'week');
  else text = phrase(Math.round(n / 30), 'month');

  return ahead ? `in ${text}` : `${text} ago`;
}
