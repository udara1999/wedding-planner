-- =============================================================================
-- 20260904001600  a demo wedding  (ticket 9.3)
-- =============================================================================
-- "New user reaches a populated dashboard in under 2 minutes."
--
-- The two minutes are the whole requirement, and an empty wedding cannot meet
-- it however fast it is created. seed_wedding already brings in 93 tasks, 59
-- countdown checks, 24 components, 56 timeline events and the rest — but every
-- one of them is unstarted, so the dashboard opens on 0% of everything and the
-- alerts panel fires on nothing because there is nothing to be wrong about.
--
-- So the demo also puts money and people in: a few vendors at different stages,
-- payments in several states including one overdue, guests who have and have
-- not replied, contributions part-received. Enough that the readiness chart has
-- shape, the money block has real numbers, and the ATTENTION REQUIRED panel has
-- something to say — which is what somebody is actually evaluating.
--
-- SECURITY INVOKER, deliberately. The caller ends up the owner of their own
-- demo through create_wedding, and every insert below is subject to their own
-- RLS. A definer function here would be a way to write rows into a wedding
-- while bypassing the policies that protect every other wedding.
-- =============================================================================

create or replace function public.create_demo_wedding()
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id       uuid;
  v_date     date := current_date + 118;   -- inside no gate, outside the free window edge
  v_line     uuid;
  v_vendor   uuid;
  v_guest    uuid;
begin
  -- The caller's own wedding, created the ordinary way, so ownership and the
  -- membership row come from the same code path as a real one.
  v_id := public.create_wedding('Amaya', 'Dilan', v_date, 'LKR', 'Asia/Colombo', 'poruwa');

  perform public.seed_wedding(v_id);

  update weddings
     set total_budget_minor = 400000000,   -- 4,000,000.00
         venue_name         = 'Hotel Suisse',
         venue_town         = 'Kandy',
         crew_count         = 8,
         notes              = 'A demo wedding. Everything in it is made up — '
                              'change anything, or delete the whole thing.'
   where id = v_id;

  -- ---------------------------------------------------------------- vendors
  -- Spread across the pipeline so the board and its strip have shape.
  insert into vendors (wedding_id, category, name, contact_name, phone, status,
                       contract_signed, quoted_minor, negotiated_minor, arrival_time)
  values
    (v_id, 'Venue & Hotel', 'Hotel Suisse', 'Mr Fernando', '0812234567', 'confirmed',
     true, 60000000, 52400000, '07:00'),
    (v_id, 'Photography', 'Studio Lanka', 'Nuwan', '0771234567', 'confirmed',
     true, 35000000, 18000000, '14:30'),
    (v_id, 'Food & Beverage', 'Green Cabin Catering', 'Ms Perera', '0112345678',
     'tentatively_booked', false, 210000000, 200700000, '11:00'),
    (v_id, 'Decor & Florals', 'Lotus Decor', null, null, 'negotiating',
     false, 70000000, 0, null),
    (v_id, 'Entertainment', 'Baila Brothers', 'Sunil', '0765555555', 'shortlisted',
     false, 40000000, 0, '18:00'),
    (v_id, 'Videography', 'Frame by Frame', null, null, 'researching',
     false, 0, 0, null);

  -- Link the photographer to a real budget line so the vendor money view has
  -- something to derive from rather than only typed figures.
  select id into v_vendor from vendors
   where wedding_id = v_id and name = 'Studio Lanka';

  select id into v_line from budget_lines
   where wedding_id = v_id and name ilike '%photograph%'
   order by sort_order limit 1;

  if v_line is not null then
    update budget_lines
       set vendor_id = v_vendor, negotiated_minor = 18000000
     where id = v_line;

    -- Two payments: one settled, one overdue. The overdue one is what makes
    -- the alerts panel worth looking at on a first visit.
    insert into payments (wedding_id, budget_line_id, stage, amount_due_minor,
                          amount_paid_minor, due_date, paid_on, method, paid_by)
    values (v_id, v_line, 'booking_deposit', 5000000, 5000000,
            current_date - 40, current_date - 40, 'Bank Transfer', 'Couple'),
           (v_id, v_line, 'progress_payment', 6500000, 0,
            current_date - 6, null, 'Bank Transfer', 'Couple');
  end if;

  -- Some budget lines actually costed, so the money-by-category chart is not
  -- one flat colour.
  update budget_lines set negotiated_minor = budgeted_minor - (budgeted_minor / 10)
   where wedding_id = v_id
     and applicability = 'required'
     and budgeted_minor > 0
     and sort_order % 3 = 0;

  -- ---------------------------------------------------------------- guests
  insert into guests (wedding_id, household_name, relationship, side, category,
                      adults_invited, children_invited, phone, rsvp_status,
                      adults_attending, children_attending, expected_gift_minor,
                      gift_received_minor)
  values
    (v_id, 'Perera family', 'Aunt', 'bride', 'Relatives', 4, 1, '0711111111',
     'accepted', 4, 1, 1000000, 0),
    (v_id, 'Silva family', 'Uncle', 'groom', 'Relatives', 2, 0, '0722222222',
     'accepted', 2, 0, 500000, 500000),
    (v_id, 'Office friends', 'Work', 'groom', 'Friends / Work', 6, 0, null,
     'pending', 0, 0, 300000, 0),
    (v_id, 'Nanayakkara family', 'Neighbour', 'bride', 'Relatives', 3, 2, '0733333333',
     'declined', 0, 0, 0, 0),
    (v_id, 'University friends', 'Friends', 'both', 'Friends / Work', 8, 0, null,
     'pending', 0, 0, 400000, 0);

  -- One household seated, so the seating screen is not empty and the
  -- unseated count is a real number rather than everything.
  insert into seating_tables (wedding_id, name, capacity, sort_order)
  values (v_id, 'Top table', 10, 0), (v_id, 'Table 1', 10, 1), (v_id, 'Table 2', 10, 2);

  select id into v_guest from guests
   where wedding_id = v_id and household_name = 'Silva family';

  update guests set table_id = (select id from seating_tables
                                 where wedding_id = v_id and name = 'Top table')
   where id = v_guest;

  -- ---------------------------------------------------------- contributions
  insert into contributions (wedding_id, contributor, relationship,
                             agreed_minor, received_minor, received_on)
  values (v_id, 'Bride''s parents', 'Parents', 150000000, 100000000, current_date - 20),
         (v_id, 'Groom''s parents', 'Parents', 120000000, 0, null);

  -- ---------------------------------------------------------------- progress
  -- Some tasks done, so readiness has variation across areas rather than a
  -- row of zeros. Every third one, which spreads across categories.
  update wedding_tasks set status = 'completed', completed_at = now()
   where wedding_id = v_id and seq % 3 = 0;

  update wedding_tasks set status = 'in_progress'
   where wedding_id = v_id and seq % 7 = 0 and status <> 'completed';

  -- A named person on a few responsibilities, leaving the rest for the 5.5
  -- warning to catch — which is the behaviour worth demonstrating.
  update responsibilities set person_name = 'Dilan', phone = '0779999999'
   where wedding_id = v_id and seq <= 4;

  return v_id;
end;
$$;

comment on function public.create_demo_wedding() is
  'Ticket 9.3. A wedding with enough money, guests and progress in it that the '
  'dashboard, the charts and the alerts panel all have something to show. '
  'SECURITY INVOKER: the caller owns it and every insert obeys their own RLS.';

revoke all on function public.create_demo_wedding() from public, anon;
grant execute on function public.create_demo_wedding() to authenticated;
