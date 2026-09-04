-- =============================================================================
-- 20260904000900  the eighteen-of-a-kind tables  (tickets 6.1 - 6.6)
-- =============================================================================
-- Plan §2, having mapped all 27 sheets: "Eighteen of these are the same shape.
-- id, wedding_id, applicability, name, owner, vendor_id, cost, status, notes,
-- sort_order plus 2-6 module-specific columns. Build one ChecklistModule<T>
-- component + one generic table pattern and configure it eighteen times."
--
-- WHY SEPARATE TABLES AND NOT ONE WITH A `module` COLUMN
--
-- One table with a discriminator and a jsonb bag would be a third of the SQL.
-- It would also give up the thing this schema is built on: the database as the
-- boundary. A jsonb `extras` cannot carry a foreign key to `guests`, cannot
-- check that a duration is positive, cannot be typed into the generated
-- TypeScript, and cannot stop a decor row acquiring a `packed` flag. Seventeen
-- tables of real columns cost more lines here and less thought later.
--
-- The repetition is handled where repetition belongs — in a loop that builds
-- the shared shape, its RLS, its touch trigger and its index. Module-specific
-- columns are then added explicitly, one ALTER per module, so what makes each
-- module different is readable in one place instead of buried in a config
-- table.
--
-- None of this is money in the §4.6 sense, so `is_member` reads and
-- `can_write` writes: the coordinator needs the decor list and the shot list
-- on the day, and cost_minor on a decor item is not the budget.
-- =============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'attire_items',
    'jewellery_items',
    'beauty_appointments',
    'ceremony_steps',
    'legal_requirements',
    'decor_items',
    'menu_items',
    'cake_items',
    'transport_legs',
    'accommodations',
    'shot_list_items',
    'procurement_items',
    'wedding_party',
    'closure_tasks',
    'lessons',
    'music_cues',
    'contacts'
  ];
begin
  foreach t in array tables loop
    execute format($f$
      create table if not exists %1$I (
        id            uuid primary key default gen_random_uuid(),
        wedding_id    uuid not null references weddings (id) on delete cascade,

        -- The workbook's "Applies?" column. Switching a row off must mute it
        -- everywhere rather than delete it: "we are not having a cake" is
        -- worth recording, and next year's couple wants the row back.
        applicability applicability not null default 'required',
        name          text not null,
        owner         text,
        -- Who supplies it. Nullable: plenty of these are bought, not booked.
        vendor_id     uuid references vendors (id) on delete set null,
        cost_minor    bigint not null default 0 check (cost_minor >= 0),
        status        task_status not null default 'not_started',
        notes         text,
        sort_order    int not null default 0,
        created_at    timestamptz not null default now(),
        updated_at    timestamptz not null default now()
      );

      create index if not exists %1$s_wedding_idx on %1$I (wedding_id, sort_order);

      alter table %1$I enable row level security;

      drop policy if exists %1$s_select on %1$I;
      create policy %1$s_select on %1$I
        for select using (app.is_member(wedding_id));

      drop policy if exists %1$s_write on %1$I;
      create policy %1$s_write on %1$I
        for all using (app.can_write(wedding_id))
              with check (app.can_write(wedding_id));

      revoke all on %1$I from anon;

      drop trigger if exists %1$s_touch on %1$I;
      create trigger %1$s_touch before update on %1$I
        for each row execute function app.touch_updated_at();
    $f$, t);
  end loop;
end $$;

-- =============================================================================
-- Module-specific columns, one block per module, from the workbook's own
-- headers. `if not exists` throughout so this migration is re-runnable.
-- =============================================================================

-- 12 Attire & Jewellery. `subject` is the sheet's "Who": Bride, Groom, mothers.
alter table attire_items
  add column if not exists subject        text,
  add column if not exists fitting_1_on   date,
  add column if not exists fitting_2_on   date,
  add column if not exists final_fitting_on date,
  add column if not exists alterations    text,
  add column if not exists collect_by     date,
  add column if not exists paid_minor     bigint not null default 0
                             check (paid_minor >= 0);

-- 6.3 The jewellery custody register. Not an attire list with a price column:
-- the question it answers is "where is it now and who has it", which is why
-- the alert below exists.
do $$ begin
  create type jewellery_ownership as enum ('owned', 'gifted', 'rented', 'borrowed');
exception when duplicate_object then null; end $$;

alter table jewellery_items
  add column if not exists subject      text,
  add column if not exists ownership    jewellery_ownership not null default 'owned',
  add column if not exists value_minor  bigint not null default 0 check (value_minor >= 0),
  add column if not exists deposit_minor bigint not null default 0
                             check (deposit_minor >= 0),
  -- The custody chain. A name, not a role: "Groom's Family" cannot be asked
  -- where the necklace is.
  add column if not exists custodian    text,
  add column if not exists collect_on   date,
  add column if not exists return_by    date,
  add column if not exists returned_on  date,
  add column if not exists insured      boolean not null default false;

