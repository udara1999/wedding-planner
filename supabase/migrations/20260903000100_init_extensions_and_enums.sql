-- =============================================================================
-- 0100  Extensions, schemas and the enums that Phase 0 needs
-- =============================================================================
-- Design note (see plan §4.3): we use Postgres ENUMs only for *state machines*
-- that application code branches on. User-extensible lists (dietary needs,
-- payment methods, vendor categories) will live in `wedding_lookups` instead,
-- so a user renaming an option can never silently break a dashboard count.
-- =============================================================================

create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists citext;        -- case-insensitive email

-- Private schema for helper functions. Never exposed through PostgREST.
create schema if not exists app;
revoke all on schema app from anon, authenticated;
grant usage on schema app to authenticated;

-- ---------------------------------------------------------------- enums
do $$ begin
  create type member_role as enum ('owner', 'partner', 'family', 'coordinator', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wedding_side as enum ('bride', 'groom', 'both');
exception when duplicate_object then null; end $$;

comment on type member_role is
  'owner/partner = the couple, full access. family = limited, scoped by side. '
  'coordinator = day-of operations only, no money access (plan §4.6). viewer = read-only.';

comment on type wedding_side is
  'Scopes what a `family` member can see: bride-side family cannot read groom-side guests.';
