-- =============================================================================
-- 1900  vendors and the comparison tables  (tickets 3.1, 3.2, 3.3, 3.6)
-- =============================================================================
-- Schema per plan §4.4. Vendor categories are deliberately NOT an enum: §4.3
-- lists them among the user-extensible values, and a couple hiring something
-- the workbook never imagined should not need a migration.
-- =============================================================================

-- The booking pipeline from 00 Lists' VendorStatus. Code branches on this
-- (the board groups by it), so it is a state machine and an enum.
do $$ begin
  create type vendor_status as enum (
    'researching', 'shortlisted', 'negotiating', 'tentatively_booked',
    'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- The four groups 05a asks its questions in. The ordering IS the product —
-- money first, then what is included, then logistics, then risk.
do $$ begin
  create type vendor_question_group as enum ('money', 'included', 'logistics', 'risk');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- vendors
create table if not exists vendors (
  id                       uuid primary key default gen_random_uuid(),
  wedding_id               uuid not null references weddings (id) on delete cascade,
  code                     text,
  category                 text not null,
  name                     text not null,
  contact_name             text,
  phone                    text,
  whatsapp                 text,
  email                    citext,
  address                  text,
  package                  text,

  quoted_minor             bigint not null default 0 check (quoted_minor >= 0),
  negotiated_minor         bigint not null default 0 check (negotiated_minor >= 0),
  deposit_paid_minor       bigint not null default 0 check (deposit_paid_minor >= 0),

  contract_signed          boolean not null default false,
  contract_location        text,
  contract_path            text,
  status                   vendor_status not null default 'researching',

  -- Day-of operations. A coordinator needs these and must not see the money
  -- above, which is what v_vendors_ops exists for.
  arrival_time             time,
  setup_done_by            time,
  finish_time              time,
  overtime_rate            text,
  key_deliverables         text,
  final_confirmation_date  date,

  rating                   int check (rating between 1 and 5),
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (wedding_id, code)
);

create index if not exists vendors_wedding_status_idx on vendors (wedding_id, status);

drop trigger if exists vendors_touch on vendors;
create trigger vendors_touch before update on vendors
  for each row execute function app.touch_updated_at();

-- The foreign keys promised when budget_lines and payments were created.
alter table budget_lines drop constraint if exists budget_lines_vendor_id_fkey;
alter table budget_lines
  add constraint budget_lines_vendor_id_fkey
  foreign key (vendor_id) references vendors (id) on delete set null;

alter table payments drop constraint if exists payments_vendor_id_fkey;
alter table payments
  add constraint payments_vendor_id_fkey
  foreign key (vendor_id) references vendors (id) on delete set null;

-- ---------------------------------------------------------------- template questions
-- Global and versioned, never copied per wedding (plan §4.4): the questions are
-- the same for everyone, and a wedding's answers point at them by id.
create table if not exists template.vendor_questions (
  id              bigint generated always as identity primary key,
  locale          text not null references template.locales (code) on delete cascade,
  category_key    text not null,
  category_label  text not null,
  "group"         vendor_question_group not null,
  seq             int not null,
  question        text not null,
  why_it_matters  text,
  unique (locale, category_key, seq)
);

alter table template.vendor_questions enable row level security;

-- ---------------------------------------------------------------- options
-- "Not capped at 3" (ticket 3.3). The workbook only had room for A, B and C;
-- nothing here does.
create table if not exists vendor_options (
  id                uuid primary key default gen_random_uuid(),
  wedding_id        uuid not null references weddings (id) on delete cascade,
  category_key      text not null,
  label             text not null,
  vendor_name       text,
  contact_name      text,
  phone             text,
  package           text,
  quoted_minor      bigint not null default 0 check (quoted_minor >= 0),
  negotiated_minor  bigint not null default 0 check (negotiated_minor >= 0),
  deposit_minor     bigint not null default 0 check (deposit_minor >= 0),
  met_or_visited    boolean not null default false,
  rating            int check (rating between 1 and 5),
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists vendor_options_wedding_category_idx
  on vendor_options (wedding_id, category_key);

drop trigger if exists vendor_options_touch on vendor_options;
create trigger vendor_options_touch before update on vendor_options
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- answers
create table if not exists vendor_answers (
  wedding_id   uuid not null references weddings (id) on delete cascade,
  option_id    uuid not null references vendor_options (id) on delete cascade,
  question_id  bigint not null references template.vendor_questions (id) on delete cascade,
  answer       text,
  notes        text,
  updated_at   timestamptz not null default now(),
  primary key (option_id, question_id)
);

drop trigger if exists vendor_answers_touch on vendor_answers;
create trigger vendor_answers_touch before update on vendor_answers
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- decisions
create table if not exists vendor_decisions (
  wedding_id          uuid not null references weddings (id) on delete cascade,
  category_key        text not null,
  chosen_option_id    uuid references vendor_options (id) on delete set null,
  decided_on          date,
  -- Closes the loop back to `vendors` (ticket 3.6): a decision is only really
  -- made once it exists as a booked vendor.
  recorded_vendor_id  uuid references vendors (id) on delete set null,
  updated_at          timestamptz not null default now(),
  primary key (wedding_id, category_key)
);

drop trigger if exists vendor_decisions_touch on vendor_decisions;
create trigger vendor_decisions_touch before update on vendor_decisions
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- RLS
-- Vendors carry prices, so the base table is money-visibility. The coordinator
-- reaches them through v_vendors_ops below instead.
alter table vendors          enable row level security;
alter table vendor_options   enable row level security;
alter table vendor_answers   enable row level security;
alter table vendor_decisions enable row level security;

create policy vendors_select on vendors
  for select using (app.can_see_money(wedding_id));
create policy vendors_write on vendors
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy vendor_options_select on vendor_options
  for select using (app.can_see_money(wedding_id));
create policy vendor_options_write on vendor_options
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy vendor_answers_select on vendor_answers
  for select using (app.can_see_money(wedding_id));
create policy vendor_answers_write on vendor_answers
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy vendor_decisions_select on vendor_decisions
  for select using (app.can_see_money(wedding_id));
create policy vendor_decisions_write on vendor_decisions
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- v_vendors_ops
-- Plan §4.6, option 2: the coordinator's vendor screen reads this, not the base
-- table. It lists names, phones and times and NO money at all.
--
-- Deliberately NOT security_invoker. As invoker it would read `vendors` under
-- that caller's policies and return a coordinator nothing, which defeats the
-- purpose. Running as owner means this WHERE clause is the entire boundary —
-- so it is `can_see_ops`, and every money column is simply absent from the
-- select list rather than nulled out.
create or replace view v_vendors_ops as
select v.id,
       v.wedding_id,
       v.category,
       v.name,
       v.contact_name,
       v.phone,
       v.whatsapp,
       v.status,
       v.arrival_time,
       v.setup_done_by,
       v.finish_time,
       v.key_deliverables,
       v.final_confirmation_date
  from vendors v
 where app.can_see_ops(v.wedding_id);

comment on view v_vendors_ops is
  'Ticket 3.1 / plan §4.6. The day-of view of a vendor: who they are, how to '
  'reach them, when they arrive. No prices, because a coordinator must never '
  'see money. Runs as owner, so its WHERE clause is the whole boundary.';

-- ---------------------------------------------------------------- v_vendor_decisions
-- Reproduces the 05a index: options entered, the decision, the chosen vendor,
-- the agreed price, and whether it has been written back into `vendors` yet.
create or replace view v_vendor_decisions
with (security_invoker = true) as
select o.wedding_id,
       o.category_key,
       count(o.id)                                   as options_entered,
       d.chosen_option_id,
       chosen.label                                  as chosen_label,
       chosen.vendor_name                            as chosen_vendor_name,
       coalesce(nullif(chosen.negotiated_minor, 0), chosen.quoted_minor)
                                                     as agreed_price_minor,
       d.decided_on,
       d.recorded_vendor_id,
       (d.recorded_vendor_id is not null)            as recorded_in_vendors
  from vendor_options o
  left join vendor_decisions d
    on d.wedding_id = o.wedding_id and d.category_key = o.category_key
  left join vendor_options chosen on chosen.id = d.chosen_option_id
 group by o.wedding_id, o.category_key, d.chosen_option_id, chosen.label,
          chosen.vendor_name, chosen.negotiated_minor, chosen.quoted_minor,
          d.decided_on, d.recorded_vendor_id;
