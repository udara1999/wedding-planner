-- =============================================================================
-- 20260904000200  rate limiting for the public RSVP surface  (ticket 4.7)
-- =============================================================================
-- 2600 built the RSVP RPCs and named what it was leaving open:
--
--   "without it, a leaked token can be submitted repeatedly. It cannot read
--    anything else, and it cannot exceed the invited count, but it can churn
--    one household's own answer."
--
-- This closes that, and R3 with it. The counting lives in Postgres rather than
-- in the Edge Function's memory because an Edge Function is not one process:
-- instances come and go per region and per request, so an in-memory counter
-- limits nothing. A table is the only shared state available.
--
-- WHAT IS AND IS NOT STORED
--
-- Postgres cannot see the caller's IP, so the Edge Function supplies an
-- identifier. It supplies a SHA-256 of the address salted with a project
-- secret, never the address itself. That is enough to count repeats and not
-- enough to recover who they were, which is the right trade for a table that
-- exists only to say "this is the ninth attempt in an hour".
-- =============================================================================

create table if not exists rsvp_rate_events (
  id          bigint generated always as identity primary key,
  -- 'submit:token:<uuid>' or 'lookup:ip:<hash>'. The bucket carries its own
  -- meaning so one table serves every limit without a kind column to join on.
  bucket      text        not null,
  occurred_at timestamptz not null default now()
);

create index if not exists rsvp_rate_events_bucket_idx
  on rsvp_rate_events (bucket, occurred_at desc);

alter table rsvp_rate_events enable row level security;

-- No policy, and no grants. Nothing outside the definer function below reads or
-- writes this — not anon, not a member, not the couple. There is nothing here
-- worth showing anyone, and an abuse log that the abuser can read is worse than
-- no log.
revoke all on rsvp_rate_events from anon, authenticated;

comment on table rsvp_rate_events is
  'Ticket 4.7. One row per attempt against the public RSVP surface. Holds a '
  'salted hash of the caller, never an address. Rows older than a day are '
  'removed as the limiter runs.';

-- ------------------------------------------------------------- rsvp_rate_take
-- Take one unit from a bucket. Returns true when the caller is inside the
-- limit, false when they are not.
--
-- The attempt is recorded EITHER WAY. A limiter that only counts the requests
-- it allowed lets a caller sit exactly on the boundary forever: they get one
-- through, get refused, and the refusal costs them nothing.
create or replace function public.rsvp_rate_take(
  p_bucket text,
  p_limit  int,
  p_window interval
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
begin
  -- Cheap at this scale, and it means the table cannot grow without bound even
  -- if nothing ever sweeps it.
  delete from rsvp_rate_events where occurred_at < now() - interval '1 day';

  select count(*) into v_used
    from rsvp_rate_events
   where bucket = p_bucket
     and occurred_at > now() - p_window;

  insert into rsvp_rate_events (bucket) values (p_bucket);

  return v_used < p_limit;
end;
$$;

-- Only the Edge Function, which holds the service role key, may call this.
-- Exposing it to anon would let a caller burn someone else's bucket.
revoke all on function public.rsvp_rate_take(text, int, interval)
  from public, anon, authenticated;

comment on function public.rsvp_rate_take(text, int, interval) is
  'Ticket 4.7. Records an attempt and reports whether it was inside the limit. '
  'Refused attempts are recorded too, so sitting on the boundary does not work.';

-- --------------------------------------------------------------- client_hint
-- rsvp_submissions.client_hint was reserved in 2600 for exactly this. The
-- parameter is added by dropping and recreating rather than by overloading:
-- two rsvp_submit signatures differing only by a defaulted trailing argument is
-- an ambiguity waiting to be resolved the wrong way.
drop function if exists public.rsvp_submit(uuid, int, int, text, boolean, boolean, text);

create function public.rsvp_submit(
  p_token           uuid,
  p_adults          int,
  p_children        int,
  p_dietary         text default null,
  p_needs_room      boolean default false,
  p_needs_transport boolean default false,
  p_message         text default null,
  p_client_hint     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest guests;
begin
  select * into v_guest from guests where rsvp_token = p_token;

  -- Same wording whatever the reason, so the error cannot be used to tell a
  -- wrong token from a malformed submission.
  if v_guest.id is null then
    raise exception 'This invitation link is not valid';
  end if;

  if p_adults is null or p_children is null or p_adults < 0 or p_children < 0 then
    raise exception 'Numbers attending cannot be negative';
  end if;

  -- The control plan §4.5 asks for by name. A public form must not be able to
  -- add heads the couple never invited.
  if p_adults + p_children > v_guest.adults_invited + v_guest.children_invited then
    raise exception 'You can reply for at most % people',
      v_guest.adults_invited + v_guest.children_invited;
  end if;

  update guests
     set adults_attending   = p_adults,
         children_attending = p_children,
         -- Nobody coming is a decline; anybody coming is an acceptance. The
         -- form has no separate yes/no, so the numbers carry the answer.
         rsvp_status        = case when p_adults + p_children = 0
                                   then 'declined'::rsvp_status
                                   else 'accepted'::rsvp_status end,
         rsvp_on            = current_date,
         dietary            = nullif(btrim(coalesce(p_dietary, '')), ''),
         needs_room         = coalesce(p_needs_room, false),
         needs_transport    = coalesce(p_needs_transport, false)
   where id = v_guest.id;

  insert into rsvp_submissions (wedding_id, guest_id, adults_attending,
                                children_attending, dietary, needs_room,
                                needs_transport, message, client_hint)
  values (v_guest.wedding_id, v_guest.id, p_adults, p_children,
          nullif(btrim(coalesce(p_dietary, '')), ''),
          coalesce(p_needs_room, false), coalesce(p_needs_transport, false),
          nullif(btrim(coalesce(p_message, '')), ''),
          nullif(btrim(coalesce(p_client_hint, '')), ''));
end;
$$;

-- ---------------------------------------------------------------- grants
-- The surface moves behind the Edge Function. anon keeps nothing: the function
-- holds the service role key, applies the limits, and calls these.
--
-- These two revokes are what make ticket 4.7 real rather than advisory — while
-- anon could still call the RPCs directly, every limit was optional.
revoke all on function public.rsvp_lookup(uuid) from public, anon, authenticated;
revoke all on function public.rsvp_submit(uuid, int, int, text, boolean, boolean, text, text)
  from public, anon, authenticated;

comment on function public.rsvp_submit(uuid, int, int, text, boolean, boolean, text, text) is
  'Ticket 4.5, limited by 4.7. Callable only by the service role, through the '
  'rsvp Edge Function, which applies Turnstile and rate limits first.';
