-- =============================================================================
-- 20260904002000  authenticated may actually read the template  (the real bug)
-- =============================================================================
-- Reported twice: the checklist content is seeded and the modules are still
-- empty. The first fix — a "pull new items" button, risk R4 — was necessary and
-- not sufficient, because the button never appeared. This is why.
--
-- THE BUG
--
-- Nothing has ever granted USAGE on schema `template` to any role. The first
-- migration granted it on schema `app`:
--
--     grant usage on schema app to authenticated;
--
-- and there is no equivalent line for `template`. Every
-- `grant select on template.X to authenticated` added since has therefore been
-- dead: Postgres refuses at the schema before it looks at the table.
--
-- WHY IT ONLY SURFACED NOW
--
-- Every earlier reader of template content came through a view created WITHOUT
-- `security_invoker = true` — v_vendor_categories, v_vendor_questions — and a
-- plain view runs with its OWNER's privileges. The owner has full rights, so
-- the Compare screen has worked all along and nobody could have known the
-- grants underneath were inert. seed_wedding is SECURITY DEFINER, so it was
-- fine too.
--
-- v_template_pending is the first template reader written as
-- `security_invoker = true`, which means it runs as the signed-in user. It
-- errors, the client treats the failure as "nothing pending", the count comes
-- out zero, and both the Setup card and the module empty state hide their
-- button — the card even says "up to date". A failed read presented as good
-- news is the worst possible shape for this, and it is what made the report
-- "still can't see them" rather than an error message.
--
-- WHY NOT JUST DROP security_invoker
--
-- That would fix the read and break the boundary. The same view also reads
-- wedding_tasks, guests, budget_lines and the rest, and as a non-invoker view
-- their RLS would be evaluated as the view owner — handing every caller a
-- count of every other couple's pending rows. The grant is the correct fix;
-- the invoker semantics are load-bearing.
-- =============================================================================

grant usage on schema template to authenticated;

-- All of it, rather than table by table. Every row in this schema is generic
-- reference content — tasks, questions, ceremony components, the 414 checklist
-- items — and ticket 1.3 asserts it holds no personal data. Naming tables
-- individually is what produced five grants that each looked right and none of
-- which worked.
grant select on all tables in schema template to authenticated;

-- So the next template table is not a repeat of this. A missing grant on new
-- reference content is invisible until something reads it as the caller, which
-- may be months later.
alter default privileges in schema template
  grant select on tables to authenticated;

-- Deliberately NOT anon. Template content is not secret, but an
-- unauthenticated caller has no reason to enumerate it, and the public RSVP
-- surface (4.7) is built on anon having nothing it does not need.
revoke all on schema template from anon;

comment on schema template is
  'Versioned reference content, seeded into a wedding by seed_wedding. '
  'Readable by any signed-in user: it is generic and holds no personal data. '
  'USAGE was missing here until 20260904002000, which made every table-level '
  'grant inert and any security_invoker view over it fail.';
