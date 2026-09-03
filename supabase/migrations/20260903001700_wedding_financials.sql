-- =============================================================================
-- 1700  v_wedding_financials  (ticket 2.8)
-- =============================================================================
-- The "MONEY" and "WHERE THE MONEY COMES FROM" blocks of 01 START HERE, which
-- the AC says to reproduce exactly. Mapped from the sheet's own formulas:
--
--   D30 Budgeted            = SUM('03 Budget'!E)   budgeted_minor
--   H30 Quoted              = SUM(I)               quoted_minor
--   D31 Negotiated          = SUM(J)               negotiated_minor
--   H31 Actual invoiced     = SUM(K)               actual_minor
--   D32 FORECAST FINAL COST = SUM(L)               forecast_minor
--   H32 Paid to date        = SUM(M)               paid_minor
--   D33 Outstanding         = SUM(N)               outstanding_minor
--   H33 Refundable out      = SUM(O)               refundable_deposits_minor
--   D34 Remaining vs budget = TotalBudget - SUM(L) remaining_against_budget_minor
--   H34 Utilisation         = IFERROR(SUM(L)/TotalBudget, 0)
--   D37/H37 Contributions   = SUM('06 Contributions'!G / !H)
--   D39 Net after gifts     = D32 - D37 - D38
--   H39 Shortfall           = MAX(0, D39 - H37 - H38)
--
-- D38/H38 are cash gifts from guests, which live in 09 Guests — a Phase 4
-- table that does not exist yet. They are present as zeros so the shape and
-- the two derived rows are right now, and Phase 4 has one place to change.
--
-- NOTE, deliberate: contributions are viewer-scoped. Ticket 2.7 confines a
-- family member to their own contribution row, so for them these two figures
-- are their own pledge rather than the household total. That is the policy
-- working, not a bug — but it means the number is not the same for every
-- reader, which is worth knowing before it appears on a dashboard.
-- =============================================================================

create or replace view v_wedding_financials
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
  coalesce(b.refundable_deposits_minor, 0)          as refundable_deposits_minor,

  -- Not floored: being over budget is information, and clamping it at zero
  -- would hide exactly the case a couple needs to see.
  w.total_budget_minor - coalesce(b.forecast_minor, 0)
                                                    as remaining_against_budget_minor,

  -- The sheet's IFERROR: a wedding with no budget set yet is 0% used, not an
  -- error. Cast to numeric so this is a ratio and not integer division.
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
-- weddings itself is readable by every member, including a coordinator, so
-- without this the view would hand them total_budget_minor. The columns living
-- on `weddings` remain reachable directly — see the note in the plan.
where app.can_see_money(w.id);

comment on view v_wedding_financials is
  'Ticket 2.8. The 01 START HERE money block. Cash-gift figures are zero until '
  'Phase 4 creates 09 Guests. Contributions are viewer-scoped by ticket 2.7, so '
  'a family member sees their own pledge rather than the household total.';
