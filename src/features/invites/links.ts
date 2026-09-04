/**
 * Ticket 4.10. Turning a household into something you can actually send.
 *
 * The WhatsApp half is the half that will be used. An invitation in Sri Lanka
 * goes out on WhatsApp, to a number that was typed into a spreadsheet in
 * whatever form the person who typed it felt like — 077 123 4567, +94 77 123
 * 4567, 0094771234567. wa.me accepts exactly one of those forms, so the
 * normalising below is the whole feature working or not working.
 */

/** Below this, it is a typo or an extension, not a phone number. */
const MIN_DIGITS = 7;

/**
 * A phone number as wa.me wants it: digits only, country code included, no
 * leading plus or zeros.
 *
 * The one judgement call is telling a local number from a foreign one. A
 * leading 0 means local, so the 0 is swapped for the wedding's country code.
 * Anything already starting with a country code is left as it is, which is what
 * makes a guest flying in from London work — prefixing 94 to their number
 * would produce something undialable.
 */
export function toWhatsAppNumber(
  raw: string | null | undefined,
  countryCode: string,
): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS) return null;

  // 0094... — the international prefix written out.
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Already carries this country's code, possibly followed by a local 0.
  if (digits.startsWith(countryCode)) {
    const rest = digits.slice(countryCode.length);
    return countryCode + (rest.startsWith('0') ? rest.slice(1) : rest);
  }

  // A leading 0 is the local trunk prefix, which wa.me must not see.
  if (digits.startsWith('0')) return countryCode + digits.slice(1);

  // No leading zero and not this country's code: assume it is already
  // international. Guessing otherwise breaks every foreign guest.
  return digits;
}

export function buildRsvpUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/rsvp/${encodeURIComponent(token)}`;
}

function readableDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * The message body, for WhatsApp and for email alike.
 *
 * Every optional detail is dropped rather than rendered empty. A message
 * reading "on null at null" is worse than one that simply does not mention the
 * date, and it goes to a guest, where it cannot be taken back.
 */
export function buildInviteMessage({
  householdName,
  coupleNames,
  weddingDate,
  venue,
  rsvpUrl,
  note,
}: {
  householdName: string;
  coupleNames: string;
  weddingDate: string | null;
  venue: string | null;
  rsvpUrl: string;
  /** A line the couple adds to every message in a batch. */
  note?: string | null;
}): string {
  const date = readableDate(weddingDate);

  const lines = [
    `Dear ${householdName},`,
    '',
    `We would love you to join us as we get married.`,
    note?.trim() ? note.trim() : null,
    coupleNames ? `With love, ${coupleNames}.` : null,
    '',
    date ? `Date: ${date}` : null,
    venue ? `Venue: ${venue}` : null,
    '',
    'Please let us know if you can come:',
    rsvpUrl,
  ];

  return (
    lines
      .filter((line) => line !== null)
      .join('\n')
      // Dropping an optional line can leave two blank lines behind it.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function whatsAppLink(
  phone: string | null | undefined,
  message: string,
  countryCode: string,
): string | null {
  const number = toWhatsAppNumber(phone, countryCode);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
