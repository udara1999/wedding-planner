-- =============================================================================
-- 1600  receipt storage  (ticket 2.10)
-- =============================================================================
-- A private bucket whose object keys are `<wedding_id>/<payment_id>/<file>`.
-- The first path segment is the tenancy boundary: the policies below read it
-- and hand it to the same helpers every money table uses, so a receipt is
-- exactly as visible as the payment it belongs to — and a coordinator, who can
-- see no amount, cannot see a receipt either (plan §4.6).
--
-- The bucket is NOT public. Reads go through a short-lived signed URL, so an
-- object key leaking is not the same as the file leaking.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Casting the first segment inline would be a hazard: a key that is not
-- wedding-scoped would raise 22P02 inside the policy, and there is no
-- guarantee Postgres evaluates the bucket_id check first. Returning NULL
-- instead means such a key simply fails the membership test — can_see_money
-- and can_write both return false for a null wedding.
create or replace function app.wedding_from_storage_path(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

comment on function app.wedding_from_storage_path(text) is
  'Ticket 2.10. First path segment as a wedding id, or NULL when the key is not '
  'wedding-scoped. Mirrored client-side by weddingFromReceiptPath().';

grant execute on function app.wedding_from_storage_path(text) to authenticated;

-- storage.objects already has RLS enabled by Supabase; these add to it.
drop policy if exists receipts_select on storage.objects;
drop policy if exists receipts_insert on storage.objects;
drop policy if exists receipts_update on storage.objects;
drop policy if exists receipts_delete on storage.objects;

create policy receipts_select on storage.objects
  for select using (
    bucket_id = 'receipts'
    and app.can_see_money(app.wedding_from_storage_path(name))
  );

create policy receipts_insert on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and app.can_write(app.wedding_from_storage_path(name))
  );

create policy receipts_update on storage.objects
  for update using (
    bucket_id = 'receipts'
    and app.can_write(app.wedding_from_storage_path(name))
  ) with check (
    bucket_id = 'receipts'
    and app.can_write(app.wedding_from_storage_path(name))
  );

create policy receipts_delete on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and app.can_write(app.wedding_from_storage_path(name))
  );
