import { describe, expect, it } from 'vitest';
import { countGuests } from './counts';
import type { GuestRow } from './api';

function guest(over: Partial<GuestRow> = {}): GuestRow {
  return {
    id: crypto.randomUUID(),
    rsvp_status: 'pending',
    adults_invited: 2,
    children_invited: 0,
    total_invited: 2,
    adults_attending: 0,
    children_attending: 0,
    total_attending: 0,
    needs_room: false,
    needs_transport: false,
    ...over,
  } as GuestRow;
}

describe('countGuests', () => {
  it('reports zeroes for an empty list rather than NaN', () => {
    const c = countGuests([]);
    expect(c.households).toBe(0);
    expect(c.invited).toBe(0);
    expect(c.responseRate).toBe(0);
  });

  it('counts households and heads separately', () => {
    const c = countGuests([
      guest({ total_invited: 4 }),
      guest({ total_invited: 3 }),
    ]);
    expect(c.households).toBe(2);
    expect(c.invited).toBe(7);
  });

  /**
   * The trap this guards: a household that accepted for four, then declined,
   * still has adults_attending set. Counting its heads would inflate the
   * caterer's number with people who told you they are not coming.
   */
  it('does not count heads from a household that declined', () => {
    const c = countGuests([
      guest({ rsvp_status: 'accepted', total_attending: 4 }),
      guest({ rsvp_status: 'declined', total_attending: 3 }),
    ]);
    expect(c.attending).toBe(4);
  });

  it('does not count heads from a household that has not answered', () => {
    const c = countGuests([guest({ rsvp_status: 'pending', total_attending: 5 })]);
    expect(c.attending).toBe(0);
  });

  it('treats a maybe as answered, because it is an answer', () => {
    const c = countGuests([guest({ rsvp_status: 'maybe' })]);
    expect(c.responded).toBe(1);
    expect(c.pending).toBe(0);
  });

  it('treats no-response as still outstanding, unlike a maybe', () => {
    const c = countGuests([guest({ rsvp_status: 'no_response' })]);
    expect(c.responded).toBe(0);
    expect(c.pending).toBe(1);
  });

  it('reports the response rate over households, not heads', () => {
    const c = countGuests([
      guest({ rsvp_status: 'accepted', total_invited: 10 }),
      guest({ rsvp_status: 'pending', total_invited: 1 }),
    ]);
    expect(c.responseRate).toBe(0.5);
  });

  it('counts rooms and transport by household', () => {
    const c = countGuests([
      guest({ needs_room: true, needs_transport: true }),
      guest({ needs_room: true }),
      guest(),
    ]);
    expect(c.needsRoom).toBe(2);
    expect(c.needsTransport).toBe(1);
  });

  it('tolerates the null totals a generated column has in the types', () => {
    const c = countGuests([
      guest({ total_invited: null, total_attending: null, rsvp_status: 'accepted' }),
    ]);
    expect(c.invited).toBe(0);
    expect(c.attending).toBe(0);
  });
});
