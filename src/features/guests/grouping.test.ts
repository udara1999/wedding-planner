import { describe, expect, it } from 'vitest';
import { groupGuests, type GroupMode } from './grouping';
import type { GuestRow } from './api';

function guest(over: Partial<GuestRow> & { household_name: string }): GuestRow {
  return {
    id: over.household_name,
    group_id: null,
    category: null,
    side: null,
    total_invited: 2,
    total_attending: 0,
    rsvp_status: 'pending',
    ...over,
  } as GuestRow;
}

const groups = [
  { id: 'g1', name: 'Family & Relatives', sort_order: 1 },
  { id: 'g2', name: 'Friends', sort_order: 2 },
];

const run = (guests: GuestRow[], mode: GroupMode = 'group') => groupGuests(guests, groups, mode);

describe('groupGuests by group', () => {
  it('puts each household under its group, in the groups own order', () => {
    const result = run([
      guest({ household_name: 'B', group_id: 'g2' }),
      guest({ household_name: 'A', group_id: 'g1' }),
    ]);
    expect(result.map((s) => s.label)).toEqual(['Family & Relatives', 'Friends']);
    expect(result[0].guests.map((g) => g.household_name)).toEqual(['A']);
  });

  it('leaves out a group with nobody in it', () => {
    const result = run([guest({ household_name: 'A', group_id: 'g1' })]);
    expect(result.map((s) => s.label)).toEqual(['Family & Relatives']);
  });

  it('collects the ungrouped into their own section, last', () => {
    const result = run([
      guest({ household_name: 'loose' }),
      guest({ household_name: 'A', group_id: 'g1' }),
    ]);
    expect(result.map((s) => s.label)).toEqual(['Family & Relatives', 'No group']);
  });

  it('puts a household whose group has been deleted with the ungrouped', () => {
    // group_id survives a deleted group only if the FK did not clear it, but a
    // stale id must not make a household vanish from the list entirely.
    const result = run([guest({ household_name: 'orphan', group_id: 'gone' })]);
    expect(result.map((s) => s.label)).toEqual(['No group']);
    expect(result[0].guests).toHaveLength(1);
  });

  it('totals households, heads invited and heads coming per section', () => {
    const result = run([
      guest({
        household_name: 'A',
        group_id: 'g1',
        total_invited: 4,
        total_attending: 3,
        rsvp_status: 'accepted',
      }),
      guest({ household_name: 'B', group_id: 'g1', total_invited: 2 }),
    ]);
    expect(result[0]).toMatchObject({ households: 2, invited: 6, attending: 3 });
  });

  it('counts heads coming only for households that accepted', () => {
    // A declined household can carry stale attending numbers; they must not
    // reach a caterer's count.
    const result = run([
      guest({
        household_name: 'A',
        group_id: 'g1',
        total_invited: 4,
        total_attending: 4,
        rsvp_status: 'declined',
      }),
    ]);
    expect(result[0].attending).toBe(0);
  });
});

describe('groupGuests by other modes', () => {
  it('groups by category, alphabetically', () => {
    const result = run(
      [
        guest({ household_name: 'A', category: 'Relatives' }),
        guest({ household_name: 'B', category: 'Immediate Family' }),
      ],
      'category',
    );
    expect(result.map((s) => s.label)).toEqual(['Immediate Family', 'Relatives']);
  });

  it('groups by side with the sides in a fixed order', () => {
    const result = run(
      [
        guest({ household_name: 'A', side: 'groom' }),
        guest({ household_name: 'B', side: 'bride' }),
        guest({ household_name: 'C', side: 'both' }),
      ],
      'side',
    );
    expect(result.map((s) => s.label)).toEqual(["Bride's side", "Groom's side", 'Shared']);
  });

  it('does not let a category swallow the ungrouped section', () => {
    // The ungrouped households are collected separately rather than under a
    // reserved key, so there is no string a person could type as a category
    // that would put them in the wrong section.
    const result = run(
      [
        guest({ household_name: 'typed', category: 'ungrouped' }),
        guest({ household_name: 'genuinely without' }),
      ],
      'category',
    );
    expect(result.map((s) => s.label)).toEqual(['ungrouped', 'No category']);
    expect(result[0].guests.map((g) => g.household_name)).toEqual(['typed']);
    expect(result[1].guests.map((g) => g.household_name)).toEqual(['genuinely without']);
  });

  it('returns one section for none, so the list renders the same way', () => {
    const result = run([guest({ household_name: 'A' }), guest({ household_name: 'B' })], 'none');
    expect(result).toHaveLength(1);
    expect(result[0].guests).toHaveLength(2);
    expect(result[0].label).toBe('All households');
  });

  it('keeps the order it was given inside a section', () => {
    // The query sorts by household_name; re-sorting here would silently
    // override that.
    const result = run(
      [guest({ household_name: 'Zoe' }), guest({ household_name: 'Amal' })],
      'none',
    );
    expect(result[0].guests.map((g) => g.household_name)).toEqual(['Zoe', 'Amal']);
  });
});
