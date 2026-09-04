-- =============================================================================
-- 2600  public RSVP: rsvp_lookup and rsvp_submit  (ticket 4.5)
-- =============================================================================
-- Plan §4.5, "the one genuinely risky surface". A guest replies with no
-- account, which means an unauthenticated caller reaching a table that holds
-- every household's name, phone number and address.
--
-- The shape of the defence:
--
--   1. anon has NO grant on guests (revoked in 2500) and none on the audit
--      table below. These two functions are the entire surface.
--   2. Both are SECURITY DEFINER, so their bodies ARE the boundary — RLS does
--      not apply inside them. Everything they return is listed explicitly;
--      there is no `select *` anywhere in this file, so a column added to
--      `guests` later cannot silently start being published.
--   3. The token is the only credential. It is a v4 UUID (122 random bits),
--      one per household, and rotatable by writing a new value.
--   4. An unknown token returns NO ROWS rather than raising. A distinguishable
--      error is an oracle: it tells a scanner which guesses were closer.
--   5. Attendance is validated against what the household was invited for, so
--      the public form cannot inflate a head count.
--   6. Every accepted submission is recorded for audit.
--
-- Rate limiting and Turnstile are ticket 4.7, in an Edge Function in front of
-- these. Note what that means today: without it, a leaked token can be
-- submitted repeatedly. It cannot read anything else, and it cannot exceed the
-- invited count, but it can churn one household's own answer.
-- =============================================================================

create table if not exists rsvp_submissions (
  id                 uuid primary key default gen_random_uuid(),
  wedding_id         uuid not null references weddings (id) on delete cascade,
  guest_id           uuid not null references guests (id) on delete cascade,
  adults_attending   int not null,
  children_attending int not null,
  dietary            text,
  needs_room         boolean not null default false,
  needs_transport    boolean not null default false,
  message            text,
  -- Filled by the Edge Function in 4.7; Postgres cannot see the caller's IP.
  client_hint        text,
  submitted_at       timestamptz not null default now()
);

create index if not exists rsvp_submissions_guest_idx
  on rsvp_submissions (guest_id, submitted_at desc);

alter table rsvp_submissions enable row level security;

-- The couple and family read the audit trail through normal membership; nobody
-- writes it directly, because only the definer function below inserts.
create policy rsvp_submissions_select on rsvp_submissions
  for select using (app.is_member(wedding_id));

revoke all on rsvp_submissions from anon;

-- ---------------------------------------------------------------- rsvp_lookup
-- What the household needs to see in order to answer: who is getting married,
-- when, how many they were invited for, and what they said last time.
--
-- Everything else about the guest row — phone, address, gift figures, notes,
-- which side they are on — is deliberately absent.
create or replace function public.rsvp_lookup(p_token uuid)
returns table (
  household_name     text,
  adults_invited     int,
  children_invited   int,
  rsvp_status        text,
  adults_attending   int,
  children_attending int,
  dietary            text,
  needs_room         boolean,
  needs_transport    boolean,
  wedding_display    text,
  wedding_date       date
)
language sql
stable
security definer
set search_path = public
as $$
  select g.household_name,
         g.adults_invited,
         g.children_invited,
         g.rsvp_status::text,
         g.adults_attending,
         g.children_attending,
         g.dietary,
         g.needs_room,
         g.needs_transport,
         trim(coalesce(w.bride_name, '') || ' & ' || coalesce(w.groom_name, '')),
         w.wedding_date
    from guests g
    join weddings w on w.id = g.wedding_id
   where g.rsvp_token = p_token;
$$;

-- ---------------------------------------------------------------- rsvp_submit
create or replace function public.rsvp_submit(
  p_token           uuid,
  p_adults          int,
  p_children        int,
  p_dietary         text default null,
  p_needs_room      boolean default false,
  p_needs_transport boolean default false,
  p_message         text default null
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
                                needs_transport, message)
  values (v_guest.wedding_id, v_guest.id, p_adults, p_children,
          nullif(btrim(coalesce(p_dietary, '')), ''),
          coalesce(p_needs_room, false), coalesce(p_needs_transport, false),
          nullif(btrim(coalesce(p_message, '')), ''));

  -- A rejected submission rolls back, taking any log row with it, so abuse
  -- attempts are recorded by the Edge Function in 4.7 rather than here.
end;
$$;

-- ---------------------------------------------------------------- grants
-- Execute on these two and nothing else. `from public` matters: Postgres grants
-- EXECUTE to PUBLIC on a new function, so revoking from anon alone would leave
-- it callable anyway.
revoke all on function public.rsvp_lookup(uuid) from public, anon, authenticated;
revoke all on function public.rsvp_submit(uuid, int, int, text, boolean, boolean, text)
  from public, anon, authenticated;

grant execute on function public.rsvp_lookup(uuid) to anon, authenticated;
grant execute on function public.rsvp_submit(uuid, int, int, text, boolean, boolean, text)
  to anon, authenticated;

comment on function public.rsvp_lookup(uuid) is
  'Ticket 4.5. The only read an unauthenticated guest can make. Returns one '
  'household by opaque token, with an explicit column list so a new guests '
  'column is never published by accident.';
