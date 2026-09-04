-- =============================================================================
-- 20260904001300  day-of operations  (tickets 8.1 - 8.4)
-- =============================================================================
-- Plan risk R8 is the one that keeps this phase honest: "Day-of failure — the
-- venue has no signal and the coordinator has nothing." Everything here exists
-- to be read by one person, on their feet, in a hotel ballroom, possibly on
-- paper.
--
-- THE WRITE BOUNDARY CHANGES HERE
--
-- Every other domain table in this schema is written by the couple
-- (app.can_write). The day-of pack is the exception §4.8's matrix calls out:
-- the coordinator has RW on the timeline, the schedule, the contacts and the
-- risks. They are the person ticking vendors in at 7am; making them read-only
-- would mean the couple updating the schedule from the top table.
--
-- So a new helper, rather than repeating the role list on eight policies.
-- =============================================================================

create or replace function app.can_run_day(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) in ('owner', 'partner', 'coordinator'), false)
$$;

comment on function app.can_run_day(uuid) is
  'Ticket 8.5 / plan §4.8. Write access to the day-of pack: the couple plus the '
  'coordinator, who is the one actually running it. Coalesced to false because '
  'app.role_in returns NULL for a non-member and `not NULL` never fires.';

-- ---------------------------------------------------------------- 8.1 timeline
create table if not exists timeline_events (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references weddings (id) on delete cascade,
  source_template_id  bigint,
  seq                 int,

  -- Setup / Preparation / Arrival / Ceremony / Reception / Close, from the
  -- workbook. Free text so a wedding can add its own phase.
  phase               text,
  starts_at           time,
  duration_minutes    int check (duration_minutes >= 0),

  -- Computed, not stored twice. The workbook has an "Ends" column that a
  -- person maintains by hand, which is how a timeline ends up claiming an
  -- event finishes before it starts.
  ends_at             time generated always as (
                        case when starts_at is null or duration_minutes is null then null
                             else (starts_at + make_interval(mins => duration_minutes))::time
                        end
                      ) stored,

  name                text not null,
  who                 text,
  location            text,
  vendor_id           uuid references vendors (id) on delete set null,
  applicability       applicability not null default 'required',
  done                boolean not null default false,
  notes               text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists timeline_events_wedding_idx
  on timeline_events (wedding_id, sort_order);

-- ------------------------------------------------------- 8.2 vendor schedule
-- Plan §2 says "derived from vendors times", and the times are indeed already
-- on `vendors`. What is NOT derivable is the two ticks — checked in, checked
-- out — which are facts about the day itself and are written by the
-- coordinator, who cannot write `vendors`.
--
-- So this table holds only what the day adds, one row per vendor, and the view
-- below joins it to the ops view for the times and the phone number. Putting
-- the ticks on `vendors` would have meant opening that table to the
-- coordinator, and `vendors` carries prices.
create table if not exists vendor_schedule (
  wedding_id      uuid not null references weddings (id) on delete cascade,
  vendor_id       uuid not null references vendors (id) on delete cascade,
  checked_in_at   timestamptz,
  checked_out_at  timestamptz,
  where_in_venue  text,
  day_notes       text,
  updated_at      timestamptz not null default now(),
  primary key (wedding_id, vendor_id)
);

-- ---------------------------------------------------------------- 8.4 risks
create table if not exists risks (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references weddings (id) on delete cascade,
  source_template_id  bigint,
  seq                 int,

  area                text,
  name                text not null,

  -- 1 to 4, as the workbook's Low / Medium / High / Critical. Numbers rather
  -- than an enum because the score below is a product, and multiplying enum
  -- labels is not a thing.
  likelihood          int not null default 2 check (likelihood between 1 and 4),
  impact              int not null default 2 check (impact between 1 and 4),
  score               int generated always as (likelihood * impact) stored,

  prevent_by          text,
  if_it_happens       text,
  owner               text,
  who_to_call         text,
  prevention_done     boolean not null default false,
  applicability       applicability not null default 'required',
  notes               text,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists risks_wedding_idx on risks (wedding_id, score desc);

-- ---------------------------------------------------------------- RLS
alter table timeline_events  enable row level security;
alter table vendor_schedule  enable row level security;
alter table risks            enable row level security;

do $$
declare t text;
begin
  foreach t in array array['timeline_events', 'vendor_schedule', 'risks'] loop
    execute format($f$
      drop policy if exists %1$s_select on %1$I;
      create policy %1$s_select on %1$I
        for select using (app.is_member(wedding_id));

      -- The one place a coordinator writes.
      drop policy if exists %1$s_write on %1$I;
      create policy %1$s_write on %1$I
        for all using (app.can_run_day(wedding_id))
              with check (app.can_run_day(wedding_id));

      revoke all on %1$I from anon;

      drop trigger if exists %1$s_touch on %1$I;
      create trigger %1$s_touch before update on %1$I
        for each row execute function app.touch_updated_at();
    $f$, t);
  end loop;
end $$;

-- ------------------------------------------------- 8.1 conflict detection
-- Two events overlap in time AND need the same person, the same vendor or the
-- same room. Overlapping in time alone is normal — a wedding is many things at
-- once — so a view that flagged that would flag everything.
--
-- Only `a.id < b.id` so each clash is reported once rather than twice with the
-- pair reversed.
create or replace view v_timeline_conflicts
with (security_invoker = true) as
select a.wedding_id,
       a.id            as event_id,
       b.id            as clashes_with_id,
       a.name          as event_name,
       b.name          as clashes_with_name,
       a.starts_at     as event_starts,
       b.starts_at     as clashes_with_starts,
       case
         when a.vendor_id is not null and a.vendor_id = b.vendor_id then 'vendor'
         when coalesce(btrim(a.who), '') <> '' and btrim(a.who) = btrim(b.who) then 'person'
         else 'place'
       end             as clash_on,
       coalesce(v.name, nullif(btrim(a.who), ''), a.location) as contested
  from timeline_events a
  join timeline_events b
    on b.wedding_id = a.wedding_id
   and b.id <> a.id
   and a.id < b.id
   -- Half-open intervals: an event ending at 14:00 and one starting at 14:00
   -- are back to back, not a clash.
   and a.starts_at is not null and b.starts_at is not null
   and a.ends_at is not null   and b.ends_at is not null
   and a.starts_at < b.ends_at and b.starts_at < a.ends_at
   and (
        (a.vendor_id is not null and a.vendor_id = b.vendor_id)
     or (coalesce(btrim(a.who), '') <> '' and btrim(a.who) = btrim(b.who))
     or (coalesce(btrim(a.location), '') <> '' and btrim(a.location) = btrim(b.location))
   )
  left join vendors v on v.id = a.vendor_id
 where a.applicability <> 'not_applicable'
   and b.applicability <> 'not_applicable';

comment on view v_timeline_conflicts is
  'Ticket 8.1. Overlapping events that contend for the same vendor, person or '
  'room. Overlap alone is not a conflict — a wedding is many things at once. '
  'Intervals are half-open, so back-to-back events do not clash, and each pair '
  'is reported once.';

-- ------------------------------------------------------- 8.2 the schedule view
-- Reads v_vendors_ops, not `vendors`. That view exists precisely so a
-- coordinator can have the times and the phone number without the prices, and
-- going to the table directly here would have undone it.
create or replace view v_vendor_schedule
with (security_invoker = true) as
select o.wedding_id,
       o.id                as vendor_id,
       o.name,
       o.category,
       o.contact_name,
       o.phone,
       o.arrival_time,
       o.setup_done_by,
       o.finish_time,
       o.key_deliverables,
       s.checked_in_at,
       s.checked_out_at,
       -- No fallback to vendors.address: v_vendors_ops does not carry it, and
       -- reaching past that view for one column would defeat the point of it.
       s.where_in_venue,
       s.day_notes,
       (s.checked_in_at is not null)          as checked_in,
       (s.checked_out_at is not null)         as checked_out,
       -- The number the coordinator cannot work without, and the one most
       -- often missing. Surfaced as a fact rather than an empty cell.
       (coalesce(btrim(o.phone), '') = '')    as no_phone
  from v_vendors_ops o
  left join vendor_schedule s
    on s.wedding_id = o.wedding_id and s.vendor_id = o.id;

comment on view v_vendor_schedule is
  'Ticket 8.2. The coordinator''s arrival board. Times and contact come from '
  'v_vendors_ops, which is money-free by design; the two ticks come from '
  'vendor_schedule, which the coordinator may write and `vendors` is not.';

-- ------------------------------------------------------------- template side
create table if not exists template.timeline_events (
  id               bigint generated always as identity primary key,
  locale           text not null references template.locales (code) on delete cascade,
  seq              int  not null,
  phase            text,
  starts_at        time,
  duration_minutes int,
  name             text not null,
  who              text,
  location         text,
  vendor_hint      text,
  applicability    applicability not null default 'required',
  unique (locale, seq)
);

create table if not exists template.risks (
  id             bigint generated always as identity primary key,
  locale         text not null references template.locales (code) on delete cascade,
  seq            int  not null,
  area           text,
  name           text not null,
  likelihood     int  not null check (likelihood between 1 and 4),
  impact         int  not null check (impact between 1 and 4),
  prevent_by     text,
  if_it_happens  text,
  owner_default  text,
  who_to_call    text,
  unique (locale, seq)
);

grant select on template.timeline_events, template.risks to authenticated;

do $$ begin
  alter table timeline_events
    add constraint timeline_events_template_fk
    foreign key (source_template_id) references template.timeline_events (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table risks
    add constraint risks_template_fk
    foreign key (source_template_id) references template.risks (id) on delete set null;
exception when duplicate_object then null; end $$;

create unique index if not exists timeline_events_template_uniq
  on timeline_events (wedding_id, source_template_id);
create unique index if not exists risks_template_uniq
  on risks (wedding_id, source_template_id);

insert into template.timeline_events
  (locale, seq, phase, starts_at, duration_minutes, name, who, location,
   vendor_hint, applicability)
values
  ('poruwa', 1, 'Setup', '07:00', 60, 'Venue opens - coordinator arrives, collects keys and floor plan', 'Coordinator', 'Venue', null, 'required'),
  ('poruwa', 2, 'Setup', '08:00', 60, 'Decor team arrives, unloads, marks out the room', 'Vendor', 'Ballroom', 'Decorator', 'required'),
  ('poruwa', 3, 'Setup', '09:00', 180, 'PORUWA build and decoration', 'Vendor', 'Ballroom', 'Decorator', 'required'),
  ('poruwa', 4, 'Setup', '09:00', 120, 'Table layout, linen, chair covers', 'Vendor', 'Ballroom', 'Venue', 'required'),
  ('poruwa', 5, 'Setup', '11:00', 90, 'Sound, lighting and AV rig', 'Vendor', 'Ballroom', 'Sound & AV', 'required'),
  ('poruwa', 6, 'Setup', '12:00', 90, 'Stage, backdrop and head table', 'Vendor', 'Ballroom', 'Decorator', 'required'),
  ('poruwa', 7, 'Preparation', '13:00', 30, 'Bridal dresser arrives at the suite', 'Vendor', 'Bridal suite', 'Makeup Artist', 'required'),
  ('poruwa', 8, 'Preparation', '13:30', 150, 'BRIDE - hair and makeup', 'Bride', 'Bridal suite', 'Makeup Artist', 'required'),
  ('poruwa', 9, 'Preparation', '13:30', 90, 'Bridesmaids - hair and makeup', 'Bridesmaids', 'Bridal suite', 'Makeup Artist', 'required'),
  ('poruwa', 10, 'Preparation', '14:30', 30, 'Photographer and videographer arrive at the suite', 'Vendor', 'Bridal suite', 'Photographer', 'required'),
  ('poruwa', 11, 'Preparation', '14:30', 60, 'Detail shots - saree, jewellery, rings, shoes, invitation', 'Vendor', 'Bridal suite', 'Photographer', 'required'),
  ('poruwa', 12, 'Setup', '14:00', 120, 'Fresh flowers delivered and placed', 'Vendor', 'Ballroom', 'Florist', 'required'),
  ('poruwa', 13, 'Setup', '15:30', 30, 'CAKE delivered and set on the cake table', 'Vendor', 'Ballroom', 'Cake', 'required'),
  ('poruwa', 14, 'Preparation', '15:30', 60, 'GROOM - grooming and dressing', 'Groom', 'Groom''s room', null, 'required'),
  ('poruwa', 15, 'Preparation', '16:00', 45, 'Groom''s portraits and shots with his family', 'Groom', 'Groom''s room', 'Photographer', 'required'),
  ('poruwa', 16, 'Setup', '16:00', 60, 'Signage, seating board, table numbers, place cards placed', 'Coordinator', 'Welcome area', null, 'required'),
  ('poruwa', 17, 'Setup', '16:30', 30, 'Gift table, guest book and favour display set', 'Coordinator', 'Welcome area', null, 'required'),
  ('poruwa', 18, 'Preparation', '16:00', 60, 'Bride into the saree - dresser and mother', 'Bride', 'Bridal suite', 'Makeup Artist', 'required'),
  ('poruwa', 19, 'Preparation', '17:00', 30, 'Bride''s first-look with her father', 'Bride', 'Bridal suite', 'Photographer', 'required'),
  ('poruwa', 20, 'Preparation', '17:00', 45, 'Bride''s portraits and shots with bridesmaids', 'Bride', 'Bridal suite', 'Photographer', 'required'),
  ('poruwa', 21, 'Setup', '17:00', 45, 'DECOR SIGN-OFF - coordinator and couple walk the room', 'Coordinator', 'Ballroom', 'Decorator', 'required'),
  ('poruwa', 22, 'Setup', '17:00', 60, 'Kandyan dancers and drummers arrive, change, sound check', 'Vendor', 'Backstage', 'Kandyan Dancers', 'required'),
  ('poruwa', 23, 'Setup', '17:30', 30, 'Sound check - MC, officiant and speech microphones', 'Vendor', 'Ballroom', 'Sound & AV', 'required'),
  ('poruwa', 24, 'Setup', '17:30', 30, 'Welcome drinks station ready', 'Vendor', 'Welcome area', 'Caterer', 'required'),
  ('poruwa', 25, 'Arrival', '17:30', 30, 'Groom and his family leave for the venue', 'Groom', 'En route', null, 'required'),
  ('poruwa', 26, 'Arrival', '18:00', 60, 'GUESTS ARRIVE - ushers seat them, welcome drinks served', 'Ushers', 'Welcome area', 'Venue', 'required'),
  ('poruwa', 27, 'Arrival', '18:15', 30, 'Bride leaves for the venue in the bridal car', 'Bride', 'En route', null, 'required'),
  ('poruwa', 28, 'Arrival', '18:45', 15, 'Registrar arrives - coordinator receives the document folder', 'Coordinator', 'Venue', null, 'required'),
  ('poruwa', 29, 'Arrival', '18:50', 10, 'Guests seated, doors closed, phones to silent announcement', 'MC', 'Ballroom', 'MC', 'required'),
  ('poruwa', 30, 'Ceremony', '19:00', 5, 'Hewisi drummers and Kandyan dancers lead the groom in', 'Vendor', 'Ballroom', 'Kandyan Dancers', 'required'),
  ('poruwa', 31, 'Ceremony', '19:05', 5, 'Bride enters with her father', 'Bride', 'Ballroom', null, 'required'),
  ('poruwa', 32, 'Ceremony', '19:10', 20, 'PORUWA CEREMONY - see 14 Ceremony & Legal for the full order', 'Couple', 'Poruwa', 'Poruwa Officiant', 'required'),
  ('poruwa', 33, 'Ceremony', '19:30', 15, 'MARRIAGE REGISTRATION - couple and witnesses sign', 'Couple', 'Signing table', null, 'required'),
  ('poruwa', 34, 'Ceremony', '19:45', 10, 'Blessings from the elders', 'Couple', 'Ballroom', null, 'required'),
  ('poruwa', 35, 'Reception', '19:55', 25, 'FAMILY GROUP PHOTOGRAPHS - see the list on 18 Photo & Video', 'Coordinator', 'Stage', 'Photographer', 'required'),
  ('poruwa', 36, 'Reception', '19:55', 25, 'Guests move through to the reception, music on', 'Ushers', 'Ballroom', 'DJ', 'required'),
  ('poruwa', 37, 'Reception', '20:20', 10, 'Couple''s entrance to the reception', 'Couple', 'Ballroom', 'MC', 'required'),
  ('poruwa', 38, 'Reception', '20:30', 15, 'Welcome speech', 'Groom''s Family', 'Stage', 'MC', 'required'),
  ('poruwa', 39, 'Reception', '20:45', 15, 'Traditional dance performance', 'Vendor', 'Dance floor', 'Kandyan Dancers', 'required'),
  ('poruwa', 40, 'Reception', '21:00', 60, 'DINNER SERVICE - head table and elderly guests first', 'Vendor', 'Ballroom', 'Caterer', 'required'),
  ('poruwa', 41, 'Reception', '21:00', 45, 'Couple''s portraits while guests eat', 'Couple', 'Garden', 'Photographer', 'required'),
  ('poruwa', 42, 'Reception', '21:30', 10, 'CAKE CUTTING', 'Couple', 'Cake table', 'MC', 'required'),
  ('poruwa', 43, 'Reception', '21:45', 20, 'Speeches - best man, maid of honour, fathers', 'Speakers', 'Stage', 'MC', 'required'),
  ('poruwa', 44, 'Reception', '22:05', 10, 'First dance', 'Couple', 'Dance floor', 'DJ', 'required'),
  ('poruwa', 45, 'Reception', '22:15', 60, 'Music, dancing and table rounds by the couple', 'Couple', 'Ballroom', 'DJ', 'required'),
  ('poruwa', 46, 'Reception', '22:15', 45, 'Photographer covers every table', 'Vendor', 'Ballroom', 'Photographer', 'required'),
  ('poruwa', 47, 'Close', '23:15', 10, 'Final announcements and thank-you from the couple', 'Couple', 'Stage', 'MC', 'required'),
  ('poruwa', 48, 'Close', '23:25', 5, 'Cake boxes and favours handed out at the door', 'Ushers', 'Welcome area', null, 'required'),
  ('poruwa', 49, 'Close', '23:30', 30, 'GUESTS DEPART - buses leave', 'Coordinator', 'Entrance', 'Transport', 'required'),
  ('poruwa', 50, 'Close', '23:30', 15, 'GIFT TABLE cleared to a locked room - two people, count together', 'Groom''s Family', 'Welcome area', null, 'required'),
  ('poruwa', 51, 'Close', '23:35', 25, 'JEWELLERY removed, checked against 12 Attire & Jewellery, secured', 'Groom', 'Bridal suite', null, 'required'),
  ('poruwa', 52, 'Close', '23:40', 20, 'Personal belongings collected from both rooms and the stage', 'Bridesmaids', 'Venue', null, 'required'),
  ('poruwa', 53, 'Close', '23:45', 30, 'Vendor sign-off - coordinator checks each one out', 'Coordinator', 'Venue', null, 'required'),
  ('poruwa', 54, 'Close', '23:45', 20, 'Day-of balances and tips paid', 'Best Man', 'Venue', null, 'required'),
  ('poruwa', 55, 'Close', '00:00', 45, 'Decor and AV breakdown begins', 'Vendor', 'Ballroom', 'Decorator', 'required'),
  ('poruwa', 56, 'Close', '00:15', 15, 'FINAL VENUE WALKTHROUGH - nothing left behind', 'Coordinator', 'Venue', 'Venue / Hotel', 'required');

insert into template.risks
  (locale, seq, area, name, likelihood, impact, prevent_by, if_it_happens,
   owner_default, who_to_call)
values
  ('poruwa', 1, 'Weather', 'Heavy rain during an outdoor segment', 3, 3, 'Book an indoor venue or a covered area from the start; confirm the wet-weather plan in writing', 'Move everything indoors; umbrellas at the entrance; reroute guest drop-off under cover', 'Coordinator', null),
  ('poruwa', 2, 'Power', 'Power cut during the ceremony or reception', 2, 3, 'Confirm the venue''s generator and its automatic switchover time in writing', 'Generator on standby; candles and torches ready; DJ has a battery speaker', 'Coordinator', null),
  ('poruwa', 3, 'Vendor', 'A key vendor does not turn up', 1, 4, 'Confirm every vendor in writing 14 days out and again 3 days out', 'Keep a shortlisted back-up for photographer, DJ and MC with numbers on 22 Contact Sheet', 'Coordinator', null),
  ('poruwa', 4, 'Vendor', 'Photographer or videographer arrives late', 2, 3, 'Confirm arrival time in writing; ask for the second shooter''s number too', 'Second shooter starts; reorder the timeline so preparation shots move later', 'Coordinator', null),
  ('poruwa', 5, 'Transport', 'Bridal car breaks down or the driver is late', 1, 4, 'Book with an established company; confirm the driver''s number the day before', 'Nominate a back-up family car and driver; number on 22 Contact Sheet', 'Groom''s Family', null),
  ('poruwa', 6, 'Transport', 'Guest bus is delayed', 2, 2, 'Confirm pick-up points and times in writing 3 days out', 'Delay the ceremony start by 10 minutes; MC keeps guests entertained', 'Coordinator', null),
  ('poruwa', 7, 'Beauty', 'Bridal dressing runs over time', 3, 3, 'Book the dresser to start 60 minutes earlier than you think you need', 'Cut the bride''s solo portraits; move them to after the ceremony', 'Bride', null),
  ('poruwa', 8, 'Ceremony', 'Registrar is late or a document is missing', 1, 4, 'Confirm attendance in writing; check every document 7 days out and again the night before', 'Continue with the Poruwa; register separately at the office afterwards', 'Couple', null),
  ('poruwa', 9, 'Ceremony', 'Witness does not arrive', 1, 3, 'Nominate two reserve witnesses and tell them in advance', 'Reserve witness steps in - must be 18+ with a valid NIC', 'Coordinator', null),
  ('poruwa', 10, 'Ceremony', 'A Poruwa item is missing or forgotten', 2, 3, 'Pack the ceremony box 4 days out and check it against 23 Procurement & Packing', 'Venue or officiant usually keeps spares; send someone to the nearest shop', 'Groom''s Family', null),
  ('poruwa', 11, 'Catering', 'More guests arrive than confirmed', 3, 3, 'Cater for the confirmed number plus a 5% buffer (see 16 Food & Beverage)', 'Ask the venue for the agreed number of extra covers; hold back two spare tables', 'Coordinator', null),
  ('poruwa', 12, 'Catering', 'Food runs short at the buffet', 2, 3, 'Agree in writing what the venue does if a dish runs out', 'Venue replenishes; slow the service; open the dessert counter early', 'Coordinator', null),
  ('poruwa', 13, 'Catering', 'A guest has an allergic reaction', 1, 4, 'Collect dietary requirements at RSVP; label the buffet clearly', 'First aid; call the venue duty manager; hospital number is on 22 Contact Sheet', 'Coordinator', null),
  ('poruwa', 14, 'AV', 'Sound system or microphone fails', 2, 3, 'Sound check at 17:30 with the actual microphones being used', 'Spare handheld mic on standby; DJ system as back-up PA', 'Vendor', null),
  ('poruwa', 15, 'Decor', 'Decor is not finished when guests arrive', 2, 3, 'Set a 17:00 sign-off deadline and hold the decorator to it', 'Hold guests in the welcome area with drinks; delay opening the ballroom doors', 'Coordinator', null),
  ('poruwa', 16, 'Attire', 'Saree tears, a button pops or a heel breaks', 2, 2, 'Pack the emergency kit and keep flat shoes in the bridal bag', 'Safety pins, fashion tape and the sewing kit are in the bride''s bag', 'Bride', null),
  ('poruwa', 17, 'Property', 'Cash gifts or a gift goes missing', 1, 4, 'Lockable gift box; one named person responsible all evening', 'Two people move the box to a locked room together at 23:30 and count it', 'Groom''s Family', null),
  ('poruwa', 18, 'Property', 'Jewellery is misplaced at the end of the night', 1, 4, 'One named custodian; check items off against 12 Attire & Jewellery', 'Nobody leaves until the register is checked item by item', 'Groom', null),
  ('poruwa', 19, 'Guests', 'Seating conflict or a guest has no seat', 2, 2, 'Finalise the seating plan 14 days out; check for unseated guests on 02 Dashboard', 'Keep two spare tables laid; ushers seat quietly without discussion', 'Ushers', null),
  ('poruwa', 20, 'Guests', 'An uninvited guest arrives', 2, 1, 'Brief the ushers on who is expected', 'Seat them at a spare table; never turn anyone away in front of others', 'Ushers', null),
  ('poruwa', 21, 'Health', 'Bride, groom or a parent falls ill on the day', 1, 4, 'Rest properly in the final week; eat before the ceremony', 'First aid at the venue; doctor and hospital numbers on 22 Contact Sheet', 'Coordinator', null),
  ('poruwa', 22, 'Timing', 'The whole evening runs 30+ minutes late', 3, 2, 'Build 15 minutes of slack into 20 Day Timeline at each phase change', 'Cut the table rounds and shorten the speeches; MC keeps things moving', 'Coordinator', null),
  ('poruwa', 23, 'Money', 'Venue presents unexpected extra charges', 2, 3, 'Get every inclusion and exclusion in writing before signing', 'Contract is in the documents box; escalate to the banquet manager, pay nothing on the spot', 'Couple', null),
  ('poruwa', 24, 'Money', 'Overtime is needed after midnight', 2, 2, 'Agree the overtime rate in the contract in advance (05 Vendors)', 'Coordinator decides with the couple; contingency fund covers it', 'Coordinator', null);
