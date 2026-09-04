-- =============================================================================
-- 20260904001500  reconciliation and entitlement  (tickets 9.1, 9.4)
-- =============================================================================
-- 9.1 asks for "true cost, net cost, cost per guest". Those three phrases hide
-- three decisions, and the point of putting them in a view is that they get
-- made once.
--
--   TRUE COST is the final bill: what has actually left the account, plus what
--   is still owed on payments already raised. Not the forecast — a forecast is
--   a plan, and after the wedding nobody wants the plan.
--
--   NET COST is the true cost less the money that came in: contributions
--   received and gifts received. RECEIVED, not agreed or expected. Before the
--   wedding a pledge is useful for planning; afterwards it is either in the
--   account or it is not.
--
--   COST PER GUEST divides by the heads who actually came, and is NULL when
--   nobody has. Dividing by invited heads flatters the number, and dividing by
--   zero to produce zero would report a free wedding.
--
-- Refundable deposits are reported separately rather than netted off. Until a
-- deposit is actually back it is money the couple does not have, and quietly
-- subtracting it makes the closure figure optimistic in exactly the weeks
-- somebody is chasing it.
-- =============================================================================

create or replace view v_reconciliation
with (security_invoker = true) as
select w.id                                                as wedding_id,
       w.currency,
       w.total_budget_minor,

       coalesce(p.spent_minor, 0)                          as spent_minor,
       coalesce(p.still_to_pay_minor, 0)                   as still_to_pay_minor,
       coalesce(p.spent_minor, 0) + coalesce(p.still_to_pay_minor, 0)
                                                           as true_cost_minor,

       -- Raised but never settled, and the wedding is over. Distinct from
       -- still_to_pay, which includes what is simply not due yet.
       coalesce(p.overdue_minor, 0)                        as overdue_minor,

       -- Still out with somebody. Reported, never netted off.
       coalesce(b.refundable_out_minor, 0)                 as refundable_out_minor,

       coalesce(c.received_minor, 0)                       as contributions_received_minor,
       coalesce(g.received_minor, 0)                       as gifts_received_minor,

       coalesce(p.spent_minor, 0) + coalesce(p.still_to_pay_minor, 0)
         - coalesce(c.received_minor, 0)
         - coalesce(g.received_minor, 0)                   as net_cost_minor,

       coalesce(hc.attending, 0)                           as guests_attending,

       -- Null rather than zero when nobody came: a wedding with no guests has
       -- no cost per guest, and reporting 0 would read as free.
       case when coalesce(hc.attending, 0) = 0 then null
            else (coalesce(p.spent_minor, 0) + coalesce(p.still_to_pay_minor, 0))
                   / hc.attending
       end                                                 as cost_per_guest_minor,

       case when coalesce(hc.attending, 0) = 0 then null
            else (coalesce(p.spent_minor, 0) + coalesce(p.still_to_pay_minor, 0)
                    - coalesce(c.received_minor, 0)
                    - coalesce(g.received_minor, 0)) / hc.attending
       end                                                 as net_per_guest_minor,

       -- What the plan said, kept alongside so the two can be compared. This
       -- is the number that earns or loses trust in the whole exercise.
       coalesce(b.forecast_minor, 0)                       as forecast_minor,
       coalesce(p.spent_minor, 0) + coalesce(p.still_to_pay_minor, 0)
         - coalesce(b.forecast_minor, 0)                   as variance_to_forecast_minor,

       coalesce(cl.total, 0)                               as closure_tasks,
       coalesce(cl.done, 0)                                as closure_done
  from weddings w
  left join (
    select wedding_id,
           sum(amount_paid_minor)                                    as spent_minor,
           sum(greatest(amount_due_minor - amount_paid_minor, 0))     as still_to_pay_minor,
           sum(greatest(amount_due_minor - amount_paid_minor, 0))
             filter (where status = 'overdue')                        as overdue_minor
      from v_payments
     group by wedding_id
  ) p on p.wedding_id = w.id
  left join (
    select wedding_id,
           sum(forecast_minor)             as forecast_minor,
           sum(refundable_deposit_minor)   as refundable_out_minor
      from v_budget_lines
     group by wedding_id
  ) b on b.wedding_id = w.id
  left join (
    select wedding_id, sum(received_minor) as received_minor
      from contributions group by wedding_id
  ) c on c.wedding_id = w.id
  left join (
    select wedding_id, sum(gift_received_minor) as received_minor
      from guests group by wedding_id
  ) g on g.wedding_id = w.id
  left join (
    select wedding_id,
           sum(total_attending) filter (where rsvp_status = 'accepted') as attending
      from guests group by wedding_id
  ) hc on hc.wedding_id = w.id
  left join (
    select wedding_id,
           count(*)                                        as total,
           count(*) filter (where status = 'completed')     as done
      from closure_tasks
     where applicability <> 'not_applicable'
     group by wedding_id
  ) cl on cl.wedding_id = w.id
 where app.can_see_money(w.id);

