-- =============================================================================
-- 2500  guest groups and guests  (tickets 4.1, 4.3)
-- =============================================================================
-- The household model the workbook uses: ONE row per household with adults and
-- children counted, not one row per person. "Nayana nanda · 4 adults" is a
-- single row, and every count in the app follows from that.
--
-- Two things are set up here that Phase 4's riskier tickets depend on:
--
--   rsvp_token — opaque, one per household, so a public RSVP link identifies a
--   household without identifying anything else. The RPCs that use it arrive
--   with 4.5; the column exists now so it is part of the table from the start
--   rather than bolted on.
--
--   anon has no access to this table AT ALL. Supabase grants new public tables
--   to anon by default, so it is revoked explicitly rather than left to policy
--   alone. Plan §4.5: "Never expose `guests` to the `anon` role."
-- =============================================================================

do $$ begin
  create type rsvp_status as enum
    ('pending', 'accepted', 'declined', 'maybe', 'no_response');
exception when duplicate_object then null; end $$;

create table if not exists guest_groups (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings (id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0,
  unique (wedding_id, name)
);

create table if not exists guests (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references weddings (id) on delete cascade,
  group_id            uuid references guest_groups (id) on delete set null,
  code                text,

  household_name      text not null,
  relationship        text,
  -- Nullable on purpose: a guest belonging to neither side (a shared friend)
  -- is visible to both families, which can_see_guest_side already allows for.
  side                wedding_side,
  category            text,
  vip                 boolean not null default false,

  adults_invited      int not null default 0 check (adults_invited >= 0),
  children_invited    int not null default 0 check (children_invited >= 0),

  phone               text,
  whatsapp            text,
  email               citext,
  city                text,
  district            text,
  country             text,

  invitation_type     text,
  invitation_sent     boolean not null default false,
  invitation_sent_on  date,

  rsvp_status         rsvp_status not null default 'pending',
  rsvp_on             date,
  adults_attending    int not null default 0 check (adults_attending >= 0),
  children_attending  int not null default 0 check (children_attending >= 0),

  dietary             text,
  needs_room          boolean not null default false,
  needs_transport     boolean not null default false,
  transport_type      text,

  -- Ticket 4.8 creates seating_tables and adds the foreign key.
  table_id            uuid,

  expected_gift_minor bigint not null default 0 check (expected_gift_minor >= 0),
  gift_received_minor bigint not null default 0 check (gift_received_minor >= 0),
  gift_description    text,
  thank_you_sent      boolean not null default false,

  -- One per household, unguessable, rotatable by writing a new value.
  rsvp_token          uuid not null default gen_random_uuid() unique,

  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Immutable arithmetic over the row, so both can be generated rather than
  -- maintained. The workbook's "Total invited" and "Total attending".
  total_invited   int generated always as (adults_invited + children_invited) stored,
  total_attending int generated always as (adults_attending + children_attending) stored,

  unique (wedding_id, code)
);

create index if not exists guests_wedding_side_idx on guests (wedding_id, side);
create index if not exists guests_group_idx on guests (group_id);

drop trigger if exists guests_touch on guests;
create trigger guests_touch before update on guests
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- RLS
alter table guest_groups enable row level security;
alter table guests       enable row level security;

-- Ticket 4.3. The bride's mother cannot read groom-side guests. The rule lives
-- in app.can_see_guest_side(), written back in Phase 0: everyone except family
-- sees all sides, and a family member sees their own side, guests marked
-- 'both', and guests with no side set.
create policy guests_select on guests
  for select using (app.can_see_guest_side(wedding_id, side));

-- Writing stays with the couple. A family member reading their side of the
-- list is a different question from editing it, and the AC only asks for the
-- former.
create policy guests_write on guests
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy guest_groups_select on guest_groups
  for select using (app.is_member(wedding_id));
create policy guest_groups_write on guest_groups
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- anon
-- The control plan §4.5 asks for, stated rather than assumed. Supabase grants
-- new tables in `public` to anon by default; a policy alone would leave the
-- grant in place, and one accidental permissive policy later would be a guest
-- list on the open internet.
revoke all on guests from anon;
revoke all on guest_groups from anon;

comment on column guests.rsvp_token is
  'Opaque per-household RSVP key (plan §4.5). Never exposed to anon directly — '
  'only the security-definer RPCs added in ticket 4.5 read it.';
