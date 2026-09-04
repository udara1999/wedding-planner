-- =============================================================================
-- 20260904000700  readiness and the responsibility matrix  (tickets 5.3, 5.5)
-- =============================================================================
-- Phase 5's two schema pieces. Tasks and the countdown already have their
-- tables (0900) and their re-dating engine (1000); those tickets are screens.
--
-- 5.3 v_readiness — "% complete per area, from task completion". A view, not a
-- column, because it is an aggregate (Appendix A).
--
-- 5.5 responsibilities — the workbook's "19 Responsibilities" sheet, which is a
-- RACI matrix. The sheet says why it exists, in its own header row:
--
--   "Fill in real names in the 'Person' column so nobody assumes someone else
--    has it."
--
-- That is the whole point of the ticket's "warns when an activity has no named
-- person". The R/A/C/I columns hold ROLES — Couple, Best Man, Ushers — and a
-- role is not a person. "Ushers" is responsible for seating guests right up
-- until the morning nobody knows which ushers, and then it is nobody.
-- =============================================================================

-- --------------------------------------------------- template.responsibilities
-- Generic guidance, so it is template content like tasks and the countdown,
-- and it arrives through seed_wedding rather than being typed by every couple.
create table if not exists template.responsibilities (
  id           bigint generated always as identity primary key,
  locale       text not null references template.locales (code) on delete cascade,
  seq          int  not null,
  area         text,
  activity     text not null,
  responsible  text,
  accountable  text,
  consulted    text,
  informed     text,
  unique (locale, seq)
);

grant select on template.responsibilities to authenticated;

insert into template.responsibilities
  (locale, seq, area, activity, responsible, accountable, consulted, informed)
values
  ('poruwa', 1, 'Money', 'Approving any spend above the budget line', 'Couple', 'Couple', 'Both families', 'Coordinator'),
  ('poruwa', 2, 'Money', 'Paying vendor deposits and balances', 'Couple', 'Groom', 'Both families', 'Vendor'),
  ('poruwa', 3, 'Money', 'Carrying day-of cash and paying tips', 'Best Man', 'Groom', 'Couple', 'Coordinator'),
  ('poruwa', 4, 'Money', 'Guarding the gift table and cash gifts', 'Gift table attendant', 'Groom''s Family', 'Coordinator', 'Couple'),
  ('poruwa', 5, 'Guests', 'Owning the guest list and RSVPs', 'Couple', 'Couple', 'Both families', 'Coordinator'),
  ('poruwa', 6, 'Guests', 'Welcoming and seating guests', 'Ushers', 'Coordinator', 'Both families', 'Venue'),
  ('poruwa', 7, 'Guests', 'Looking after elderly relatives', 'Family reps', 'Both families', 'Coordinator', 'Venue'),
  ('poruwa', 8, 'Guests', 'Looking after overseas / outstation guests', 'Family reps', 'Couple', 'Coordinator', 'Hotel'),
  ('poruwa', 9, 'Ceremony', 'Poruwa items - buying and bringing them', 'Groom''s Family', 'Groom''s Family', 'Officiant', 'Coordinator'),
  ('poruwa', 10, 'Ceremony', 'Registration folder - NICs, certificates', 'Couple', 'Couple', 'Registrar', 'Coordinator'),
  ('poruwa', 11, 'Ceremony', 'Producing the two witnesses on time', 'Coordinator', 'Couple', 'Witnesses', 'Registrar'),
  ('poruwa', 12, 'Ceremony', 'Ring custody until the exchange', 'Best Man', 'Groom', 'Maid of Honour', 'Couple'),
  ('poruwa', 13, 'Ceremony', 'Cueing the Jayamangala Gatha singers', 'Coordinator', 'Coordinator', 'Officiant', 'MC'),
  ('poruwa', 14, 'Vendors', 'Checking each vendor in on arrival', 'Coordinator', 'Coordinator', 'Venue', 'Couple'),
  ('poruwa', 15, 'Vendors', 'Signing off decor before guests enter', 'Coordinator', 'Couple', 'Decorator', 'Venue'),
  ('poruwa', 16, 'Vendors', 'Feeding the vendors and crew', 'Coordinator', 'Couple', 'Caterer', 'Venue'),
  ('poruwa', 17, 'Vendors', 'Managing overtime decisions after midnight', 'Coordinator', 'Couple', 'Venue', 'Both families'),
  ('poruwa', 18, 'Logistics', 'Bringing the emergency kit', 'Maid of Honour', 'Bride', 'Bridesmaids', 'Coordinator'),
  ('poruwa', 19, 'Logistics', 'Jewellery custody and safe return', 'Jewellery custodian', 'Groom', 'Groom''s Family', 'Jeweller'),
  ('poruwa', 20, 'Logistics', 'Collecting personal belongings at the end', 'Bridesmaids', 'Couple', 'Coordinator', 'Venue'),
  ('poruwa', 21, 'Logistics', 'Returning rented items the next day', 'Coordinator', 'Couple', 'Vendors', 'Both families'),
  ('poruwa', 22, 'Logistics', 'Wet-weather decision', 'Coordinator', 'Couple', 'Venue', 'Both families'),
  ('poruwa', 23, 'Programme', 'Keeping the timeline on track', 'Coordinator', 'Coordinator', 'MC', 'Couple'),
  ('poruwa', 24, 'Programme', 'MC script and name pronunciations', 'MC', 'Couple', 'Both families', 'DJ'),
  ('poruwa', 25, 'Programme', 'Music cues and volume', 'DJ', 'Coordinator', 'Couple', 'MC'),
  ('poruwa', 26, 'Programme', 'Speeches - keeping them to time', 'MC', 'Coordinator', 'Speakers', 'Couple'),
  ('poruwa', 27, 'Photography', 'Rounding people up for family photos', 'Family reps', 'Coordinator', 'Photographer', 'Couple'),
  ('poruwa', 28, 'Photography', 'Holding the shot list on the night', 'Photographer', 'Couple', 'Family reps', 'Coordinator'),
  ('poruwa', 29, 'After', 'Settling final balances', 'Couple', 'Couple', 'Vendors', 'Both families'),
  ('poruwa', 30, 'After', 'Logging gifts and sending thank-yous', 'Couple', 'Bride', 'Both families', '-');

