-- =============================================================================
-- 20260904001900  what a wedding is missing from the template  (risk R4)
-- =============================================================================
-- Reported: the 414 checklist rows are seeded and the modules are still empty.
-- Correct, and the omission is mine.
--
-- seed_wedding only ever INSERTS, and it runs once, when a wedding is created.
-- Everything added to the template afterwards — which today is the 414
-- checklist rows, and before that the ceremony, the registration checklist, the
-- timeline and the contingencies — reaches new weddings and no existing one.
--
-- Plan risk R4 names this exactly: "Template drift — improving the question
-- bank doesn't reach existing weddings. Mitigation: snapshot template_version
-- on seed; later add an opt-in 'pull new items' diff screen." The snapshot was
-- built in 1.4. The pull never was, and until now there was no way to know
-- anything was missing.
--
-- This is the counting half. Re-running seed_wedding is already safe — every
-- insert is ON CONFLICT DO NOTHING on (wedding_id, source_template_id), so it
-- adds only what is new and cannot touch an edit — but nobody presses a button
-- that does not say what it will do.
-- =============================================================================

-- Every template row this wedding already has from the checklist content, in
-- one place. The fourteen module tables all reference the same template table,
-- so a union here means the pending count below is one NOT EXISTS rather than
-- fourteen.
create or replace view v_seeded_checklist_ids
with (security_invoker = true) as
            select wedding_id, source_template_id from attire_items
  union all select wedding_id, source_template_id from jewellery_items
  union all select wedding_id, source_template_id from beauty_appointments
  union all select wedding_id, source_template_id from decor_items
  union all select wedding_id, source_template_id from menu_items
  union all select wedding_id, source_template_id from cake_items
  union all select wedding_id, source_template_id from transport_legs
  union all select wedding_id, source_template_id from accommodations
  union all select wedding_id, source_template_id from shot_list_items
  union all select wedding_id, source_template_id from procurement_items
  union all select wedding_id, source_template_id from wedding_party
  union all select wedding_id, source_template_id from contacts
  union all select wedding_id, source_template_id from closure_tasks
  union all select wedding_id, source_template_id from lessons;

comment on view v_seeded_checklist_ids is
  'Risk R4. Which template.checklist_items rows a wedding already holds, '
  'across all fourteen module tables.';

create or replace view v_template_pending
with (security_invoker = true) as
with base as (
  select w.id                                             as wedding_id,
         coalesce(w.template_locale, w.tradition)          as locale,
         w.template_version                                as seeded_version
    from weddings w
   where app.is_member(w.id)
)
select b.wedding_id,
       b.locale,
       b.seeded_version,
       l.version                                           as available_version,

       (select count(*) from template.tasks t
         where t.locale = b.locale
           and not exists (select 1 from wedding_tasks x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as tasks,

       (select count(*) from template.countdown_checks t
         where t.locale = b.locale
           and not exists (select 1 from wedding_countdown_checks x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as countdown,

       (select count(*) from template.responsibilities t
         where t.locale = b.locale
           and not exists (select 1 from responsibilities x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as responsibilities,

       (select count(*) from template.ceremony_steps t
         where t.locale = b.locale
           and not exists (select 1 from ceremony_steps x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as ceremony,

       (select count(*) from template.legal_requirements t
         where t.locale = b.locale
           and not exists (select 1 from legal_requirements x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as legal,

       (select count(*) from template.timeline_events t
         where t.locale = b.locale
           and not exists (select 1 from timeline_events x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as timeline,

       (select count(*) from template.risks t
         where t.locale = b.locale
           and not exists (select 1 from risks x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as risks,

       (select count(*) from template.checklist_items t
         where t.locale = b.locale
           and not exists (select 1 from v_seeded_checklist_ids x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as checklists,

       (select count(*) from template.budget_lines t
         where t.locale = b.locale
           and not exists (select 1 from budget_lines x
                            where x.wedding_id = b.wedding_id
                              and x.source_template_id = t.id))          as budget_lines

  from base b
  left join template.locales l on l.code = b.locale;

comment on view v_template_pending is
  'Risk R4. How many template rows a wedding has not got yet, per source. '
  'Zero everywhere means the wedding is level with the template. Re-running '
  'seed_wedding brings the rest in and cannot alter anything already there.';

-- The content genuinely changed today, so the version moves. An existing
-- wedding keeps the version it was seeded at, which is what makes the
-- difference visible rather than something a couple has to guess at.
insert into template.locales (code, label, language, tradition, version)
values ('poruwa', 'Poruwa (Sinhala Buddhist)', 'en', 'poruwa', 2)
on conflict (code) do update set version = excluded.version;
