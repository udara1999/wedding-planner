-- =============================================================================
-- 20260904002200  a new wedding's timeline starts from its own ceremony time
-- =============================================================================
-- 002100 gave the template its offsets, added the trigger, and repaired the
-- weddings that already existed. This is the third case: a wedding created from
-- now on.
--
-- seed_wedding was copying template.timeline_events.starts_at straight across,
-- so a couple who entered a 17:30 ceremony still got a day built around 19:00
-- until they changed the time and back again to fire the trigger. Seeding has
-- to compute the time the same way the trigger does — which is why 002100 put
-- that arithmetic in app.timeline_time rather than writing it inline.
--
-- Only the timeline insert changes; the rest is unchanged from 001800 and is
-- restated because this function is the one place that decides what a new
-- wedding starts with, and it should be readable in one piece.
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
  v_locale        text;
  v_version       int;
  v_wedding_date  date;
  v_ceremony_time time;
  v_inserted      int := 0;
  n               int;
begin
  if app.is_owner(p_wedding_id) is not true then
    raise exception 'Only an owner can seed a wedding';
  end if;

  select coalesce(p_locale, w.tradition), w.wedding_date, w.ceremony_time
    into v_locale, v_wedding_date, v_ceremony_time
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

  -- THE CHANGE. starts_at is computed from this wedding's own ceremony time
  -- rather than copied from the template's 19:00, through the same helper the
  -- retime trigger uses so the two can never disagree.
  insert into timeline_events
    (wedding_id, source_template_id, seq, phase, offset_minutes, starts_at,
     duration_minutes, name, who, location, applicability, notes, sort_order)
  select p_wedding_id, t.id, t.seq, t.phase, t.offset_minutes,
         app.timeline_time(v_ceremony_time, t.offset_minutes, v_locale),
         t.duration_minutes, t.name, t.who, t.location, t.applicability,
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
  'Ticket 1.4, completed by 1.3 and corrected by the ceremony-time work. The '
  'one place that decides what a new wedding starts with. Dates come from '
  'offset_days and the wedding date; timeline times from offset_minutes and '
  'the ceremony time. Idempotent throughout.';
