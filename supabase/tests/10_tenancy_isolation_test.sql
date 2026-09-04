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
select plan(200);

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

-- =============================================================================
-- 13. payments and the six-state status (2.5, rest of 2.2) — 10 assertions
-- =============================================================================
-- Dates are written relative to current_date so the expected status does not
-- depend on when the suite runs.
select tests.login((select v from ids where k = 'alice'));

insert into payments (wedding_id, budget_line_id, code, stage,
                      amount_due_minor, due_date, amount_paid_minor)
select (select v from w where k='a'), bl.id, x.code, 'final_payment',
       x.due, x.due_date, x.paid
  from (values
        ('PY-DRAFT',    0::bigint,        null::date,             0::bigint),
        ('PY-PAID',     10000::bigint,    current_date + 3,       10000::bigint),
        ('PY-OVER',     10000::bigint,    current_date - 1,       0::bigint),
        ('PY-DUE',      10000::bigint,    current_date + 3,       0::bigint),
        ('PY-SOON',     10000::bigint,    current_date + 20,      0::bigint),
        ('PY-NOTDUE',   10000::bigint,    current_date + 90,      0::bigint),
        ('PY-NODATE',   10000::bigint,    null::date,             0::bigint),
        ('PY-OVERPAID', 10000::bigint,    current_date + 3,       25000::bigint)
       ) as x(code, due, due_date, paid)
  cross join (select id from budget_lines
               where wedding_id = (select v from w where k='a') and code = 'BG077') bl;

select is((select status::text from v_payments where code = 'PY-DRAFT'), 'draft',
          'A payment with nothing due is a draft');
select is((select status::text from v_payments where code = 'PY-PAID'), 'paid',
          'Paying the full amount makes it paid');
select is((select status::text from v_payments where code = 'PY-OVER'), 'overdue',
          'A due date in the past is overdue');
select is((select status::text from v_payments where code = 'PY-DUE'), 'due',
          'Within a week is due');
select is((select status::text from v_payments where code = 'PY-SOON'), 'due_soon',
          'Within a month is due soon');
select is((select status::text from v_payments where code = 'PY-NOTDUE'), 'not_due',
          'Beyond a month is not due yet');
select is((select status::text from v_payments where code = 'PY-NODATE'), 'not_due',
          'A payment with no due date is not due rather than overdue');

-- Overpaying must not read as a negative balance owed.
select is((select balance_minor from v_payments where code = 'PY-OVERPAID'), 0::bigint,
          'An overpayment floors the balance at zero');

-- v_budget_lines rolls the payments up onto the line.
select is((select paid_minor::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG077'),
          35000::bigint,
          'v_budget_lines sums the payments made against a line');

-- §4.6 again, through the new view: a coordinator sees no money anywhere.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from v_payments
             where wedding_id = (select v from w where k='a')), 0,
          'A coordinator cannot see a single payment');

-- =============================================================================
-- 14. contributions: family may touch only their own row (2.7) — 8 assertions
-- =============================================================================
select tests.become_service_role();

insert into contributions (wedding_id, code, contributor_user_id, contributor_name,
                           agreed_minor, received_minor)
values
  ((select v from w where k='a'), 'C-MUM', (select v from ids where k='brides_mum'),
   'Bride''s family', 50000, 20000),
  ((select v from w where k='a'), 'C-DAD', (select v from ids where k='grooms_dad'),
   'Groom''s family', 70000, 70000);

select is((select still_to_come_minor from contributions where code = 'C-MUM'),
          30000::bigint,
          'still_to_come_minor is agreed minus received');

select is((select still_to_come_minor from contributions where code = 'C-DAD'),
          0::bigint,
          'A fully received contribution has nothing still to come');

select tests.login((select v from ids where k = 'alice'));
select is((select count(*)::int from contributions
             where wedding_id = (select v from w where k='a')), 2,
          'The couple see every contribution');

select tests.login((select v from ids where k = 'brides_mum'));
select is((select count(*)::int from contributions
             where wedding_id = (select v from w where k='a')), 1,
          'A family member sees only their own contribution');

-- Writing her own row is allowed.
select lives_ok(
  $q$ update contributions set received_minor = 30000 where code = 'C-MUM' $q$,
  'A family member can update their own contribution');

-- Someone else's row is filtered, not refused, so the proof is that the value
-- did not move.
select lives_ok(
  $q$ update contributions set agreed_minor = 1 where code = 'C-DAD' $q$,
  'Updating another family member''s row is filtered rather than an error');

select tests.become_service_role();
select is((select agreed_minor from contributions where code = 'C-DAD'), 70000::bigint,
          'Another family member''s contribution is untouched');

-- The WITH CHECK: attributing a new row to somebody else is a hard failure,
-- not a filtered one, because the row would otherwise be readable by its
-- supposed owner and invisible to its author.
select tests.login((select v from ids where k = 'brides_mum'));
select throws_ok(
  $q$ insert into contributions (wedding_id, contributor_user_id, contributor_name,
                                 agreed_minor)
      values ((select v from w where k='a'),
              (select v from ids where k='grooms_dad'), 'Not mine', 500) $q$);

-- =============================================================================
-- 15. receipt storage (2.10) — 6 assertions
-- =============================================================================
select tests.become_service_role();

select is(app.wedding_from_storage_path(
            (select v from w where k='a')::text || '/pay/receipt.pdf'),
          (select v from w where k='a'),
          'The first path segment is read as the wedding id');

-- The reason the helper swallows the cast error: a key that is not
-- wedding-scoped must fail the membership test, not raise inside the policy.
select ok(app.wedding_from_storage_path('receipt.pdf') is null,
          'A key with no wedding folder yields null rather than an error');
select ok(app.wedding_from_storage_path('not-a-uuid/x.pdf') is null,
          'A key whose folder is not a uuid yields null rather than an error');