-- 13 Beauty & Grooming.
alter table beauty_appointments
  add column if not exists subject          text,
  add column if not exists provider         text,
  add column if not exists on_date          date,
  add column if not exists at_time          time,
  add column if not exists location         text,
  add column if not exists duration_minutes int check (duration_minutes > 0),
  add column if not exists paid_minor       bigint not null default 0
                             check (paid_minor >= 0);

-- 6.4 Ceremony steps. Ordered by sort_order, switchable by applicability,
-- durations summed by the view below.
alter table ceremony_steps
  add column if not exists at_time          time,
  add column if not exists location         text,
  add column if not exists items_needed     text,
  add column if not exists leads            text,
  add column if not exists duration_minutes int check (duration_minutes > 0);

-- 6.5 Legal requirements. verify_status is the workbook's VERIFY pattern, and
-- plan R10 is why it exists: registration rules are stated as things to check
-- with the authority, never as fact.
do $$ begin
  create type verify_status as enum ('to_verify', 'verified', 'not_applicable');
exception when duplicate_object then null; end $$;

alter table legal_requirements
  add column if not exists jurisdiction   text,
  add column if not exists verify_status  verify_status not null default 'to_verify',
  add column if not exists authority      text,
  add column if not exists reference_url  text,
  add column if not exists verified_on    date,
  add column if not exists due_date       date,
  add column if not exists document_held  boolean not null default false;

-- 15 Decor & Design.
alter table decor_items
  add column if not exists area             text,
  add column if not exists qty              int check (qty >= 0),
  add column if not exists setup_by         text,
  add column if not exists remove_after     text,
  add column if not exists checked_on_day   boolean not null default false;

-- 16 Food & Beverage.
alter table menu_items
  add column if not exists course    text,
  add column if not exists dietary   text,
  add column if not exists qty       int check (qty >= 0),
  add column if not exists per_head  boolean not null default false;

alter table cake_items
  add column if not exists tiers        int check (tiers > 0),
  add column if not exists flavour      text,
  add column if not exists servings     int check (servings >= 0),
  add column if not exists delivery_at  time;

-- 17 Transport & Stay.
alter table transport_legs
  add column if not exists vehicle       text,
  add column if not exists driver        text,
  add column if not exists driver_phone  text,
  add column if not exists passengers    text,
  add column if not exists pickup_from   text,
  add column if not exists pickup_at     time,
  add column if not exists destination   text,
  add column if not exists arrive_by     time,
  add column if not exists return_trip   boolean not null default false;

alter table accommodations
  add column if not exists guest_id         uuid references guests (id) on delete set null,
  add column if not exists hotel            text,
  add column if not exists room_type        text,
  add column if not exists check_in         date,
  add column if not exists check_out        date,
  add column if not exists nights           int check (nights >= 0),
  add column if not exists confirmation_ref text;

-- 18 Photo & Video Plan.
alter table shot_list_items
  add column if not exists section        text,
  add column if not exists priority       text,
  add column if not exists people_needed  text,
  add column if not exists location       text,
  add column if not exists planned_at     time,
  add column if not exists captured       boolean not null default false;

-- 23 Procurement & Packing. The sheet's own workflow is buy -> pack -> load,
-- and all three flags matter separately on the day.
alter table procurement_items
  add column if not exists container      text,
  add column if not exists category       text,
  add column if not exists qty            int check (qty >= 0),
  add column if not exists actual_minor   bigint not null default 0
                             check (actual_minor >= 0),
  add column if not exists where_to_buy   text,
  add column if not exists bought         boolean not null default false,
  add column if not exists bought_on      date,
  add column if not exists stored_where   text,
  add column if not exists needed_on_day  boolean not null default false,
  add column if not exists packed         boolean not null default false,
  add column if not exists loaded         boolean not null default false;

-- 11 Wedding Party.
alter table wedding_party
  add column if not exists role          text,
  add column if not exists phone         text,
  add column if not exists whatsapp      text,
  add column if not exists side          wedding_side,
  add column if not exists outfit        text,
  add column if not exists outfit_ready  boolean not null default false,
  add column if not exists accessories   text,
  add column if not exists duties        text,
  add column if not exists arrive_by     time,
  add column if not exists transport     text,
  add column if not exists room_needed   boolean not null default false,
  add column if not exists gift_given    boolean not null default false;

-- 25 Post-Wedding.
alter table closure_tasks
  add column if not exists window_label  text,
  add column if not exists target_date   date,
  add column if not exists done_on       date,
  add column if not exists amount_minor  bigint not null default 0
                             check (amount_minor >= 0);

alter table lessons
  add column if not exists category  text,
  add column if not exists verdict   text;

-- 20 Day Timeline (music). 8.1 builds the timeline itself; the cues are a
-- list, and a list is this shape.
alter table music_cues
  add column if not exists moment  text,
  add column if not exists track   text,
  add column if not exists artist  text,
  add column if not exists cue_at  time,
  add column if not exists source  text;

