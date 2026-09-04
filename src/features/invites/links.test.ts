import { describe, expect, it } from 'vitest';
import { buildInviteMessage, buildRsvpUrl, toWhatsAppNumber, whatsAppLink } from './links';

describe('toWhatsAppNumber', () => {
  it('turns a local Sri Lankan mobile into an international one', () => {
    expect(toWhatsAppNumber('0771234567', '94')).toBe('94771234567');
  });

  it('ignores spaces, dashes and brackets', () => {
    expect(toWhatsAppNumber('077 123 4567', '94')).toBe('94771234567');
    expect(toWhatsAppNumber('077-123-4567', '94')).toBe('94771234567');
    expect(toWhatsAppNumber('(077) 123 4567', '94')).toBe('94771234567');
  });

  it('keeps a number already in international form', () => {
    expect(toWhatsAppNumber('+94771234567', '94')).toBe('94771234567');
    expect(toWhatsAppNumber('94771234567', '94')).toBe('94771234567');
  });

  it('handles the 00 international prefix', () => {
    expect(toWhatsAppNumber('0094771234567', '94')).toBe('94771234567');
  });

  it('leaves a foreign number alone', () => {
    // A guest flying in from London. Their number already carries its own
    // country code, and prefixing 94 would make it undialable.
    expect(toWhatsAppNumber('+447700900123', '94')).toBe('447700900123');
  });

  it('rejects anything too short to be a phone number', () => {
    expect(toWhatsAppNumber('123', '94')).toBeNull();
    expect(toWhatsAppNumber('', '94')).toBeNull();
    expect(toWhatsAppNumber(null, '94')).toBeNull();
  });

  it('rejects a number that is only punctuation', () => {
    expect(toWhatsAppNumber('---', '94')).toBeNull();
  });

  it('does not double a country code that is already there', () => {
    // '94' followed by a local number starting 0 is a real shape people type.
    expect(toWhatsAppNumber('940771234567', '94')).toBe('94771234567');
  });
});

describe('buildRsvpUrl', () => {
  it('builds an absolute link on the app origin', () => {
    expect(buildRsvpUrl('https://plan.example.com', 'abc-123')).toBe(
      'https://plan.example.com/rsvp/abc-123',
    );
  });

  it('does not double a trailing slash', () => {
    expect(buildRsvpUrl('https://plan.example.com/', 'abc-123')).toBe(
      'https://plan.example.com/rsvp/abc-123',
    );
  });

  it('encodes a token rather than trusting it', () => {
    expect(buildRsvpUrl('https://x.test', 'a b')).toBe('https://x.test/rsvp/a%20b');
  });
});

describe('buildInviteMessage', () => {
  const base = {
    householdName: 'Nayana nanda',
    coupleNames: 'Methuli & Udara',
    weddingDate: '2027-09-03',
    venue: 'Hotel Suisse, Kandy',
    rsvpUrl: 'https://x.test/rsvp/tok',
  };

  it('names the household and the couple', () => {
    const msg = buildInviteMessage(base);
    expect(msg).toContain('Nayana nanda');
    expect(msg).toContain('Methuli & Udara');
  });

  it('includes the link, because the link is the point', () => {
    expect(buildInviteMessage(base)).toContain('https://x.test/rsvp/tok');
  });

  it('writes the date the way a person reads it', () => {
    expect(buildInviteMessage(base)).toContain('3 September 2027');
  });

  it('leaves out the venue line when there is no venue', () => {
    const msg = buildInviteMessage({ ...base, venue: null });
    expect(msg).not.toContain('Hotel Suisse');
    expect(msg).not.toMatch(/\n\n\n/);
  });

  it('includes a personal line when the couple adds one', () => {
    expect(buildInviteMessage({ ...base, note: 'Do come early for the poruwa.' })).toContain(
      'Do come early for the poruwa.',
    );
  });

  it('adds no blank line when the personal line is empty', () => {
    expect(buildInviteMessage({ ...base, note: '   ' })).toBe(buildInviteMessage(base));
  });

  it('leaves out the date when there is none, rather than saying null', () => {
    const msg = buildInviteMessage({ ...base, weddingDate: null });
    expect(msg.toLowerCase()).not.toContain('null');
    expect(msg).not.toContain('Invalid');
  });
});

describe('whatsAppLink', () => {
  it('builds a wa.me link with the message encoded', () => {
    const link = whatsAppLink('0771234567', 'Hello there', '94');
    expect(link).toMatch(/^https:\/\/wa\.me\/94771234567\?text=/);
    expect(link).toContain(encodeURIComponent('Hello there'));
  });

  it('returns null when there is no usable number', () => {
    expect(whatsAppLink(null, 'Hello', '94')).toBeNull();
  });
});
