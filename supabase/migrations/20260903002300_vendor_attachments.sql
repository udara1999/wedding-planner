-- =============================================================================
-- 2300  contract and quote attachments  (ticket 3.8)
-- =============================================================================
-- The same shape as receipts (2.10): a private bucket whose object keys start
-- with the wedding id, and policies that hand that segment to the membership
-- helpers. What differs is the read boundary — a contract carries prices, so
-- it is can_see_money rather than can_see_ops.
--
-- A table rather than listing the bucket: "listed on vendor detail" wants a
-- kind (quote or contract) and who uploaded it, and object storage has nowhere
-- to put that. The rows are also what RLS can be written against.
-- =============================================================================

do $$ begin
  create type attachment_kind as enum ('quote', 'contract', 'invoice', 'other');
exception when duplicate_object then null; end $$;

create table if not exists vendor_attachments (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references weddings (id) on delete cascade,
  vendor_id    uuid not null references vendors (id) on delete cascade,
  kind         attachment_kind not null default 'contract',
  file_name    text not null,
  -- `<wedding_id>/<vendor_id>/<file>`, matching the storage key exactly.
  path         text not null unique,
  size_bytes   bigint,
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists vendor_attachments_vendor_idx
  on vendor_attachments (vendor_id);

alter table vendor_attachments enable row level security;

create policy vendor_attachments_select on vendor_attachments
  for select using (app.can_see_money(wedding_id));
create policy vendor_attachments_write on vendor_attachments
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- bucket
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

drop policy if exists contracts_select on storage.objects;
drop policy if exists contracts_insert on storage.objects;
drop policy if exists contracts_update on storage.objects;
drop policy if exists contracts_delete on storage.objects;

-- app.wedding_from_storage_path returns NULL for a key that is not
-- wedding-scoped, and can_see_money/can_write are both false for a null
-- wedding — so a stray object fails the test rather than raising inside the
-- policy. Same reasoning as the receipts bucket.
create policy contracts_select on storage.objects
  for select using (
    bucket_id = 'contracts'
    and app.can_see_money(app.wedding_from_storage_path(name))
  );

create policy contracts_insert on storage.objects
  for insert with check (
    bucket_id = 'contracts'
    and app.can_write(app.wedding_from_storage_path(name))
  );

create policy contracts_update on storage.objects
  for update using (
    bucket_id = 'contracts'
    and app.can_write(app.wedding_from_storage_path(name))
  ) with check (
    bucket_id = 'contracts'
    and app.can_write(app.wedding_from_storage_path(name))
  );

create policy contracts_delete on storage.objects
  for delete using (
    bucket_id = 'contracts'
    and app.can_write(app.wedding_from_storage_path(name))
  );
