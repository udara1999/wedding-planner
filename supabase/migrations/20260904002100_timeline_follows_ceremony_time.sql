-- =============================================================================
-- 20260904002100  the day timeline follows the ceremony time
-- =============================================================================
-- Reported: the day timeline does not match the wedding time, and changing the
-- time in Setup does not move it.
--
-- Both true, and it is a modelling gap rather than a bug in the screen.
-- template.timeline_events stores ABSOLUTE times taken from the source
-- workbook, whose own poruwa was at 19:00. Every wedding therefore got a
-- timeline built around 19:00 no matter what it had entered as its ceremony
-- time, and nothing could move it afterwards.
--
-- THE FIX IS THE ONE 1.7 ALREADY MADE FOR DATES
--
-- Ticket 1.7's insight was that a date on a seeded row must be stored as an
-- OFFSET from the wedding date, never as a date, so that moving the nekath
-- re-dates the plan. Times have exactly the same problem one level down, and
-- had none of the same treatment: the timeline needed offset_minutes from the
-- ceremony, and a trigger on the column it hangs off.
--
--   Setup   07:00  ->  -720 minutes
--   Ceremony 19:00 ->     0   (the anchor)
--   Close   00:15  ->  +315   (past midnight, so a day is added)
--
-- CHOOSING THE ANCHOR
--
-- The earliest event in the template's Ceremony phase, which is 19:00. Not the
-- poruwa itself at 19:10 — `ceremony_time` on the Setup screen is when the
-- ceremony STARTS, and a couple entering 17:30 means the drummers start at
-- 17:30, not that the poruwa does.
--
-- MIDNIGHT
--
-- The workbook's day runs 07:00 to 00:15, so anything before 06:00 is the
-- following morning and gets a day added before the offset is taken.
-- Postgres time arithmetic wraps modulo 24 hours, so rebuilding the time from
-- the anchor gives 00:15 back without any special handling.
-- =============================================================================

alter table template.timeline_events
  add column if not exists offset_minutes int;

alter table timeline_events
  add column if not exists offset_minutes int,
  -- The same promise due_date_overridden makes for dates: a time somebody set
  -- by hand is theirs, and moving the ceremony must not overwrite it.
  add column if not exists starts_at_overridden boolean not null default false;

comment on column timeline_events.offset_minutes is
  'Minutes from the ceremony start; negative before it. starts_at is derived '
  'from this and weddings.ceremony_time, so changing the ceremony time moves '
  'the whole day. Null for an event the couple added with a bare time.';

-- ---------------------------------------------------- backfill the template
-- Computed from the times already there rather than typed again, so the
-- template's own running order stays the single source of it.
with anchor as (
  select locale, min(starts_at) as t
    from template.timeline_events
   where phase = 'Ceremony' and starts_at is not null
   group by locale
)
update template.timeline_events te
   set offset_minutes = (
         extract(epoch from (te.starts_at - a.t)) / 60
         -- Before 06:00 is the morning after, not eleven hours before the
         -- ceremony. Without this the closing events land at -1125.
         + case when te.starts_at < time '06:00' then 1440 else 0 end
       )::int
  from anchor a
 where a.locale = te.locale
   and te.starts_at is not null;

-- --------------------------------------------------------------- the helper
-- One place that knows how a time is rebuilt, used by the seeder, the trigger
-- and the backfill below.
create or replace function app.timeline_time(
  p_ceremony_time  time,
  p_offset_minutes int,
  p_locale         text
)
returns time
language sql
stable
as $$
  select case
    when p_offset_minutes is null then null
    else coalesce(
           p_ceremony_time,
           -- No ceremony time set yet: fall back to the template's own anchor
           -- so the day still reads sensibly instead of collapsing to 00:00.
           (select min(starts_at) from template.timeline_events
             where locale = p_locale and phase = 'Ceremony' and starts_at is not null),
           time '19:00'
         ) + make_interval(mins => p_offset_minutes)
  end;
$$;

comment on function app.timeline_time(time, int, text) is
  'Rebuilds a timeline event''s clock time from the wedding''s ceremony time '
  'and the event''s offset. Postgres time arithmetic wraps at 24 hours, so an '
  'event 315 minutes after a 19:00 ceremony comes back as 00:15.';

-- ------------------------------------------------------- retime on change
create or replace function app.retime_wedding_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update timeline_events t
     set starts_at = app.timeline_time(
           new.ceremony_time,
           t.offset_minutes,
           coalesce((select template_locale from weddings where id = new.id), 'poruwa')
         )
   where t.wedding_id = new.id
     and t.offset_minutes is not null
     and not t.starts_at_overridden;

  return null;
end;
$$;

comment on function app.retime_wedding_day() is
  'Moves the whole day timeline when the ceremony time changes, skipping any '
  'event whose time was set by hand. AFTER, and returns null: it only updates '
  'other rows.';

drop trigger if exists weddings_retime on weddings;
create trigger weddings_retime
  after update of ceremony_time on weddings
  for each row
  when (old.ceremony_time is distinct from new.ceremony_time)
  execute function app.retime_wedding_day();

-- ============================================================ existing data
-- Every wedding already created — including Udara and Methuli's — carries
-- timeline rows built around the workbook's 19:00. Give them their offsets
-- from the template row they came from, then rebuild their times against
-- whatever ceremony time they have actually entered.
update timeline_events t
   set offset_minutes = te.offset_minutes
  from template.timeline_events te
 where te.id = t.source_template_id
   and t.offset_minutes is null;

update timeline_events t
   set starts_at = app.timeline_time(
         w.ceremony_time,
         t.offset_minutes,
         coalesce(w.template_locale, w.tradition, 'poruwa')
       )
  from weddings w
 where w.id = t.wedding_id
   and t.offset_minutes is not null
   and not t.starts_at_overridden;
