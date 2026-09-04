-- =============================================================================
-- 20260904001800  seed_wedding calls the checklist seeder
-- =============================================================================
-- The previous migration created 414 rows of content and a function to map it.
-- Nothing called that function, which is the exact shape of the bug ticket 1.4
-- already produced once in this project: seed_wedding was fully tested and
-- nothing invoked it, so every wedding came out empty and it took the user
-- opening the app to notice. Assertions that call a function directly prove the
-- function, never that anything uses it.
--
-- So this is one line in seed_wedding, and a pgTAP assertion on the COUNT OF
-- ROWS IN A WEDDING rather than on the seeder's return value — because the
-- second would pass again if the call were removed.
-- =============================================================================

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
  -- `is not true`, not `not`: app.is_owner returns NULL for a non-member and
  -- `if not NULL then` never fires (see 20260903001100).
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
    from template.lookups l where l.locale = v_locale
  on conflict (wedding_id, kind, value) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into wedding_tasks
    (wedding_id, source_template_id, seq, category, task, owner, priority,
     offset_days, due_date)
  select p_wedding_id, t.id, t.seq, t.category, t.task, t.owner_default, t.priority,
         t.offset_days,
         case when v_wedding_date is null then null else v_wedding_date + t.offset_days end
    from template.tasks t where t.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into wedding_countdown_checks
    (wedding_id, source_template_id, seq, window_label, check_text, owner,
     offset_days, due_date)
  select p_wedding_id, c.id, c.seq, c.window_label, c.check_text, c.owner_default,
         c.offset_days,
         case when v_wedding_date is null then null else v_wedding_date + c.offset_days end
    from template.countdown_checks c where c.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into responsibilities
    (wedding_id, source_template_id, seq, area, activity,
     responsible, accountable, consulted, informed, sort_order)
  select p_wedding_id, r.id, r.seq, r.area, r.activity,
         r.responsible, r.accountable, r.consulted, r.informed, r.seq
    from template.responsibilities r where r.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into ceremony_steps
    (wedding_id, source_template_id, seq, name, applicability, location, leads,
     items_needed, duration_minutes, sort_order)
  select p_wedding_id, c.id, c.seq, c.component, c.applicability, c.location,
         c.leads, c.items_needed, c.duration_minutes, c.seq
    from template.ceremony_steps c where c.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into legal_requirements
    (wedding_id, source_template_id, seq, name, applicability, owner, notes,
     authority, verify_status, offset_days, due_date, sort_order)
  select p_wedding_id, l.id, l.seq, l.requirement, l.applicability, l.responsible,
         l.documents, l.authority, l.verify_status, l.offset_days,
         case when v_wedding_date is null or l.offset_days is null then null
              else v_wedding_date + l.offset_days end,
         l.seq
    from template.legal_requirements l where l.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into timeline_events
    (wedding_id, source_template_id, seq, phase, starts_at, duration_minutes,
     name, who, location, applicability, notes, sort_order)
  select p_wedding_id, t.id, t.seq, t.phase, t.starts_at, t.duration_minutes,
         t.name, t.who, t.location, t.applicability,
         case when t.vendor_hint is null then null
              else 'Template suggests: ' || t.vendor_hint end,
         t.seq
    from template.timeline_events t where t.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  insert into risks
    (wedding_id, source_template_id, seq, area, name, likelihood, impact,
     prevent_by, if_it_happens, owner, who_to_call, sort_order)
  select p_wedding_id, r.id, r.seq, r.area, r.name, r.likelihood, r.impact,
         r.prevent_by, r.if_it_happens, r.owner_default, r.who_to_call, r.seq
    from template.risks r where r.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Ticket 1.3's other half: 414 rows across the fourteen checklist modules.
  -- THE LINE THAT WAS MISSING. Without it the content exists, the mapping
  -- function exists, and every wedding still opens fourteen empty screens.
  v_inserted := v_inserted
    + app.seed_checklist_modules(p_wedding_id, v_locale, v_wedding_date);

  update weddings
     set template_locale  = v_locale,
         template_version = v_version
   where id = p_wedding_id;

  return v_inserted;
end;
$$;

comment on function public.seed_wedding(uuid, text) is
  'Ticket 1.4, completed by 1.3. The one place that decides what a new wedding '
  'starts with. Idempotent: every insert is ON CONFLICT DO NOTHING against '
  '(wedding_id, source_template_id), so re-running adds only what the template '
  'has gained and never overwrites an edit.';
