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
select plan(62);

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

-- auth.users is not readable by `authenticated`, and an invitee cannot see
-- their own invitation row until they are a member — which is precisely what
-- accepting does. Both reads therefore happen as the service role, and only
-- the accept itself is impersonated.
select tests.become_service_role();

do $$
declare r record; t uuid;
begin
  for r in select i.v as uid, u.email
           from ids i join auth.users u on u.id = i.v
           where i.k in ('anil','brides_mum','grooms_dad','coordinator')
  loop
    perform set_config('role', 'postgres', true);
    perform set_config('request.jwt.claims', null, true);

    select token into t from wedding_invitations
      where wedding_id = (select v from w where k = 'a') and email = r.email;
    if t is null then
      raise exception 'fixture: no invitation token for %', r.email;
    end if;

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

-- A second locale, so "stores an explicit tradition" means something other
-- than the default. It has to exist first: weddings.tradition is a foreign key
-- to template.locales (1.2), and only 'poruwa' is seeded. Rolled back with the
-- rest of the transaction.
select tests.become_service_role();
insert into template.locales (code, label, language, tradition, version)
values ('test-tradition', 'Fixture tradition', 'en', 'test-tradition', 1)
on conflict (code) do nothing;

select tests.login((select v from ids where k = 'alice'));
insert into w values
  ('c', public.create_wedding('Ama', 'Nuwan', '2028-01-01', 'LKR', 'Asia/Colombo',
                              'test-tradition'));

select is((select tradition from weddings where id = (select v from w where k='c')),
          'test-tradition',
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

-- =============================================================================
-- 9. seed_wedding (ticket 1.4) — 10 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

select lives_ok(
  $q$ select public.seed_wedding((select v from w where k='a')) $q$,
  'An owner can seed their own wedding');

select tests.become_service_role();

-- Compared against the template rather than a hardcoded count, so adding
-- content to the workbook does not break the test.
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.tasks where locale = 'poruwa'),
          'Seeding copies every template task');

select is((select count(*)::int from wedding_countdown_checks
             where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.countdown_checks where locale = 'poruwa'),
          'Seeding copies every countdown check');

select is((select count(*)::int from wedding_lookups
             where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.lookups where locale = 'poruwa'),
          'Seeding copies the extensible lookup values');

select is((select template_version from weddings where id = (select v from w where k='a')),
          (select version from template.locales where code = 'poruwa'),
          'Seeding snapshots the template version onto the wedding');

-- Wedding A is dated 2027-09-03; the first task sits at WeddingDate-360.
select is((select due_date from wedding_tasks
             where wedding_id = (select v from w where k='a') and offset_days = -360
             order by seq limit 1),
          '2027-09-03'::date - 360,
          'A seeded due date is the wedding date plus the template offset');

-- Idempotence: the AC that matters, since a couple may click twice.
select tests.login((select v from ids where k = 'alice'));
select lives_ok(
  $q$ select public.seed_wedding((select v from w where k='a')) $q$,
  'Seeding a second time is allowed');

select tests.become_service_role();
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.tasks where locale = 'poruwa'),
          'Re-running seed_wedding does not duplicate anything');

-- Seeding writes a whole plan, so it is owner-only, not merely can_write.
select tests.login((select v from ids where k = 'coordinator'));
select throws_ok(
  $q$ select public.seed_wedding((select v from w where k='b')) $q$);

select tests.become_service_role();
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='b')), 0,
          'A non-owner cannot seed somebody else''s wedding');

-- And the new tables are inside the tenancy boundary like everything else.
select tests.login((select v from ids where k = 'stranger'));
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')), 0,
          'A stranger cannot read another wedding''s tasks');

-- =============================================================================
-- 10. The date-offset engine (ticket 1.7) — 5 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

-- One task is deliberately moved off its template offset, to prove the engine
-- leaves a considered decision alone.
update wedding_tasks
   set due_date = '2027-01-01', due_date_overridden = true
 where wedding_id = (select v from w where k='a') and seq = 1;

-- The nekath moves by a month.
update weddings set wedding_date = '2027-10-03'
 where id = (select v from w where k='a');

select tests.become_service_role();

-- Asserted over every row rather than a sample: a re-date that missed some
-- rows is the failure mode that matters, and it would look fine in a sample.
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')
               and not due_date_overridden
               and due_date is distinct from '2027-10-03'::date + offset_days), 0,
          'Moving the wedding date re-dates every non-overridden task');

select is((select due_date from wedding_tasks
             where wedding_id = (select v from w where k='a') and seq = 1),
          '2027-01-01'::date,
          'A task moved on purpose is not dragged back by a re-date');

