-- =============================================================================
-- 20260904000500  the gift ledger  (ticket 4.9)
-- =============================================================================
-- Ticket 2.8 left two placeholders and said where they would be filled:
--
--   -- Phase 4 (09 Guests) replaces these two.
--   0::bigint as expected_gifts_minor,
--   0::bigint as gifts_received_minor,
--
-- This is that. The columns have existed on `guests` since 2500 —
-- expected_gift_minor, gift_received_minor, gift_description, thank_you_sent —
-- because a gift belongs to the household that gave it, not to a separate
-- ledger that would then need reconciling against the guest list.
--
-- The workbook's own formulas are kept exactly, oddity included:
--
--   D39 Net after gifts = D32 - D37 - D38   (forecast, agreed, EXPECTED gifts)
--   H39 Shortfall       = MAX(0, D39 - H37 - H38)  (received, RECEIVED gifts)
--
-- Subtracting agreed and then received looks like double counting, and taken
-- as arithmetic it is. It is what 01 START HERE computes, and ticket 2.8's
-- acceptance criterion is "reproduces the START HERE money block exactly", so
-- it is reproduced rather than corrected. Changing it is a product decision
-- about a number the couple already trusts, not a bug fix to make quietly.
--
-- VIEWER SCOPING, same caveat as contributions and for the same reason.
-- `guests` is side-scoped by 4.3: the bride's mother reads bride-side
-- households only. security_invoker means these sums obey that, so for a
-- family member the gift figures are their own side's, not the total. That is
-- the policy working. It does mean the number differs by reader, which is
-- worth knowing before it is put on a dashboard.
-- =============================================================================

-- ------------------------------------------------------------ v_gift_summary
-- One row per wedding, so the ledger screen and the dashboard cannot compute
-- the same total two different ways.
create or replace view v_gift_summary
with (security_invoker = true) as
select g.wedding_id,
       count(*) filter (where g.expected_gift_minor > 0)     as households_expected,
       count(*) filter (where g.gift_received_minor > 0)     as households_received,
       coalesce(sum(g.expected_gift_minor), 0)              as expected_minor,
       coalesce(sum(g.gift_received_minor), 0)              as received_minor,

       -- Only where a gift was expected and less arrived. A household that
       -- gave more than expected must not offset one that gave nothing —
       -- netting them would report "nothing outstanding" while a specific
       -- household still owes a specific amount.
       coalesce(sum(greatest(g.expected_gift_minor - g.gift_received_minor, 0)), 0)
                                                             as still_expected_minor,

       -- The follow-up list: a gift arrived and nobody has been thanked for it.
       count(*) filter (where g.gift_received_minor > 0 and not g.thank_you_sent)
                                                             as thank_yous_pending
  from guests g
 group by g.wedding_id;

comment on view v_gift_summary is
  'Ticket 4.9. still_expected_minor sums per household and never nets a '
  'generous gift against a missing one. Side-scoped for family members, like '
  'every other read of guests.';

-- --------------------------------------------------- v_wedding_financials
-- Recreated with the two placeholders filled. Everything else is unchanged
-- from 1800; the gift join is the only addition.
drop view if exists v_wedding_financials;

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

  -- Ticket 4.9 fills what 2.8 left as zeros.
  coalesce(g.expected_minor, 0)                     as expected_gifts_minor,
  coalesce(g.received_minor, 0)                     as gifts_received_minor,

  coalesce(b.forecast_minor, 0)
    - coalesce(c.contributions_agreed_minor, 0)
    - coalesce(g.expected_minor, 0)                 as net_cost_after_gifts_minor,

  greatest(
    coalesce(b.forecast_minor, 0)
      - coalesce(c.contributions_agreed_minor, 0)
      - coalesce(g.expected_minor, 0)
      - coalesce(c.contributions_received_minor, 0)
      - coalesce(g.received_minor, 0),
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
left join v_gift_summary g on g.wedding_id = w.id
where app.can_see_money(w.id);

comment on view v_wedding_financials is
  'Ticket 2.8, completed by 4.9. The 01 START HERE money block, including the '
  'workbook''s own net-after-gifts and shortfall formulas. Both contributions '
  'and gifts are viewer-scoped — a family member sees their own pledge and '
  'their own side''s gifts — so this number is not the same for every reader.';

-- A gift is recorded against a household while looking at the guest list, so
-- the index that matters is the one the ledger screen filters on.
create index if not exists guests_gift_idx
  on guests (wedding_id)
  where gift_received_minor > 0 or expected_gift_minor > 0;