select is((select count(*)::int from pg_policies
             where schemaname = 'storage' and tablename = 'objects'
               and policyname like 'receipts_%'), 4,
          'All four receipt policies are installed on storage.objects');

-- The boundary itself. An upload the caller may not make violates the WITH
-- CHECK and raises, rather than being silently filtered like a SELECT.
select tests.login((select v from ids where k = 'coordinator'));
select throws_ok(
  $q$ insert into storage.objects (bucket_id, name)
      values ('receipts',
              (select v from w where k='a')::text || '/pay/sneaky.pdf') $q$);

select tests.login((select v from ids where k = 'alice'));
select lives_ok(
  $q$ insert into storage.objects (bucket_id, name)
      values ('receipts',
              (select v from w where k='a')::text || '/pay/receipt.pdf') $q$,
  'An owner can store a receipt under their own wedding folder');

-- =============================================================================
-- 16. v_wedding_financials (2.8) — 8 assertions
-- =============================================================================
-- Compared against the underlying sums rather than hardcoded totals: the point
-- is that the view composes correctly, and earlier sections have already moved
-- these numbers about.
select tests.login((select v from ids where k = 'alice'));

select is((select forecast_minor::bigint from v_wedding_financials
             where wedding_id = (select v from w where k='a')),
          (select sum(forecast_minor)::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a')),
          'FORECAST FINAL COST is the sum of every line forecast');

select is((select budgeted_minor::bigint from v_wedding_financials
             where wedding_id = (select v from w where k='a')),
          (select sum(budgeted_minor)::bigint from budget_lines
             where wedding_id = (select v from w where k='a')),
          'Budgeted is the sum of every line budget, applicable or not');

select is((select paid_minor::bigint from v_wedding_financials
             where wedding_id = (select v from w where k='a')),
          (select sum(paid_minor)::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a')),
          'Paid to date rolls up the payments');

-- D34: over budget must read as a negative, not be clamped away.
select is((select remaining_against_budget_minor::bigint from v_wedding_financials
             where wedding_id = (select v from w where k='a')),
          (select (w2.total_budget_minor - coalesce(sum(bl.forecast_minor), 0))::bigint
             from weddings w2
             left join v_budget_lines bl on bl.wedding_id = w2.id
            where w2.id = (select v from w where k='a')
            group by w2.total_budget_minor),
          'Remaining against budget is total budget minus forecast, unclamped');

-- H34's IFERROR: wedding C has no budget set and no lines seeded.
select is((select budget_utilisation from v_wedding_financials
             where wedding_id = (select v from w where k='c')),
          0::numeric,
          'A wedding with no budget set is nought per cent used, not an error');

select is((select contributions_agreed_minor::bigint from v_wedding_financials
             where wedding_id = (select v from w where k='a')),
          (select sum(agreed_minor)::bigint from contributions
             where wedding_id = (select v from w where k='a')),
          'Contributions agreed matches the contribution rows');

-- H39 is floored at zero: being fully funded is not a negative shortfall.
select ok((select shortfall_minor from v_wedding_financials
             where wedding_id = (select v from w where k='a')) >= 0,
          'Shortfall never goes below zero');

-- The view must not become the door §4.6 closes elsewhere.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from v_wedding_financials
             where wedding_id = (select v from w where k='a')), 0,
          'A coordinator gets no financial summary at all');

-- =============================================================================
-- 17. Overpayment is stated, not swallowed — 4 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

-- BG083 forecasts 43,000.00 (4300000 minor) from its template budget. Pay more
-- than that against it.
update budget_lines set budgeted_minor = 1000, quoted_minor = 0,
                        negotiated_minor = 0, actual_minor = 0
 where wedding_id = (select v from w where k='a') and code = 'BG083';

insert into payments (wedding_id, budget_line_id, code, stage,
                      amount_due_minor, amount_paid_minor)
select (select v from w where k='a'), bl.id, 'PY-OVERPAY', 'final_payment', 1000, 2500
  from budget_lines bl
 where bl.wedding_id = (select v from w where k='a') and bl.code = 'BG083';

select is((select outstanding_minor::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG083'),
          0::bigint,
          'Outstanding is floored at zero when a line has been overpaid');

select is((select overpaid_minor::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG083'),
          1500::bigint,
          'The amount paid beyond the forecast is reported as overpaid');

select ok((select overpaid_minor from v_budget_by_category
             where wedding_id = (select v from w where k='a')
               and category_key = 'jewellery') >= 1500,
          'Overpayment rolls up to the category');

select ok((select overpaid_minor from v_wedding_financials
             where wedding_id = (select v from w where k='a')) >= 1500,
          'Overpayment reaches the wedding financials');

-- =============================================================================
-- 18. Vendors, and the coordinator's money-free view (3.1, 3.2) — 6 assertions
-- =============================================================================
select tests.become_service_role();

select is((select count(*)::int from template.vendor_questions where locale = 'poruwa'),
          227,
          'All 227 vendor questions are seeded');

select is((select count(distinct category_key)::int from template.vendor_questions
             where locale = 'poruwa'),
          16,
          'The questions cover all 16 vendor categories');

select tests.login((select v from ids where k = 'alice'));
insert into vendors (wedding_id, category, name, phone, quoted_minor, arrival_time)
values ((select v from w where k='a'), 'Photographer', 'Studio Lanka', '077 000 0000',
        250000, '08:00');

-- A coordinator must not reach the base table, which carries prices.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from vendors
             where wedding_id = (select v from w where k='a')), 0,
          'A coordinator cannot read the vendors table');

-- ...but must reach the ops view, which carries none.
select is((select count(*)::int from v_vendors_ops
             where wedding_id = (select v from w where k='a')), 1,
          'A coordinator can see the vendor through the ops view');

