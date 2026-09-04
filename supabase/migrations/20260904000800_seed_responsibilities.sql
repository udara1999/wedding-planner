-- =============================================================================
-- 20260904000800  seed_wedding copies the responsibility matrix  (ticket 5.5)
-- =============================================================================
-- 000700 added template.responsibilities. Without this the table exists,
-- the content exists, and every wedding gets an empty matrix — which is the
-- shape of the bug ticket 1.4 already produced once, when seed_wedding was
-- fully tested and nothing called it.
--
-- Rewritten in full rather than patched: the whole point of the function is
-- that one place decides what a new wedding starts with, so it should be
-- readable in one piece. Every insert stays ON CONFLICT DO NOTHING against
-- (wedding_id, source_template_id), so re-running adds only what is new and
-- never overwrites an edit.
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
  -- Seeding writes a whole plan, so it is owner-only rather than can_write.
  -- `is not true`, not `not`: app.is_owner returns NULL for a non-member, and
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

  -- Ticket 5.5. The roles are seeded; person_name deliberately is not. An
  -- invented name would defeat the warning that exists to catch its absence.
  insert into responsibilities
    (wedding_id, source_template_id, seq, area, activity,
     responsible, accountable, consulted, informed, sort_order)
  select p_wedding_id, r.id, r.seq, r.area, r.activity,
         r.responsible, r.accountable, r.consulted, r.informed, r.seq
    from template.responsibilities r
   where r.locale = v_locale
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

comment on function public.seed_wedding(uuid, text) is
  'Ticket 1.4, extended by 5.5. Idempotent: every insert is ON CONFLICT DO '
  'NOTHING on (wedding_id, source_template_id), so re-running adds only what '
  'the template has gained and never overwrites an edit. Seeds RACI roles but '
  'not person names — inventing one would defeat the 5.5 warning.';