-- ------------------------------------------------------------ responsibilities
create table if not exists responsibilities (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references weddings (id) on delete cascade,
  source_template_id  bigint references template.responsibilities (id) on delete set null,
  seq                 int,
  area                text,
  activity            text not null,

  -- The four RACI roles, as the sheet has them. Free text: "Groom's Family"
  -- and "Gift table attendant" are both legitimate, and an enum would have to
  -- guess at every wedding's cast.
  responsible         text,
  accountable         text,
  consulted           text,
  informed            text,

  -- The column the ticket is about. A role is not a person.
  person_name         text,
  phone               text,

  deadline            date,
  status              task_status not null default 'not_started',
  notes               text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (wedding_id, source_template_id)
);

create index if not exists responsibilities_wedding_idx
  on responsibilities (wedding_id, sort_order);

drop trigger if exists responsibilities_touch on responsibilities;
create trigger responsibilities_touch before update on responsibilities
  for each row execute function app.touch_updated_at();

-- No money here, so membership reads and can_write writes — the same shape as
-- wedding_tasks. A coordinator needs this on the day and gets read access from
-- is_member; §4.8's matrix gives them RW on the day-of pack, which is 8.x.
alter table responsibilities enable row level security;

create policy responsibilities_select on responsibilities
  for select using (app.is_member(wedding_id));
create policy responsibilities_write on responsibilities
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

revoke all on responsibilities from anon;

comment on column responsibilities.person_name is
  'Ticket 5.5. The named human. Empty here is what the warning is for: a role '
  'with nobody in it reads as covered right up until the day it is not.';

-- ---------------------------------------------------------------- v_readiness
-- Per area, from task completion.
--
-- Cancelled tasks are excluded from the denominator, not counted as done. A
-- task the couple struck off is not work completed, and leaving it in the
-- denominator would mean an area could never reach 100% however much was
-- finished — which is the sort of thing that makes people stop trusting a
-- progress bar.
create or replace view v_readiness
with (security_invoker = true) as
select t.wedding_id,
       coalesce(nullif(btrim(t.category), ''), 'Everything else') as area,
       count(*)                                                as task_count,
       count(*) filter (where t.status = 'completed')           as completed,
       count(*) filter (where t.status = 'cancelled')            as cancelled,
       count(*) filter (where t.status = 'in_progress')          as in_progress,
       count(*) filter (where t.status = 'waiting')              as waiting,
       count(*) filter (
         where t.status not in ('completed', 'cancelled')
           and t.due_date is not null
           and t.due_date < current_date
       )                                                        as overdue,
       count(*) filter (where t.status not in ('completed', 'cancelled')) as remaining,

       -- Ratio, not a percentage: formatting is the client's business, and a
       -- numeric here keeps it exact.
       case
         when count(*) filter (where t.status <> 'cancelled') = 0 then null
         else round(
           count(*) filter (where t.status = 'completed')::numeric
             / count(*) filter (where t.status <> 'cancelled')::numeric,
           4)
       end                                                      as ratio,

       min(t.due_date) filter (
         where t.status not in ('completed', 'cancelled')
       )                                                        as next_due
  from wedding_tasks t
 group by t.wedding_id, coalesce(nullif(btrim(t.category), ''), 'Everything else');

comment on view v_readiness is
  'Ticket 5.3. Completion per area from wedding_tasks. Cancelled tasks leave '
  'the denominator rather than counting as done, so an area with work struck '
  'off can still reach 100%. ratio is null when everything in an area was '
  'cancelled — there is no progress to report, which is not the same as zero.';
