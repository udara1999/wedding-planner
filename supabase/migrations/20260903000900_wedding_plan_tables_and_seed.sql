-- =============================================================================
-- 0900  per-wedding plan tables + seed_wedding()  (ticket 1.4)
-- =============================================================================
-- These are the tables template content is copied INTO. The plan schedules the
-- task and checklist UIs in later phases, but 1.4 (seeding) and 1.7 (re-dating)
-- are Phase 1 acceptance criteria and neither means anything without somewhere
-- to seed, so the tables land here.
--
-- Due dates are STORED, not derived, and carry `due_date_overridden`. A view
-- over offset_days could never drift, but it would also stop a couple moving a
-- single task off its template offset; 1.7 recomputes only the rows that have
-- not been overridden.
-- =============================================================================

do $$ begin
  create type task_status as enum
    ('not_started', 'in_progress', 'waiting', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- lookups
-- The user-extensible dropdown values (plan §4.3), copied per wedding so that
-- renaming one cannot affect anybody else's plan.
create table if not exists wedding_lookups (
  id          bigint generated always as identity primary key,
  wedding_id  uuid not null references weddings (id) on delete cascade,
  kind        text not null,
  value       text not null,
  sort_order  int  not null default 0,
  unique (wedding_id, kind, value)
);

-- ---------------------------------------------------------------- tasks
create table if not exists wedding_tasks (
  id                   bigint generated always as identity primary key,
  wedding_id           uuid not null references weddings (id) on delete cascade,
  -- Null for a task the couple added themselves. Postgres treats nulls as
  -- distinct in a unique index, so those are never blocked by the constraint
  -- below — which is what makes re-seeding idempotent without a merge.
  source_template_id   bigint references template.tasks (id) on delete set null,
  seq                  int,
  category             text,
  task                 text not null,
  owner                text,
  priority             task_priority,
  status               task_status not null default 'not_started',
  offset_days          int,
  due_date             date,
  due_date_overridden  boolean not null default false,
  completed_at         timestamptz,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (wedding_id, source_template_id)
);

-- ---------------------------------------------------------------- countdown
create table if not exists wedding_countdown_checks (
  id                   bigint generated always as identity primary key,
  wedding_id           uuid not null references weddings (id) on delete cascade,
  source_template_id   bigint references template.countdown_checks (id) on delete set null,
  seq                  int,
  window_label         text,
  check_text           text not null,
  owner                text,
  offset_days          int,
  due_date             date,
  due_date_overridden  boolean not null default false,
  done                 boolean not null default false,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (wedding_id, source_template_id)
);

create index if not exists wedding_tasks_wedding_due_idx
  on wedding_tasks (wedding_id, due_date);
create index if not exists wedding_countdown_wedding_due_idx
  on wedding_countdown_checks (wedding_id, due_date);

drop trigger if exists wedding_tasks_touch on wedding_tasks;
create trigger wedding_tasks_touch before update on wedding_tasks
  for each row execute function app.touch_updated_at();

drop trigger if exists wedding_countdown_touch on wedding_countdown_checks;
create trigger wedding_countdown_touch before update on wedding_countdown_checks
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------- RLS
-- None of this is money, so membership is the read boundary and write access
-- the write boundary — matching wedding_invitations. Every new table gets its
-- policies in the same migration (plan §7.1).
alter table wedding_lookups            enable row level security;
alter table wedding_tasks              enable row level security;
alter table wedding_countdown_checks   enable row level security;

create policy wedding_lookups_select on wedding_lookups
  for select using (app.is_member(wedding_id));
create policy wedding_lookups_write on wedding_lookups
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy wedding_tasks_select on wedding_tasks
  for select using (app.is_member(wedding_id));
create policy wedding_tasks_write on wedding_tasks
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

create policy wedding_countdown_select on wedding_countdown_checks
  for select using (app.is_member(wedding_id));
create policy wedding_countdown_write on wedding_countdown_checks
  for all using (app.can_write(wedding_id)) with check (app.can_write(wedding_id));

-- ---------------------------------------------------------------- seed_wedding
-- Idempotent by construction: every insert is ON CONFLICT DO NOTHING against
-- (wedding_id, source_template_id), so running it twice adds nothing and — more
-- importantly — never overwrites edits the couple has already made.
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
  if not app.is_owner(p_wedding_id) then
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