-- The ops view runs as its owner, so its WHERE clause is the only thing
-- standing between a stranger and every wedding's vendors.
select tests.login((select v from ids where k = 'stranger'));
select is((select count(*)::int from v_vendors_ops
             where wedding_id = (select v from w where k='a')), 0,
          'The ops view still keeps a stranger out');

select tests.become_service_role();
select is((select count(*)::int from information_schema.columns
             where table_name = 'v_vendors_ops'
               and (column_name like '%minor%' or column_name like '%quote%'
                    or column_name like '%deposit%')), 0,
          'The ops view exposes no money column at all');

-- =============================================================================
-- 19. Vendor decision write-back (3.6) — 6 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

insert into vendor_options (wedding_id, category_key, label, vendor_name, phone,
                            quoted_minor, negotiated_minor, deposit_minor, rating)
values ((select v from w where k='a'), 'photographer', 'Option A', 'Studio Lanka',
        '077 111 2222', 500000, 450000, 100000, 4);

select lives_ok(
  $q$ select public.record_vendor_from_option(
        (select id from vendor_options
          where wedding_id = (select v from w where k='a')
            and category_key = 'photographer')) $q$,
  'An owner can record a chosen option as a vendor');

select is((select count(*)::int from vendors
             where wedding_id = (select v from w where k='a')
               and name = 'Studio Lanka'), 1,
          'The vendor row is created from the option');

select is((select negotiated_minor from vendors
             where wedding_id = (select v from w where k='a')
               and name = 'Studio Lanka'),
          450000::bigint,
          'The negotiated price carries across');

-- A decision is not a signed contract.
select is((select status::text from vendors
             where wedding_id = (select v from w where k='a')
               and name = 'Studio Lanka'),
          'tentatively_booked',
          'A recorded vendor starts as tentatively booked, not confirmed');

select is((select count(*)::int from vendor_decisions
             where wedding_id = (select v from w where k='a')
               and category_key = 'photographer'
               and recorded_vendor_id is not null), 1,
          'The decision points at the vendor it created');

-- The guard is written `is not true` for the reason the earlier NULL bug
-- taught: a coordinator is not a member of wedding B at all.
select tests.login((select v from ids where k = 'coordinator'));
select throws_ok(
  $q$ select public.record_vendor_from_option(
        (select id from vendor_options
          where wedding_id = (select v from w where k='a')
            and category_key = 'photographer')) $q$);

-- =============================================================================
-- 20. Vendor attachments (3.8) — 4 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

insert into vendor_attachments (wedding_id, vendor_id, kind, file_name, path)
select (select v from w where k='a'), v.id, 'contract', 'contract.pdf',
       (select v from w where k='a')::text || '/' || v.id::text || '/contract.pdf'
  from vendors v
 where v.wedding_id = (select v from w where k='a') and v.name = 'Studio Lanka';

select is((select count(*)::int from vendor_attachments
             where wedding_id = (select v from w where k='a')), 1,
          'The couple can attach a contract to a vendor');

-- A contract carries prices, so it follows the money boundary rather than the
-- ops one: a coordinator sees the vendor through v_vendors_ops but not this.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from vendor_attachments
             where wedding_id = (select v from w where k='a')), 0,
          'A coordinator cannot see a vendor contract');

select is((select count(*)::int from pg_policies
             where schemaname = 'storage' and tablename = 'objects'
               and policyname like 'contracts_%'), 4,
          'All four contract policies are installed on storage.objects');

select tests.login((select v from ids where k = 'stranger'));
select is((select count(*)::int from vendor_attachments
             where wedding_id = (select v from w where k='a')), 0,
          'A stranger cannot see another wedding''s contracts');

-- =============================================================================
-- 21. A vendor's money comes from its budget lines — 6 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

-- Point two jewellery lines at the vendor recorded earlier.
update budget_lines
   set vendor_id = (select id from vendors
                     where wedding_id = (select v from w where k='a')
                       and name = 'Studio Lanka')
 where wedding_id = (select v from w where k='a')
   and code in ('BG077', 'BG082');

select is((select budget_line_count::int from v_vendor_financials
             where vendor_id = (select id from vendors
                                 where wedding_id = (select v from w where k='a')
                                   and name = 'Studio Lanka')),
          2,
          'A vendor knows how many budget lines it fulfils');

select is((select forecast_minor::bigint from v_vendor_financials
             where vendor_id = (select id from vendors
                                 where wedding_id = (select v from w where k='a')
                                   and name = 'Studio Lanka')),
          (select sum(forecast_minor)::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a')
               and code in ('BG077', 'BG082')),
          'The vendor forecast is the sum of its lines, not a second figure');

select is((select paid_minor::bigint from v_vendor_financials
             where vendor_id = (select id from vendors
                                 where wedding_id = (select v from w where k='a')
                                   and name = 'Studio Lanka')),
          (select sum(paid_minor)::bigint from v_budget_lines
             where wedding_id = (select v from w where k='a')
               and code in ('BG077', 'BG082')),
          'Payments reach the vendor through its lines');

-- A payment carries no vendor of its own; it is resolved through the line, so
-- the two can never disagree.
select is((select vendor_id from v_payments
             where wedding_id = (select v from w where k='a') and code = 'PY-DRAFT'),
          (select vendor_id from budget_lines
             where wedding_id = (select v from w where k='a') and code = 'BG077'),
          'A payment resolves its vendor through its budget line');

select is((select count(*)::int from information_schema.columns
             where table_name = 'payments' and column_name = 'vendor_id'), 0,
          'The payments table no longer carries a second path to a vendor');

-- A vendor with no lines linked is not an error, just an unallocated quote.
select tests.login((select v from ids where k = 'alice'));
insert into vendors (wedding_id, category, name, quoted_minor)
values ((select v from w where k='a'), 'Cake', 'Unlinked Cakes', 50000);

