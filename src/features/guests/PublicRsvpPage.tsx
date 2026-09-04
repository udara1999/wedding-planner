import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Heart, Loader2, Minus, Plus, X } from 'lucide-react';
import { useRsvpLookup, useRsvpSubmit, type RsvpHousehold } from './rsvpApi';
import { useTurnstile } from './turnstile';
import { Button, Card, CardBody, Field, Input, Textarea, cn } from '../../components/ui';

/**
 * Ticket 4.6. The tokenised, login-free RSVP page.
 *
 * The only screen a stranger ever sees, and the only one reached without a
 * session — so it lives outside the app shell entirely: no sidebar, no wedding
 * context, nothing that assumes a logged-in user.
 *
 * Mobile first in the literal sense: this arrives as a WhatsApp link and will
 * be opened on a phone, one-handed, probably by someone who does not use apps
 * much. One column, large targets, one decision at a time.
 */
export function PublicRsvpPage() {
  const { token } = useParams<{ token: string }>();
  const lookup = useRsvpLookup(token ?? null);
  const [outcome, setOutcome] = useState<{ attending: boolean; people: number } | null>(null);

  const household = lookup.data;

  if (lookup.isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-500">
          <Loader2 className="size-4 animate-spin text-wine-600" />
          Finding your invitation…
        </div>
      </Shell>
    );
  }

  // A missing household and a wrong token look identical on purpose — the
  // function returns no rows either way rather than confirming a guess.
  if (lookup.error || !household) {
    return (
      <Shell>
        <Card className="shadow-raised">
          <CardBody className="space-y-2 py-8 text-center">
            <h1 className="text-base font-semibold text-stone-900">
              We could not find this invitation
            </h1>
            <p className="text-sm text-stone-500">
              The link may have been mistyped or replaced. Please check the message you were sent,
              or ask the couple for a new link.
            </p>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  const date =
    household.wedding_date &&
    new Date(household.wedding_date).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  if (outcome) {
    return (
      <Shell display={household.wedding_display} date={date}>
        <Card className="shadow-raised">
          <CardBody className="space-y-4 py-8 text-center">
            <div
              className={cn(
                'mx-auto flex size-12 items-center justify-center rounded-full',
                outcome.attending
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-stone-100 text-stone-500',
              )}
            >
              {outcome.attending ? <Check className="size-6" /> : <Heart className="size-6" />}
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-900">
                {outcome.attending
                  ? 'Thank you — you are on the list'
                  : 'Thank you for letting us know'}
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {outcome.attending
                  ? `We have you down for ${outcome.people} ${
                      outcome.people === 1 ? 'person' : 'people'
                    }.`
                  : 'We are sorry you cannot make it, and grateful you replied.'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setOutcome(null)}>
              Change your answer
            </Button>
          </CardBody>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell display={household.wedding_display} date={date}>
      {/* Keyed on the token so the form remounts with fresh initial state if
          the link ever changes, rather than being corrected by an effect. */}
      <RsvpForm key={token} token={token ?? null} household={household} onDone={setOutcome} />
      <p className="mt-4 text-center text-xs text-stone-500">
        You can change your answer any time using this same link.
      </p>
    </Shell>
  );
}

function RsvpForm({
  token,
  household,
  onDone,
}: {
  token: string | null;
  household: RsvpHousehold;
  onDone: (outcome: { attending: boolean; people: number }) => void;
}) {
  const submit = useRsvpSubmit(token);
  // Destructured rather than kept as one object: the ref must not be read
  // through the same value the render reads `ready` from.
  const {
    enabled: challengeEnabled,
    ready: challengeReady,
    failed: challengeFailed,
    token: challengeToken,
    containerRef: challengeRef,
    reset: resetChallenge,
  } = useTurnstile();
  const replied = household.rsvp_status === 'accepted' || household.rsvp_status === 'declined';

  // Initial state derived from what they said last time, so changing one detail
  // does not mean re-entering everything. Lazy initialisers rather than an
  // effect: the values are known at first render.
  const [attending, setAttending] = useState<boolean | null>(
    replied ? household.rsvp_status === 'accepted' : null,
  );
  const [adults, setAdults] = useState(() =>
    household.rsvp_status === 'accepted' ? household.adults_attending : household.adults_invited,
  );
  const [children, setChildren] = useState(() =>
    household.rsvp_status === 'accepted'
      ? household.children_attending
      : household.children_invited,
  );
  const [dietary, setDietary] = useState(household.dietary ?? '');
  const [message, setMessage] = useState('');
  const [needsRoom, setNeedsRoom] = useState(household.needs_room);
  const [needsTransport, setNeedsTransport] = useState(household.needs_transport);

  const maxAdults = household.adults_invited;
  const maxChildren = household.children_invited;

  function send(isAttending: boolean) {
    submit.mutate(
      {
        adults: isAttending ? adults : 0,
        children: isAttending ? children : 0,
        dietary: isAttending ? dietary : '',
        needsRoom: isAttending ? needsRoom : false,
        needsTransport: isAttending ? needsTransport : false,
        message,
        turnstileToken: challengeToken,
      },
      {
        onSuccess: () =>
          onDone({ attending: isAttending, people: isAttending ? adults + children : 0 }),
        // A Turnstile token is single-use. Without a reset, correcting an
        // answer after a rejected submit would fail on a spent token.
        onError: () => resetChallenge(),
      },
    );
  }

  return (
    <Card className="shadow-raised">
      <CardBody className="space-y-5 py-6">
        <div className="text-center">
          <p className="text-sm text-stone-500">Invitation for</p>
          <h1 className="text-lg font-semibold tracking-tight text-stone-900">
            {household.household_name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {maxAdults + maxChildren === 1
              ? 'One place is reserved for you.'
              : `${maxAdults + maxChildren} places are reserved for you.`}
          </p>
          {replied && (
            <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
              You have already replied. Changing anything below will update your answer.
            </p>
          )}
        </div>

        {/* One decision first. Asking for numbers before knowing whether they
            are coming is the wrong order for someone declining. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setAttending(true);
              // A household that declined last time is carrying zeros. Saying
              // "we will be there" and then meeting a disabled button with
              // nothing explaining why is a dead end, so accepting fills in
              // what they were invited for and they adjust down from there.
              if (adults + children === 0) {
                setAdults(maxAdults);
                setChildren(maxChildren);
              }
            }}
            className={cn(
              'focus-ring rounded-xl border px-3 py-4 text-sm font-medium transition-colors',
              attending === true
                ? 'border-wine-600 bg-wine-700 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
            )}
          >
            <Check className="mx-auto mb-1 size-5" />
            We will be there
          </button>
          <button
            type="button"
            onClick={() => setAttending(false)}
            className={cn(
              'focus-ring rounded-xl border px-3 py-4 text-sm font-medium transition-colors',
              attending === false
                ? 'border-stone-400 bg-stone-700 text-white'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300',
            )}
          >
            <X className="mx-auto mb-1 size-5" />
            Sadly cannot come
          </button>
        </div>

        {attending && (
          <div className="space-y-4 border-t border-stone-100 pt-4">
            <p className="text-sm text-stone-500">
              How many of you can come? Up to {maxAdults + maxChildren}, and at least one — if
              nobody can make it, choose “Sadly cannot come” instead.
            </p>
            {/* The floor is on the TOTAL, not on adults. A household invited
                for two adults and a child might be sending only the child with
                someone else's family, and a minimum of one adult would make
                that unanswerable. */}
            <Stepper
              label="Adults"
              value={adults}
              max={maxAdults}
              min={children > 0 ? 0 : 1}
              onChange={setAdults}
            />
            {maxChildren > 0 && (
              <Stepper
                label="Children"
                value={children}
                max={maxChildren}
                min={adults > 0 ? 0 : 1}
                onChange={setChildren}
              />
            )}

            <Field label="Anything we should know about food?" hint="Allergies, vegetarian, halal.">
              <Input
                value={dietary}
                placeholder="Optional"
                onChange={(e) => setDietary(e.target.value)}
              />
            </Field>

            <div className="space-y-2">
              <Toggle label="We will need a room" value={needsRoom} onChange={setNeedsRoom} />
              <Toggle
                label="We will need transport"
                value={needsTransport}
                onChange={setNeedsTransport}
              />
            </div>
          </div>
        )}

        {attending !== null && (
          <>
            <Field label="A message for the couple">
              <Textarea
                rows={3}
                value={message}
                placeholder="Optional"
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>

            {/* Ticket 4.7. Rendered only when a site key is configured; the
                Edge Function's rate limits apply either way. */}
            {challengeEnabled && !challengeFailed && (
              <div ref={challengeRef} className="flex justify-center" />
            )}

            {submit.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {submit.error instanceof Error ? submit.error.message : 'Something went wrong'}
              </p>
            )}

            <Button
              size="lg"
              className="w-full"
              loading={submit.isPending}
              disabled={!challengeReady || (attending && adults + children < 1)}
              onClick={() => send(attending)}
            >
              {attending ? 'Send our reply' : 'Send our apologies'}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Shell({
  display,
  date,
  children,
}: {
  display?: string;
  date?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-ivory px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-wine-100),transparent)] opacity-70"
      />
      <div className="relative mx-auto w-full max-w-md">
        {display && (
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-wine-700 text-white shadow-raised">
              <Heart className="size-5" fill="currentColor" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-wine-800">{display}</h2>
            {date && <p className="mt-0.5 text-sm text-stone-500">{date}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * A stepper rather than a number input: on a phone it is one tap per person and
 * cannot produce a value the server would reject, so nobody meets a validation
 * error for something the form could have prevented.
 */
function Stepper({
  label,
  value,
  max,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  /** Set so a household cannot accept for nobody; see the caller. */
  min?: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-stone-800">{label}</p>
        <p className="text-xs text-stone-500">
          {max} invited{min > 0 && max > 0 ? ' · at least one of you' : ''}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`One fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="focus-ring flex size-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span className="tabular w-10 text-center text-lg font-semibold text-stone-900">
          {value}
        </span>
        <button
          type="button"
          aria-label={`One more ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="focus-ring flex size-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        'focus-ring flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors',
        value
          ? 'border-wine-300 bg-wine-50 text-wine-800'
          : 'border-stone-200 bg-white text-stone-700',
      )}
    >
      {label}
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full border',
          value ? 'border-wine-600 bg-wine-600 text-white' : 'border-stone-300',
        )}
      >
        {value && <Check className="size-3" />}
      </span>
    </button>
  );
}
