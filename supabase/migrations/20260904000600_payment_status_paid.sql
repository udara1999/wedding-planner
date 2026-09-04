-- =============================================================================
-- 20260904000600  a payment with no invoice recorded is still paid
-- =============================================================================
-- Reported: recording a final payment left it showing as "draft".
--
-- The six-state rule from plan §4.2 opens with:
--
--   when amount_due_minor = 0 then 'draft'
--
-- which reads as "nothing has been raised yet, so this is a stub". That is
-- true when the row is genuinely empty. It is wrong the moment someone records
-- money that has actually left their account, which is the common case: paying
-- the photographer in cash and typing the amount into "paid" is a complete
-- record of a payment. There was never an invoice to put in "due".
--
-- The rule now distinguishes those two:
--
--   due = 0 and paid = 0  ->  draft   (a stub, nothing recorded)
--   due = 0 and paid > 0  ->  paid    (money moved; no invoice was raised)
--
-- Everything else is unchanged: paid >= due is still paid, and the date-based
-- states still only apply while something is outstanding.
--
-- Worth naming what the old behaviour cost, because it is not just a wrong
-- label. `draft` is how the payments screen and every filter describe a row
-- that does not count yet, so a real payment was being presented as one that
-- had not happened.
-- =============================================================================

drop view if exists v_payments;

create view v_payments
with (security_invoker = true) as
select pm.*,
       greatest(pm.amount_due_minor - pm.amount_paid_minor, 0) as balance_minor,
       (case
          -- Nothing entered at all. The only genuine draft.
          when pm.amount_due_minor = 0 and pm.amount_paid_minor = 0 then 'draft'
          -- Covers both "paid in full against an invoice" and "paid with no
          -- invoice recorded", since paid >= 0 always holds when due is 0.
          when pm.amount_paid_minor >= pm.amount_due_minor    then 'paid'
          when pm.due_date is null                            then 'not_due'
          when pm.due_date <  current_date                    then 'overdue'
          when pm.due_date <= current_date + 7                then 'due'
          when pm.due_date <= current_date + 30               then 'due_soon'
          else 'not_due'
        end)::payment_status as status
  from payments pm;

comment on view v_payments is
  'Ticket 2.5, corrected 4.x. balance_minor is floored at zero: an overpayment '
  'is not a negative balance. status derives from current_date, so it cannot be '
  'stored. A row is draft only when nothing has been entered — money recorded '
  'as paid with no invoice raised is paid, not a draft. vendor_id comes from '
  'the column, which the trigger keeps equal to the budget line''s vendor '
  'whenever the line names one.';