select is((select budget_line_count::int from v_vendor_financials
             where vendor_id = (select id from vendors
                                 where wedding_id = (select v from w where k='a')
                                   and name = 'Unlinked Cakes')),
          0,
          'A vendor with no budget lines is allowed, and reads as zero');

-- =============================================================================
-- 22. Guests: the household model and side-scoped reading (4.1, 4.3) — 8 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

insert into guests (wedding_id, household_name, side, adults_invited, children_invited)
values ((select v from w where k='a'), 'Bride side household',  'bride', 4, 1),
       ((select v from w where k='a'), 'Groom side household',  'groom', 3, 0),
       ((select v from w where k='a'), 'Shared friends',        'both',  2, 0),
       ((select v from w where k='a'), 'Side not decided',       null,   2, 2);

select is((select total_invited from guests
             where wedding_id = (select v from w where k='a')
               and household_name = 'Bride side household'),
          5,
          'total_invited counts adults and children together');

select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')), 4,
          'The couple see every household, whichever side');

-- Ticket 4.3, the assertion its AC names outright.
select tests.login((select v from ids where k = 'brides_mum'));
select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')
               and household_name = 'Groom side household'), 0,
          'The bride''s mother cannot read groom-side guests');

select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')
               and household_name = 'Bride side household'), 1,
          'The bride''s mother can read her own side');

-- 'both' and an undecided side are visible to either family: withholding them
-- would hide shared friends from everyone.
select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')
               and household_name in ('Shared friends', 'Side not decided')), 2,
          'Shared and undecided households are visible to either side');

select tests.login((select v from ids where k = 'grooms_dad'));
select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')
               and household_name = 'Bride side household'), 0,
          'And the groom''s father cannot read bride-side guests');

-- A coordinator seats people, so they see the list — guests are not money.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from guests
             where wedding_id = (select v from w where k='a')), 4,
          'A coordinator sees the whole guest list, which they need for seating');

-- Plan §4.5's flat rule, checked as a grant rather than trusted to policy.
select tests.become_service_role();
select is((select count(*)::int from information_schema.role_table_grants
             where table_name = 'guests' and grantee = 'anon'), 0,
          'anon has no grant of any kind on the guests table');

-- =============================================================================
-- 23. The public RSVP surface (4.5) and its guard (4.7) — 21 assertions
-- =============================================================================
-- The shape of this section changed with 4.7. anon used to call these RPCs
-- directly, and that was the point of testing as anon. It no longer can: the
-- grants were revoked so that every caller goes through the rsvp Edge Function,
-- which applies Turnstile and rate limits first.
--
-- So there are now two things to prove, and the second is the one that would
-- rot quietly. That anon is refused — otherwise the limits are advisory and a
-- script can simply skip them. And that the RPCs still behave correctly for the
-- role that does call them, which is the service role the function holds.
--
-- The behavioural assertions therefore run as the service role. That is a real
-- reduction in what they prove, and it is why the refusals are asserted as
-- grants rather than inferred from an error: a `throws_ok` alone would keep
-- passing if the function started failing for some unrelated reason.
-- =============================================================================
select tests.become_service_role();

create temporary table tok (k text primary key, v uuid);
grant select on tok to public;
insert into tok
select 'household', rsvp_token from guests
 where wedding_id = (select v from w where k='a')
   and household_name = 'Bride side household';

-- 1. The 4.7 guarantee: the Edge Function is the only route in.
select is(has_function_privilege('anon', 'public.rsvp_lookup(uuid)', 'execute'),
          false,
          'anon cannot execute rsvp_lookup — the Edge Function is the only route');

select is(has_function_privilege('anon',
            'public.rsvp_submit(uuid, int, int, text, boolean, boolean, text, text)',
            'execute'),
          false,
          'anon cannot execute rsvp_submit, so the rate limits cannot be skipped');

select is(has_function_privilege('anon',
            'public.rsvp_rate_take(text, int, interval)', 'execute'),
          false,
          'anon cannot call the limiter and burn someone else''s bucket');

-- 2. And the refusal is real, not just a missing grant on paper.
select tests.logout();
select throws_ok(
  $q$ select * from public.rsvp_lookup((select v from tok where k='household')) $q$);

-- 3. Nothing behind the functions is reachable either. Unchanged by 4.7, and
--    still the assertion that matters most on this surface.
select throws_ok($q$ select count(*) from guests $q$);
select throws_ok($q$ select count(*) from rsvp_submissions $q$);
select throws_ok($q$ select count(*) from rsvp_rate_events $q$);

-- 4. The read path, as the role the function actually uses.
select tests.become_service_role();

select is((select count(*)::int from public.rsvp_lookup((select v from tok where k='household'))),
          1,
          'A valid token returns exactly one household');

select is((select household_name from public.rsvp_lookup((select v from tok where k='household'))),
          'Bride side household',
          'The lookup returns the right household');

-- An unknown token is silent, not an error: a distinguishable failure is an
-- oracle for anyone guessing.
select is((select count(*)::int from public.rsvp_lookup(gen_random_uuid())), 0,
          'An unknown token returns no rows rather than raising');

-- 5. The write path, within what the household was invited for (4 adults + 1
--    child), now carrying the caller hint 4.7 records.
select lives_ok(
  $q$ select public.rsvp_submit((select v from tok where k='household'),
                                3, 1, 'no pork', true, false, 'see you there',
                                'abc123hash') $q$,
  'A household can reply through the public function');

select is((select rsvp_status::text from guests
             where rsvp_token = (select v from tok where k='household')),
          'accepted',
          'Replying with people coming marks the household accepted');

select is((select count(*)::int from rsvp_submissions
             where guest_id = (select id from guests
                                where rsvp_token = (select v from tok where k='household'))),
          1,
          'Every accepted submission is recorded for audit');

select is((select client_hint from rsvp_submissions
             where guest_id = (select id from guests
                                where rsvp_token = (select v from tok where k='household'))),
          'abc123hash',
          'The audit row records who submitted, as a salted hash');

