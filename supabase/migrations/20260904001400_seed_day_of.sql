-- =============================================================================
-- 20260904001400  seeding the day, and 8.3's missing numbers
-- =============================================================================
-- Three things.
--
-- The timeline and the risks join seed_wedding. 56 events and 24 risks is more
-- than anybody types from scratch the week before a wedding, and both are
-- generic enough to be template content.
--
-- The timeline's vendor_hint is deliberately NOT resolved to a vendor_id at
-- seed time. The template says "Decorator"; whether this wedding has a vendor
-- called that, and which row it is, is not knowable when the plan is created.
-- Guessing would attach the wrong vendor to a timeline event, and a wrong
-- vendor on the day-of pack is worse than none — the coordinator rings the
-- number they are given.
--
-- And 8.3: contacts "pulls vendor phones; flags missing numbers".
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

  -- Ticket 8.1. vendor_hint is carried into notes rather than resolved: the
  -- template knows the trade, not this wedding's vendor row.
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

  -- Ticket 8.4. prevention_done stays false: the workbook's whole point is
  -- that agreeing the plan and having done it are different things.
  insert into risks
    (wedding_id, source_template_id, seq, area, name, likelihood, impact,
     prevent_by, if_it_happens, owner, who_to_call, sort_order)
  select p_wedding_id, r.id, r.seq, r.area, r.name, r.likelihood, r.impact,
         r.prevent_by, r.if_it_happens, r.owner_default, r.who_to_call, r.seq
    from template.risks r where r.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  update weddings
     set template_locale  = v_locale,
         template_version = v_version
   where id = p_wedding_id;

  return v_inserted;
end;
$$;

-- ---------------------------------------------------------------- 8.3
-- "Pulls vendor phones; flags missing numbers."
--
-- A union, not a copy. Copying vendor numbers into `contacts` at some moment
-- would leave the sheet stale the first time a vendor changed their phone, and
-- the day-of contact sheet going stale is the specific failure this whole
-- phase exists to prevent. Vendors appear here because they are vendors; the
-- contacts table holds only the people who are not in another table —
-- the venue's night manager, a neighbour with a generator, the couple's
-- parents.
create or replace view v_contact_sheet
with (security_invoker = true) as
select c.wedding_id,
       'contact'::text                        as source,
       c.id::text                             as source_id,
       coalesce(nullif(btrim(c.group_label), ''), 'Other') as group_label,
       c.role,
       c.name,
       c.phone,
       c.backup_phone,
       c.whatsapp,
       (coalesce(btrim(c.phone), '') = '' and coalesce(btrim(c.backup_phone), '') = '')
                                              as no_number,
       c.sort_order
  from contacts c
 where c.applicability <> 'not_applicable'

union all

select o.wedding_id,
       'vendor'::text                         as source,
       o.id::text                             as source_id,
       'Vendors'::text                        as group_label,
       o.category                             as role,
       coalesce(nullif(btrim(o.contact_name), ''), o.name) as name,
       o.phone,
       o.whatsapp                             as backup_phone,
       o.whatsapp,
       (coalesce(btrim(o.phone), '') = '' and coalesce(btrim(o.whatsapp), '') = '')
                                              as no_number,
       1000                                   as sort_order
  from v_vendors_ops o;

comment on view v_contact_sheet is
  'Ticket 8.3. The contacts table unioned with the vendors, rather than vendor '
  'numbers copied into it — a copy goes stale the first time a vendor changes '
  'their phone, and a stale contact sheet on the day is the failure R8 is '
  'about. no_number flags anyone who cannot be rung at all.';
