-- =============================================================================
-- 20260904000100  a payment can name its vendor — under one rule
-- =============================================================================
-- Migration 2400 dropped payments.vendor_id because it was a second path from a
-- payment to a vendor, and two paths can disagree: a payment tagged to vendor A
-- whose budget line points at vendor B is unanswerable. That reasoning still
-- holds. What it missed is a real case:
--
--   * a payment with no budget line at all (budget_line_id is nullable), and
--   * a payment whose budget line names no vendor — "album printing" is
--     budgeted, but nothing says who is printing it.
--
-- Both are money leaving the couple's account for a vendor, and neither could
-- be attributed. The vendor screen therefore under-reported, which is worse
-- than the redundancy that was removed.
--
-- The column comes back, but NOT as a second path. It is the same single path
-- with a documented precedence, enforced by triggers so it cannot drift:
--
--   THE BUDGET LINE'S VENDOR WINS. If the line names a vendor, the payment is
--   attributed to it. Only when the line names none — or there is no line —
--   does the payment's own choice apply.
--
-- The column is therefore always the answer, never a competing opinion, and
-- v_payments can read it directly instead of resolving a join at read time.
-- =============================================================================

alter table payments
  add column if not exists vendor_id uuid references vendors (id) on delete set null;

create index if not exists payments_vendor_idx
  on payments (vendor_id) where vendor_id is not null;

comment on column payments.vendor_id is
  'Who was paid. Maintained by payments_apply_vendor_rule: the budget line''s '
  'vendor wins, and this is only the payment''s own choice when the line names '
  'no vendor or there is no line. Never write it expecting it to survive a '
  'line that disagrees.';

-- ---------------------------------------------------------------- the rule
-- Applied on the payment side: whatever anyone writes, the stored value obeys
-- the precedence above. A client that sends a stale or wrong vendor cannot
-- create a contradiction; it is simply corrected.
create or replace function app.payments_apply_vendor_rule()
returns trigger language plpgsql as $$
declare
  v_line_vendor uuid;
begin
  if new.budget_line_id is not null then
    select vendor_id into v_line_vendor from budget_lines where id = new.budget_line_id;
    if v_line_vendor is not null then
      new.vendor_id := v_line_vendor;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_vendor_rule on payments;
create trigger payments_vendor_rule
  before insert or update of budget_line_id, vendor_id on payments
  for each row execute function app.payments_apply_vendor_rule();

-- Applied on the budget-line side: re-linking a line to a different vendor has
-- to carry its payments with it, or the rule would hold only at write time.
--
-- The WHERE clause is the careful part. When the line gains a vendor, that
-- vendor wins for every payment on the line — unconditionally, because that is
-- the rule. When the line's vendor is CLEARED, only the payments that were
-- following the line are cleared with it: a payment carrying some other vendor
-- was only able to do so because the line named none, so it was that payment's
-- own choice and is left alone.
create or replace function app.budget_lines_cascade_vendor()
returns trigger language plpgsql as $$
begin
  update payments p
     set vendor_id = new.vendor_id
   where p.budget_line_id = new.id
     and (new.vendor_id is not null
          or p.vendor_id is not distinct from old.vendor_id);
  return null;
end;
$$;

drop trigger if exists budget_lines_vendor_cascade on budget_lines;
create trigger budget_lines_vendor_cascade
  after update of vendor_id on budget_lines
  for each row when (old.vendor_id is distinct from new.vendor_id)
  execute function app.budget_lines_cascade_vendor();

-- Existing rows predate the column, so bring them under the rule once.
update payments p
   set vendor_id = bl.vendor_id
  from budget_lines bl
 where bl.id = p.budget_line_id
   and bl.vendor_id is not null
   and p.vendor_id is distinct from bl.vendor_id;

-- ---------------------------------------------------------------- v_payments
drop view if exists v_payments;

