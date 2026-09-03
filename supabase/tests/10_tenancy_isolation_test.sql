-- =============================================================================
-- RLS gate: tenancy isolation and the role matrix (plan §4.8, risk R1)
-- =============================================================================
-- This file is the Phase 0 gate. If it fails, nothing else ships.
--   supabase test db
--
-- NOTE ON ASSERTIONS: an RLS policy does not raise on a blocked write — it
-- filters the rows out, so the statement succeeds and affects zero rows. Every
-- write test therefore uses lives_ok() and then re-reads the value as the
-- service role to prove nothing actually changed. Using throws_ok() here would
-- pass for the wrong reason and hide a real leak.
-- =============================================================================

begin;
create extension if not exists pgtap;
select plan(34);

-- ---------------------------------------------------------------- fixtures
select tests.become_service_role();

-- These fixtures are created by the service role but read back while the suite
-- impersonates `authenticated` and `anon`, which inherit no privileges on another
-- role's temp tables. Without these grants the first insert as a real user dies
-- with `permission denied for table w`. The transaction is rolled back, so
-- granting to public here exposes nothing.
create temporary table ids (k text primary key, v uuid);
grant select on ids to public;
insert into ids values
  ('alice',       tests.create_user('alice@example.com')),    -- owner of wedding A
  ('anil',        tests.create_user('anil@example.com')),     -- partner, A
  ('brides_mum',  tests.create_user('mum@example.com')),      -- family (bride), A
  ('grooms_dad',  tests.create_user('dad@example.com')),      -- family (groom), A
  ('coordinator', tests.create_user('coord@example.com')),    -- coordinator, A
  ('stranger',    tests.create_user('stranger@example.com')); -- owner of wedding B

create temporary table w (k text primary key, v uuid);
grant select, insert on w to public;

select tests.login((select v from ids where k = 'alice'));
insert into w values
  ('a', public.create_wedding('Methuli', 'Udara', '2027-09-03', 'LKR', 'Asia/Colombo'));

select tests.login((select v from ids where k = 'stranger'));
insert into w values
  ('b', public.create_wedding('Someone', 'Else', '2027-12-01', 'LKR', 'Asia/Colombo'));

-- Alice staffs wedding A, and everyone accepts.
select tests.login((select v from ids where k = 'alice'));
select public.invite_member((select v from w where k='a'), 'anil@example.com',  'partner',     null);
select public.invite_member((select v from w where k='a'), 'mum@example.com',   'family',      'bride');
select public.invite_member((select v from w where k='a'), 'dad@example.com',   'family',      'groom');
select public.invite_member((select v from w where k='a'), 'coord@example.com', 'coordinator', null);

do $$
declare r record; t uuid;
begin
  for r in select i.v as uid, u.email
           from ids i join auth.users u on u.id = i.v
           where i.k in ('anil','brides_mum','grooms_dad','coordinator')
  loop
    select token into t from wedding_invitations
      where wedding_id = (select v from w where k = 'a') and email = r.email;
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims',
      json_build_object('sub', r.uid::text, 'role', 'authenticated')::text, true);
    perform public.accept_invitation(t);
  end loop;
end $$;

-- =============================================================================
-- 1. Cross-tenant isolation — the existential test (6 assertions)
-- =============================================================================
select tests.login((select v from ids where k = 'stranger'));

select is((select count(*)::int from weddings where id = (select v from w where k='a')), 0,
          'A stranger cannot SELECT another couple''s wedding');

select is((select count(*)::int from wedding_members
             where wedding_id = (select v from w where k='a')), 0,
          'A stranger cannot SELECT another wedding''s members');

select is((select count(*)::int from public.my_weddings()), 1,
          'my_weddings() returns only the caller''s own weddings');

select lives_ok(
  format('update weddings set bride_name = ''hacked'' where id = %L',
         (select v from w where k='a')),
  'A stranger''s UPDATE is filtered by RLS, not an error');

select lives_ok(
  format('delete from weddings where id = %L', (select v from w where k='a')),
  'A stranger''s DELETE is filtered by RLS, not an error');

select tests.become_service_role();
select is((select bride_name from weddings where id = (select v from w where k='a')),
          'Methuli',
          'Wedding A is untouched after the stranger''s UPDATE and DELETE');

-- =============================================================================
-- 2. The couple — full access (8 assertions)
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

