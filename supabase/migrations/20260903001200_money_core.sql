-- =============================================================================
-- 1200  the money core: budget categories and lines  (ticket 2.1)
-- =============================================================================
-- Schema per plan §4.2. Two things there are load-bearing:
--
--   forecast_minor CAN be a stored generated column: the expression only reads
--   columns of its own row and is immutable. paid_minor CANNOT — it aggregates
--   payments — and payment status cannot either, because it depends on
--   current_date, which is STABLE, not IMMUTABLE. Those live in views.
--
--   All money is integer MINOR units (plan R5). Nothing here is numeric or
--   float, and the extractor converts with Decimal rather than multiplying.
-- =============================================================================

-- Only the three the Budget sheet actually uses. The workbook's Applicability
-- list also carries "Completed", which conflates applicability with status —
-- the very confusion plan §4.3 warns against — so status carries that instead.
do $$ begin
  create type applicability as enum ('required', 'optional', 'not_applicable');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- template side
create table if not exists template.budget_categories (
  id          bigint generated always as identity primary key,
  locale      text not null references template.locales (code) on delete cascade,
  key         text not null,
  label       text not null,
  sort_order  int  not null,
  unique (locale, key)
);

create table if not exists template.budget_lines (
  id              bigint generated always as identity primary key,
  locale          text not null references template.locales (code) on delete cascade,
  code            text not null,
  category_key    text not null,
  name            text not null,
  applicability   applicability not null default 'required',
  payer           text,
  budgeted_minor  bigint not null default 0 check (budgeted_minor >= 0),
  sort_order      int    not null,
  unique (locale, code),
  foreign key (locale, category_key)
    references template.budget_categories (locale, key) on delete cascade
);

alter table template.budget_categories enable row level security;
alter table template.budget_lines      enable row level security;

-- ---------------------------------------------------------------- per wedding
create table if not exists budget_categories (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings (id) on delete cascade,
  key         text not null,
  label       text not null,
  sort_order  int  not null default 0,
  unique (wedding_id, key)
);

create table if not exists budget_lines (
  id                        uuid primary key default gen_random_uuid(),
  wedding_id                uuid not null references weddings (id) on delete cascade,
  category_id               uuid references budget_categories (id) on delete set null,
  source_template_id        bigint references template.budget_lines (id) on delete set null,
  code                      text,
  name                      text not null,
  applicability             applicability not null default 'required',
  payer                     text,
  -- Phase 3 creates `vendors` and adds the foreign key; until then this is a
  -- plain column rather than a dangling reference.
  vendor_id                 uuid,
  budgeted_minor            bigint not null default 0 check (budgeted_minor >= 0),
  quoted_minor              bigint not null default 0 check (quoted_minor >= 0),
  negotiated_minor          bigint not null default 0 check (negotiated_minor >= 0),
  actual_minor              bigint not null default 0 check (actual_minor >= 0),
  refundable_deposit_minor  bigint not null default 0 check (refundable_deposit_minor >= 0),
  status                    task_status not null default 'not_started',
  notes                     text,
  sort_order                int not null default 0,

  -- The single definition of "what will this actually cost". Stored, so every
  -- reader agrees and no caller can forget the precedence.
  forecast_minor bigint generated always as (
    case when applicability = 'not_applicable' then 0
         when actual_minor     > 0 then actual_minor
         when negotiated_minor > 0 then negotiated_minor
         when quoted_minor     > 0 then quoted_minor
         else budgeted_minor end
  ) stored,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (wedding_id, code),
  unique (wedding_id, source_template_id)
);

create index if not exists budget_lines_wedding_category_idx
  on budget_lines (wedding_id, category_id);

drop trigger if exists budget_lines_touch on budget_lines;
create trigger budget_lines_touch before update on budget_lines
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- RLS
-- This is money, so the read boundary is can_see_money, NOT is_member: a
-- coordinator is a full member with day-of access and must still never see a
-- number (plan §4.6). Writing stays with the couple.
alter table budget_categories enable row level security;
alter table budget_lines      enable row level security;

create policy budget_categories_select on budget_categories
  for select using (app.can_see_money(wedding_id));
create policy budget_categories_write on budget_categories
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy budget_lines_select on budget_lines
  for select using (app.can_see_money(wedding_id));
