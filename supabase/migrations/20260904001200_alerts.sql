-- =============================================================================
-- 20260904001200  v_alerts  (tickets 7.1, 7.2)
-- =============================================================================
-- Plan §7.1, unusually forceful about this one: "7.1 is the product's daily
-- hook. Building the warnings as 23 hand-written client queries would be the
-- single worst decision available. One view, one component, one place to add
-- the 24th."
--
-- So: one view, 23 rows per wedding, every one of them the workbook's own
-- warning from the ATTENTION REQUIRED panel of "02 Dashboard" — same wording,
-- same severities, same time gates.
--
-- SHAPE
--
-- Every alert is emitted for every wedding, always, with a count. It would be
-- easy to emit only the ones that are firing, and that would be worse: a
-- dashboard that can say "nothing overdue" is telling you something, and a
-- dashboard that simply omits the row leaves you wondering whether it checked.
-- `active` is the column to filter on.
--
-- TIME GATES (7.2)
--
-- Four of the workbook's warnings say when they apply, in their own text:
-- packing inside 14 days, procurement inside 45, unreturned jewellery and
-- missed photographs after the day. A packing alert 300 days out is noise, and
-- noise on this panel is fatal — the whole thing works only if it is read every
-- time, and it is only read every time if everything on it is worth reading.
--
-- COUNTS ARE COMPUTED ONCE
--
-- One CTE per source table, then a lateral VALUES list that turns those
-- numbers into 23 rows. The naive shape — 23 subqueries unioned — would scan
-- payments four times and vendors five.
-- =============================================================================

