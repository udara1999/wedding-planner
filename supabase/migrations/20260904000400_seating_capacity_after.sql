-- =============================================================================
-- 20260904000400  the capacity check has to run AFTER, not BEFORE
-- =============================================================================
-- A correction to the trigger added minutes earlier in 20260904000300, before
-- anything depends on it.
--
-- That trigger was BEFORE INSERT OR UPDATE and it read `new.heads_to_seat`.
-- heads_to_seat is a STORED GENERATED column, and Postgres computes generated
-- columns AFTER before-triggers have run. So `new.heads_to_seat` was null
-- inside it, `v_seated + null > v_capacity` evaluated to null, the `if` never
-- fired, and the capacity check silently enforced nothing.
--
-- This is the same shape as the bug in 20260903001100: a guard written as
-- `if <null> then` does not raise, it just quietly agrees. Null-valued
-- conditions in PL/pgSQL are the recurring hazard in this schema.
--
-- AFTER is also simply the right timing, independently of that. The question
-- "does this table now hold more people than it seats" is about the state of
-- the table once the row is written, which is what an AFTER trigger sees. It
-- needs no exclusion of the row being changed, no reasoning about whether a
-- household is moving within a table or into it, and the sum it takes is the
-- number a reader would get. An exception raised in an AFTER trigger still
-- aborts the statement, so nothing is lost by checking later.
--
-- Found by reading rather than by a failing test: `supabase test db` needs
-- Docker, which is not available here, so the pgTAP assertions covering this
-- have not been executed. That is exactly why it is worth writing down which
-- reasoning found it.
-- =============================================================================

drop trigger if exists guests_seating_capacity on guests;

create or replace function app.seating_check_capacity()
returns trigger language plpgsql as $$
declare
  v_capacity int;
  v_seated   int;
  v_name     text;
begin
  select capacity, name into v_capacity, v_name
    from seating_tables where id = new.table_id;

  -- No such table. The foreign key has already refused it, so there is nothing
  -- useful to add.
  if v_capacity is null then
    return null;
  end if;

  -- Every household at the table, this one included: the row is written by the
  -- time an AFTER trigger runs, so this is the same total the seating screen
  -- will show.
  select coalesce(sum(heads_to_seat), 0) into v_seated
    from guests
   where table_id = new.table_id;

  if v_seated > v_capacity then
    raise exception '% seats % people, and that would put % at it',
      v_name, v_capacity, v_seated
      using errcode = 'check_violation',
            hint = 'Move a household to another table, or raise the seat count.';
  end if;

  return null;
end;
$$;

-- `of table_id` remains the important part, and for the reason 000300 gave: an
-- RSVP that changes a head count must never be refused because of where the
-- couple decided to seat that household. The reply is the fact; the seating is
-- the plan; the plan gives way, and v_seating_tables reports it.
create trigger guests_seating_capacity
  after insert or update of table_id on guests
  for each row when (new.table_id is not null)
  execute function app.seating_check_capacity();

comment on function app.seating_check_capacity() is
  'Ticket 4.8. Refuses an assignment that would exceed a table''s capacity. '
  'AFTER, not BEFORE: it reads heads_to_seat, which is a generated column and '
  'is therefore not populated during a before-trigger. Bound to table_id only, '
  'so a household replying with more people is reported rather than blocked.';
