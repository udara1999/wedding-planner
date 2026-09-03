-- =============================================================================
-- 1000  the date-offset engine  (ticket 1.7)
-- =============================================================================
-- "Changing wedding_date re-dates every offset_days row in one transaction."
--
-- Implemented as a trigger rather than an RPC on purpose. The AC's guarantee is
-- atomicity, and a trigger cannot be forgotten by a caller: any path that moves
-- the date — the Setup screen, an import, a psql session — re-dates the plan.
-- A plan half re-dated is worse than one not re-dated at all, because nothing
-- about it looks wrong.
--
-- SECURITY DEFINER for the same reason: the re-date must be complete. Left as
-- invoker, RLS would silently narrow the UPDATE to the rows the caller happens
-- to be able to write, and the rest would keep their old dates.
-- =============================================================================

create or replace function app.redate_wedding_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rows the couple deliberately moved are left alone; that is what
  -- due_date_overridden is for. A null wedding date un-dates what it derived,
  -- so clearing the date cannot leave stale dates behind.
  update wedding_tasks
     set due_date = case
                      when new.wedding_date is null then null
                      else new.wedding_date + offset_days
                    end
   where wedding_id = new.id
     and offset_days is not null
     and not due_date_overridden;

  update wedding_countdown_checks
     set due_date = case
                      when new.wedding_date is null then null
                      else new.wedding_date + offset_days
                    end
   where wedding_id = new.id
     and offset_days is not null
     and not due_date_overridden;

  return new;
end;
$$;

comment on function app.redate_wedding_plan() is
  'Ticket 1.7. Recomputes due dates from offset_days whenever weddings.wedding_date '
  'changes, skipping rows with due_date_overridden.';

drop trigger if exists weddings_redate on weddings;
create trigger weddings_redate
  after update of wedding_date on weddings
  for each row
  when (old.wedding_date is distinct from new.wedding_date)
  execute function app.redate_wedding_plan();