-- 6. The control §4.5 names: a public form cannot invent guests. Still enforced
--    in the RPC, not in the Edge Function, so a bug in the function cannot
--    inflate a head count.
select throws_ok(
  $q$ select public.rsvp_submit((select v from tok where k='household'), 40, 0) $q$);

-- 7. Nobody coming is a decline, not a silent nothing.
select lives_ok(
  $q$ select public.rsvp_submit((select v from tok where k='household'), 0, 0) $q$,
  'A household can decline by replying with nobody attending');

select is((select rsvp_status::text from guests
             where rsvp_token = (select v from tok where k='household')),
          'declined',
          'Replying with nobody coming marks the household declined');

-- 8. The limiter itself (4.7). Two units in the bucket, then refusal.
select is(public.rsvp_rate_take('test:bucket', 2, interval '1 hour'), true,
          'The first attempt in a bucket is allowed');

select is(public.rsvp_rate_take('test:bucket', 2, interval '1 hour'), true,
          'The second attempt is still inside a limit of two');

select is(public.rsvp_rate_take('test:bucket', 2, interval '1 hour'), false,
          'The third attempt is refused');

-- The property that makes the limiter hold rather than leak: a refused attempt
-- costs the caller a unit too. Counting only what it allowed would let someone
-- sit on the boundary indefinitely.
select is((select count(*)::int from rsvp_rate_events where bucket = 'test:bucket'),
          3,
          'A refused attempt is recorded, so sitting on the limit does not work');

-- =============================================================================
-- The vendor precedence rule  (20260904000100)
-- =============================================================================
-- payments.vendor_id was dropped in 2400 precisely because two paths to a
-- vendor can disagree. It is back, so the reason it is safe this time has to be
-- provable rather than asserted in a comment: the budget line's vendor wins,
-- always, and the column follows it.
-- =============================================================================
-- Same reason as `ids` and `w` above: created by the service role so the grant
-- can be made, then written and read while impersonating a real user.
select tests.become_service_role();
create temporary table pv (k text primary key, v uuid);
grant select, insert on pv to public;

select tests.login((select v from ids where k = 'alice'));

with ins as (
  insert into vendors (wedding_id, category, name)
  values ((select v from w where k='a'), 'Photography', 'Studio One')
  returning id
)
insert into pv select 'vendor1', id from ins;

with ins as (
  insert into vendors (wedding_id, category, name)
  values ((select v from w where k='a'), 'Photography', 'Studio Two')
  returning id
)
insert into pv select 'vendor2', id from ins;

-- A line that names a vendor, and one that names none.
with ins as (
  insert into budget_lines (wedding_id, code, name, budgeted_minor, vendor_id)
  values ((select v from w where k='a'), 'VP001', 'Photography package', 100000,
          (select v from pv where k='vendor1'))
  returning id
)
insert into pv select 'line_with', id from ins;

with ins as (
  insert into budget_lines (wedding_id, code, name, budgeted_minor)
  values ((select v from w where k='a'), 'VP002', 'Album printing', 20000)
  returning id
)
insert into pv select 'line_without', id from ins;

-- 1. The line's vendor wins over whatever the client sent.
with ins as (
  insert into payments (wedding_id, budget_line_id, vendor_id,
                        amount_due_minor, amount_paid_minor, paid_on)
  values ((select v from w where k='a'),
          (select v from pv where k='line_with'),
          (select v from pv where k='vendor2'),   -- deliberately the wrong one
          60000, 60000, current_date)
  returning id
)
insert into pv select 'pay_on_line', id from ins;

select is((select vendor_id from payments where id = (select v from pv where k='pay_on_line')),
          (select v from pv where k='vendor1'),
          'A payment is attributed to its budget line''s vendor, not the one it was sent with');

-- 2. With no vendor on the line, the payment's own choice stands.
with ins as (
  insert into payments (wedding_id, budget_line_id, vendor_id,
                        amount_due_minor, amount_paid_minor, paid_on)
  values ((select v from w where k='a'),
          (select v from pv where k='line_without'),
          (select v from pv where k='vendor2'),
          20000, 20000, current_date)
  returning id
)
insert into pv select 'pay_own_vendor', id from ins;

select is((select vendor_id from payments where id = (select v from pv where k='pay_own_vendor')),
          (select v from pv where k='vendor2'),
          'A payment on a line with no vendor keeps the vendor it names');

-- 3. Re-pointing the line carries its payments with it.
update budget_lines set vendor_id = (select v from pv where k='vendor2')
 where id = (select v from pv where k='line_with');

select is((select vendor_id from payments where id = (select v from pv where k='pay_on_line')),
          (select v from pv where k='vendor2'),
          'Re-linking a budget line moves the payments made against it');

-- 4. The line wins unconditionally: a payment that had named its own vendor is
--    taken over once the line names one.
update budget_lines set vendor_id = (select v from pv where k='vendor1')
 where id = (select v from pv where k='line_without');

select is((select vendor_id from payments where id = (select v from pv where k='pay_own_vendor')),
          (select v from pv where k='vendor1'),
          'A line that gains a vendor takes over the payments on it');

-- 5. Clearing the line's vendor clears the payments that were following it.
update budget_lines set vendor_id = null
 where id = (select v from pv where k='line_without');

select is((select vendor_id from payments where id = (select v from pv where k='pay_own_vendor')),
          null,
          'Clearing a line''s vendor clears the payments that had followed it');

-- 6. The case the column exists for: money out with no budget line at all.
insert into payments (wedding_id, vendor_id, amount_due_minor, amount_paid_minor, paid_on)
values ((select v from w where k='a'), (select v from pv where k='vendor2'),
        5000, 5000, current_date);

select is((select unbudgeted_paid_minor from v_vendor_financials
            where vendor_id = (select v from pv where k='vendor2')),
          5000::bigint,
          'A payment with no budget line is reported as unbudgeted against its vendor');