create policy budget_lines_write on budget_lines
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- v_budget_by_category
-- security_invoker is essential, not decoration. A view runs as its OWNER by
-- default, which is postgres here — that bypasses RLS on budget_lines entirely
-- and would hand a coordinator the whole budget through the view while the
-- table itself denied them. With it, the policies above apply to the caller.
--
-- paid/outstanding are absent on purpose: they aggregate `payments`, which
-- ticket 2.5 creates. v_budget_lines joins them once that table exists.
create or replace view v_budget_by_category
with (security_invoker = true) as
select bl.wedding_id,
       bc.id                                        as category_id,
       bc.key                                       as category_key,
       bc.label                                     as category_label,
       bc.sort_order,
       count(*)                                     as line_count,
       count(*) filter (where bl.applicability = 'not_applicable')
                                                    as not_applicable_count,
       sum(bl.budgeted_minor)                       as budgeted_minor,
       sum(bl.forecast_minor)                       as forecast_minor,
       sum(bl.forecast_minor) - sum(bl.budgeted_minor) as variance_minor
  from budget_lines bl
  join budget_categories bc on bc.id = bl.category_id
 group by bl.wedding_id, bc.id, bc.key, bc.label, bc.sort_order;

comment on view v_budget_by_category is
  'Ticket 2.2 (partial). budgeted_minor sums every line; forecast_minor zeroes '
  'not-applicable ones. The §4.2 golden fixture asserts 905,500 / 735,500 here.';

-- ---------------------------------------------------------------- seed_wedding
-- Extended to copy the budget as well.
create or replace function public.seed_wedding(
  p_wedding_id uuid,
  p_locale     text default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_locale       text;
  v_version      int;
  v_wedding_date date;
  v_inserted     int := 0;
  n              int;
begin
  -- Seeding writes a whole plan, so it is owner-only rather than can_write.
  --
  -- `is not true` rather than `not ...`: for a non-member the helper used to
  -- return NULL, and `not NULL` is NULL, so the IF never fired and the guard
  -- passed silently. The helpers are fixed below, but the guard is written to
  -- be correct even if one ever returns NULL again.
  if app.is_owner(p_wedding_id) is not true then
    raise exception 'Only an owner can seed a wedding';
  end if;

  select coalesce(p_locale, w.tradition), w.wedding_date
    into v_locale, v_wedding_date
    from weddings w
   where w.id = p_wedding_id;

  if v_locale is null then
    raise exception 'Wedding % not found', p_wedding_id;
  end if;

  select l.version into v_version from template.locales l where l.code = v_locale;
  if v_version is null then
    raise exception 'Unknown template locale %', v_locale;
  end if;

  insert into wedding_lookups (wedding_id, kind, value, sort_order)
  select p_wedding_id, l.kind, l.value, l.sort_order
    from template.lookups l
   where l.locale = v_locale
  on conflict (wedding_id, kind, value) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into wedding_tasks
    (wedding_id, source_template_id, seq, category, task, owner, priority,
     offset_days, due_date)
  select p_wedding_id, t.id, t.seq, t.category, t.task, t.owner_default, t.priority,
         t.offset_days,
         case when v_wedding_date is null then null
              else v_wedding_date + t.offset_days end
    from template.tasks t
   where t.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into wedding_countdown_checks
    (wedding_id, source_template_id, seq, window_label, check_text, owner,
     offset_days, due_date)
  select p_wedding_id, c.id, c.seq, c.window_label, c.check_text, c.owner_default,
         c.offset_days,
         case when v_wedding_date is null then null
              else v_wedding_date + c.offset_days end
    from template.countdown_checks c
   where c.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Budget: categories first, so the lines can be joined onto them by key.
  insert into budget_categories (wedding_id, key, label, sort_order)
  select p_wedding_id, c.key, c.label, c.sort_order
    from template.budget_categories c
   where c.locale = v_locale
  on conflict (wedding_id, key) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into budget_lines
    (wedding_id, category_id, source_template_id, code, name, applicability,
     payer, budgeted_minor, sort_order)
  select p_wedding_id, bc.id, tl.id, tl.code, tl.name, tl.applicability,
         tl.payer, tl.budgeted_minor, tl.sort_order
    from template.budget_lines tl
    join budget_categories bc
      on bc.wedding_id = p_wedding_id and bc.key = tl.category_key
   where tl.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Snapshot what this plan was built from (plan R4), so a later content
  -- change is visible rather than silently assumed.
  update weddings
     set template_locale  = v_locale,
         template_version = v_version
   where id = p_wedding_id;

  return v_inserted;
end;
$$;
revoke all on function public.seed_wedding(uuid, text) from public, anon;
grant execute on function public.seed_wedding(uuid, text) to authenticated;
