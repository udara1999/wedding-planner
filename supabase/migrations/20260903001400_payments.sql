-- =============================================================================
-- 1400  payments + v_payments, and v_budget_lines  (tickets 2.5, rest of 2.2)
-- =============================================================================
-- Why status is a view and not a column: it depends on current_date, which is
-- STABLE, not IMMUTABLE. Postgres will not accept it in a generated column, and
-- that is the right answer — a row's status changes as time passes without
-- anybody touching it. Storing it would mean a nightly job to keep it honest.
-- =============================================================================

-- A state machine the UI branches on, so an enum (plan §4.3). Values are the
-- workbook's PayStage list. PayMethod stays free text: it is a user-extensible
-- lookup, and renaming "Online" must not break a query.
do $$ begin
  create type payment_stage as enum (
    'booking_deposit', 'advance', 'progress_payment', 'final_payment',
    'extra_overtime', 'refundable_deposit', 'refund_received');
exception when duplicate_object then null; end $$;

-- The six states of ticket 2.5, as an enum so the generated client types are a
-- union rather than bare text.
do $$ begin
  create type payment_status as enum
    ('draft', 'paid', 'overdue', 'due', 'due_soon', 'not_due');
exception when duplicate_object then null; end $$;

create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  wedding_id          uuid not null references weddings (id) on delete cascade,
  -- A payment outlives the budget line it was raised against: losing the line
  -- must not erase the fact that money moved.
  budget_line_id      uuid references budget_lines (id) on delete set null,
  -- Phase 3 creates `vendors` and adds the foreign key.
  vendor_id           uuid,
  code                text,
  raised_on           date not null default current_date,
  stage               payment_stage,
  amount_due_minor    bigint not null default 0 check (amount_due_minor >= 0),
  due_date            date,
  amount_paid_minor   bigint not null default 0 check (amount_paid_minor >= 0),
  paid_on             date,
  method              text,
  reference           text,
  refundable          boolean not null default false,
  -- 2.10 fills receipt_path with a Storage object path; the workbook's
  -- "Receipt kept where" is the paper equivalent and stays useful.
  receipt_path        text,
  receipt_location    text,
  paid_by             text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (wedding_id, code)
);

create index if not exists payments_wedding_due_idx on payments (wedding_id, due_date);
create index if not exists payments_budget_line_idx on payments (budget_line_id);

drop trigger if exists payments_touch on payments;
create trigger payments_touch before update on payments
  for each row execute function app.touch_updated_at();

-- Money, so reads are can_see_money and not is_member: a coordinator must
-- never see an amount (plan §4.6).
alter table payments enable row level security;

create policy payments_select on payments
  for select using (app.can_see_money(wedding_id));
create policy payments_write on payments
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- v_payments
create or replace view v_payments
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
  'Ticket 2.5. balance_minor is floored at zero: an overpayment is not a negative '
  'balance. status is derived from current_date, so it cannot be a stored column.';

-- ---------------------------------------------------------------- v_budget_lines
-- The other half of ticket 2.2, which had to wait for `payments` to exist.
-- security_invoker matters twice over here: it applies budget_lines' policies
-- to the caller, and it also means the payments subquery is filtered by the
-- caller's own access rather than summing rows they cannot see.
create or replace view v_budget_lines
with (security_invoker = true) as
select bl.*,
       coalesce(p.paid_minor, 0)                                  as paid_minor,
       greatest(bl.forecast_minor - coalesce(p.paid_minor, 0), 0) as outstanding_minor,
       bl.forecast_minor - bl.budgeted_minor                      as variance_minor
  from budget_lines bl
  left join (select budget_line_id, sum(amount_paid_minor) as paid_minor
               from payments
              where budget_line_id is not null
              group by budget_line_id) p
    on p.budget_line_id = bl.id;

-- ---------------------------------------------------------------- v_budget_by_category
-- Recreated rather than replaced: `create or replace view` cannot add columns.
-- Now built on v_budget_lines so paid and outstanding roll up too.
drop view if exists v_budget_by_category;
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
       sum(bl.budgeted_minor)                          as budgeted_minor,
       sum(bl.forecast_minor)                          as forecast_minor,
       sum(bl.paid_minor)                              as paid_minor,
       sum(bl.outstanding_minor)                       as outstanding_minor,
       sum(bl.forecast_minor) - sum(bl.budgeted_minor) as variance_minor
  from v_budget_lines bl
  join budget_categories bc on bc.id = bl.category_id
 group by bl.wedding_id, bc.id, bc.key, bc.label, bc.sort_order;

comment on view v_budget_by_category is
  'Tickets 2.2 / 2.9. budgeted_minor sums every line; forecast_minor zeroes '
  'not-applicable ones. The §4.2 golden fixture asserts 905,500 / 735,500 here.';
