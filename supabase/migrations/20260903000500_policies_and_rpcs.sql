-- =============================================================================
-- 0500  Policies for the tenancy tables + the RPCs that bootstrap membership
-- =============================================================================

alter table weddings            enable row level security;
alter table wedding_members     enable row level security;
alter table wedding_invitations enable row level security;

-- ---------------------------------------------------------------- weddings
-- No INSERT policy: weddings are created only through create_wedding(), which
-- also creates the owner membership. Without that, a freshly inserted wedding
-- would have no members and be invisible to its own creator.
drop policy if exists weddings_select on weddings;
create policy weddings_select on weddings
  for select using (app.is_member(id));

drop policy if exists weddings_update on weddings;
create policy weddings_update on weddings
  for update using (app.can_write(id)) with check (app.can_write(id));

drop policy if exists weddings_delete on weddings;
create policy weddings_delete on weddings
  for delete using (app.is_owner(id));

-- --------------------------------------------------------- wedding_members
-- Safe from recursion because app.* helpers are security definer (see 0400).
drop policy if exists wedding_members_select on wedding_members;
create policy wedding_members_select on wedding_members
  for select using (user_id = auth.uid() or app.is_member(wedding_id));

drop policy if exists wedding_members_write on wedding_members;
create policy wedding_members_write on wedding_members
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- The last owner must not be able to remove themselves and orphan the wedding.
create or replace function app.protect_last_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  select count(*) into remaining
  from wedding_members
  where wedding_id = old.wedding_id and role = 'owner' and user_id <> old.user_id;

  if old.role = 'owner' and remaining = 0 then
    raise exception 'Cannot remove the last owner of a wedding';
  end if;
  return old;
end;
$$;

drop trigger if exists wedding_members_protect_owner on wedding_members;
create trigger wedding_members_protect_owner
  before delete on wedding_members
  for each row execute function app.protect_last_owner();

-- ----------------------------------------------------- wedding_invitations
drop policy if exists wedding_invitations_manage on wedding_invitations;
create policy wedding_invitations_manage on wedding_invitations
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- =============================================================================
-- RPCs
-- =============================================================================

-- Create a wedding and its first owner in one transaction.
create or replace function public.create_wedding(
  p_bride_name text default null,
  p_groom_name text default null,
  p_wedding_date date default null,
  p_currency char(3) default 'LKR',
  p_timezone text default 'Asia/Colombo'
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

  insert into weddings (bride_name, groom_name, wedding_date, currency, timezone, created_by)
  values (p_bride_name, p_groom_name, p_wedding_date, p_currency, p_timezone, v_uid)
  returning id into v_id;

  insert into wedding_members (wedding_id, user_id, role, side, accepted_at)
  values (v_id, v_uid, 'owner', 'both', now());

  return v_id;
end;
$$;

-- Invite someone by email. Returns the token the client turns into a link.
create or replace function public.invite_member(
  p_wedding_id uuid,
  p_email citext,
  p_role member_role,
  p_side wedding_side default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_token uuid;
begin
  if not app.can_write(p_wedding_id) then
    raise exception 'Only the couple can invite members';
  end if;
  if p_role = 'family' and p_side is null then
    raise exception 'A family member must be given a side (bride or groom)';
  end if;
  if p_role = 'owner' then
    raise exception 'Cannot invite a second owner; transfer ownership instead';
  end if;

  insert into wedding_invitations (wedding_id, email, role, side, invited_by)
  values (p_wedding_id, p_email, p_role, p_side, auth.uid())
  on conflict (wedding_id, email) do update
    set role = excluded.role,
        side = excluded.side,
        token = gen_random_uuid(),
        created_at = now(),
        expires_at = now() + interval '30 days',
        accepted_at = null
  returning token into v_token;

  return v_token;
end;
$$;

-- Accept an invitation. The caller must be signed in; we match on the token
-- rather than on their email so a forwarded link still works, but we record
-- who actually accepted.
create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv wedding_invitations;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv from wedding_invitations
  where token = p_token and accepted_at is null and expires_at > now();

  if v_inv is null then
    raise exception 'Invitation is invalid, already used, or expired';
  end if;

  insert into wedding_members (wedding_id, user_id, role, side, invited_by, accepted_at)
  values (v_inv.wedding_id, v_uid, v_inv.role, v_inv.side, v_inv.invited_by, now())
  on conflict (wedding_id, user_id) do update
    set role = excluded.role, side = excluded.side, accepted_at = now();

  update wedding_invitations set accepted_at = now() where id = v_inv.id;

  return v_inv.wedding_id;
end;
$$;

-- What the app calls on load: every wedding this user can see, plus their role.
create or replace function public.my_weddings()
returns table (
  id uuid, bride_name text, groom_name text, wedding_date date,
  currency char(3), role member_role, side wedding_side,
  days_to_go int
)
language sql
stable
security definer
set search_path = public
as $$
  select w.id, w.bride_name, w.groom_name, w.wedding_date, w.currency,
         m.role, m.side,
         case when w.wedding_date is null then null
              else (w.wedding_date - current_date)::int end
  from weddings w
  join wedding_members m on m.wedding_id = w.id
  where m.user_id = auth.uid() and m.accepted_at is not null
  order by w.wedding_date nulls last
$$;

revoke all on function public.create_wedding(text, text, date, char, text) from anon;
revoke all on function public.invite_member(uuid, citext, member_role, wedding_side) from anon;
revoke all on function public.accept_invitation(uuid) from anon;
revoke all on function public.my_weddings() from anon;

grant execute on function public.create_wedding(text, text, date, char, text) to authenticated;
grant execute on function public.invite_member(uuid, citext, member_role, wedding_side) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.my_weddings() to authenticated;
