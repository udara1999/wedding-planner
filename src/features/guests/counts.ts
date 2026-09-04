import type { GuestRow, RsvpStatus } from './api';

export interface GuestCounts {
  households: number;
  invited: number;
  attending: number;
  accepted: number;
  declined: number;
  pending: number;
  responded: number;
  /** 0–1. Households that have given any answer, over households invited. */
  responseRate: number;
  needsRoom: number;
  needsTransport: number;
}

const RESPONDED: RsvpStatus[] = ['accepted', 'declined', 'maybe'];

/**
 * Ticket 4.4's numbers, in one place.
 *
 * Counts households AND heads, because they answer different questions: the
 * caterer needs heads, the invitation list needs households, and conflating
 * them is how a guest list quietly disagrees with a catering quote.
 *
 * "No response" counts as not responded, unlike 'maybe' — a maybe is an answer,
 * even if an unhelpful one.
 */
export function countGuests(guests: readonly GuestRow[]): GuestCounts {
  let invited = 0;
  let attending = 0;
  let accepted = 0;
  let declined = 0;
  let pending = 0;
  let responded = 0;
  let needsRoom = 0;
  let needsTransport = 0;

  for (const g of guests) {
    invited += g.total_invited ?? 0;
    // Only accepted households contribute heads: a declined household with
    // stale attending numbers must not inflate the caterer's count.
    if (g.rsvp_status === 'accepted') attending += g.total_attending ?? 0;

    if (g.rsvp_status === 'accepted') accepted += 1;
    if (g.rsvp_status === 'declined') declined += 1;
    if (g.rsvp_status === 'pending' || g.rsvp_status === 'no_response') pending += 1;
    if (RESPONDED.includes(g.rsvp_status)) responded += 1;

    if (g.needs_room) needsRoom += 1;
    if (g.needs_transport) needsTransport += 1;
  }

  return {
    households: guests.length,
    invited,
    attending,
    accepted,
    declined,
    pending,
    responded,
    responseRate: guests.length === 0 ? 0 : responded / guests.length,
    needsRoom,
    needsTransport,
  };
}
