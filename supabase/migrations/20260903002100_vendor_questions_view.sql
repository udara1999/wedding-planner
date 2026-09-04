-- =============================================================================
-- 2100  a public read path for the vendor questions  (ticket 3.3 / 3.4)
-- =============================================================================
-- The comparison screen needs the 227 questions, and it cannot reach them:
-- `template` is not exposed to PostgREST, deliberately, and §4.4 says the
-- questions are global and never copied per wedding — so there is no
-- per-wedding table to read them from either.
--
-- A view in `public` is the way through. It runs as its owner, which is how it
-- reads a schema the caller has no rights to, and that is safe here in a way it
-- would not be for a money table: these rows are the same for every wedding and
-- contain nothing about anybody. There is no wedding_id to filter on, and no
-- tenancy question to get wrong.
--
-- NOT security_invoker, for exactly that reason: as invoker it would inherit the
-- caller's (nonexistent) access to `template` and always return nothing.
-- =============================================================================

create or replace view public.v_vendor_questions as
select id,
       locale,
       category_key,
       category_label,
       "group",
       seq,
       question,
       why_it_matters
  from template.vendor_questions;

comment on view public.v_vendor_questions is
  'Ticket 3.3. Read-only window onto template.vendor_questions for the '
  'comparison screen. Global reference data: no wedding_id, nothing private, '
  'identical for every caller.';

revoke all on public.v_vendor_questions from anon;
grant select on public.v_vendor_questions to authenticated;

-- The 16 categories, so the screen does not have to pull 227 rows just to build
-- a picker.
create or replace view public.v_vendor_categories as
select locale,
       category_key,
       min(category_label) as category_label,
       count(*)            as question_count
  from template.vendor_questions
 group by locale, category_key;

revoke all on public.v_vendor_categories from anon;
grant select on public.v_vendor_categories to authenticated;