select is((select count(*)::int from wedding_countdown_checks
             where wedding_id = (select v from w where k='a')
               and not due_date_overridden
               and due_date is distinct from '2027-10-03'::date + offset_days), 0,
          'The countdown checklist re-dates with the wedding');

select tests.login((select v from ids where k = 'alice'));
update weddings set wedding_date = null where id = (select v from w where k='a');

select tests.become_service_role();
select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')
               and not due_date_overridden
               and due_date is not null), 0,
          'Clearing the wedding date clears the dates derived from it');

select is((select count(*)::int from wedding_tasks
             where wedding_id = (select v from w where k='a')
               and source_template_id is not null
               and offset_days is null), 0,
          'Re-dating never damages the offsets it dates from');

-- =============================================================================
-- 11. Membership helpers return false, not NULL (regression) — 4 assertions
-- =============================================================================
-- A NULL here is safe inside an RLS USING clause but silently disables any
-- procedural guard written as `if not app.is_owner(...)`, which is how a
-- coordinator came to seed a wedding they were not a member of. `is false`
-- rather than `= false`, so a NULL fails these assertions.
select tests.login((select v from ids where k = 'coordinator'));

select ok(app.is_owner((select v from w where k='b')) is false,
          'is_owner returns false, not null, for a non-member');
select ok(app.can_write((select v from w where k='b')) is false,
          'can_write returns false, not null, for a non-member');
select ok(app.can_see_money((select v from w where k='b')) is false,
          'can_see_money returns false, not null, for a non-member');
select ok(app.can_write_ops((select v from w where k='b')) is false,
          'can_write_ops returns false, not null, for a non-member');

-- =============================================================================
-- 12. The money core and the golden fixture (2.1, 2.2, 2.9) — 8 assertions
-- =============================================================================
-- template.* is unreadable by `authenticated`, so counts against it are taken
-- as the service role.
select tests.become_service_role();

select is((select count(*)::int from budget_lines
             where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.budget_lines where locale = 'poruwa'),
          'Seeding copies every template budget line');

-- ---------------------------------------------------------------------------
-- The §4.2 golden fixture. Read as the owner, through the view, so this also
-- proves the read path a UI would use.
--
-- 905,500 is every jewellery line's budget; 735,500 is the three applicable
-- ones. The difference, 170,000, is the seven not-applicable lines. Both
-- reconcile against the workbook, and the fixture only holds on a freshly
-- seeded wedding: the real workbook has quotes and actuals on those three
-- lines, which would move the forecast to 896,000.
-- ---------------------------------------------------------------------------
select tests.login((select v from ids where k = 'alice'));

select is((select budgeted_minor::bigint from v_budget_by_category
             where wedding_id = (select v from w where k='a')
               and category_key = 'jewellery'),
          90550000::bigint,
          'Golden fixture: jewellery budgeted is 905,500');

select is((select forecast_minor::bigint from v_budget_by_category
             where wedding_id = (select v from w where k='a')
               and category_key = 'jewellery'),
          73550000::bigint,
          'Golden fixture: jewellery forecast is 735,500');

-- The precedence in the generated column, which is the whole reason it is
-- generated rather than left to each caller.
update budget_lines
   set quoted_minor = 100, negotiated_minor = 200, actual_minor = 300
 where wedding_id = (select v from w where k='a') and code = 'BG077';

select is((select forecast_minor from budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG077'),
          300::bigint,
          'forecast_minor prefers actual over negotiated and quoted');

update budget_lines set actual_minor = 99999
 where wedding_id = (select v from w where k='a') and code = 'BG078';

select is((select forecast_minor from budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG078'),
          0::bigint,
          'A not-applicable line forecasts zero even with an actual cost');

-- ---------------------------------------------------------------------------
-- Plan §4.6: a coordinator is a full member with day-of access who must never
-- see a number. The second assertion is the one that matters — a view runs as
-- its owner unless it is security_invoker, which would bypass RLS entirely.
-- ---------------------------------------------------------------------------
select tests.login((select v from ids where k = 'coordinator'));

select is((select count(*)::int from budget_lines
             where wedding_id = (select v from w where k='a')), 0,
          'A coordinator cannot see a single budget line');

select is((select count(*)::int from v_budget_by_category
             where wedding_id = (select v from w where k='a')), 0,
          'The category view does not hand a coordinator the budget');

select tests.login((select v from ids where k = 'brides_mum'));
select ok((select count(*)::int from budget_lines
             where wedding_id = (select v from w where k='a')) > 0,
          'Family can see money, unlike a coordinator');

select * from finish();
rollback;
