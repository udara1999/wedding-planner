-- =============================================================================
-- 0600  weddings.tradition  (ticket 1.1)
-- =============================================================================
-- Which tradition the couple's plan follows. Decision D2: Poruwa only for
-- M1–M3, but the column is deliberately NOT an enum — D2 records that adding
-- a tradition is *content* work, and an enum would make it a migration.
--
-- Ticket 1.2 introduces the `template` schema and its locales registry; the
-- foreign key belongs there, once that registry exists. Until then this is a
-- plain text column with a default, so 1.1 does not have to invent 1.2.
-- =============================================================================

alter table weddings
  add column if not exists tradition text not null default 'poruwa';

comment on column weddings.tradition is
  'Tradition whose template seeds this wedding (plan D2). FK to the template '
  'locales registry lands with ticket 1.2; text until then.';

-- ---------------------------------------------------------------- create_wedding
-- A parameter with a default creates an OVERLOAD rather than replacing the
-- function, which would leave two candidates and make every call ambiguous.
-- The old signature therefore has to go first.
drop function if exists public.create_wedding(text, text, date, char, text);

create or replace function public.create_wedding(
  p_bride_name text default null,
  p_groom_name text default null,
  p_wedding_date date default null,
  p_currency char(3) default 'LKR',
  p_timezone text default 'Asia/Colombo',
  p_tradition text default 'poruwa'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into weddings (bride_name, groom_name, wedding_date, currency, timezone,
                        tradition, created_by)
  values (p_bride_name, p_groom_name, p_wedding_date, p_currency, p_timezone,
          coalesce(p_tradition, 'poruwa'), v_uid)
  returning id into v_id;

  insert into wedding_members (wedding_id, user_id, role, side, accepted_at)
  values (v_id, v_uid, 'owner', 'both', now());

  return v_id;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC on a new function, so revoking from `anon`
-- alone would leave it callable. (It would still raise 'Not authenticated',
-- but the grant should not be there in the first place.)
revoke all on function public.create_wedding(text, text, date, char, text, text)
  from public, anon;
grant execute on function public.create_wedding(text, text, date, char, text, text)
  to authenticated;
