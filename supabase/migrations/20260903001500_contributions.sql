-- =============================================================================
-- 1500  contributions  (ticket 2.7)
-- =============================================================================
-- Who has agreed to fund what. The AC is the interesting part: a family member
-- may read and write THEIR OWN row only. Family can otherwise see all the
-- money (can_see_money includes them), but a pledge is personal — the bride's
-- mother should not see what the groom's father promised.
--
-- That makes this the first per-ROW ownership boundary in the schema, rather
-- than a per-role one, and it needs a WITH CHECK as well as a USING: without
-- the check, a family member could insert or reassign a row to somebody else
-- and read it back quite legitimately.
-- =============================================================================

create or replace function app.is_family(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) = 'family', false)
$$;

grant execute on function app.is_family(uuid) to authenticated;

create table if not exists contributions (
  id                   uuid primary key default gen_random_uuid(),
  wedding_id           uuid not null references weddings (id) on delete cascade,
  code                 text,
  -- What makes "their own row" mean anything. Null for a contributor with no
  -- account — a grandparent who will never log in — which the couple manages
  -- on their behalf.
  contributor_user_id  uuid references auth.users (id) on delete set null,
  contributor_name     text not null,
  relationship         text,
  purpose              text,
  agreed_on            date,
  agreed_minor         bigint not null default 0 check (agreed_minor >= 0),
  received_minor       bigint not null default 0 check (received_minor >= 0),
  last_received_on     date,
  notes                text,

  -- The workbook's "Still to come". Immutable arithmetic over its own row, so
  -- it can be generated; floored at zero because over-contributing is not a
  -- negative outstanding amount.
  still_to_come_minor bigint generated always as (
    greatest(agreed_minor - received_minor, 0)
  ) stored,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (wedding_id, code)
);

create index if not exists contributions_wedding_idx on contributions (wedding_id);
create index if not exists contributions_contributor_idx on contributions (contributor_user_id);

drop trigger if exists contributions_touch on contributions;
create trigger contributions_touch before update on contributions
  for each row execute function app.touch_updated_at();

alter table contributions enable row level security;

-- The couple see and manage everything; a family member is confined to their
-- own row. A coordinator matches neither branch, so sees nothing — as with
-- every other money table (plan §4.6). Nor does a viewer: can_write excludes
-- them and they are not family.
create policy contributions_select on contributions
  for select using (
    app.can_write(wedding_id)
    or (app.is_family(wedding_id) and contributor_user_id = auth.uid())
  );

create policy contributions_write on contributions
  for all using (
    app.can_write(wedding_id)
    or (app.is_family(wedding_id) and contributor_user_id = auth.uid())
  )
  with check (
    app.can_write(wedding_id)
    or (app.is_family(wedding_id) and contributor_user_id = auth.uid())
  );

comment on table contributions is
  'Ticket 2.7. Family members may read and write only the row whose '
  'contributor_user_id is their own; the WITH CHECK is what stops them '
  'attributing a row to somebody else.';
