-- =============================================================================
-- 20260904000300  seating tables and assignment  (ticket 4.8)
-- =============================================================================
-- guests.table_id has been a bare uuid since 2500, waiting for this. The
-- foreign key is added here rather than there because the target did not exist
-- yet, and a dangling reference is worse than a plain column.
--
-- HOW MANY PEOPLE A HOUSEHOLD TAKES UP
--
-- The household model means a row is 'Nayana nanda · 4 adults · 2 children',
-- and seating has to know that is six chairs. Before they reply it is six;
-- after they reply saying three are coming it is three. So:
--
--   heads to seat = what they said, once they have said something,
--                   otherwise what they were invited for.
--
-- That is `seated_heads_minor`-style logic but for people, and it lives in one
-- generated column so the trigger, the view and the screen cannot disagree
-- about it.
--
-- WHAT IS BLOCKED AND WHAT IS ONLY WARNED ABOUT
--
-- The ticket says over-capacity is blocked, and assigning a household to a
-- full table is refused. But a table can ALSO go over capacity without anyone
-- assigning anything: a household seated when three were coming replies again
-- to say five are. Blocking that would mean a guest's RSVP failing because of
-- a seating decision they know nothing about, which is indefensible — the
-- reply is the fact, the seating is the plan, and the plan is what has to give.
--
-- So the trigger fires only on assignment, and the view reports over-capacity
-- so the couple can fix it. Block the deliberate action; surface the
-- consequence.
-- =============================================================================

create table if not exists seating_tables (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings (id) on delete cascade,
  name        text not null,
  capacity    int  not null default 10 check (capacity > 0 and capacity <= 100),
  -- Free text on purpose: 'round', 'long', 'poruwa side'. An enum here would
  -- be a guess at what venues in Sri Lanka actually lay out.
  shape       text,
  location    text,
  notes       text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (wedding_id, name)
);

create index if not exists seating_tables_wedding_idx
  on seating_tables (wedding_id, sort_order);

