-- =============================================================================
-- 0400  RLS helper functions
-- =============================================================================
-- WHY THESE ARE `security definer` — read before changing:
--
-- A policy on `wedding_members` that needs to ask "is the caller a member of
-- this wedding?" must query `wedding_members`. If the function doing the
-- lookup runs as the caller, that query re-triggers the same policy and
-- Postgres raises `infinite recursion detected in policy`.
--
-- `security definer` makes the function run as its owner, which bypasses RLS
-- on the tables it reads, breaking the cycle. `search_path` is pinned so a
-- caller cannot shadow `wedding_members` with their own object.
--
-- These live in the private `app` schema and are NOT exposed via PostgREST.
-- =============================================================================

create or replace function app.role_in(w uuid)
returns member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from wedding_members m
  where m.wedding_id = w
    and m.user_id = auth.uid()
    and m.accepted_at is not null
  limit 1
$$;

create or replace function app.member_side(w uuid)
returns wedding_side
language sql
stable
security definer
set search_path = public
as $$
  select m.side
  from wedding_members m
  where m.wedding_id = w
    and m.user_id = auth.uid()
    and m.accepted_at is not null
  limit 1
$$;

-- Any accepted member, whatever their role. Use for "can see this wedding at all".
create or replace function app.is_member(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) is not null
$$;

-- The couple. The only roles that may change anything by default.
create or replace function app.can_write(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) in ('owner', 'partner')
$$;

create or replace function app.is_owner(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) = 'owner'
$$;

-- Money visibility. Deliberately EXCLUDES coordinator.
--
-- Supabase runs every logged-in user as the single Postgres role
-- `authenticated`, so column-level GRANTs cannot vary per user. Hiding money
-- from coordinators therefore has to be done by denying the ROWS — the
-- financial tables simply get no SELECT policy for that role (plan §4.6).
create or replace function app.can_see_money(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) in ('owner', 'partner', 'family')
$$;

-- Day-of operations: timeline, vendor schedule, contacts, seating, risks.
create or replace function app.can_see_ops(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) is not null
$$;

create or replace function app.can_write_ops(w uuid)
returns boolean language sql stable as $$
  select app.role_in(w) in ('owner', 'partner', 'coordinator')
$$;

-- Guest visibility for family members is scoped to their side of the family.
create or replace function app.can_see_guest_side(w uuid, guest_side wedding_side)
returns boolean language sql stable as $$
  select case
    when app.role_in(w) in ('owner', 'partner', 'coordinator', 'viewer') then true
    when app.role_in(w) = 'family' then
      app.member_side(w) = 'both'
      or guest_side is null
      or guest_side = 'both'
      or guest_side = app.member_side(w)
    else false
  end
$$;

grant execute on function
  app.role_in(uuid), app.member_side(uuid), app.is_member(uuid),
  app.can_write(uuid), app.is_owner(uuid), app.can_see_money(uuid),
  app.can_see_ops(uuid), app.can_write_ops(uuid),
  app.can_see_guest_side(uuid, wedding_side)
to authenticated;
