import { describe, expect, it } from 'vitest';
import { TASK_VIEWS, countByView, describeDue, matchesView, type TaskLike } from './views';

/** A fixed "today" so these assertions do not change meaning overnight. */
const TODAY = '2026-09-04';

function task(over: Partial<TaskLike> = {}): TaskLike {
  return { status: 'not_started', due_date: null, ...over };
}

describe('matchesView', () => {
  it('overdue is anything past its date and not finished', () => {
    expect(matchesView(task({ due_date: '2026-09-03' }), 'overdue', TODAY)).toBe(true);
    expect(matchesView(task({ due_date: '2026-09-04' }), 'overdue', TODAY)).toBe(false);
    expect(matchesView(task({ due_date: '2026-09-05' }), 'overdue', TODAY)).toBe(false);
  });

  it('never calls a completed or cancelled task overdue', () => {
    // A task finished late is finished. Leaving it in the overdue list means
    // the number never goes down and people stop reading it.
    const late = { due_date: '2026-01-01' };
    expect(matchesView(task({ ...late, status: 'completed' }), 'overdue', TODAY)).toBe(false);
    expect(matchesView(task({ ...late, status: 'cancelled' }), 'overdue', TODAY)).toBe(false);
  });

  it('today is exactly today', () => {
    expect(matchesView(task({ due_date: TODAY }), 'today', TODAY)).toBe(true);
    expect(matchesView(task({ due_date: '2026-09-05' }), 'today', TODAY)).toBe(false);
  });

  it('this week includes anything overdue as well as the next seven days', () => {
    // Something due last Tuesday is part of this week's work whatever the
    // calendar says, and a week view that hides it is worse than useless.
    expect(matchesView(task({ due_date: '2026-08-30' }), 'this_week', TODAY)).toBe(true);
    expect(matchesView(task({ due_date: '2026-09-11' }), 'this_week', TODAY)).toBe(true);
    expect(matchesView(task({ due_date: '2026-09-12' }), 'this_week', TODAY)).toBe(false);
  });

  it('unscheduled is a task with no date at all', () => {
    expect(matchesView(task(), 'unscheduled', TODAY)).toBe(true);
    expect(matchesView(task({ due_date: TODAY }), 'unscheduled', TODAY)).toBe(false);
  });

  it('done covers completed and cancelled together', () => {
    expect(matchesView(task({ status: 'completed' }), 'done', TODAY)).toBe(true);
    expect(matchesView(task({ status: 'cancelled' }), 'done', TODAY)).toBe(true);
    expect(matchesView(task({ status: 'waiting' }), 'done', TODAY)).toBe(false);
  });

  it('open is everything still to do, dated or not', () => {
    expect(matchesView(task({ status: 'in_progress' }), 'open', TODAY)).toBe(true);
    expect(matchesView(task({ status: 'completed' }), 'open', TODAY)).toBe(false);
  });

  it('all means all', () => {
    expect(matchesView(task({ status: 'completed' }), 'all', TODAY)).toBe(true);
    expect(matchesView(task(), 'all', TODAY)).toBe(true);
  });
});

describe('countByView', () => {
  it('counts each view over one pass', () => {
    const counts = countByView(
      [
        task({ due_date: '2026-09-01' }),
        task({ due_date: TODAY }),
        task({ due_date: '2026-09-10' }),
        task({ status: 'completed', due_date: '2026-01-01' }),
        task(),
      ],
      TODAY,
    );
    expect(counts.overdue).toBe(1);
    expect(counts.today).toBe(1);
    expect(counts.this_week).toBe(3);
    expect(counts.unscheduled).toBe(1);
    expect(counts.done).toBe(1);
    expect(counts.all).toBe(5);
  });

  it('has an entry for every view the picker offers', () => {
    const counts = countByView([], TODAY);
    for (const view of TASK_VIEWS) {
      expect(counts[view.value]).toBe(0);
    }
  });
});

describe('describeDue', () => {
  it('says today and tomorrow rather than a date', () => {
    expect(describeDue(TODAY, TODAY)).toBe('today');
    expect(describeDue('2026-09-05', TODAY)).toBe('tomorrow');
    expect(describeDue('2026-09-03', TODAY)).toBe('yesterday');
  });

  it('counts days in the near term, in both directions', () => {
    expect(describeDue('2026-09-09', TODAY)).toBe('in 5 days');
    expect(describeDue('2026-08-30', TODAY)).toBe('5 days ago');
  });

  it('switches to weeks and then months as it gets further away', () => {
    expect(describeDue('2026-09-25', TODAY)).toBe('in 3 weeks');
    expect(describeDue('2026-12-04', TODAY)).toBe('in 3 months');
  });

  it('says nothing at all when there is no date', () => {
    expect(describeDue(null, TODAY)).toBeNull();
  });

  it('does not choke on a value that is not a date', () => {
    expect(describeDue('not a date', TODAY)).toBeNull();
  });

  it('uses singulars where they read better', () => {
    expect(describeDue('2026-09-11', TODAY)).toBe('in 1 week');
    expect(describeDue('2026-10-04', TODAY)).toBe('in 1 month');
  });
});
