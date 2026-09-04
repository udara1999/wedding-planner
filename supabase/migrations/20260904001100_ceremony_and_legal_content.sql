-- =============================================================================
-- 20260904001100  the poruwa ceremony and the registration checklist
-- =============================================================================
-- Tickets 6.4 and 6.5 built the tables and the screens. Empty, they are a
-- shape rather than a product: the ordered poruwa components ARE the ceremony
-- module, and the registrar checklist IS the legal module. This is the content,
-- from sheet "14 Ceremony & Legal".
--
-- Two things the workbook itself asserts, kept as facts to check against:
--
--   * 24 components, of which the required ones total 93 active minutes. The
--     sheet prints "Active minutes: 93" in its own header, so v_ceremony_length
--     has a known-good number to be tested against — the same trick as the
--     905,500 / 735,500 jewellery fixture in ticket 2.9.
--   * The registration items marked VERIFY are the ones plan R10 exists for.
--     They arrive as 'to_verify' and nothing in this app ever moves them to
--     'verified' on its own: only a person who has actually rung the registrar
--     can do that.
--
-- The legal target dates were absolute serials in the sheet, all relative to
-- its own wedding date (serial 46633 = 2027-09-03). They are stored here as
-- offset_days, like tasks, so they re-date when the nekath moves — which is
-- exactly what ticket 1.7 exists for and what a hard-coded date would break.
-- =============================================================================

-- ------------------------------------------------------------- template side
create table if not exists template.ceremony_steps (
  id               bigint generated always as identity primary key,
  locale           text not null references template.locales (code) on delete cascade,
  seq              int  not null,
  component        text not null,
  applicability    applicability not null default 'required',
  location         text,
  leads            text,
  items_needed     text,
  duration_minutes int,
  unique (locale, seq)
);

create table if not exists template.legal_requirements (
  id             bigint generated always as identity primary key,
  locale         text not null references template.locales (code) on delete cascade,
  seq            int  not null,
  requirement    text not null,
  applicability  applicability not null default 'required',
  responsible    text,
  documents      text,
  authority      text,
  offset_days    int,
  verify_status  verify_status not null default 'to_verify',
  unique (locale, seq)
);

grant select on template.ceremony_steps, template.legal_requirements to authenticated;

insert into template.ceremony_steps
  (locale, seq, component, applicability, location, leads, items_needed, duration_minutes)
values
  ('poruwa', 1, 'Guests seated, Hewisi drummers at the entrance', 'required', 'Ballroom', 'Coordinator', 'Drums, seating ushers', 10),
  ('poruwa', 2, 'Kandyan dancers lead the groom''s procession in', 'required', 'Ballroom', 'Vendor', 'Dance troupe, drummers', 5),
  ('poruwa', 3, 'Groom takes his place at the Poruwa', 'required', 'Poruwa', 'Groom', null, 2),
  ('poruwa', 4, 'Bride enters with her father / brother', 'required', 'Ballroom', 'Bride''s Family', 'Bouquet, veil', 3),
  ('poruwa', 5, 'Couple step onto the Poruwa - right foot first', 'required', 'Poruwa', 'Vendor', 'Poruwa, white cloth', 2),
  ('poruwa', 6, 'Ashtaka chanting', 'required', 'Poruwa', 'Vendor', 'Ashtaka chanter', 5),
  ('poruwa', 7, 'Betel leaves offered to the four corners', 'required', 'Poruwa', 'Vendor', 'Bulath thattuwa (betel tray)', 3),
  ('poruwa', 8, 'Exchange of rings', 'required', 'Poruwa', 'Couple', 'Ring box, ring bearer', 3),
  ('poruwa', 9, 'Bride''s little finger tied to groom''s with gold thread', 'required', 'Poruwa', 'Vendor', 'Gold thread', 2),
  ('poruwa', 10, 'Water poured over the tied hands', 'required', 'Poruwa', 'Vendor', 'Kalasa pot, water', 2),
  ('poruwa', 11, 'Jayamangala Gatha sung', 'required', 'Poruwa', 'Vendor', 'Singers', 4),
  ('poruwa', 12, 'Groom gifts the white cloth to the bride''s mother', 'required', 'Poruwa', 'Groom', 'White cloth', 2),
  ('poruwa', 13, 'Couple step off the Poruwa - coconut split', 'required', 'Poruwa', 'Vendor', 'Coconut, knife, mat', 3),
  ('poruwa', 14, 'Milk rice (kiribath) and sweets fed to the couple', 'required', 'Poruwa', 'Bride''s Family', 'Kiribath, sweets tray', 3),
  ('poruwa', 15, 'Oil lamp lit by both families', 'required', 'Poruwa', 'Couple', 'Pahana, wicks, matches', 3),
  ('poruwa', 16, 'MARRIAGE REGISTRATION - signing the register', 'required', 'Signing table', 'Vendor', 'Registrar, register, NICs, witnesses', 10),
  ('poruwa', 17, 'Witnesses sign', 'required', 'Signing table', 'Coordinator', 'Two witnesses + NICs', 3),
  ('poruwa', 18, 'Blessings from elders / parents', 'required', 'Ballroom', 'Couple', null, 5),
  ('poruwa', 19, 'Family group photographs', 'required', 'Ballroom', 'Vendor', 'Photographer, list of groups', 20),
  ('poruwa', 20, 'Church / temple service', 'optional', 'Off-site', 'Couple', 'Officiant', 45),
  ('poruwa', 21, 'Pirith chanting / religious blessing', 'optional', 'Ballroom', 'Vendor', 'Monks / officiant', 30),
  ('poruwa', 22, 'Readings or a poem', 'optional', 'Ballroom', 'Couple', 'Printed reading', 5),
  ('poruwa', 23, 'Traditional dance performance', 'optional', 'Ballroom', 'Vendor', 'Dance troupe', 10),
  ('poruwa', 24, 'Recessional - couple exit', 'required', 'Ballroom', 'Couple', null, 3);