do $$ begin
  create type alert_severity as enum ('critical', 'high', 'medium', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type alert_gate as enum ('always', 'inside_45', 'inside_14', 'after');
exception when duplicate_object then null; end $$;

create or replace view v_alerts
with (security_invoker = true) as
with base as (
  select w.id as wedding_id,
         w.wedding_date,
         w.total_budget_minor,
         -- Negative after the wedding, null when no date is set. A wedding with
         -- no date has no "inside 14 days", so its gated alerts stay shut.
         (w.wedding_date - current_date) as days_to_go
    from weddings w
),
pay as (
  select wedding_id,
         count(*) filter (where status = 'overdue')                           as overdue,
         count(*) filter (where status in ('due', 'due_soon'))                as due_soon,
         count(*) filter (
           where status = 'paid' and receipt_path is null
             and coalesce(btrim(receipt_location), '') = ''
         )                                                                    as no_receipt
    from v_payments
   group by wedding_id
),
ven as (
  select wedding_id,
         count(*) filter (where status <> 'confirmed')                        as unconfirmed,
         count(*) filter (where not contract_signed)                          as no_contract,
         count(*) filter (where coalesce(btrim(phone), '') = '')              as no_phone,
         count(*) filter (where arrival_time is null)                         as no_arrival
    from vendors
   group by wedding_id
),
dec as (
  select wedding_id,
         -- A decision is only really made once it exists as a booked vendor
         -- (ticket 3.6). recorded_vendor_id is that link.
         count(*) filter (
           where chosen_option_id is not null and recorded_vendor_id is null
         )                                                                    as unrecorded
    from vendor_decisions
   group by wedding_id
),
tsk as (
  select wedding_id,
         count(*) filter (
           where status not in ('completed', 'cancelled')
             and due_date is not null and due_date < current_date
         )                                                                    as overdue,
         count(*) filter (
           where status not in ('completed', 'cancelled')
             and due_date is not null
             and due_date between current_date and current_date + 7
         )                                                                    as this_week,
         count(*) filter (
           where status not in ('completed', 'cancelled')
             and priority = 'critical'
             and due_date is not null and due_date <= current_date + 30
         )                                                                    as critical_soon,
         count(*) filter (
           where status not in ('completed', 'cancelled')
             and coalesce(btrim(owner), '') = ''
         )                                                                    as no_owner
    from wedding_tasks
   group by wedding_id
),
gst as (
  select wedding_id,
         count(*) filter (where rsvp_status in ('pending', 'no_response'))    as no_reply,
         count(*) filter (where rsvp_status = 'accepted' and table_id is null) as unseated,
         count(*) filter (where side is null)                                  as no_side
    from guests
   group by wedding_id
),
seat as (
  select wedding_id, count(*) filter (where over_capacity) as over_capacity
    from v_seating_tables
   group by wedding_id
),
bud as (
  select wedding_id,
         count(*) filter (
           where applicability <> 'not_applicable' and forecast_minor > budgeted_minor
         )                                                                    as over_line,
         coalesce(sum(forecast_minor), 0)                                     as forecast
    from v_budget_lines
   group by wedding_id
),
leg as (
  select wedding_id,
         count(*) filter (
           where verify_status = 'to_verify' and applicability <> 'not_applicable'
         )                                                                    as to_verify
    from legal_requirements
   group by wedding_id
),
jew as (
  select wedding_id, count(*) filter (where overdue_return) as unreturned
    from v_jewellery_custody
   group by wedding_id
),
proc as (
  select wedding_id,
         count(*) filter (
           where applicability <> 'not_applicable' and not bought
         )                                                                    as not_bought,
         count(*) filter (
           where applicability <> 'not_applicable' and needed_on_day and not packed
         )                                                                    as not_packed
    from procurement_items
   group by wedding_id
),
shot as (
  select wedding_id,
         count(*) filter (
           where applicability <> 'not_applicable' and priority = 'Must' and not captured
         )                                                                    as missed
    from shot_list_items
   group by wedding_id
)
select b.wedding_id,
       a.code,
       a.severity::alert_severity,
       a.count::bigint,
       a.message,
       -- Relative to /w/:weddingId, so the client prefixes once. Ticket 7.5:
       -- every one of these lands on the screen already filtered.
       a.deep_link,
       a.gate::alert_gate,
       a.sort_order::int,
       b.days_to_go,

       -- Whether the gate is open at all today, independent of the count.
       (case a.gate
          when 'always'    then true
          when 'inside_45' then b.days_to_go is not null
                                and b.days_to_go >= 0 and b.days_to_go <= 45
          when 'inside_14' then b.days_to_go is not null
                                and b.days_to_go >= 0 and b.days_to_go <= 14
          when 'after'     then b.days_to_go is not null and b.days_to_go < 0
        end)                                                     as gate_open,

       -- What the dashboard filters on: something to say, and the right moment
       -- to say it.
       (a.count > 0 and (case a.gate
          when 'always'    then true
          when 'inside_45' then b.days_to_go is not null
                                and b.days_to_go >= 0 and b.days_to_go <= 45
          when 'inside_14' then b.days_to_go is not null
                                and b.days_to_go >= 0 and b.days_to_go <= 14
          when 'after'     then b.days_to_go is not null and b.days_to_go < 0
        end))                                                    as active

  from base b
  left join pay  on pay.wedding_id  = b.wedding_id
  left join ven  on ven.wedding_id  = b.wedding_id
  left join dec  on dec.wedding_id  = b.wedding_id
  left join tsk  on tsk.wedding_id  = b.wedding_id
  left join gst  on gst.wedding_id  = b.wedding_id
  left join seat on seat.wedding_id = b.wedding_id
  left join bud  on bud.wedding_id  = b.wedding_id
  left join leg  on leg.wedding_id  = b.wedding_id
  left join jew  on jew.wedding_id  = b.wedding_id
  left join proc on proc.wedding_id = b.wedding_id
  left join shot on shot.wedding_id = b.wedding_id

  -- The 23 warnings, in the workbook's own order and wording. Adding the 24th
  -- means adding a line here, which is the whole point of doing it this way.
  cross join lateral (values
    ( 1, 'payment_overdue',      'critical', coalesce(pay.overdue, 0),
      'Vendor payments are overdue',
      'payments?status=overdue', 'always'),
    ( 2, 'payment_due_soon',     'high',     coalesce(pay.due_soon, 0),
      'Vendor payments fall due in the next 30 days',
      'payments?status=due', 'always'),
    ( 3, 'vendor_unconfirmed',   'high',     coalesce(ven.unconfirmed, 0),
      'Vendors are not yet confirmed',
      'vendors?status=researching', 'always'),
    ( 4, 'vendor_no_contract',   'high',     coalesce(ven.no_contract, 0),
      'Vendors have no signed contract recorded',
      'vendors?contract=missing', 'always'),
    ( 5, 'vendor_no_phone',      'medium',   coalesce(ven.no_phone, 0),
      'Vendors have no phone number — you cannot reach them on the day',
      'vendors?phone=missing', 'always'),
    ( 6, 'vendor_no_arrival',    'medium',   coalesce(ven.no_arrival, 0),
      'Vendors have no arrival time set',
      'vendors?arrival=missing', 'always'),
    ( 7, 'task_overdue',         'critical', coalesce(tsk.overdue, 0),
      'Tasks are overdue',
      'tasks?view=overdue', 'always'),
    ( 8, 'task_this_week',       'high',     coalesce(tsk.this_week, 0),
      'Tasks are due today or this week',
      'tasks?view=this_week', 'always'),
    ( 9, 'task_critical_soon',   'high',     coalesce(tsk.critical_soon, 0),
      'Critical tasks due within 30 days are still not finished',
      'tasks?view=next_month', 'always'),
    (10, 'task_no_owner',        'medium',   coalesce(tsk.no_owner, 0),
      'Tasks have nobody responsible — assign an owner',
      'tasks?owner=nobody', 'always'),
    (11, 'guest_no_reply',       'high',     coalesce(gst.no_reply, 0),
      'Households were invited but have not replied',
      'guests?status=pending', 'always'),
    (12, 'guest_unseated',       'high',     coalesce(gst.unseated, 0),
      'Confirmed guests have no table assigned',
      'seating', 'always'),
    (13, 'table_over_capacity',  'critical', coalesce(seat.over_capacity, 0),
      'Tables are over capacity — people will have nowhere to sit',
      'seating', 'always'),
    (14, 'guest_no_side',        'low',      coalesce(gst.no_side, 0),
      'Households have no side recorded',
      'guests?side=none', 'always'),
    (15, 'budget_line_over',     'medium',   coalesce(bud.over_line, 0),
      'Budget lines are forecast to come in over their budgeted amount',
      'budget?over=1', 'always'),
    (16, 'forecast_over_budget', 'critical',
      case when b.total_budget_minor > 0
                and coalesce(bud.forecast, 0) > b.total_budget_minor
           then 1 else 0 end,
      'The forecast final cost now exceeds your total budget',
      'budget', 'always'),
    (17, 'payment_no_receipt',   'low',      coalesce(pay.no_receipt, 0),
      'Payments marked paid have no receipt recorded',
      'payments?status=paid', 'always'),
    (18, 'legal_to_verify',      'high',     coalesce(leg.to_verify, 0),
      'Registration items still need confirming with your registrar',
      'm/legal', 'always'),
    (19, 'jewellery_unreturned', 'critical', coalesce(jew.unreturned, 0),
      'Rented jewellery has not been returned',
      'm/jewellery', 'after'),
    (20, 'procurement_unbought', 'medium',   coalesce(proc.not_bought, 0),
      'Items on the procurement list still have not been bought',
      'm/procurement', 'inside_45'),
    (21, 'procurement_unpacked', 'high',     coalesce(proc.not_packed, 0),
      'Items needed on the day are still not packed',
      'm/procurement', 'inside_14'),
    (22, 'shot_missed',          'low',      coalesce(shot.missed, 0),
      'Must-have photographs were not ticked off',
      'm/shots', 'after'),
    (23, 'decision_unrecorded',  'high',     coalesce(dec.unrecorded, 0),
      'Vendor decisions were made on the comparison but never recorded',
      'compare', 'always')
  ) as a(sort_order, code, severity, count, message, deep_link, gate)

 where app.is_member(b.wedding_id);

comment on view v_alerts is
  'Tickets 7.1 and 7.2. All 23 warnings from the workbook''s ATTENTION '
  'REQUIRED panel, in its wording and its severities. Every alert is emitted '
  'for every wedding whether or not it fires: a panel that can say "nothing '
  'overdue" is saying something, and one that omits the row leaves you '
  'wondering whether it looked. Filter on `active`, which is a count above '
  'zero AND an open time gate — a packing warning 300 days out is noise, and '
  'noise here is fatal, because the panel only works if it is read every time.';