select is((select paid_minor from v_vendor_financials
            where vendor_id = (select v from pv where k='vendor2')),
          65000::bigint,
          'A vendor''s paid total includes payments no budget line covers');

-- 7. Two lines and two payments must not multiply each other. This is the bug
--    the two lateral aggregates exist to prevent, and it would look like a
--    plausible number rather than an error.
insert into budget_lines (wedding_id, code, name, budgeted_minor, vendor_id)
values ((select v from w where k='a'), 'VP003', 'Second shooter', 40000,
        (select v from pv where k='vendor2'));

insert into payments (wedding_id, budget_line_id, amount_due_minor, amount_paid_minor, paid_on)
values ((select v from w where k='a'),
        (select v from pv where k='line_with'), 40000, 40000, current_date);

select is((select budgeted_minor from v_vendor_financials
            where vendor_id = (select v from pv where k='vendor2')),
          140000::bigint,
          'Budget lines are summed once regardless of how many payments exist');

select is((select budget_line_count from v_vendor_financials
            where vendor_id = (select v from pv where k='vendor2')),
          2::bigint,
          'The line count is the number of lines, not lines times payments');

-- =============================================================================
-- Seating (4.8) — 10 assertions
-- =============================================================================
-- The interesting assertions here are the two about what is NOT blocked. It is
-- easy to write a capacity constraint that also refuses a guest's RSVP, and
-- nobody would notice until a guest could not reply.
-- =============================================================================
select tests.become_service_role();
create temporary table st (k text primary key, v uuid);
grant select, insert on st to public;
create temporary table snap (k text primary key, v bigint);
grant select, insert on snap to public;

select tests.login((select v from ids where k = 'alice'));

with ins as (
  insert into seating_tables (wedding_id, name, capacity)
  values ((select v from w where k='a'), 'Top table', 6)
  returning id
)
insert into st select 'top', id from ins;

with ins as (
  insert into guests (wedding_id, household_name, side, adults_invited, children_invited)
  values ((select v from w where k='a'), 'Seat test A', 'bride', 4, 0)
  returning id
)
insert into st select 'a', id from ins;

with ins as (
  insert into guests (wedding_id, household_name, side, adults_invited, children_invited)
  values ((select v from w where k='a'), 'Seat test B', 'bride', 4, 0)
  returning id
)
insert into st select 'b', id from ins;

with ins as (
  insert into guests (wedding_id, household_name, side, adults_invited, children_invited)
  values ((select v from w where k='a'), 'Seat test C', 'bride', 2, 0)
  returning id
)
insert into st select 'c', id from ins;

-- 1. Before anyone replies, a household needs as many chairs as it was
--    invited for. Planning for the invitation is the only sane default.
select is((select heads_to_seat from guests where id = (select v from st where k='a')),
          4,
          'Chairs needed comes from the invitation until the household replies');

-- 2. An assignment that fits is allowed.
select lives_ok(
  $q$ update guests set table_id = (select v from st where k='top')
       where id = (select v from st where k='a') $q$,
  'A household that fits can be seated');

-- 3. And one that does not fit is refused. This is the ticket's
--    "over-capacity blocked".
select throws_ok(
  $q$ update guests set table_id = (select v from st where k='top')
       where id = (select v from st where k='b') $q$);

-- 4. Once they reply, the reply is what counts.
update guests set rsvp_status = 'accepted', adults_attending = 2, children_attending = 0
 where id = (select v from st where k='a');

select is((select heads_to_seat from guests where id = (select v from st where k='a')),
          2,
          'Chairs needed follows the reply once one has been given');

-- 5. So the same assignment now fits, with no other change.
select lives_ok(
  $q$ update guests set table_id = (select v from st where k='top')
       where id = (select v from st where k='b') $q$,
  'Freeing seats by an RSVP makes room for the next household');

-- 6. THE ONE THAT MATTERS. A household already seated replies with more people
--    than expected. That must not be refused: the reply is the fact and the
--    seating is the plan, so the plan is what gives way. A trigger written on
--    the whole row instead of `of table_id` would fail here, and it would fail
--    for a guest on a phone rather than for the couple.
select lives_ok(
  $q$ update guests set adults_attending = 4
       where id = (select v from st where k='a') $q$,
  'A reply that overflows a table is accepted, not blocked');

-- 7. It is reported instead.
select is((select over_capacity from v_seating_tables
            where table_id = (select v from st where k='top')),
          true,
          'The table is reported as over capacity so the couple can fix it');

select is((select seated_heads from v_seating_tables
            where table_id = (select v from st where k='top')),
          8::bigint,
          'seated_heads counts people rather than households');

-- 8. A household that has declined needs no chair, and must not sit in the
--    "still to seat" number forever as work that can never be finished.
insert into snap
select 'unseated', unseated_households from v_seating_summary
 where wedding_id = (select v from w where k='a');

update guests set rsvp_status = 'declined'
 where id = (select v from st where k='c');

select is((select unseated_households from v_seating_summary
            where wedding_id = (select v from w where k='a')),
          (select v from snap where k='unseated') - 1,
          'A household that declines stops counting as unseated');

-- 9. Deleting a table unseats its households rather than deleting them. The
--    foreign key says `on delete set null`; this proves nobody changed it.
delete from seating_tables where id = (select v from st where k='top');

select is((select count(*)::int from guests
            where id in ((select v from st where k='a'), (select v from st where k='b'))
              and table_id is null),
          2,
          'Deleting a table unseats its households and keeps them on the list');

-- =============================================================================
-- The gift ledger (4.9) — 7 assertions
-- =============================================================================
-- Two properties are worth proving here. That the placeholders ticket 2.8 left
-- as literal zeros are actually gone — a view can keep returning 0 forever and
-- look perfectly healthy. And that a generous household never offsets a
-- missing one, which is the difference between a useful follow-up figure and a
-- reassuring lie.
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

