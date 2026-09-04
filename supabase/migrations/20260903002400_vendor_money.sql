-- =============================================================================
-- 2400  a vendor's money, derived from the budget lines it fulfils
-- =============================================================================
-- Two changes, one principle: money should have exactly one path from a payment
-- to a vendor.
--
--   payment -> budget_line -> vendor
--
-- payments.vendor_id was a second path. Two routes to the same fact can
-- disagree, and nothing can then say which is right — a payment tagged to
-- vendor A while its budget line points at vendor B is unanswerable. Ticket 2.6
-- already requires every payment to have a budget line, so the vendor follows
-- from it and the column is redundant. It was added in 2.5 by me, never written
-- by the UI, and is dropped here rather than left as a trap.
--
-- What is NOT duplication: vendors.quoted_minor / negotiated_minor against the
-- sum of the vendor's budget lines. The first is what the vendor said; the
-- second is how the couple has planned it. A gap between them is information —
-- "you have allocated 450,000 across lines but they quoted 500,000" — so both
-- are kept and the difference is reported as allocation_gap_minor.
-- =============================================================================

drop view if exists v_payments;

alter table payments drop column if exists vendor_id;

-- Recreated with the vendor resolved through the budget line, so the payments
-- list can show a vendor without anyone maintaining a second link.
create view v_payments
with (security_invoker = true) as
select pm.*,
       bl.vendor_id                                            as vendor_id,
       greatest(pm.amount_due_minor - pm.amount_paid_minor, 0)  as balance_minor,
       (case
          when pm.amount_due_minor = 0                        then 'draft'
          when pm.amount_paid_minor >= pm.amount_due_minor    then 'paid'
          when pm.due_date is null                            then 'not_due'
          when pm.due_date <  current_date                    then 'overdue'
          when pm.due_date <= current_date + 7                then 'due'
          when pm.due_date <= current_date + 30               then 'due_soon'
          else 'not_due'
        end)::payment_status as status
  from payments pm
  left join budget_lines bl on bl.id = pm.budget_line_id;

comment on view v_payments is
  'Ticket 2.5. balance_minor is floored at zero: an overpayment is not a '
  'negative balance. status derives from current_date, so it cannot be stored. '
  'vendor_id is resolved through the budget line — the payment does not carry '
  'its own, so the two can never disagree.';

-- ---------------------------------------------------------------- v_vendor_financials
-- What a vendor actually costs, from the lines they fulfil rather than from
-- figures typed twice.
create or replace view v_vendor_financials
with (security_invoker = true) as
select v.id                                                as vendor_id,
       v.wedding_id,
       count(bl.id)                                        as budget_line_count,
       coalesce(sum(bl.budgeted_minor), 0)                 as budgeted_minor,
       coalesce(sum(bl.forecast_minor), 0)                 as forecast_minor,
       coalesce(sum(bl.paid_minor), 0)                     as paid_minor,
       coalesce(sum(bl.outstanding_minor), 0)              as outstanding_minor,
       coalesce(sum(bl.overpaid_minor), 0)                 as overpaid_minor,

       -- What the vendor themselves quoted, negotiated price winning.
       coalesce(nullif(v.negotiated_minor, 0), v.quoted_minor) as vendor_price_minor,

       -- Allocated minus quoted. Positive means the lines add up to more than
       -- the vendor asked for; negative means something they will charge for is
       -- not in the budget yet. Zero is the happy case, and a vendor with no
       -- linked lines simply reads as the negative of their quote.
       coalesce(sum(bl.forecast_minor), 0)
         - coalesce(nullif(v.negotiated_minor, 0), v.quoted_minor)
                                                           as allocation_gap_minor
  from vendors v
  left join v_budget_lines bl on bl.vendor_id = v.id
 group by v.id, v.wedding_id, v.quoted_minor, v.negotiated_minor;

comment on view v_vendor_financials is
  'A vendor total derived from the budget lines it fulfils, never typed twice. '
  'allocation_gap_minor compares what the couple planned against what the '
  'vendor quoted; a non-zero value is a question worth asking, not an error.';

-- Linking a line to a vendor is a frequent lookup once the vendor screen shows
-- its lines.
create index if not exists budget_lines_vendor_idx
  on budget_lines (vendor_id) where vendor_id is not null;
