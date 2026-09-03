-- =============================================================================
-- 0700  template schema  (ticket 1.2)
-- =============================================================================
-- Global, versioned reference content that every wedding is seeded FROM. Never
-- copied per wedding except by seed_wedding() in 1.4, which snapshots
-- template.locales.version into weddings.template_version (plan R4) so a later
-- content change cannot silently rewrite an in-flight plan.
--
-- The schema is deliberately NOT exposed to PostgREST — only `public` and
-- `graphql_public` are — and carries no grants to anon or authenticated, the
-- same treatment as schema `app`. Reads go through security-definer functions.
-- RLS is enabled with no policies as a second line of defence: if the schema
-- were ever exposed by accident, every table would still deny.
-- =============================================================================

create schema if not exists template;
revoke all on schema template from anon, authenticated;

-- Priority is a state machine the UI branches on, so it is an enum (plan §4.3).
-- The other 00 Lists columns become enums in the phase that owns them; the
-- user-extensible ones live in template.lookups below.
do $$ begin
  create type task_priority as enum ('critical', 'high', 'medium', 'low');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- locales
create table if not exists template.locales (
  code        text primary key,
  label       text not null,
  language    text not null default 'en',
  tradition   text not null,
  version     int  not null default 1 check (version > 0),
  updated_at  timestamptz not null default now()
);

comment on table template.locales is
  'Registry of template variants. `version` is bumped whenever content changes; '
  'seed_wedding() snapshots it onto the wedding (plan R4).';

-- ---------------------------------------------------------------- tasks
create table if not exists template.tasks (
  id             bigint generated always as identity primary key,
  locale         text not null references template.locales (code) on delete cascade,
  seq            int  not null,
  category       text,
  task           text not null,
  owner_default  text,
  priority       task_priority,
  -- Days relative to the wedding date; negative is before. Extracted from the
  -- workbook's `=WeddingDate-360` formulas, and what the 1.7 re-dating engine
  -- recomputes from. A task with no offset could never re-date, so it is
  -- not nullable.
  offset_days    int  not null,
  unique (locale, seq)
);

-- ---------------------------------------------------------------- countdown
create table if not exists template.countdown_checks (
  id             bigint generated always as identity primary key,
  locale         text not null references template.locales (code) on delete cascade,
  seq            int  not null,
  window_label   text,
  offset_days    int  not null,
  check_text     text not null,
  owner_default  text,
  unique (locale, seq)
);

-- ---------------------------------------------------------------- lookups
-- The user-extensible half of `00 Lists` (plan §4.3): values code never
-- branches on, so renaming one must not break anything. Seeded per wedding
-- into wedding_lookups by 1.4.
create table if not exists template.lookups (
  id          bigint generated always as identity primary key,
  locale      text not null references template.locales (code) on delete cascade,
  kind        text not null,
  value       text not null,
  sort_order  int  not null,
  unique (locale, kind, value)
);

alter table template.locales           enable row level security;
alter table template.tasks             enable row level security;
alter table template.countdown_checks  enable row level security;
alter table template.lookups           enable row level security;

-- ---------------------------------------------------------------- the FK 1.1 promised
-- Inserted here rather than in the generated content migration, so that the
-- foreign key below has something to point at: existing weddings already
-- default to 'poruwa', and the constraint would fail against an empty registry.
-- The content migration updates the label and version via ON CONFLICT.
insert into template.locales (code, label, language, tradition, version)
values ('poruwa', 'Poruwa (Sinhala Buddhist)', 'en', 'poruwa', 1)
on conflict (code) do nothing;

alter table weddings
  drop constraint if exists weddings_tradition_fkey;
alter table weddings
  add constraint weddings_tradition_fkey
  foreign key (tradition) references template.locales (code);