insert into snap
select 'net_cost', net_cost_after_gifts_minor from v_wedding_financials
 where wedding_id = (select v from w where k='a');

-- One household gives more than expected, one gives nothing. Netted, they
-- would report nothing outstanding.
insert into guests (wedding_id, household_name, side,
                    adults_invited, expected_gift_minor, gift_received_minor,
                    thank_you_sent)
values ((select v from w where k='a'), 'Gift generous', 'bride', 2, 10000, 15000, false),
       ((select v from w where k='a'), 'Gift missing',  'groom', 2, 10000, 0,     false);

select is((select expected_minor from v_gift_summary
            where wedding_id = (select v from w where k='a')),
          20000::bigint,
          'Expected gifts sum across households');

select is((select received_minor from v_gift_summary
            where wedding_id = (select v from w where k='a')),
          15000::bigint,
          'Received gifts sum across households');

select is((select still_expected_minor from v_gift_summary
            where wedding_id = (select v from w where k='a')),
          10000::bigint,
          'A household that gave more does not offset one that gave nothing');

select is((select thank_yous_pending from v_gift_summary
            where wedding_id = (select v from w where k='a')),
          1::bigint,
          'Only a household whose gift arrived and who has not been thanked counts');

-- The 2.8 placeholders. A literal 0 in a view is invisible until something
-- asserts it is no longer there.
select is((select expected_gifts_minor from v_wedding_financials
            where wedding_id = (select v from w where k='a')),
          20000::bigint,
          'v_wedding_financials reports gifts rather than 2.8''s placeholder zero');

select is((select net_cost_after_gifts_minor from v_wedding_financials
            where wedding_id = (select v from w where k='a')),
          (select v from snap where k='net_cost') - 20000,
          'Net cost falls by the gifts expected, per the workbook''s D39');

-- Gifts are read from `guests`, which 4.3 scopes by side. So a family member's
-- gift total is their own side's, not the wedding's. That is the policy
-- working, and it means the figure differs by reader — which is exactly why it
-- is asserted rather than assumed.
select tests.login((select v from ids where k = 'brides_mum'));
select is((select expected_minor from v_gift_summary
            where wedding_id = (select v from w where k='a')),
          10000::bigint,
          'A family member sees only their own side''s gifts, by the same RLS as the guest list');

-- =============================================================================
-- Phase 5: readiness and the responsibility matrix — 11 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

