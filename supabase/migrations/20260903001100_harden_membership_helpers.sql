-- =============================================================================
-- 1100  membership helpers must not return NULL
-- =============================================================================
-- Found by the pgTAP gate: a coordinator successfully seeded a wedding they
-- were not a member of.
--
-- app.role_in() returns NULL for a non-member, so `role_in(w) = 'owner'`
-- evaluated to NULL rather than false. In an RLS USING clause that is safe —
-- NULL is not true, so the row is filtered — which is why every tenancy
-- assertion passed and no data ever leaked. In PL/pgSQL it is not safe:
--
--     if not app.is_owner(x) then raise ... end if;   -- not NULL -> NULL
--
-- The IF simply does not fire, and the guard is bypassed. Any procedural guard
-- written against these helpers had the same hole, so they are fixed here
-- rather than at the one call site that exposed it.
--
-- The four below are the ones using `=` or `in`. is_member() and
-- can_see_ops() use `is not null` and already returned a real boolean;
-- can_see_guest_side() ends in `else false`, and a CASE treats a NULL
-- condition as unmatched, so it was safe too.
-- =============================================================================

create or replace function app.is_owner(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) = 'owner', false)
$$;

create or replace function app.can_write(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) in ('owner', 'partner'), false)
$$;

create or replace function app.can_see_money(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) in ('owner', 'partner', 'family'), false)
$$;

create or replace function app.can_write_ops(w uuid)
returns boolean language sql stable as $$
  select coalesce(app.role_in(w) in ('owner', 'partner', 'coordinator'), false)
$$;

-- ---------------------------------------------------------------- seed_wedding
-- Recreated with a guard that holds even against a NULL.
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

  -- Snapshot what this plan was built from (plan R4), so a later content
  -- change is visible rather than silently assumed.
  update weddings
     set template_locale  = v_locale,
         template_version = v_version
   where id = p_wedding_id;

  return v_inserted;
end;
$$;