comment on view v_reconciliation is
  'Ticket 9.1. True cost is the final bill — spent plus still owed — not the '
  'forecast, because after the wedding nobody wants the plan. Net cost '
  'subtracts only money RECEIVED, not pledged. Cost per guest divides by heads '
  'who came and is null when none did. Refundable deposits are reported, never '
  'netted off: until one is back it is money the couple does not have.';

-- =============================================================================
-- 9.4  entitlement, without a payment provider
-- =============================================================================
-- The ticket is "Billing (Stripe via Edge Function) — free until 30 days out;
-- paid thereafter (pricing TBD — see D3)".
--
-- D3 is still open, and taking a payment needs an account that belongs to
-- whoever runs this. So what is built here is the half that does not depend on
-- either: the entitlement model, and the view that answers "does this wedding
-- need to have paid yet". Charging is a matter of writing one row into
-- wedding_billing, whether that comes from Stripe, a bank transfer, or a
-- friend being given it for free.
--
-- Deliberately NOT built: anything that blocks access. A couple locked out of
-- their own timeline nine days before the wedding because a card expired is a
-- disaster the product cannot recover from, and choosing what to degrade is a
-- decision for whoever sets the price.
-- =============================================================================

do $$ begin
  create type billing_state as enum ('free_window', 'due', 'paid', 'comped', 'lapsed');
exception when duplicate_object then null; end $$;

create table if not exists wedding_billing (
  wedding_id     uuid primary key references weddings (id) on delete cascade,
  state          billing_state not null default 'free_window',
  plan           text,
  amount_minor   bigint not null default 0 check (amount_minor >= 0),
  currency       text,
  paid_at        timestamptz,
  -- Whatever the provider calls it. Text because it might be a Stripe payment
  -- intent, a bank reference, or a note saying "waived, first ten couples".
  reference      text,
  notes          text,
  updated_at     timestamptz not null default now()
);

alter table wedding_billing enable row level security;

-- Readable by the couple, written by nobody through the API. Money changing
-- hands is recorded by whatever took it — an Edge Function with the service
-- role key, or a human with psql — never by the browser.
create policy wedding_billing_select on wedding_billing
  for select using (app.is_owner(wedding_id) or app.role_in(wedding_id) = 'partner');

revoke all on wedding_billing from anon, authenticated;
grant select on wedding_billing to authenticated;

drop trigger if exists wedding_billing_touch on wedding_billing;
create trigger wedding_billing_touch before update on wedding_billing
  for each row execute function app.touch_updated_at();

comment on table wedding_billing is
  'Ticket 9.4. One row per wedding once it has been charged or comped. Not '
  'writable through the API: whatever takes the money records it with the '
  'service role. D3 (pricing) is still open, so nothing here enforces payment.';

/** The free window the ticket names: paid from 30 days out. */
create or replace view v_entitlement
with (security_invoker = true) as
select w.id                                        as wedding_id,
       (w.wedding_date - current_date)             as days_to_go,
       b.state,
       b.plan,
       b.paid_at,

       -- Free while the wedding is more than 30 days away, or has no date yet.
       -- A couple who have not chosen a date are still deciding whether to use
       -- this at all.
       (w.wedding_date is null or (w.wedding_date - current_date) > 30) as in_free_window,

       coalesce(b.state in ('paid', 'comped'), false)                   as settled,

       -- The only question a caller needs: is money owed today. Both halves
       -- matter — inside the window nothing is owed however unpaid, and
       -- outside it nothing is owed once settled.
       (not (w.wedding_date is null or (w.wedding_date - current_date) > 30)
          and not coalesce(b.state in ('paid', 'comped'), false))       as payment_due
  from weddings w
  left join wedding_billing b on b.wedding_id = w.id
 where app.is_member(w.id);

comment on view v_entitlement is
  'Ticket 9.4. Whether a wedding owes money today: free beyond 30 days out or '
  'with no date set, otherwise until wedding_billing says paid or comped. '
  'Nothing consumes this to restrict access — see the migration header for why '
  'locking a couple out nine days before their wedding is not a feature.';
