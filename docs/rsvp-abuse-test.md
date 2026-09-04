# RSVP abuse test

Ticket 4.7's acceptance criteria are "Edge Function wrapper; abuse test
documented". This is the documented test, and the results of running it against
the hosted project on 2026-09-04.

## What is being defended

Plan §7 R3 names three attacks on the public RSVP surface. They are not equally
real, and it is worth being clear about which is which.

| Attack | Status |
|---|---|
| **Headcount tampering** — replying for more people than were invited | Closed since 4.5, in `rsvp_submit`, and deliberately *not* moved into the Edge Function: a bug in the function must not be able to inflate a guest list. |
| **Token enumeration** — guessing another household's link | Not a practical attack. `rsvp_token` is a v4 UUID: 122 random bits. The limits below make it slower still, but they are not what makes it infeasible. |
| **Spam / repetition** — churning a household's answer with a leaked link | This is the real one, it was open until 4.7, and it is what the limits address. |

## The limits

Set in `supabase/functions/rsvp/index.ts`. Counting happens in Postgres
(`rsvp_rate_take`), because an Edge Function is not one long-lived process and
an in-memory counter would limit nothing.

| Bucket | Limit | Window |
|---|---|---|
| `lookup:ip:<hash>` | 60 | 10 minutes |
| `lookup:token:<uuid>` | 30 | 10 minutes |
| `submit:ip:<hash>` | 20 | 1 hour |
| `submit:token:<uuid>` | 6 | 1 hour |

Deliberately generous. A household reloading the page, or correcting their
answer twice, must never meet a limit — a guest who cannot reply at all is a
worse outcome than a spammer who gets six replies in instead of five.

## Test 1 — the guard cannot be bypassed

The point of 4.7 is not the limits themselves; it is that there is no way round
them. `anon` lost EXECUTE on both RPCs in `20260904000200`.

```
POST /rest/v1/rpc/rsvp_lookup      (anon key)
  -> 401  {"code":"42501","message":"permission denied for function rsvp_lookup"}

POST /rest/v1/rpc/rsvp_rate_take   (anon key)
  -> 401  {"code":"42501","message":"permission denied for function rsvp_rate_take"}
```

**Result: pass.** Confirmed live. Without this, every limit below is advisory.

## Test 2 — the wrapper works

```
POST /functions/v1/rsvp   {"action":"lookup","token":"<unknown uuid>"}
  -> 200  {"household":null}
```

**Result: pass.** An unknown token returns 200 with no household — the same
response a real token with nothing to show would give. A distinguishable
failure would be an oracle confirming guesses.

## Test 3 — the limit fires at the boundary

33 consecutive lookups against one token, limit 30 per 10 minutes:

```
1..30 -> 200
31,32,33 -> 429  {"error":"Too many attempts. Please try again in a few minutes."}
```

**Result: pass.** Refused at exactly the 31st attempt.

## Reproducing it

```sh
URL=$(grep -m1 '^VITE_SUPABASE_URL=' .env | cut -d= -f2-)
KEY=$(grep -m1 '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2-)
T=00000000-0000-4000-8000-000000000001

for i in $(seq 1 33); do
  curl -s -o /dev/null -w "$i:%{http_code} " -X POST "$URL/functions/v1/rsvp" \
    -H "Authorization: Bearer $KEY" -H "apikey: $KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"action\":\"lookup\",\"token\":\"$T\"}"
done
```

Use a fresh token UUID each run, or wait ten minutes — the bucket is keyed by
token.

## What is NOT yet in force

**Turnstile is configured but inactive.** It needs a Cloudflare account
belonging to whoever runs the app, which does not exist yet. The code path is
complete on both sides and switches on entirely through configuration:

```sh
npx supabase secrets set TURNSTILE_SECRET_KEY=...   # the function
# and VITE_TURNSTILE_SITE_KEY=... in .env           # the widget
```

Until then `turnstileOk()` returns true without calling Cloudflare, and the
submit response carries `challenged: false` so the downgrade is visible rather
than silent. The rate limits above are in force either way, which is why
shipping in this state is reasonable and not a stub.

**The limits are per-token and per-hashed-IP, not per-household-per-day.** A
determined caller behind many addresses can still spend a household's
`submit:token` budget of 6 an hour. That bounds the damage to one household's
own answer, which is recoverable — every submission is in `rsvp_submissions`
with its caller hash, so the couple can see what happened and correct it.

## Privacy note

`rsvp_rate_events` and `rsvp_submissions.client_hint` hold a SHA-256 of the
caller's address salted with `RSVP_IP_SALT`, truncated to 32 hex characters.
Never the address. That is enough to count repeats and not enough to reconstruct
who visited. The salt is a function secret; rotating it resets every bucket,
which is harmless.