-- The reference 2500 promised. `on delete set null`: deleting a table
-- unseats its households rather than deleting them.
do $$ begin
  alter table guests
    add constraint guests_table_id_fkey
    foreign key (table_id) references seating_tables (id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists guests_table_idx
  on guests (table_id) where table_id is not null;

-- One definition of how many chairs a household needs, stored so that every
-- reader agrees. Immutable: it reads only this row's own columns.
alter table guests
  add column if not exists heads_to_seat int
  generated always as (
    case when rsvp_status in ('accepted', 'declined')
         then adults_attending + children_attending
         else adults_invited + children_invited
    end
  ) stored;

comment on column guests.heads_to_seat is
  'Ticket 4.8. Chairs this household needs: what they replied once they have '
  'replied, otherwise what they were invited for. Generated, so the capacity '
  'trigger and the seating screen cannot disagree.';

-- ---------------------------------------------------------------- RLS
alter table seating_tables enable row level security;

-- Read by anyone in the wedding — the coordinator needs the layout on the day,
-- and §4.8's matrix gives them read. Written by the couple only.
create policy seating_tables_select on seating_tables
  for select using (app.is_member(wedding_id));

create policy seating_tables_write on seating_tables
  for all using (app.can_write(wedding_id))
        with check (app.can_write(wedding_id));

revoke all on seating_tables from anon;

-- ---------------------------------------------------- the capacity guard
create or replace function app.seating_check_capacity()
returns trigger language plpgsql as $$
declare
  v_capacity int;
  v_seated   int;
  v_name     text;
begin
  select capacity, name into v_capacity, v_name
    from seating_tables where id = new.table_id;

  if v_capacity is null then
    return new;  -- No such table; the foreign key will refuse it.
  end if;

  -- Everyone already at the table except this household, which may be being
  -- moved within the same table rather than added to it.
  select coalesce(sum(heads_to_seat), 0) into v_seated
    from guests
   where table_id = new.table_id
     and id <> new.id;

  if v_seated + new.heads_to_seat > v_capacity then
    raise exception
      '% seats % people and % already has % seated, so % more will not fit',
      v_name, v_capacity, v_name, v_seated, new.heads_to_seat
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- `of table_id` is the whole design. An RSVP that changes the head count does
-- NOT run this: a guest replying must never be refused because of where the
-- couple decided to seat them.
drop trigger if exists guests_seating_capacity on guests;
create trigger guests_seating_capacity
  before insert or update of table_id on guests
  for each row when (new.table_id is not null)
  execute function app.seating_check_capacity();

comment on function app.seating_check_capacity() is
  'Ticket 4.8. Refuses an assignment that would exceed a table''s capacity. '
  'Bound to table_id only: a household replying with more people than expected '
  'puts the table over capacity, which is reported by v_seating_tables rather '
  'than blocked.';

-- ---------------------------------------------------------------- views
create or replace view v_seating_tables
with (security_invoker = true) as
select t.id                                        as table_id,
       t.wedding_id,
       t.name,
       t.capacity,
       t.shape,
       t.location,
       t.notes,
       t.sort_order,
       count(g.id)                                 as household_count,
       coalesce(sum(g.heads_to_seat), 0)           as seated_heads,
       greatest(t.capacity - coalesce(sum(g.heads_to_seat), 0), 0) as seats_free,
       -- True only by the route the trigger allows: a household replied with
       -- more people after being seated.
       coalesce(sum(g.heads_to_seat), 0) > t.capacity as over_capacity
  from seating_tables t
  left join guests g on g.table_id = t.id
 group by t.id, t.wedding_id, t.name, t.capacity, t.shape, t.location, t.notes,
          t.sort_order;

comment on view v_seating_tables is
  'Ticket 4.8. seated_heads counts people, not households. over_capacity can '
  'only become true through an RSVP arriving after seating, which is reported '
  'rather than blocked.';

-- The count the ticket asks to be surfaced. A number nobody can find is not
-- surfaced, so it is one row the dashboard and the seating screen both read.
create or replace view v_seating_summary
with (security_invoker = true) as
select w.id                                                     as wedding_id,
       coalesce(t.table_count, 0)                               as table_count,
       coalesce(t.capacity_total, 0)                            as capacity_total,
       coalesce(t.over_capacity_tables, 0)                      as over_capacity_tables,
       coalesce(g.seated_households, 0)                         as seated_households,
       coalesce(g.seated_heads, 0)                              as seated_heads,
       coalesce(g.unseated_households, 0)                        as unseated_households,
       coalesce(g.unseated_heads, 0)                            as unseated_heads
  from weddings w
  left join (
    select wedding_id,
           count(*)                                  as table_count,
           sum(capacity)                             as capacity_total,
           count(*) filter (where over_capacity)     as over_capacity_tables
      from v_seating_tables
     group by wedding_id
  ) t on t.wedding_id = w.id
  left join (
    select wedding_id,
           count(*) filter (where table_id is not null)                as seated_households,
           coalesce(sum(heads_to_seat) filter (where table_id is not null), 0)
                                                                       as seated_heads,
           -- Anyone who has declined needs no chair, so they are not
           -- "unseated" — they would otherwise sit in this number forever as
           -- work that can never be finished.
           count(*) filter (where table_id is null and rsvp_status <> 'declined')
                                                                       as unseated_households,
           coalesce(sum(heads_to_seat) filter (
             where table_id is null and rsvp_status <> 'declined'), 0)  as unseated_heads
      from guests
     group by wedding_id
  ) g on g.wedding_id = w.id;

comment on view v_seating_summary is
  'Ticket 4.8''s "unseated-guest count surfaced". Households who have declined '
  'are not counted as unseated: they need no chair, and counting them would '
  'leave a number that can never reach zero.';