-- 22 Contact Sheet. 8.3 adds pulling vendor phones and flagging missing
-- numbers; the table is this shape.
alter table contacts
  add column if not exists group_label   text,
  add column if not exists role          text,
  add column if not exists phone         text,
  add column if not exists backup_phone  text,
  add column if not exists whatsapp      text;

-- =============================================================================
-- Views
-- =============================================================================

-- 6.3's alert. Anything rented or borrowed that has not come back, and either
-- its return date has passed or the wedding has. Deliberately two conditions:
-- a rental due back next week is not a problem, and one with no return date at
-- all is, because nobody has decided when it goes back.
create or replace view v_jewellery_custody
with (security_invoker = true) as
select j.wedding_id,
       j.id                                   as item_id,
       j.name,
       j.subject,
       j.ownership,
       j.value_minor,
       j.deposit_minor,
       j.custodian,
       j.collect_on,
       j.return_by,
       j.returned_on,
       j.insured,
       (j.ownership in ('rented', 'borrowed') and j.returned_on is null) as awaiting_return,
       (j.ownership in ('rented', 'borrowed')
          and j.returned_on is null
          and (j.return_by is null or j.return_by < current_date)
          and j.applicability <> 'not_applicable')                       as overdue_return,
       -- Somebody has to be able to be asked. An item in nobody's custody is
       -- how a rented necklace goes missing between the venue and the shop.
       (j.custodian is null or btrim(j.custodian) = '')                   as no_custodian
  from jewellery_items j;

comment on view v_jewellery_custody is
  'Ticket 6.3. overdue_return covers a rental with no return date as well as '
  'one past it: nobody having decided when it goes back is the same problem '
  'later. Not-applicable items are excluded — they were switched off, not lost.';

-- 6.4's duration sum. A ceremony is a sequence of timed components, and the
-- number people want is how long the whole thing runs, with switched-off
-- components contributing nothing.
create or replace view v_ceremony_length
with (security_invoker = true) as
select c.wedding_id,
       count(*)                                                     as step_count,
       count(*) filter (where c.applicability <> 'not_applicable')  as active_steps,
       coalesce(sum(c.duration_minutes) filter (
         where c.applicability <> 'not_applicable'
       ), 0)                                                        as minutes,
       count(*) filter (
         where c.applicability <> 'not_applicable' and c.duration_minutes is null
       )                                                            as steps_without_duration,
       min(c.at_time) filter (where c.applicability <> 'not_applicable') as starts_at
  from ceremony_steps c
 group by c.wedding_id;

comment on view v_ceremony_length is
  'Ticket 6.4. Sums only the components that still apply. '
  'steps_without_duration says how much of the total is guesswork — a sum over '
  'a list with holes in it reads as authoritative and is not.';

-- 6.6 Catering headcount. "Confirmed + crew + buffer %, live from guests."
alter table weddings
  add column if not exists crew_count int not null default 0 check (crew_count >= 0);

comment on column weddings.crew_count is
  'Ticket 6.6. Vendors and helpers who eat but were never invited — the '
  'photographer, the band, the coordinator. They are not guests, so they are '
  'not in the guest list, and forgetting them is how a caterer runs short.';

create or replace view v_catering_headcount
with (security_invoker = true) as
select w.id                                              as wedding_id,
       w.guest_buffer_pct,
       w.crew_count,
       coalesce(g.invited, 0)                            as invited,
       coalesce(g.confirmed, 0)                          as confirmed,
       coalesce(g.declined_heads, 0)                     as declined_heads,
       coalesce(g.awaiting, 0)                           as awaiting_reply,

       -- The number to give the caterer. Confirmed heads, plus the buffer for
       -- the ones who turn up anyway, plus the crew. Rounded UP: half a person
       -- is a person, and rounding down is how somebody goes without.
       ceil(coalesce(g.confirmed, 0) * (1 + w.guest_buffer_pct))::int + w.crew_count
                                                          as cater_for,

       -- What it would be if everyone still to reply said yes. The gap between
       -- this and cater_for is the risk being carried.
       ceil((coalesce(g.confirmed, 0) + coalesce(g.awaiting, 0))
              * (1 + w.guest_buffer_pct))::int + w.crew_count
                                                          as cater_for_if_all_accept
  from weddings w
  left join (
    select wedding_id,
           sum(total_invited)                                                  as invited,
           sum(total_attending) filter (where rsvp_status = 'accepted')         as confirmed,
           sum(total_invited)   filter (where rsvp_status = 'declined')         as declined_heads,
           sum(total_invited)   filter (
             where rsvp_status in ('pending', 'no_response', 'maybe')
           )                                                                    as awaiting
      from guests
     group by wedding_id
  ) g on g.wedding_id = w.id
 where app.is_member(w.id);

comment on view v_catering_headcount is
  'Ticket 6.6. cater_for is confirmed heads plus the buffer plus crew, rounded '
  'up. cater_for_if_all_accept is the same with everyone still to reply saying '
  'yes; the difference is the exposure. Side-scoped for family members, like '
  'every other read of guests.';
