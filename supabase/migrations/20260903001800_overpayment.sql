-- =============================================================================
-- 1800  make overpayment visible
-- =============================================================================
-- v_budget_lines floors outstanding at zero, which is right — an overpayment is
-- not a negative amount owed. But it meant paying more than a line forecasts
-- showed as "nothing outstanding" and the excess appeared nowhere at all.
--
-- overpaid_minor is the other half of that floor. Keeping both means neither
-- number lies: outstanding never goes negative, and money paid beyond the
-- forecast is stated rather than swallowed.
--
-- The three views are dropped and recreated together because each one's column
-- list changes, and create-or-replace cannot do that.
-- =============================================================================

drop view if exists v_wedding_financials;
drop view if exists v_budget_by_category;
drop view if exists v_budget_lines;

create view v_budget_lines
with (security_invoker = true) as
select bl.*,
       coalesce(p.paid_minor, 0)                                  as paid_minor,
       greatest(bl.forecast_minor - coalesce(p.paid_minor, 0), 0) as outstanding_minor,
       greatest(coalesce(p.paid_minor, 0) - bl.forecast_minor, 0) as overpaid_minor,
       bl.forecast_minor - bl.budgeted_minor                      as variance_minor
  from budget_lines bl
  left join (select budget_line_id, sum(amount_paid_minor) as paid_minor
               from payments
              where budget_line_id is not null
              group by budget_line_id) p
    on p.budget_line_id = bl.id;

comment on view v_budget_lines is
  'outstanding_minor and overpaid_minor are the two halves of the same '
  'comparison: a line is either still owed money or has had too much paid '
  'against it, never both, and never a negative.';

create view v_budget_by_category
with (security_invoker = true) as
select bl.wedding_id,
       bc.id                                           as category_id,
       bc.key                                          as category_key,
       bc.label                                        as category_label,
       bc.sort_order,
       count(*)                                        as line_count,
       count(*) filter (where bl.applicability = 'not_applicable')
                                                       as not_applicable_count,
       count(*) filter (where bl.overpaid_minor > 0)   as overpaid_count,
       sum(bl.budgeted_minor)                          as budgeted_minor,
       sum(bl.forecast_minor)                          as forecast_minor,
       sum(bl.paid_minor)                              as paid_minor,
       sum(bl.outstanding_minor)                       as outstanding_minor,
       sum(bl.overpaid_minor)                          as overpaid_minor,
       sum(bl.forecast_minor) - sum(bl.budgeted_minor) as variance_minor
  from v_budget_lines bl
  join budget_categories bc on bc.id = bl.category_id
 group by bl.wedding_id, bc.id, bc.key, bc.label, bc.sort_order;

comment on view v_budget_by_category is
  'Tickets 2.2 / 2.9. budgeted_minor sums every line; forecast_minor zeroes '
  'not-applicable ones. The §4.2 golden fixture asserts 905,500 / 735,500 here.';

create view v_wedding_financials
with (security_invoker = true) as
select
  w.id                                              as wedding_id,
  w.currency,
  w.total_budget_minor,
  w.contingency_pct,
  w.guest_buffer_pct,

  coalesce(b.budgeted_minor, 0)                     as budgeted_minor,
  coalesce(b.quoted_minor, 0)                       as quoted_minor,
  coalesce(b.negotiated_minor, 0)                   as negotiated_minor,
  coalesce(b.actual_minor, 0)                       as actual_minor,
  coalesce(b.forecast_minor, 0)                     as forecast_minor,
  coalesce(b.paid_minor, 0)                         as paid_minor,
  coalesce(b.outstanding_minor, 0)                  as outstanding_minor,
  coalesce(b.overpaid_minor, 0)                     as overpaid_minor,
  coalesce(b.refundable_deposits_minor, 0)          as refundable_deposits_minor,

  -- Not floored: being over budget is information, and clamping it at zero
  -- would hide exactly the case a couple needs to see.
  w.total_budget_minor - coalesce(b.forecast_minor, 0)
                                                    as remaining_against_budget_minor,

  case when w.total_budget_minor = 0 then 0::numeric
       else round(coalesce(b.forecast_minor, 0)::numeric
                    / w.total_budget_minor::numeric, 4)
  end                                               as budget_utilisation,

  coalesce(c.contributions_agreed_minor, 0)         as contributions_agreed_minor,
  coalesce(c.contributions_received_minor, 0)       as contributions_received_minor,

  -- Phase 4 (09 Guests) replaces these two.
  0::bigint                                         as expected_gifts_minor,
  0::bigint                                         as gifts_received_minor,

  coalesce(b.forecast_minor, 0)
    - coalesce(c.contributions_agreed_minor, 0)
    - 0                                             as net_cost_after_gifts_minor,

  greatest(
    coalesce(b.forecast_minor, 0)
      - coalesce(c.contributions_agreed_minor, 0)
      - 0
      - coalesce(c.contributions_received_minor, 0)
      - 0,
    0)                                              as shortfall_minor

from weddings w
left join (
  select wedding_id,
         sum(budgeted_minor)           as budgeted_minor,
         sum(quoted_minor)             as quoted_minor,
         sum(negotiated_minor)         as negotiated_minor,
         sum(actual_minor)             as actual_minor,
         sum(forecast_minor)           as forecast_minor,
         sum(paid_minor)               as paid_minor,
         sum(outstanding_minor)        as outstanding_minor,
         sum(overpaid_minor)           as overpaid_minor,
         sum(refundable_deposit_minor) as refundable_deposits_minor
    from v_budget_lines
   group by wedding_id
) b on b.wedding_id = w.id
left join (
  select wedding_id,
         sum(agreed_minor)   as contributions_agreed_minor,
         sum(received_minor) as contributions_received_minor
    from contributions
   group by wedding_id
) c on c.wedding_id = w.id
where app.can_see_money(w.id);

comment on view v_wedding_financials is
  'Ticket 2.8. The 01 START HERE money block. Cash-gift figures are zero until '
  'Phase 4 creates 09 Guests. Contributions are viewer-scoped by ticket 2.7, so '
  'a family member sees their own pledge rather than the household total.';
