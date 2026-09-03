# Wedding Planner

Multi-tenant wedding planning app. React + TypeScript on the front, Supabase (Postgres + RLS) on the back, no custom server.

Requirements and the phased delivery plan live in **`Wedding Planner SaaS - Development Plan.md`**. This README covers getting it running.

**Status: Phase 0 complete.** Auth, tenancy, the role model and the RLS test harness are in place. Domain modules start at Phase 1.

---

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Point it at a database

**Option A — local (recommended while developing).** Needs Docker.

```bash
npx supabase start          # first run pulls images, takes a few minutes
npx supabase db reset       # applies every migration in order
```

`supabase start` prints an API URL and anon key. Put them in `.env`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<the anon key it printed>
```

**Option B — a hosted Supabase project.**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Then take the URL and anon key from _Project Settings → API_.

### 3. Run

```bash
npm run dev            # http://localhost:5173
```

With a local stack, magic-link emails are captured by Inbucket at
<http://localhost:54324> rather than actually sent — open the link from there.

---

## Verify it

```bash
npm run verify         # lint, type-check, build, unit tests
npm run db:test        # RLS policy tests (needs the local stack running)
```

`npm run db:test` is the important one. It is the Phase 0 gate described in the
plan (§7.1): 28 assertions covering cross-tenant isolation and the full role
matrix. **If it fails, stop and fix it before writing anything else** — in a
Supabase app there is no server layer to catch an authorisation mistake, so a
missing policy is a data breach rather than a bug.

---

## Scripts

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Vite dev server                              |
| `npm run build`     | Type-check (`tsc -b`) then production build  |
| `npm run test`      | Vitest unit tests                            |
| `npm run lint`      | oxlint                                       |
| `npm run format`    | Prettier over `src/` and `supabase/`         |
| `npm run verify`    | lint + build + test — what CI runs           |
| `npm run db:start`  | Start the local Supabase stack               |
| `npm run db:reset`  | Rebuild the local database from migrations   |
| `npm run db:test`   | Run the pgTAP RLS suite                      |
| `npm run db:push`   | Push migrations to the linked hosted project |
| `npm run types:gen` | Regenerate `src/types/database.types.ts`     |

**After every migration, run `npm run types:gen`.** CI compares the committed
types against the schema and fails if they have drifted.

---

## Layout

```
src/
  lib/
    env.ts                 validates env vars at startup, fails loudly
    supabase.ts            typed client + unwrap() so no error is swallowed
  types/
    database.types.ts      generated; committed so a fresh clone type-checks
  features/
    auth/                  AuthProvider, sign-in
    weddings/              list, create, layout, setup, members, dashboard
  components/ui/           button, input, field, card, badge, states
supabase/
  migrations/              schema, in order — never edit an applied migration
  tests/                   pgTAP RLS suite (the Phase 0 gate)
```

### Migrations

| File                                  | Contents                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `…0100_init_extensions_and_enums.sql` | pgcrypto, citext, `app` schema, `member_role`, `wedding_side`                    |
| `…0200_profiles.sql`                  | `profiles` + auto-create trigger on signup                                       |
| `…0300_weddings_and_members.sql`      | `weddings`, `wedding_members`, `wedding_invitations`                             |
| `…0400_rls_helpers.sql`               | `app.role_in`, `can_write`, `can_see_money`, `can_see_ops`, …                    |
| `…0500_policies_and_rpcs.sql`         | Policies + `create_wedding`, `invite_member`, `accept_invitation`, `my_weddings` |

---

## Things to know before you change the schema

**Money is stored as `bigint` minor units.** Never floats. `total_budget_minor`
is LKR cents. This is deliberate (plan risk R5) — a rounding error in a wedding
budget destroys trust in every other number on the screen.

**Derived values are never stored.** `forecast` will be a generated column;
`paid`, `outstanding`, `variance` and every dashboard alert are views. The
spreadsheet this replaces got that right and the app must not regress it. See
Appendix A of the plan for the full derived-vs-stored table.

**The RLS helpers are `security definer` on purpose.** A policy on
`wedding_members` that needs to check membership must query `wedding_members`,
which re-triggers the same policy and raises `infinite recursion detected in
policy`. Running as the definer bypasses RLS inside the function and breaks the
cycle. `search_path` is pinned so a caller cannot shadow the table. Do not
"simplify" these to `security invoker`.

**Coordinators cannot see money, and column grants won't do it.** Supabase runs
every signed-in user as the single Postgres role `authenticated`, so
column-level `GRANT`s cannot vary per user. Money is therefore hidden by
denying the _rows_ — financial tables get no SELECT policy for that role. Any
screen that mixes money and operations needs an ops-facing view.

**Every new table needs `wedding_id`, an index on it, RLS enabled, a policy,
and a test.** The tenancy boundary is that column; there are no exceptions.

**Navigation is not security.** `WeddingLayout` hides links by role as a
convenience. The database refuses the query regardless. `navigation.test.ts`
keeps the two in the same shape so drift is visible.

---

## What is not built yet

Phase 0 is the foundation only. The next tickets, in order:

1. **1.2 – 1.4** the `template` schema and `seed_wedding()` — this is what turns
   an empty wedding into 194 budget lines, 93 tasks and 227 vendor questions.
   It is the critical path.
2. **1.7** the date-offset engine, so changing the wedding date re-dates the
   whole plan.
3. **Phase 2** the money core, which must pass the golden fixture in plan §4.2
   before any UI is built on top of it.

See the plan for acceptance criteria on each.
