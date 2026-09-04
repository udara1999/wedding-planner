import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Mail, MessageCircle, Send } from 'lucide-react';
import { buildInviteMessage, buildRsvpUrl, whatsAppLink } from './links';
import { useSendInvites, type InviteResult } from './api';
import { useGuests, useUpdateGuest, type GuestRow } from '../guests/api';
import { useWedding } from '../weddings/api';
import {
  Badge,
  Button,
  Field,
  InlineError,
  Input,
  Modal,
  Section,
  SkeletonRows,
  Textarea,
  cn,
} from '../../components/ui';

/**
 * Ticket 4.10. Getting the link to the household.
 *
 * WhatsApp first, and not as a fallback: an invitation in Sri Lanka arrives on
 * WhatsApp, and the email half needs a Resend account that may not exist. So
 * the WhatsApp column always works, the email button says plainly when it
 * cannot, and neither is presented as the real way to do it.
 */
export function InvitesModal({
  weddingId,
  open,
  onClose,
}: {
  weddingId: string;
  open: boolean;
  onClose: () => void;
}) {
  const guests = useGuests(weddingId);
  const wedding = useWedding(weddingId);
  const send = useSendInvites(weddingId);
  const update = useUpdateGuest(weddingId);

  const [note, setNote] = useState('');
  const [subject, setSubject] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<InviteResult | null>(null);

  const w = wedding.data;
  const coupleNames = [w?.bride_name, w?.groom_name].filter(Boolean).join(' & ');
  const venue = [w?.venue_name, w?.venue_town].filter(Boolean).join(', ') || null;
  const countryCode = '94';
  const defaultSubject = coupleNames ? `An invitation from ${coupleNames}` : 'An invitation';

  const rows = useMemo(() => {
    return (guests.data ?? []).filter((g) => g.rsvp_status !== 'declined');
  }, [guests.data]);

  function messageFor(g: GuestRow) {
    return buildInviteMessage({
      householdName: g.household_name,
      coupleNames,
      weddingDate: w?.wedding_date ?? null,
      venue,
      rsvpUrl: buildRsvpUrl(window.location.origin, g.rsvp_token),
      note,
    });
  }

  const emailable = rows.filter((g) => selected.has(g.id) && g.email);
  const selectedWithoutEmail = rows.filter((g) => selected.has(g.id) && !g.email).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Opens WhatsApp with the message ready, and records the invitation as sent.
   *
   * Opening the app is not proof it was sent, and the honest alternative —
   * recording nothing — means the couple loses track of a 200-household list.
   * So it marks, the hint says it marks, and the tick can be undone.
   */
  function sendOnWhatsApp(g: GuestRow) {
    const link = whatsAppLink(g.phone ?? g.whatsapp, messageFor(g), countryCode);
    if (!link) return;
    window.open(link, '_blank', 'noopener,noreferrer');
    if (!g.invitation_sent) {
      update.mutate({
        id: g.id,
        patch: { invitation_sent: true, invitation_sent_on: new Date().toISOString().slice(0, 10) },
      });
    }
  }

  const preview = rows.find((g) => selected.has(g.id)) ?? rows[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title="Send invitations"
      subtitle="One link per household. WhatsApp works now; email needs a Resend key."
      badge={selected.size > 0 ? <Badge tone="accent">{selected.size} selected</Badge> : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Section
            title="Households"
            description="Anyone who has declined is left out. Tick the ones you want to email; WhatsApp sends one at a time."
          >
            {guests.isLoading ? (
              <SkeletonRows rows={8} />
            ) : (
              <div className="scroll-subtle max-h-[26rem] overflow-y-auto rounded-xl border border-stone-200">
                <ul className="divide-y divide-stone-100">
                  {rows.map((g) => {
                    const link = whatsAppLink(g.phone ?? g.whatsapp, 'x', countryCode);
                    return (
                      <li key={g.id} className="flex items-center gap-3 px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${g.household_name}`}
                          checked={selected.has(g.id)}
                          onChange={() => toggle(g.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-stone-900">{g.household_name}</p>
                          <p className="truncate text-[11px] text-stone-500">
                            {g.phone ?? g.whatsapp ?? 'no phone'}
                            {g.email ? ` · ${g.email}` : ' · no email'}
                          </p>
                        </div>

                        {g.invitation_sent ? (
                          <button
                            type="button"
                            title="Mark as not sent"
                            onClick={() =>
                              update.mutate({
                                id: g.id,
                                patch: { invitation_sent: false, invitation_sent_on: null },
                              })
                            }
                          >
                            <Badge tone="good">
                              <Check className="size-3" />
                              sent
                            </Badge>
                          </button>
                        ) : (
                          <Badge tone="neutral">not sent</Badge>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!link}
                          title={
                            link
                              ? 'Opens WhatsApp and marks the invitation as sent'
                              : 'No usable phone number'
                          }
                          onClick={() => sendOnWhatsApp(g)}
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Section>

          {preview && (
            <Section
              title="What they will read"
              description={`Shown for ${preview.household_name}. Every household gets their own link.`}
            >
              <pre className="scroll-subtle max-h-56 overflow-auto rounded-xl bg-stone-50 px-4 py-3 text-xs whitespace-pre-wrap text-stone-700">
                {messageFor(preview)}
              </pre>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section
            title="Add a line of your own"
            description="Goes into every message in this batch."
          >
            <Textarea
              rows={3}
              placeholder="Do come early for the poruwa."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Section>

          <Section title="By email">
            <Field label="Subject">
              <Input
                placeholder={defaultSubject}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>

            {selectedWithoutEmail > 0 && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {selectedWithoutEmail} of the selected households have no email address. Send theirs
                on WhatsApp.
              </p>
            )}

            {send.error && <InlineError error={send.error} />}

            <Button
              className="w-full"
              icon={<Send className="size-4" />}
              loading={send.isPending}
              disabled={emailable.length === 0}
              onClick={() =>
                send.mutate(
                  emailable.map((g) => ({
                    guestId: g.id,
                    subject: subject.trim() || defaultSubject,
                    body: messageFor(g),
                  })),
                  { onSuccess: setResult },
                )
              }
            >
              {emailable.length === 0
                ? 'Select households with an email'
                : `Email ${emailable.length} ${emailable.length === 1 ? 'household' : 'households'}`}
            </Button>

            {result && (
              <div
                className={cn(
                  'rounded-xl px-3 py-2 text-xs',
                  result.configured ? 'bg-stone-50 text-stone-600' : 'bg-amber-50 text-amber-800',
                )}
              >
                {result.message ? (
                  <p className="flex items-start gap-2">
                    <Mail className="mt-0.5 size-3.5 shrink-0" />
                    {result.message}
                  </p>
                ) : (
                  <p>
                    {result.sent} sent
                    {result.failed.length > 0 && `, ${result.failed.length} could not be sent`}.
                  </p>
                )}
                {result.failed.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {result.failed.map((f) => (
                      <li key={f.guestId} className="text-amber-800">
                        {rows.find((g) => g.id === f.guestId)?.household_name ?? f.guestId}:{' '}
                        {f.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </Modal>
  );
}