select is((select count(*)::int from weddings), 1, 'Owner sees exactly one wedding');
select ok(app.is_owner((select v from w where k='a')),      'Owner is recognised as owner');
select ok(app.can_write((select v from w where k='a')),     'Owner can write');
select ok(app.can_see_money((select v from w where k='a')), 'Owner can see money');

select lives_ok(
  format('update weddings set total_budget_minor = 400000000 where id = %L',
         (select v from w where k='a')),
  'Owner can set the budget');

select is((select total_budget_minor from weddings where id = (select v from w where k='a')),
          400000000::bigint,
          'Owner''s budget change persisted');

select tests.login((select v from ids where k = 'anil'));
select ok(app.can_write((select v from w where k='a')),     'Partner can write');
select ok(app.can_see_money((select v from w where k='a')), 'Partner can see money');

-- =============================================================================
-- 3. Coordinator — day-of access, and NO money (plan §4.6, risk R2) (8)
-- =============================================================================
select tests.login((select v from ids where k = 'coordinator'));

select ok(app.is_member((select v from w where k='a')),
          'Coordinator is a member');
select ok(app.can_see_ops((select v from w where k='a')),
          'Coordinator can see day-of operations');
select ok(NOT app.can_see_money((select v from w where k='a')),
          'Coordinator CANNOT see money');
select ok(NOT app.can_write((select v from w where k='a')),
          'Coordinator cannot edit the wedding record');
select ok(app.can_write_ops((select v from w where k='a')),
          'Coordinator CAN edit day-of operations');
select is((select count(*)::int from weddings), 1,
          'Coordinator can still read the wedding header');

select lives_ok(
  format('update weddings set venue_name = ''nope'' where id = %L',
         (select v from w where k='a')),
  'Coordinator''s UPDATE is filtered by RLS');

select tests.become_service_role();
select is((select venue_name from weddings where id = (select v from w where k='a')),
          null,
          'Coordinator''s UPDATE changed nothing');

-- =============================================================================
-- 4. Family — limited, scoped to their side (6 assertions)
-- =============================================================================
select tests.login((select v from ids where k = 'brides_mum'));

select ok(app.can_see_money((select v from w where k='a')),
          'Family can see money');
select ok(NOT app.can_write((select v from w where k='a')),
          'Family cannot write the wedding record');
select is(app.member_side((select v from w where k='a'))::text, 'bride',
          'Bride''s mother is scoped to the bride side');
select ok(app.can_see_guest_side((select v from w where k='a'), 'bride'),
          'Bride-side family can see bride-side guests');
select ok(NOT app.can_see_guest_side((select v from w where k='a'), 'groom'),
          'Bride-side family CANNOT see groom-side guests');

select tests.login((select v from ids where k = 'grooms_dad'));
select ok(app.can_see_guest_side((select v from w where k='a'), 'groom'),
          'Groom-side family can see groom-side guests');

-- =============================================================================
-- 8. Tradition (1.1) and invitation revoke (1.6) — 6 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

select is((select tradition from weddings where id = (select v from w where k='a')),
          'poruwa',
          'A wedding created without a tradition defaults to poruwa');

insert into w values
  ('c', public.create_wedding('Ama', 'Nuwan', '2028-01-01', 'LKR', 'Asia/Colombo', 'christian'));

select is((select tradition from weddings where id = (select v from w where k='c')),
          'christian',
          'create_wedding stores an explicit tradition');

-- Revoke is governed by wedding_invitations_manage (app.can_write), the same
-- permission as sending the invitation. A fresh pending row to revoke:
insert into wedding_invitations (wedding_id, email, role, side, invited_by)
values ((select v from w where k='a'), 'revokeme@example.com', 'viewer', null,
        (select v from ids where k='alice'));

select tests.login((select v from ids where k = 'coordinator'));
select lives_ok(
  $q$ delete from wedding_invitations where email = 'revokeme@example.com' $q$,
  'A coordinator''s revoke is filtered by RLS rather than raising');

select tests.become_service_role();
select is((select count(*)::int from wedding_invitations
             where email = 'revokeme@example.com'), 1,
          'The invitation survives a coordinator trying to revoke it');

select tests.login((select v from ids where k = 'anil'));
select lives_ok(
  $q$ delete from wedding_invitations
       where email = 'revokeme@example.com' and accepted_at is null $q$,
  'A partner can revoke a pending invitation');

select tests.become_service_role();
select is((select count(*)::int from wedding_invitations
             where email = 'revokeme@example.com'), 0,
          'The invitation is gone once a partner revokes it');

select * from finish();
rollback;
