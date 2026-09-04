# Backup and restore runbook

Ticket 9.6. The acceptance criterion is **"PITR verified by an actual restore
test"**, and that verification has **not been done**. See "What has not been
verified" at the end — it is the most important section here, and it is at the
end only because you need the rest to do it.

## What is actually at risk

Not the code. That is in git, and rebuilding the whole application from
`supabase/migrations` plus `npm ci` takes minutes.

What cannot be rebuilt is one couple's typed data: eighty households with phone
numbers, a year of budget decisions, and which vendor was paid what. Losing
that three weeks before a wedding is not recoverable by any amount of
engineering.

So this runbook is about one thing: getting *rows* back.

## What exists today

| Layer | State | Notes |
|---|---|---|
| Supabase daily backups | **Free tier: none guaranteed** | Daily backups and PITR are paid-plan features. Confirm the current plan before relying on either. |
| Point-in-time recovery | **Not enabled** | Requires a paid plan. Plan risk R11 already flags the free tier. |
| Migrations in git | Yes | `supabase/migrations`, 30-odd files, replay in order. |
| Template content in git | Yes | Tasks, countdown, RACI, ceremony, legal, timeline, risks are all seed SQL. |
| A couple's own data | **Only in the database** | This is the gap. |
| Storage buckets (receipts, contracts) | **Only in Supabase** | Not covered by a database backup at all. |

**The honest summary: on the free tier there is no backup.** Everything below
assumes the project has been moved to a paid plan, which R11 says to do from M2
anyway.

## Before you need it

1. **Turn PITR on.** Dashboard → Database → Backups. Without it the best case
   is a daily snapshot, which on a bad day means losing a day of a couple's
   work.
2. **Do the restore test in the last section.** An untested backup is a belief,
   not a backup.
3. **Tell couples they can export.** The Export screen (ticket 9.2) produces a
   spreadsheet of everything in one click, built in the browser. It is not a
   substitute for backups, but it means a couple who exported monthly is never
   fully exposed to a failure here.

## Restoring

### Case 1 — somebody deleted their own rows

Far and away the most likely incident: a wedding deleted, a category cleared, an
import run twice.

`weddings` cascades on delete, so deleting a wedding removes its budget,
payments, guests and everything else. There is **no soft delete** in this
schema.

1. Establish *when*. `created_at` / `updated_at` on the neighbouring rows
   usually brackets it within minutes.
2. Do **not** restore the whole project. That would roll back every other
   couple to the same moment.
3. Restore into a **new** project at the timestamp, then copy the one wedding
   across:

```sh
# 1. PITR-restore to a fresh project via the dashboard, then:
supabase link --project-ref <restored-ref>

# 2. Dump only the affected wedding's rows. Order matters — parents first.
pg_dump "$RESTORED_DB_URL" \
  --data-only --no-owner \
  --table=public.weddings --table=public.wedding_members \
  --table=public.budget_categories --table=public.budget_lines \
  --table=public.payments --table=public.contributions \
  --table=public.vendors --table=public.vendor_options \
  --table=public.vendor_answers --table=public.vendor_decisions \
  --table=public.guests --table=public.guest_groups --table=public.seating_tables \
  --table=public.wedding_tasks --table=public.wedding_countdown_checks \
  --table=public.responsibilities --table=public.timeline_events --table=public.risks \
  > wedding-rows.sql

# 3. Filter to the one wedding id before loading it anywhere near production.
grep -F "<wedding-uuid>" wedding-rows.sql > one-wedding.sql
```

Then load `one-wedding.sql` into production **inside a transaction**, and read
the row counts before committing.

> A restore that overwrites a *second* couple's data while fixing the first is
> worse than the original incident. Filter by wedding id, and check the counts.

### Case 2 — a migration damaged the schema

1. Migrations are forward-only here; there are no `down` scripts.
2. `supabase db push` runs each file in a transaction, so a *failing* migration
   leaves nothing behind. The dangerous one is a migration that succeeds and is
   wrong — a dropped column, a policy replaced with a looser one.
3. Recovery is a new migration that puts it back, not a restore. Data loss from
   a dropped column is the exception, and that needs Case 1.

**This has already nearly happened twice in this project**, both recorded in the
migrations: `20260903001100` (a NULL-returning helper meant `if not is_owner`
never fired) and `20260904000400` (a capacity check that silently enforced
nothing). Both were caught by reasoning, not by a test run — which is why the
pgTAP suite matters and why it needs to actually execute.

### Case 3 — Storage objects lost

`receipts` and `contracts` hold uploaded files. A database restore does **not**
bring those back; they are separate.

```sh
# There is no incremental Storage backup. This is the whole of it.
supabase storage download --recursive ss://receipts ./backup/receipts
supabase storage download --recursive ss://contracts ./backup/contracts
```

`payments.receipt_path` and `vendors.contract_path` will still point at objects
that no longer exist. The app treats a missing object as a missing file rather
than an error, so nothing breaks — but the receipt is gone.

## The restore test — NOT YET DONE

This is the acceptance criterion, and it is the part that cannot be written
into a document. It has to be performed.

1. Note a timestamp. Create a wedding, add a household with a memorable name.
2. Wait past the PITR granularity, then **delete the wedding**.
3. PITR-restore to a new project at the noted timestamp.
4. Confirm the household is present in the restored project.
5. Copy that one wedding back to production using Case 1.
6. Confirm it is in production, and that **no other wedding changed** — compare
   `count(*)` on `weddings` and `guests` before and after.
7. Delete the restored project.
8. Write the date and the outcome here.

**Result: not performed.**

Why not, plainly: PITR needs a paid plan this project is not on, and the test's
own steps involve deleting real data and standing up a second paid project.
Both are decisions for whoever owns the account, not something to do
unannounced.

Until step 8 has a date in it, ticket 9.6 is **incomplete**, and the right way
to describe the current position is: the procedure is written and the mechanism
is untested.
