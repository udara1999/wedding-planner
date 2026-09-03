-- =============================================================================
-- 0300  weddings + wedding_members  — the tenancy boundary
-- =============================================================================
-- Every domain table from here on carries `wedding_id uuid not null` and is
-- indexed on it. That column IS the tenant boundary; there are no exceptions.
-- =============================================================================

create table if not exists weddings (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text unique,

  -- the couple & the day  (workbook: 01 START HERE)
  bride_name                text,
  groom_name                text,
  wedding_date              date,
  currency                  char(3)     not null default 'LKR',
  timezone                  text        not null default 'Asia/Colombo',

  ceremony_time             time,
  registration_time         time,
  reception_time            time,
  expected_finish           time,

  venue_name                text,
  venue_town                text,
  venue_district            text,
  ceremony_area             text,
  reception_area            text,
  venue_contact_name        text,
  venue_contact_phone       text,

  theme                     text,
  colour_palette            text,
  coordinator_name          text,
  coordinator_phone         text,
  emergency_contact_name    text,
  emergency_contact_phone   text,

  -- money control  (all amounts are integer MINOR units — never float, plan R5)
  total_budget_minor        bigint       not null default 0
                              check (total_budget_minor >= 0),
  contingency_pct           numeric(5,4) not null default 0.0700
                              check (contingency_pct >= 0 and contingency_pct <= 0.5),
  guest_buffer_pct          numeric(5,4) not null default 0.0500
                              check (guest_buffer_pct >= 0 and guest_buffer_pct <= 0.5),

  -- which template this wedding was seeded from, snapshotted (plan R4)
  template_locale           text,
  template_version          int,

  created_by                uuid references auth.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on column weddings.total_budget_minor is
  'Integer minor units of `currency` (LKR cents). Every variance figure measures against this.';
comment on column weddings.template_version is
  'Snapshotted at seed time so later template improvements cannot silently mutate a live wedding.';

drop trigger if exists weddings_touch on weddings;
create trigger weddings_touch before update on weddings
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- members
create table if not exists wedding_members (
  wedding_id    uuid        not null references weddings (id) on delete cascade,
  user_id       uuid        not null references auth.users (id) on delete cascade,
  role          member_role not null default 'viewer',
  side          wedding_side,
  invited_email citext,
  invited_by    uuid references auth.users (id) on delete set null,
  invited_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  primary key (wedding_id, user_id)
);

create index if not exists wedding_members_user_idx on wedding_members (user_id);
create index if not exists wedding_members_wedding_idx on wedding_members (wedding_id);

comment on column wedding_members.side is
  'Required for role=family; scopes guest visibility to that side of the family.';

-- Guard: a family member without a side would see nothing (or everything if a
-- policy is written carelessly). Force the data to be unambiguous.
alter table wedding_members drop constraint if exists family_needs_side;
alter table wedding_members add constraint family_needs_side
  check (role <> 'family' or side is not null);

-- ------------------------------------------- pending invitations by email
-- Someone can be invited before they have an account. We keep those rows
-- separate so wedding_members always references a real auth user.
create table if not exists wedding_invitations (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid        not null references weddings (id) on delete cascade,
  email         citext      not null,
  role          member_role not null,
  side          wedding_side,
  token         uuid        not null unique default gen_random_uuid(),
  invited_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days',
  accepted_at   timestamptz,
  unique (wedding_id, email)
);

create index if not exists wedding_invitations_email_idx on wedding_invitations (email);