-- ---------------------------------------------------------------- 5.5 seeding
-- The failure this guards against has happened once already, in 1.4:
-- seed_wedding was fully tested and nothing called it, so every wedding was
-- empty. Here the risk is narrower and the same shape — the template content
-- and the table both exist, and the function forgets to copy one to the other.
select is((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')),
          (select count(*)::int from template.responsibilities where locale = 'poruwa'),
          'seed_wedding copies every template responsibility into the wedding');

select ok((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')) > 0,
          'And there is template content for it to copy');

-- The roles arrive; the names deliberately do not. An invented name would
-- defeat the warning that exists to catch its absence.
select is((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')
              and person_name is not null),
          0,
          'Seeding names nobody, so the 5.5 warning starts by firing');

select ok((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')
              and responsible is not null) > 0,
          'But the RACI roles are seeded, so there is something to attach a name to');

-- ---------------------------------------------------------------- 5.5 tenancy
select tests.login((select v from ids where k = 'stranger'));
select is((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')),
          0,
          'A stranger cannot read another wedding''s responsibility matrix');

select tests.login((select v from ids where k = 'coordinator'));
select ok((select count(*)::int from responsibilities
            where wedding_id = (select v from w where k='a')) > 0,
          'A coordinator can read it — they are the one running the day');

select throws_ok(
  $q$ insert into responsibilities (wedding_id, activity)
      values ((select v from w where k='a'), 'Coordinator writes') $q$);

-- ---------------------------------------------------------------- 5.3 readiness
select tests.login((select v from ids where k = 'alice'));

-- A clean area to assert against, rather than arithmetic over 93 seeded rows.
insert into wedding_tasks (wedding_id, category, task, status, due_date)
values ((select v from w where k='a'), 'ZZ Readiness', 'done one',   'completed',  current_date),
       ((select v from w where k='a'), 'ZZ Readiness', 'done two',   'completed',  current_date),
       ((select v from w where k='a'), 'ZZ Readiness', 'to do',      'not_started', current_date + 5),
       ((select v from w where k='a'), 'ZZ Readiness', 'struck off', 'cancelled',  current_date),
       ((select v from w where k='a'), 'ZZ Readiness', 'late',       'in_progress', current_date - 3);

-- THE property. Cancelled leaves the denominator rather than counting as done:
-- 2 completed of 4 relevant is 0.5. Counting the cancelled row would give 0.4,
-- and an area with work struck off could never reach 100% however much was
-- finished — which is how people stop trusting a progress bar.
select is((select ratio from v_readiness
            where wedding_id = (select v from w where k='a') and area = 'ZZ Readiness'),
          0.5000::numeric,
          'Cancelled tasks leave the denominator instead of counting as incomplete');

select is((select overdue from v_readiness
            where wedding_id = (select v from w where k='a') and area = 'ZZ Readiness'),
          1::bigint,
          'Overdue counts what is past its date and not finished');

-- A cancelled task is not overdue however old it is: it is not work any more.
insert into wedding_tasks (wedding_id, category, task, status, due_date)
values ((select v from w where k='a'), 'ZZ Cancelled', 'abandoned', 'cancelled', current_date - 90);

select is((select overdue from v_readiness
            where wedding_id = (select v from w where k='a') and area = 'ZZ Cancelled'),
          0::bigint,
          'A cancelled task is never overdue, however long ago its date was');

-- Nothing but cancelled work reports no progress, which is not the same as 0%.
select is((select ratio from v_readiness
            where wedding_id = (select v from w where k='a') and area = 'ZZ Cancelled'),
          null,
          'An area with everything cancelled has no ratio rather than a zero');

-- =============================================================================
-- Phase 6: the checklist modules — 14 assertions
-- =============================================================================
select tests.login((select v from ids where k = 'alice'));

-- ---------------------------------------------------------- the shared shape
-- Plan §2's shape, checked on the schema rather than trusted to the loop that
-- built seventeen tables. If the loop ever gains a table that misses a column,
-- ChecklistModule renders it and quietly cannot save that field.
select is((select count(*)::int from information_schema.columns
            where table_schema = 'public'
              and table_name in ('attire_items','jewellery_items','beauty_appointments',
                                 'ceremony_steps','legal_requirements','decor_items',
                                 'menu_items','cake_items','transport_legs','accommodations',
                                 'shot_list_items','procurement_items','wedding_party',
                                 'closure_tasks','lessons','music_cues','contacts')
              and column_name in ('id','wedding_id','applicability','name','owner',
                                  'vendor_id','cost_minor','status','notes','sort_order')),
          170,
          'All seventeen module tables carry all ten shared columns');

-- RLS on every one of them. Plan §7.1: never ship a table without a policy.
select is((select count(*)::int from pg_tables
            where schemaname = 'public'
              and tablename in ('attire_items','jewellery_items','beauty_appointments',
                                'ceremony_steps','legal_requirements','decor_items',
                                'menu_items','cake_items','transport_legs','accommodations',
                                'shot_list_items','procurement_items','wedding_party',
                                'closure_tasks','lessons','music_cues','contacts')
              and rowsecurity),
          17,
          'Row-level security is enabled on every module table');

select is((select count(*)::int from pg_policies
            where schemaname = 'public'
              and tablename in ('attire_items','jewellery_items','beauty_appointments',
                                'ceremony_steps','legal_requirements','decor_items',
                                'menu_items','cake_items','transport_legs','accommodations',
                                'shot_list_items','procurement_items','wedding_party',
                                'closure_tasks','lessons','music_cues','contacts')),
          34,
          'And each has both a read and a write policy');

-- A stranger cannot read one, checked on a real table rather than inferred
-- from the policy text.
insert into decor_items (wedding_id, name, area) values
  ((select v from w where k='a'), 'Poruwa backdrop', 'Ballroom');

select tests.login((select v from ids where k = 'stranger'));
select is((select count(*)::int from decor_items
            where wedding_id = (select v from w where k='a')),
          0,
          'A stranger cannot read another wedding''s decor list');

-- The coordinator needs these on the day and gets read but not write.
select tests.login((select v from ids where k = 'coordinator'));
select is((select count(*)::int from decor_items
            where wedding_id = (select v from w where k='a')),
          1,
          'A coordinator can read the decor list');
select throws_ok(
  $q$ insert into decor_items (wedding_id, name)
      values ((select v from w where k='a'), 'Coordinator writes') $q$);

-- ------------------------------------------------------------ 6.4 the fixture
-- The workbook prints "Active minutes: 93" in its own header. That makes it a
-- known-good number rather than one this code invented, so it is asserted the
-- same way the 905,500 / 735,500 jewellery figure is in 2.9.
select tests.login((select v from ids where k = 'alice'));

select is((select count(*)::int from ceremony_steps
            where wedding_id = (select v from w where k='a')),
          24,
          'Seeding brings in all 24 poruwa components');

select is((select minutes from v_ceremony_length
            where wedding_id = (select v from w where k='a')),
          93::bigint,
          'The required components total 93 minutes, as the sheet''s own header says');

-- Switching one off must take its minutes with it. This is the whole point of
-- the applicability column on a ceremony.
update ceremony_steps set applicability = 'not_applicable'
 where wedding_id = (select v from w where k='a')
   and name = 'Family group photographs';

select is((select minutes from v_ceremony_length
            where wedding_id = (select v from w where k='a')),
          73::bigint,
          'Switching off the 20-minute photographs takes 20 minutes off the total');

-- And a component with no duration is reported rather than silently treated
-- as zero, or the total reads as authoritative when it is short.
insert into ceremony_steps (wedding_id, name, sort_order)
values ((select v from w where k='a'), 'Something we have not timed', 99);

select is((select steps_without_duration from v_ceremony_length
            where wedding_id = (select v from w where k='a')),
          1::bigint,
          'A component with no duration is counted as a hole in the total');

-- ------------------------------------------------------------ 6.5 VERIFY
select is((select count(*)::int from legal_requirements
            where wedding_id = (select v from w where k='a')),
          17,
          'Seeding brings in all 17 registration requirements');

-- Plan R10: legal content is never asserted as fact. Most of the checklist
-- arrives needing confirmation with the registrar, and nothing in this app
-- moves a row to 'verified' on its own.
select ok((select count(*)::int from legal_requirements
            where wedding_id = (select v from w where k='a')
              and verify_status = 'to_verify') > 10,
          'Most registration requirements arrive marked to verify, not verified');

-- 1.7 covers the registrar deadlines too. Giving notice has a statutory
-- waiting period behind it, so a stale date here is the one that cannot be
-- recovered from.
select is((select due_date from legal_requirements
            where wedding_id = (select v from w where k='a') and seq = 3),
          (select wedding_date - 90 from weddings where id = (select v from w where k='a')),
          'Notice of marriage is dated 90 days before the wedding');

update weddings set wedding_date = wedding_date + 30
 where id = (select v from w where k='a');

select is((select due_date from legal_requirements
            where wedding_id = (select v from w where k='a') and seq = 3),
          (select wedding_date - 90 from weddings where id = (select v from w where k='a')),
          'Moving the wedding re-dates the registration deadlines with it');

select * from finish();
rollback;
