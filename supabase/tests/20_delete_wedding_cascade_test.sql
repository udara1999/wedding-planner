-- =============================================================================
-- Deleting a wedding wipes everything under it (owner only)
-- =============================================================================
--   supabase test db
--
-- Two things are asserted here, and the first is the one that will catch a
-- future mistake: after the parent row goes, NO table in public with a
-- wedding_id column still holds a row for it. The check is driven off
-- information_schema rather than a hand-written list, so a table added later
-- with `on delete restrict` (or no cascade at all) fails this file without
-- anyone having to remember to update it.
--
-- The second is that only the owner can do it. weddings_delete is
-- `using (app.is_owner(id))`, and RLS filters a delete it disallows instead of
-- raising — so the partner's attempt uses lives_ok() and then proves, as the
-- service role, that the wedding is still there. throws_ok() would pass for
-- the wrong reason.
--
-- Storage objects are NOT covered here: they live outside Postgres and are
-- purged by the client before this delete runs. See deleteWedding.test.ts.
-- =============================================================================

begin;
create extension if not exists pgtap;
select plan(9);

select tests.become_service_role();

-- Total rows across every wedding-scoped table in public, for one wedding.
create or replace function tests.wedding_scoped_rows(p_wedding uuid)
returns bigint language plpgsql as $$
declare t record; n bigint; total bigint := 0;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'wedding_id'
      and tb.table_type = 'BASE TABLE'
  loop
    execute format('select count(*) from public.%I where wedding_id = $1', t.table_name)
      into n using p_wedding;
    total := total + n;
  end loop;
  return total;
end;
$$;
grant execute on function tests.wedding_scoped_rows(uuid) to public;

create temporary table ids (k text primary key, v uuid);
grant select on ids to public;
insert into ids values
  ('owner',   tests.create_user('owner@example.com')),
  ('partner', tests.create_user('partner@example.com'));

create temporary table w (k text primary key, v uuid);
grant select, insert on w to public;

-- create_wedding also seeds the template, so the wedding starts with rows in
-- budget, tasks, countdown checks and the lookup lists.
select tests.login((select v from ids where k = 'owner'));
insert into w values
  ('a', public.create_wedding('Methuli', 'Udara', '2027-09-03', 'LKR', 'Asia/Colombo'));

-- A few rows the template does not create, so the cascade has more to reach.
insert into guests (wedding_id, household_name)
  values ((select v from w where k = 'a'), 'The Pereras');
insert into vendors (wedding_id, category, name)
  values ((select v from w where k = 'a'), 'Photography', 'Studio Lanka');
insert into payments (wedding_id, amount_due_minor, receipt_path)
  values ((select v from w where k = 'a'), 50000,
          (select v from w where k = 'a') || '/p1/receipt.pdf');

select tests.become_service_role();
select ok(tests.wedding_scoped_rows((select v from w where k = 'a')) > 0,
          'the wedding starts with wedding-scoped rows to delete');

-- ------------------------------------------------- a non-owner cannot delete
select tests.become_service_role();
insert into wedding_members (wedding_id, user_id, role, accepted_at)
  values ((select v from w where k = 'a'), (select v from ids where k = 'partner'),
          'partner', now());

select tests.login((select v from ids where k = 'partner'));
select lives_ok(
  format('delete from weddings where id = %L', (select v from w where k = 'a')),
  'a partner''s delete is filtered by RLS, not refused');

select tests.become_service_role();
select is((select count(*)::int from weddings where id = (select v from w where k = 'a')), 1,
          'the wedding still exists after the partner tried to delete it');
select ok(tests.wedding_scoped_rows((select v from w where k = 'a')) > 0,
          'and none of its data was touched');

-- ------------------------------------------------------- the owner can delete
select tests.login((select v from ids where k = 'owner'));
select lives_ok(
  format('delete from weddings where id = %L', (select v from w where k = 'a')),
  'the owner can delete the wedding');

select tests.become_service_role();
select is((select count(*)::int from weddings where id = (select v from w where k = 'a')), 0,
          'the weddings row is gone');

-- The point of the file: nothing wedding-scoped survives anywhere.
select is(tests.wedding_scoped_rows((select v from w where k = 'a')), 0::bigint,
          'no table with a wedding_id column still holds a row for it');

-- Named separately so a failure says which cascade broke, not just "something".
select is((select count(*)::int from guests where wedding_id = (select v from w where k = 'a')), 0,
          'guests cascaded');
select is((select count(*)::int from payments where wedding_id = (select v from w where k = 'a')), 0,
          'payments cascaded');

select * from finish();
rollback;