insert into template.legal_requirements
  (locale, seq, requirement, applicability, responsible, documents, authority,
   offset_days, verify_status)
values
  ('poruwa', 1, 'Confirm which registrar covers your venue''s division', 'required', 'Couple', 'Venue address', 'Divisional Secretariat', -200, 'to_verify'),
  ('poruwa', 2, 'Confirm the fee schedule for a registrar attending the venue', 'required', 'Couple', null, 'Registrar', -200, 'to_verify'),
  ('poruwa', 3, 'Give notice of marriage', 'required', 'Couple', 'NICs / passports, birth certificates', 'Registrar''s office', -90, 'to_verify'),
  ('poruwa', 4, 'Pay the notice fee and keep the receipt', 'required', 'Couple', 'Receipt', 'Registrar''s office', -90, 'verified'),
  ('poruwa', 5, 'Confirm the waiting period before the marriage may be registered', 'required', 'Couple', null, 'Registrar', -90, 'to_verify'),
  ('poruwa', 6, 'Confirm the registrar''s attendance at the venue in writing', 'required', 'Couple', 'Written confirmation', 'Registrar', -85, 'verified'),
  ('poruwa', 7, 'Identify two witnesses aged 18+ with valid NICs', 'required', 'Couple', 'Witness NICs', null, -80, 'to_verify'),
  ('poruwa', 8, 'Check both NICs / passports are valid and names match the birth certificates', 'required', 'Couple', 'NIC, passport, birth certificate', null, -80, 'verified'),
  ('poruwa', 9, 'Obtain certified English translations if any document is not in Sinhala/Tamil/English', 'required', 'Couple', 'Original + translation', 'Registrar / translator', -75, 'to_verify'),
  ('poruwa', 10, 'If either party was previously married - obtain the divorce decree or death certificate', 'required', 'Couple', 'Decree absolute / death certificate', 'Courts', -120, 'to_verify'),
  ('poruwa', 11, 'If either party is a foreign national - confirm the additional documents required', 'required', 'Couple', 'Passport, certificate of no impediment', 'Registrar / Embassy', -150, 'to_verify'),
  ('poruwa', 12, 'Confirm whether the General or Kandyan marriage law applies to you', 'required', 'Couple', null, 'Registrar', -150, 'to_verify'),
  ('poruwa', 13, 'Confirm any religious registration requirement (Muslim / other)', 'required', 'Couple', null, 'Relevant registrar', -150, 'to_verify'),
  ('poruwa', 14, 'Assemble every document in ONE labelled folder', 'required', 'Couple', 'All of the above', null, -7, 'verified'),
  ('poruwa', 15, 'Hand the folder to the coordinator on the morning', 'required', 'Couple', 'Folder', 'Venue', 0, 'verified'),
  ('poruwa', 16, 'Apply for certified copies of the marriage certificate', 'required', 'Couple', 'Registration reference', 'Registrar''s office', 14, 'to_verify'),
  ('poruwa', 17, 'Update NIC, passport and bank records if changing name', 'required', 'Bride', 'Marriage certificate', 'Relevant offices', 60, 'to_verify');

