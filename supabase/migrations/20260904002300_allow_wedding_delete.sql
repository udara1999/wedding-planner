-- =============================================================================
-- The last-owner guard must not block deleting the wedding itself
-- =============================================================================
-- app.protect_last_owner() is a `before delete` row trigger on
-- wedding_members. It could not tell these two cases apart:
--
--   1. an owner removing their own membership from a wedding that carries on
--      -- which must stay blocked, or the wedding is orphaned with no owner;
--   2. that same row going away because the WEDDING is being deleted
--      -- which must be allowed.
--
-- `delete from weddings` cascades into wedding_members, the trigger fired on
-- the owner's row, saw no other owner, and raised — aborting the whole
-- transaction. Deleting a wedding was therefore impossible: it always failed
-- with 'Cannot remove the last owner of a wedding'.
--
-- The fix is to let a cascaded row through. ON DELETE CASCADE is an AFTER
-- DELETE referential action on weddings, so when this trigger fires for a
-- cascaded row the parent row has already gone in this transaction. "No
-- wedding" therefore means "the membership is not being removed from a
-- surviving wedding", which is exactly case 2.
-- =============================================================================

create or replace function app.protect_last_owner()
returns trigger language plpgsql security definer set search_path = public as $$
declare remaining int;
begin
  -- Case 2. Note this runs SECURITY DEFINER as the function owner, so the
  -- lookup is not filtered by RLS — a caller who cannot see the wedding still
  -- gets the guard, rather than slipping past it on an invisible row.
  if not exists (select 1 from weddings where id = old.wedding_id) then
    return old;
  end if;

  select count(*) into remaining
  from wedding_members
  where wedding_id = old.wedding_id and role = 'owner' and user_id <> old.user_id;

  if old.role = 'owner' and remaining = 0 then
    raise exception 'Cannot remove the last owner of a wedding';
  end if;
  return old;
end;
$$;

comment on function app.protect_last_owner() is
  'Blocks removing the last owner of a surviving wedding. Lets the row through '
  'when the wedding itself is being deleted, which reaches here by cascade.';