create view v_payments
with (security_invoker = true) as
select pm.*,
       greatest(pm.amount_due_minor - pm.amount_paid_minor, 0) as balance_minor,
       (case
          when pm.amount_due_minor = 0                        then 'draft'
          when pm.amount_paid_minor >= pm.amount_due_minor    then 'paid'
          when pm.due_date is null                            then 'not_due'
          when pm.due_date <  current_date                    then 'overdue'
          when pm.due_date <= current_date + 7                then 'due'
          when pm.due_date <= current_date + 30               then 'due_soon'
          else 'not_due'
        end)::payment_status as status
  from payments pm;

comment on view v_payments is
  'Ticket 2.5. balance_minor is floored at zero: an overpayment is not a '
  'negative balance. status derives from current_date, so it cannot be stored. '
  'vendor_id now comes from the column, which the trigger keeps equal to the '
  'budget line''s vendor whenever the line names one.';

-- ------------------------------------------------------- v_vendor_financials
-- Rebuilt around two independent aggregates rather than one join.
--
-- Summing budget lines and payments in a single grouped query multiplies them
-- together: a vendor with 3 lines and 4 payments would count every line four
-- times. Two lateral subqueries keep each total honest, which matters more here
-- than anywhere else in the app — these are the figures the couple use to
-- decide whether a vendor has been paid.
-- Dropped rather than replaced: the column list is reordered, and
-- `create or replace view` cannot rename a column in place.
drop view if exists v_vendor_financials;

create view v_vendor_financials
with (security_invoker = true) as
select v.id         as vendor_id,
       v.wedding_id,

       lines.budget_line_count,
       lines.budgeted_minor,
       lines.forecast_minor,
       lines.overpaid_minor,

       pay.payment_count,
       pay.paid_minor,
       -- Raised but not yet settled. Distinct from outstanding_minor below,
       -- which is what the plan says is still to come whether or not anyone has
       -- raised a payment for it yet.
       pay.due_minor,
       pay.next_due_date,
       pay.last_paid_on,
       -- Money paid to this vendor that no budget line accounts for. A nonzero
       -- value is the question "what was this for?", surfaced rather than
       -- quietly folded into a total.
       pay.unbudgeted_paid_minor,

       greatest(lines.forecast_minor - pay.paid_minor, 0) as outstanding_minor,

       -- What the vendor themselves quoted, negotiated price winning.
       coalesce(nullif(v.negotiated_minor, 0), v.quoted_minor) as vendor_price_minor,

       -- Allocated minus quoted. Positive means the lines add up to more than
       -- the vendor asked for; negative means something they will charge for is
       -- not in the budget yet. Zero is the happy case, and a vendor with no
       -- linked lines simply reads as the negative of their quote.
       lines.forecast_minor
         - coalesce(nullif(v.negotiated_minor, 0), v.quoted_minor) as allocation_gap_minor

  from vendors v

  cross join lateral (
    select count(*)                                as budget_line_count,
           coalesce(sum(bl.budgeted_minor), 0)     as budgeted_minor,
           coalesce(sum(bl.forecast_minor), 0)     as forecast_minor,
           coalesce(sum(bl.overpaid_minor), 0)     as overpaid_minor
      from v_budget_lines bl
     where bl.vendor_id = v.id
  ) lines

  cross join lateral (
    select count(*)                                    as payment_count,
           coalesce(sum(pm.amount_paid_minor), 0)      as paid_minor,
           coalesce(sum(greatest(pm.amount_due_minor - pm.amount_paid_minor, 0)), 0)
                                                       as due_minor,
           min(pm.due_date) filter (
             where pm.amount_paid_minor < pm.amount_due_minor
           )                                           as next_due_date,
           max(pm.paid_on) filter (
             where pm.amount_paid_minor > 0
           )                                           as last_paid_on,
           coalesce(sum(pm.amount_paid_minor) filter (
             where pm.budget_line_id is null
           ), 0)                                       as unbudgeted_paid_minor
      from payments pm
     where pm.vendor_id = v.id
  ) pay;

comment on view v_vendor_financials is
  'What a vendor costs and what has actually been paid them. Planned figures '
  'come from the budget lines they fulfil; paid figures come from the payments '
  'attributed to them, which includes payments no budget line covers. The two '
  'are separate lateral aggregates so neither multiplies the other.';
