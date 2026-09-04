/**
 * Ticket 4.10 — sending invitations by email.
 *
 * WHY THIS IS NOT A MAIL RELAY
 *
 * A function that takes an address and a body and sends mail, callable by any
 * authenticated user, is spam infrastructure with the couple's domain on it.
 * Two things prevent that here:
 *
 *   1. It never accepts an address. The client sends guest IDs; every address
 *      is read out of the database.
 *   2. It reads them AS THE CALLER. Every request to PostgREST below carries
 *      the caller's own JWT, not the service role key, so row-level security
 *      decides which guests exist for them — and 4.3 already scopes that by
 *      wedding and by side. A caller asking for a guest ID from someone else's
 *      wedding gets an empty list, and nothing is sent.
 *
 * There is no service role key in this function at all, which is the strongest
 * form that argument can take.
 *
 * WHY THE BODY COMES FROM THE CLIENT
 *
 * The message is composed by src/features/invites/links.ts, which is unit
 * tested, and the couple can edit it before sending. Composing it again here
 * would mean two implementations of one message, and the one that goes to
 * guests would be the untested one.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface Message {
  guestId: string;
  subject: string;
  body: string;
}

interface GuestContact {
  id: string;
  household_name: string;
  email: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization) return json({ error: 'Not signed in.' }, 401);

  // Every read and write below is made as the caller. RLS is the authorisation.
  const asCaller = {
    apikey: ANON_KEY,
    Authorization: authorization,
    'Content-Type': 'application/json',
  };

  let payload: { weddingId?: string; messages?: Message[] };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const weddingId = payload.weddingId;
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (!weddingId || messages.length === 0) {
    return json({ error: 'Nothing to send.' }, 400);
  }
  if (messages.length > 200) {
    return json({ error: 'Send at most 200 invitations at a time.' }, 400);
  }

  // Reported rather than treated as an error: the WhatsApp half of 4.10 works
  // without any of this, and the screen says which half is available.
  if (!RESEND_KEY || !RESEND_FROM) {
    return json({
      configured: false,
      sent: 0,
      failed: [],
      message:
        'Email sending is not configured. Set RESEND_API_KEY and RESEND_FROM on the ' +
        'invite function to enable it. The WhatsApp links work without it.',
    });
  }

  const ids = messages.map((m) => m.guestId).filter(Boolean);
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/guests` +
      `?select=id,household_name,email` +
      `&wedding_id=eq.${encodeURIComponent(weddingId)}` +
      `&id=in.(${ids.map(encodeURIComponent).join(',')})`,
    { headers: asCaller },
  );

  if (!lookup.ok) {
    return json({ error: 'Those households could not be read.' }, lookup.status);
  }

  const contacts = (await lookup.json()) as GuestContact[];
  const byId = new Map(contacts.map((c) => [c.id, c]));

  const sentIds: string[] = [];
  const failed: { guestId: string; reason: string }[] = [];

  for (const message of messages) {
    const contact = byId.get(message.guestId);

    // Either the caller cannot see this household, or it is not theirs. Same
    // outcome, and deliberately the same wording.
    if (!contact) {
      failed.push({ guestId: message.guestId, reason: 'Household not found' });
      continue;
    }
    if (!contact.email) {
      failed.push({ guestId: message.guestId, reason: 'No email address' });
      continue;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [contact.email],
          subject: message.subject,
          text: message.body,
        }),
      });

      if (res.ok) {
        sentIds.push(contact.id);
      } else {
        const detail = await res.text();
        console.error('resend refused', contact.id, res.status, detail);
        failed.push({ guestId: contact.id, reason: `Refused (${res.status})` });
      }
    } catch (err) {
      console.error('resend unreachable', contact.id, err);
      failed.push({ guestId: contact.id, reason: 'Could not reach the mail service' });
    }
  }

  // Only what actually went out is marked as sent. Marking the whole batch
  // would hide the failures behind a tick, and nobody would ever chase them.
  if (sentIds.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const mark = await fetch(
      `${SUPABASE_URL}/rest/v1/guests?id=in.(${sentIds.map(encodeURIComponent).join(',')})`,
      {
        method: 'PATCH',
        headers: { ...asCaller, Prefer: 'return=minimal' },
        body: JSON.stringify({ invitation_sent: true, invitation_sent_on: today }),
      },
    );
    if (!mark.ok) {
      console.error('could not mark invitations sent', await mark.text());
      return json({
        configured: true,
        sent: sentIds.length,
        failed,
        message:
          'The invitations were sent, but marking them as sent failed. ' +
          'Re-sending would send them twice — check the list before you do.',
      });
    }
  }

  return json({ configured: true, sent: sentIds.length, failed });
});