-- --------------------------------------------------------- the wedding side
-- The two module tables need what every seeded table needs: a link back to
-- the template row, so re-seeding is idempotent rather than duplicating, and
-- a unique index to enforce it. Nulls are distinct in a unique index, so rows
-- the couple adds themselves are never blocked by it.
alter table ceremony_steps
  add column if not exists source_template_id bigint
    references template.ceremony_steps (id) on delete set null,
  add column if not exists seq int;

alter table legal_requirements
  add column if not exists source_template_id bigint
    references template.legal_requirements (id) on delete set null,
  add column if not exists seq int,
  -- So the registrar deadlines move with the wedding date. Ticket 1.7's
  -- engine is extended below to include them.
  add column if not exists offset_days int,
  add column if not exists due_date_overridden boolean not null default false;

create unique index if not exists ceremony_steps_template_uniq
  on ceremony_steps (wedding_id, source_template_id);
create unique index if not exists legal_requirements_template_uniq
  on legal_requirements (wedding_id, source_template_id);

-- ------------------------------------------------------- 1.7, extended
create or replace function app.redate_wedding_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Rows the couple deliberately moved are left alone; that is what
  -- due_date_overridden is for. A null wedding date un-dates what it derived,
  -- so clearing the date cannot leave stale dates behind.
  update wedding_tasks
     set due_date = case
                      when new.wedding_date is null then null
                      else new.wedding_date + offset_days
                    end
   where wedding_id = new.id
     and offset_days is not null
     and not due_date_overridden;

  update wedding_countdown_checks
     set due_date = case
                      when new.wedding_date is null then null
                      else new.wedding_date + offset_days
                    end
   where wedding_id = new.id
     and offset_days is not null
     and not due_date_overridden;

  -- Added with 6.5. Giving notice of marriage 90 days out is the most
  -- date-sensitive thing in the whole plan: it has a statutory waiting period
  -- behind it, and a stale date here is the one that cannot be recovered from.
  update legal_requirements
     set due_date = case
                      when new.wedding_date is null then null
                      else new.wedding_date + offset_days
                    end
   where wedding_id = new.id
     and offset_days is not null
     and not due_date_overridden;

  return new;
end;
$$;

comment on function app.redate_wedding_plan() is
  'Ticket 1.7, extended by 6.5. Recomputes due dates from offset_days whenever '
  'weddings.wedding_date changes, skipping rows with due_date_overridden. '
  'Covers tasks, countdown checks and registration deadlines.';

-- ------------------------------------------------------- seed_wedding, again
-- Two more inserts, same rules: ON CONFLICT DO NOTHING against the template
-- link, so re-running adds only what the template has gained.
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

  -- Ticket 5.5. Roles are seeded; person_name deliberately is not, or the
  -- warning that catches its absence would never fire.
  insert into responsibilities
    (wedding_id, source_template_id, seq, area, activity,
     responsible, accountable, consulted, informed, sort_order)
  select p_wedding_id, r.id, r.seq, r.area, r.activity,
         r.responsible, r.accountable, r.consulted, r.informed, r.seq
    from template.responsibilities r
   where r.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Ticket 6.4. sort_order carries the running order, which is the whole
  -- point of the module: a ceremony out of sequence is not a ceremony.
  insert into ceremony_steps
    (wedding_id, source_template_id, seq, name, applicability, location, leads,
     items_needed, duration_minutes, sort_order)
  select p_wedding_id, c.id, c.seq, c.component, c.applicability, c.location,
         c.leads, c.items_needed, c.duration_minutes, c.seq
    from template.ceremony_steps c
   where c.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Ticket 6.5. verify_status comes across as the template has it, which for
  -- most rows is 'to_verify'. Nothing here decides a requirement is confirmed.
  insert into legal_requirements
    (wedding_id, source_template_id, seq, name, applicability, owner, notes,
     authority, verify_status, offset_days, due_date, sort_order)
  select p_wedding_id, l.id, l.seq, l.requirement, l.applicability, l.responsible,
         l.documents, l.authority, l.verify_status, l.offset_days,
         case when v_wedding_date is null or l.offset_days is null then null
              else v_wedding_date + l.offset_days end,
         l.seq
    from template.legal_requirements l
   where l.locale = v_locale
  on conflict (wedding_id, source_template_id) do nothing;
  get diagnostics n = row_count;  v_inserted := v_inserted + n;

  -- Snapshot what this plan was built from (plan R4).
  update weddings
     set template_locale  = v_locale,
         template_version = v_version
   where id = p_wedding_id;

  return v_inserted;
end;
$$;
