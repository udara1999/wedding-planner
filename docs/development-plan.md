# MangalaHub — Requirements & Development Plan

**Source of truth for requirements:** `Sri Lankan Wedding Master Planner.xlsx` (27 sheets, 6,120 formulas)
**Stack:** React + TypeScript (Vite) · Supabase (Postgres, Auth, RLS, Storage, Edge Functions) · no custom server
**Model:** Multi-tenant SaaS — any couple signs up and gets their own wedding
**UI:** App-like — list views, detail pages, modal forms, cards
**Roles:** Couple (full) · Family (limited) · Coordinator (day-of, no money) · Public RSVP (no login)

---

## 1. What we are actually building

The workbook is not a spreadsheet. It is three products fused together, and the plan should treat them separately because they have different data shapes, different users and different risk profiles.

| # | Sub-product | What it does | Primary user | Why it matters |
|---|---|---|---|---|
| A | **Financial controller** | Budget → quote → negotiate → actual → paid → outstanding, with variance and forecast | Couple | This is where the money is lost. Highest value, hardest correctness bar. |
| B | **Decision & procurement engine** | Vendor shortlisting, side-by-side comparison, 227 pre-written questions, decision audit | Couple | The real differentiator. Nobody else ships the question bank. |
| C | **Day-of operations console** | Timeline, vendor arrival schedule, contact sheet, seating, packing, emergency plan | Coordinator | Used once, under stress, possibly offline. Reliability > features. |

Everything else (attire, beauty, decor, ceremony, transport) is **checklist-shaped CRUD** that shares one pattern and should be built once as a generic module, not eighteen times.

### The single most important architectural insight

The workbook's value is not its formulas — it is its **content**: 194 budget lines, 93 tasks, 227 vendor questions, 24 ceremony steps, 24 risks, 83 packing items, 62 shot-list items, 57 timeline events, 17 legal requirements.

That content must become a **versioned template library** in the database. Creating a wedding = running a seed function against a template locale. This makes the product defensible and lets it later support Hindu, Muslim, Christian and non-Sri-Lankan traditions without code changes.

```
template.locales      →  'lk-buddhist-poruwa' (v1), 'lk-christian', 'lk-hindu', 'generic'
template.budget_lines  →  seeded into  budget_lines
template.vendor_questions → stays global, referenced not copied
```

---

## 2. Feature inventory — 27 sheets mapped to modules

| Sheet | Module | Core tables | Notes |
|---|---|---|---|
| 01 START HERE | Setup | `weddings` | One row per tenant. Drives every date offset. |
| 02 Dashboard | Dashboard | *(views only)* | `v_wedding_financials`, `v_readiness`, `v_alerts` |
| 03 Budget | Money | `budget_categories`, `budget_lines` | `forecast` generated; `paid` from view |
| 04 Payments | Money | `payments` | Status derived (needs `current_date`) |
| 05 Vendors | Vendors | `vendors`, `vendor_categories` | |
| 05a Vendor Compare | Vendors | `vendor_options`, `vendor_answers`, `vendor_decisions`, `template.vendor_questions` | 227 questions, 16 categories |
| 06 Contributions | Money | `contributions` | Family funding |
| 07 Tasks | Planning | `tasks` | `offset_days` enables re-dating |
| 08 Countdown | Planning | `countdown_items` | 30-day → day-after |
| 09 Guests | Guests | `guests`, `guest_groups` | `rsvp_token` per household |
| 10 RSVP & Seating | Guests | `seating_tables` | Capacity vs seated |
| 11 Wedding Party | Guests | `wedding_party` | |
| 12 Attire & Jewellery | Checklist | `attire_items`, `jewellery_items` | Jewellery = custody register |
| 13 Beauty & Grooming | Checklist | `beauty_appointments` | Date offsets |
| 14 Ceremony & Legal | Ceremony | `ceremony_steps`, `legal_requirements` | `verify_status` flag |
| 15 Decor & Design | Checklist | `decor_items` | |
| 16 Food & Beverage | Catering | `menu_items`, `cake` | Headcount from guests |
| 17 Transport & Stay | Logistics | `transport_legs`, `accommodations` | |
| 18 Photo & Video Plan | Checklist | `shot_list_items` | |
| 19 Responsibilities | Planning | `responsibilities` | RACI |
| 20 Day Timeline | Day-of | `timeline_events`, `music_cues` | |
| 21 Vendor Schedule | Day-of | `vendor_schedule` | Derived from `vendors` times |
| 22 Contact Sheet | Day-of | `contacts` | Pulls vendor phones |
| 23 Procurement & Packing | Logistics | `procurement_items` | buy → pack → load |
| 24 Emergency Plan | Day-of | `risks` | likelihood × impact |
| 25 Post-Wedding | Closure | `closure_tasks`, `lessons` | Reconciliation view |
| 00 Lists | Reference | pg enums + `wedding_lookups` | See §4.3 |

**Eighteen of these are the same shape.** `id, wedding_id, applicability, name, owner, vendor_id, cost, status, notes, sort_order` plus 2–6 module-specific columns. Build one `ChecklistModule<T>` component + one generic table pattern and configure it eighteen times.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React SPA (Vite + TS)          Vercel / Netlify        │
│  ├── shadcn/ui + Tailwind        app-like forms & cards │
│  ├── TanStack Query              all server state       │
│  ├── react-hook-form + zod       every form             │
│  ├── React Router v6             /w/:weddingId/*        │
│  └── supabase-js v2              typed from schema      │
└──────────────────┬──────────────────────────────────────┘
                   │ PostgREST + GoTrue (RLS enforced)
┌──────────────────┴──────────────────────────────────────┐
│  Supabase                                               │
│  ├── Postgres      tables · views · generated cols      │
│  ├── RLS           every table, no exceptions           │
│  ├── Auth          email + password, confirmed by email │
│  ├── Storage       contracts, quotes, receipts          │
│  └── Edge Functions  only where a secret is needed:     │
│        · send-rsvp-invite (Resend)                      │
│        · rsvp-submit (rate limit + captcha verify)      │
└─────────────────────────────────────────────────────────┘
```

**Rules of engagement**
1. **No business logic in the client that affects money.** Totals, forecasts and alerts come from Postgres views so the browser cannot disagree with the database.
2. **No stored duplicates of derived values.** `paid`, `outstanding`, `variance`, `readiness %` are views. The Excel version got this right; don't regress it.
3. **Edge Functions only for secrets or rate limiting.** Everything else is PostgREST + RLS.
4. **Money is `bigint` minor units.** Never `float`, never `numeric` in the client. LKR stored as cents.

### 3.1 Concrete stack decisions

| Concern | Choice | Why |
|---|---|---|
| Server state | TanStack Query | Cache invalidation per wedding; optimistic updates on checklists |
| Forms | react-hook-form + zod | Zod schemas shared with DB constraint expectations |
| Types | `supabase gen types typescript` in CI | Schema drift becomes a build failure |
| Dates | date-fns + `Asia/Colombo` | `wedding_date` is a `date`, times are `time`, audit is `timestamptz` |
| Charts | Recharts | Dashboard only; keep it to 3 charts |
| Money formatting | `Intl.NumberFormat('en-LK', { currency })` | Currency code lives on `weddings` |
| Tests | Vitest (unit) · pgTAP (RLS) · Playwright (2 flows) | RLS tests are non-negotiable — see §7.1 |
| Migrations | Supabase CLI, checked in, applied by CI | No dashboard-clicked schema changes |

---

## 4. Data model

### 4.1 Tenancy

```sql
profiles          (id → auth.users, full_name, phone, avatar_url)

weddings          (id, slug, bride_name, groom_name, wedding_date,
                   currency default 'LKR', timezone default 'Asia/Colombo',
                   ceremony_time, registration_time, reception_time, expected_finish,
                   venue_name, venue_town, venue_district,
                   ceremony_area, reception_area,
                   venue_contact_name, venue_contact_phone,
                   theme, colour_palette,
                   coordinator_name, coordinator_phone,
                   emergency_contact_name, emergency_contact_phone,
                   total_budget_minor bigint, contingency_pct numeric(4,3),
                   guest_buffer_pct numeric(4,3) default 0.05,
                   template_locale, template_version,
                   created_by, created_at)

wedding_members   (wedding_id, user_id, role, side, invited_email, accepted_at)
                   role: owner | partner | family | coordinator | viewer
                   side: bride | groom | both        -- scopes what `family` can see
                   PK (wedding_id, user_id)
```

Every domain table carries `wedding_id uuid not null references weddings on delete cascade` and is indexed on it. No exceptions — that column is the tenancy boundary.

### 4.2 The money core (get this right first)

```sql
budget_lines (
  id, wedding_id, category_id, code text,          -- 'BG077'
  name, applicability, payer, vendor_id,
  budgeted_minor  bigint default 0,
  quoted_minor    bigint default 0,
  negotiated_minor bigint default 0,
  actual_minor    bigint default 0,
  refundable_deposit_minor bigint default 0,
  status, notes, sort_order,

  forecast_minor bigint GENERATED ALWAYS AS (
    case when applicability = 'not_applicable' then 0
         when actual_minor    > 0 then actual_minor
         when negotiated_minor > 0 then negotiated_minor
         when quoted_minor    > 0 then quoted_minor
         else budgeted_minor end
  ) STORED,

  unique (wedding_id, code)
)
```

`forecast_minor` **can** be a stored generated column — the expression is immutable.
`paid_minor` **cannot** — it is an aggregate over `payments`, so it lives in a view.
Payment status **cannot** — it depends on `current_date`, which is stable, not immutable.

```sql
create view v_budget_lines as
select bl.*,
       coalesce(p.paid_minor, 0)                                   as paid_minor,
       greatest(bl.forecast_minor - coalesce(p.paid_minor,0), 0)   as outstanding_minor,
       bl.forecast_minor - bl.budgeted_minor                       as variance_minor
from budget_lines bl
left join (select budget_line_id, sum(amount_paid_minor) paid_minor
           from payments group by 1) p on p.budget_line_id = bl.id;

create view v_payments as
select pm.*,
       greatest(amount_due_minor - amount_paid_minor, 0) as balance_minor,
       case when amount_due_minor = 0                 then 'draft'
            when amount_paid_minor >= amount_due_minor then 'paid'
            when due_date is null                      then 'not_due'
            when due_date <  current_date               then 'overdue'
            when due_date <= current_date + 7           then 'due'
            when due_date <= current_date + 30          then 'due_soon'
            else 'not_due' end as status
from payments pm;
```

**Acceptance test that must pass before Phase 2 closes:** seed a wedding from `lk-buddhist-poruwa`, apply the jewellery edits from the real workbook (necklace 260,000 · rings 432,500 · brother's ring 43,000 · seven lines to *not applicable*), and assert the category returns **905,500 budgeted / 735,500 forecast**. That number is a known-good fixture from a workbook that has already been reconciled.

### 4.3 Reference data — two different kinds

Do not model these the same way.

| Kind | Examples | Implementation |
|---|---|---|
| **State machines** — code branches on these | `applicability`, `task_status`, `priority`, `vendor_status`, `rsvp_status`, `payment_stage` | Postgres `enum`. Adding a value is a migration. |
| **User-extensible lists** — code never branches | dietary needs, payment methods, vendor categories, transport types | `wedding_lookups (wedding_id, kind, value, sort_order)`, seeded per wedding |

The workbook's `00 Lists` conflated these. Splitting them prevents the classic bug where a user renames "Confirmed" and half the dashboard silently stops counting.

### 4.4 Vendor comparison (sub-product B)

```sql
template.vendor_questions (id, category_key, group, seq, question, why_it_matters)
   -- GLOBAL, 227 rows, versioned. Never copied per wedding.
   -- group: money | included | logistics | risk   (this ordering is the product)

vendor_options   (id, wedding_id, category_id, label, vendor_name, contact_name,
                  phone, package, quoted_minor, negotiated_minor, deposit_minor,
                  met_or_visited, rating)         -- 'A' | 'B' | 'C', extensible to N
vendor_answers   (wedding_id, option_id, question_id, answer, notes)
                  PK (option_id, question_id)
vendor_decisions (wedding_id, category_id, chosen_option_id, decided_on,
                  recorded_vendor_id)             -- closes the loop back to `vendors`
```

`v_vendor_decisions` reproduces the workbook's index sheet: options entered, decision, chosen vendor, agreed price, and whether it has been written into `vendors` yet.

### 4.5 Public RSVP — the one genuinely risky surface

Guests must submit **without an account**. Never expose `guests` to the `anon` role.

```sql
-- guests.rsvp_token uuid default gen_random_uuid() unique  (opaque, per household)

create function public.rsvp_lookup(p_token uuid)
returns table (household_name text, adults_invited int, children_invited int,
               rsvp_status text, adults_attending int, children_attending int,
               dietary text, wedding_display text, wedding_date date)
language sql security definer set search_path = public as $$ ... $$;

create function public.rsvp_submit(p_token uuid, p_adults int, p_children int,
                                   p_dietary text, p_needs_room bool,
                                   p_needs_transport bool, p_message text)
returns void language plpgsql security definer set search_path = public as $$ ... $$;
```

Controls: `revoke all on guests from anon` · `grant execute` on the two RPCs only · validate `p_adults + p_children <= adults_invited + children_invited` inside the function · Cloudflare Turnstile verified in an Edge Function wrapper · log every submission to `rsvp_submissions` for audit · tokens are UUIDv4 (unguessable), one per household, rotatable.

### 4.6 Coordinator must not see money — an RLS finding worth flagging

Supabase runs every logged-in user as the single Postgres role `authenticated`. **Column-level `GRANT`s therefore cannot vary per user**, so the obvious solution does not work.

Three options, in order of preference:

1. **Row denial (recommended).** Coordinators get *no* SELECT policy on `budget_lines`, `payments`, `contributions`, `v_*` financial views. They simply cannot read those tables. Ops tables (`timeline_events`, `vendor_schedule`, `contacts`, `seating_tables`, `risks`) grant coordinator read.
2. Separate `v_ops_*` views that hard-code `null` in money columns, with the money tables denied entirely. Use where a screen genuinely mixes both.
3. Split money into a `finance` schema not exposed via PostgREST, reachable only through views. Cleanest long-term, most upfront work.

Consequence for the UI: `vendors` contains `quoted_minor` / `negotiated_minor`. Coordinators need vendor **names, phones and arrival times** but not prices. So `vendors` gets an ops-facing companion view and the coordinator's vendor screen reads that, not the base table.

> **Gap found while building 2.8 (2026-09-03).** Row denial does not cover money
> columns that sit on a row a coordinator legitimately needs. `weddings` holds
> `total_budget_minor`, `contingency_pct` and `guest_buffer_pct`, and its SELECT
> policy is `app.is_member` — because the same row carries the couple's names,
> the date and the venue, which the day-of pack needs. **A coordinator can
> therefore read the total budget today.** `v_wedding_financials` guards itself
> with `app.can_see_money`, so the view is not a second door, but the base
> table is still open.
>
> The fix is option 3 applied narrowly: move those three columns to a
> `wedding_budget_settings` table (one row per wedding) with a
> `can_see_money` policy, and have the Setup screen (1.5) edit them there.
> Not yet done — it touches 1.5 and `v_wedding_financials`, so it wants its
> own ticket rather than being folded into 2.8.

### 4.7 RLS helpers

```sql
create function app.role_in(w uuid) returns text language sql stable security definer as $$
  select role::text from wedding_members
  where wedding_id = w and user_id = auth.uid()
$$;

create function app.can_write(w uuid) returns boolean language sql stable as $$
  select app.role_in(w) in ('owner','partner')
$$;

create function app.can_see_money(w uuid) returns boolean language sql stable as $$
  select app.role_in(w) in ('owner','partner','family')
$$;
```

Standard policy shape, applied to every domain table:

```sql
alter table budget_lines enable row level security;
create policy read  on budget_lines for select using (app.can_see_money(wedding_id));
create policy write on budget_lines for all    using (app.can_write(wedding_id))
                                          with check (app.can_write(wedding_id));
```

### 4.8 Role × module permission matrix

| Module | Owner / Partner | Family | Coordinator | Anon (token) |
|---|---|---|---|---|
| Wedding setup | RW | R | R (no money fields) | — |
| Budget · Payments · Contributions | RW | R (own contributions RW) | **none** | — |
| Vendors | RW | R | R via ops view (no prices) | — |
| Vendor Compare | RW | — | — | — |
| Guests | RW | R+W **own side only** | R (names + table only) | own household via RPC |
| Seating | RW | R own side | R | — |
| Tasks · Countdown · Responsibilities | RW | RW where assigned | R day-of items | — |
| Checklist modules | RW | R | R | — |
| Ceremony · Legal | RW | R | R | — |
| Day-of pack (timeline, schedule, contacts, risks) | RW | R | **RW** | — |
| Post-wedding & reconciliation | RW | — | — | — |

---

## 5. Delivery plan

Ten phases. Every ticket is sized **0.5–2 days**. Phases 0–2 are strictly sequential; 3–6 can run in parallel once the money core is stable.

Estimates assume one experienced full-stack developer and **exclude** template content entry, which is called out separately in Phase 1 because it is the largest single chunk of work in the project.

### Phase 0 — Foundations (≈5 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 0.1 | Repo + tooling | Vite/React/TS, ESLint, Prettier, Vitest run green in CI |
| 0.2 | Supabase project + CLI migrations | `supabase db reset` rebuilds from checked-in SQL; no dashboard edits |
| 0.3 | Type generation in CI | Schema change without regenerating types fails the build |
| 0.4 | Auth shell | Email + password sign-in, sign-up confirmed by email, password reset; protected routes; sign-out |
| 0.5 | `profiles` + trigger | Row auto-created on `auth.users` insert |
| 0.6 | Tenancy tables + RLS helpers | `weddings`, `wedding_members`, `app.role_in`, `can_write`, `can_see_money` |
| 0.7 | **pgTAP RLS harness** | A test proves user B cannot read user A's wedding. CI fails if it can. |
| 0.8 | App shell | `/w/:weddingId/*` routing, wedding switcher, nav, empty states |

### Phase 1 — Setup & templates (≈8 days + content entry)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 1.1 | Create-wedding wizard | Names, date, currency, timezone, tradition → row + owner membership |
| 1.2 | `template` schema | Tables + `locales` registry, versioned |
| 1.3 | **Template content migration** | Extract all workbook content to seed SQL. *Largest task in the project — budget 4–6 days on its own.* |
| 1.4 | `seed_wedding(wedding_id, locale)` RPC | Idempotent; re-running does not duplicate; snapshots `template_version` |
| 1.5 | Setup screen | All `weddings` fields editable; `days_to_go` derived, never stored |
| 1.6 | Member invitations | Invite by email with role + side; accept flow; revoke |
| 1.7 | Date-offset engine | Changing `wedding_date` re-dates every `offset_days` row in one transaction |

> **1.7 is a genuine product feature, not plumbing.** The workbook does this with `=WeddingDate-90`. Losing it would be a regression — the whole plan must re-date when the nekath moves.

### Phase 2 — Money core (≈10 days) — *do not parallelise this*

| # | Ticket | Acceptance criteria |
|---|---|---|
| 2.1 | `budget_categories` + `budget_lines` + generated `forecast_minor` | Migration + RLS + pgTAP |
| 2.2 | `v_budget_lines`, `v_budget_by_category` | `paid`/`outstanding`/`variance` correct against fixtures |
| 2.3 | Budget list + detail form | Filter by category/applicability; inline applicability toggle |
| 2.4 | Applicability switch component | Not-applicable rows visually muted **and** excluded from forecast |
| 2.5 | `payments` + `v_payments` | Six-state status derived from `current_date` |
| 2.6 | Payment form with budget-line picker | Search by code **or** name; unknown code rejected |
| 2.7 | `contributions` CRUD | Family can RW their own row only (pgTAP proves it) |
| 2.8 | `v_wedding_financials` | Reproduces the START HERE money block exactly |
| 2.9 | **Golden-fixture test** | The 905,500 / 735,500 jewellery assertion in §4.2 passes |
| 2.10 | Receipt upload | Supabase Storage, per-wedding bucket path, RLS on the bucket |

### Phase 3 — Vendors & comparison (≈9 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 3.1 | `vendors` CRUD + status pipeline | Researching → Confirmed; pipeline board view |
| 3.2 | `template.vendor_questions` seed | 227 rows across 16 categories, grouped money/included/logistics/risk |
| 3.3 | `vendor_options` CRUD | Add/remove options per category, not capped at 3 |
| 3.4 | Comparison screen | Options as columns, questions as rows, grouped and ordered |
| 3.5 | Answer capture | Autosave per cell; no lost keystrokes on navigation |
| 3.6 | `vendor_decisions` + write-back | Choosing an option offers one-click creation of the `vendors` row |
| 3.7 | Decision index | Per category: options entered, decision, chosen vendor, price, recorded? |
| 3.8 | Contract/quote attachments | Upload to Storage, listed on vendor detail |

### Phase 4 — Guests, RSVP & seating (≈10 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 4.1 | `guest_groups` + `guests` CRUD | Household model — adults/children per row, not one row per person |
| 4.2 | CSV import | Maps a spreadsheet column set; dry-run preview before commit |
| 4.3 | Side-scoped RLS for family | pgTAP: bride's mother cannot read groom-side guests |
| 4.4 | RSVP tracker | Counts, response rate, follow-up list |
| 4.5 | `rsvp_token` + `rsvp_lookup` / `rsvp_submit` RPCs | `anon` has zero direct table access (pgTAP proves it) |
| 4.6 | Public RSVP page | Tokenised URL, mobile-first, no login, confirmation screen |
| 4.7 | Turnstile + rate limit | Edge Function wrapper; abuse test documented |
| 4.8 | `seating_tables` + assignment | Over-capacity blocked; unseated-guest count surfaced |
| 4.9 | Gift ledger | Expected vs received; feeds net-cost figure |
| 4.10 | Invite dispatch | Resend via Edge Function + copyable WhatsApp link per household |

### Phase 5 — Planning (≈6 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 5.1 | `tasks` CRUD + `offset_days` | Seeded from template; re-dates with the wedding date |
| 5.2 | Task views | Overdue / today / this week / by owner / by area |
| 5.3 | `v_readiness` | % complete per area, from task completion |
| 5.4 | `countdown_items` | Grouped 30 → day-after; tickable |
| 5.5 | `responsibilities` (RACI) | Warns when an activity has no named person |

### Phase 6 — Checklist modules (≈8 days for all eighteen)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 6.1 | Generic `ChecklistModule` | Config-driven: columns, enums, extra fields. One component. |
| 6.2 | Configure 14 simple modules | Attire, beauty, decor, menu, shot list, procurement, transport, accommodation, wedding party, closure, music, contacts, cake, lessons |
| 6.3 | Jewellery custody register | Value, custodian, collect/return dates; unreturned-rental alert |
| 6.4 | Ceremony steps | Ordered, switchable, duration sums |
| 6.5 | Legal requirements | `verify_status`; jurisdiction disclaimer surfaced in-app |
| 6.6 | Catering headcount | Confirmed + crew + buffer %, live from guests |

### Phase 7 — Dashboard & alerts (≈6 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 7.1 | **`v_alerts`** | All 23 workbook warnings as one queryable view: `severity, count, message, deep_link, gate` |
| 7.2 | Time-gated alerts | Packing alerts inside 14 days, closure alerts after the date — as the workbook does |
| 7.3 | KPI cards | Days to go, budget, forecast, paid, outstanding, remaining |
| 7.4 | Money-by-category + readiness | Two charts, no more |
| 7.5 | Alert deep links | Every alert navigates to the exact filtered screen |

> **7.1 is the product's daily hook.** Building the warnings as 23 hand-written client queries would be the single worst decision available. One view, one component, one place to add the 24th.

### Phase 8 — Day-of operations (≈8 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 8.1 | `timeline_events` | Phase-grouped, computed end times, conflict detection |
| 8.2 | `vendor_schedule` | Sorted by arrival; check-in/check-out toggles |
| 8.3 | `contacts` | Pulls vendor phones; flags missing numbers |
| 8.4 | `risks` | Likelihood × impact score; prevention tick |
| 8.5 | Coordinator role end-to-end | pgTAP: coordinator reads timeline, **cannot** read budget |
| 8.6 | **Printable day-of pack** | Print-CSS routes for timeline, schedule, contacts, seating, packing |
| 8.7 | **PWA offline read** | Day-of pack readable with no network. See risk R8. |

### Phase 9 — Closure & SaaS hardening (≈10 days)

| # | Ticket | Acceptance criteria |
|---|---|---|
| 9.1 | `closure_tasks` + reconciliation view | True cost, net cost, cost per guest |
| 9.2 | Export to XLSX | Round-trips the workbook shape — the exit-hatch that earns trust |
| 9.3 | Onboarding + demo wedding | New user reaches a populated dashboard in under 2 minutes |
| 9.4 | Billing (Stripe via Edge Function) | Free until 30 days out; paid thereafter (pricing TBD — see D3) |
| 9.5 | Observability | Sentry, Supabase logs, alert on RLS-denied spikes |
| 9.6 | Backup & restore runbook | PITR verified by an actual restore test |
| 9.7 | Accessibility pass | Keyboard nav, labels, contrast ≥ 4.5:1 on the top 10 screens |

### Timeline summary

| Phase | Days | Cumulative |
|---|---|---|
| 0 Foundations | 5 | 5 |
| 1 Setup & templates | 8 (+4–6 content) | 19 |
| 2 Money core | 10 | 29 |
| 3 Vendors | 9 | 38 |
| 4 Guests & RSVP | 10 | 48 |
| 5 Planning | 6 | 54 |
| 6 Checklists | 8 | 62 |
| 7 Dashboard | 6 | 68 |
| 8 Day-of | 8 | 76 |
| 9 Closure & SaaS | 10 | 86 |

**≈86 developer-days ≈ 17–18 weeks solo.** A usable-for-your-own-wedding cut is **Phases 0–2 + 7 ≈ 35 days**.

### Suggested release gates

| Release | Contains | Who can use it |
|---|---|---|
| **M1 — Private alpha** | Phases 0–2 + minimal dashboard | You, for your own wedding |
| **M2 — Closed beta** | + Phases 3, 4, 5 | 5–10 invited couples |
| **M3 — Public beta** | + Phases 6, 7, 8 | Open sign-up, free |
| **M4 — GA** | + Phase 9 | Paid |

---

## 6. Non-goals for v1

Writing these down is what stops the project drifting to 200 days.

- Native mobile apps — responsive PWA only
- Offline **writes** — offline read of the day-of pack only
- Multi-currency within one wedding
- Localisation beyond English (schema is ready; UI is not)
- Vendor self-service portal (vendors logging in to update their own rows)
- In-app messaging or comment threads
- Automated seating optimisation
- AI features of any kind
- Photo galleries / albums
- Website builder for the couple
- Planner multi-wedding org hierarchy *(explicitly deferred — see D1)*

---

## 7. Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| **R1** | **RLS gap leaks another couple's data.** The single existential risk in a multi-tenant app. | Critical | pgTAP suite per table from Phase 0.7; CI blocks merge; quarterly review; never ship a table without a policy test |
| **R2** | Coordinator sees money because column grants don't work per-user in Supabase (§4.6) | High | Row-denial design decided upfront; pgTAP test 8.5 |
| **R3** | Public RSVP endpoint abused — token enumeration, spam, headcount tampering | High | UUIDv4 tokens, RPC-only access, server-side bounds validation, Turnstile, submission audit log |
| **R4** | Template drift — improving the question bank doesn't reach existing weddings | Medium | Snapshot `template_version` on seed; later add an opt-in "pull new items" diff screen |
| **R5** | Money rounding errors from float arithmetic | High | `bigint` minor units end to end; zod rejects non-integers; golden-fixture test 2.9 |
| **R6** | Derived-value logic diverges from the workbook and users lose trust in the numbers | High | Views not client maths; fixture tests from the already-reconciled workbook |
| **R7** | Scope creep across 27 sheets stalls delivery | High | Generic checklist module (6.1); non-goals list; release gates |
| **R8** | **Day-of failure — venue has no signal and the coordinator has nothing** | High | Printable pack (8.6) is the real mitigation; PWA cache is secondary. *Never let the day depend on connectivity.* |
| **R9** | Date-offset regeneration overwrites manually adjusted dates | Medium | Store both `offset_days` and `date_overridden` flag; never re-date an overridden row |
| **R10** | Legal/registration content is treated as advice | Medium | Keep the workbook's VERIFY pattern; jurisdiction disclaimer on the module; never assert requirements as fact |
| **R11** | Supabase free-tier project pauses after inactivity mid-beta | Low | Paid tier from M2 onward |
| **R12** | Two users edit the same record simultaneously | Low | `updated_at` optimistic concurrency; last-write-wins is acceptable at this scale |

### 7.1 Why the RLS test suite is listed as a Phase 0 deliverable

In a Supabase app there is no server layer to catch an authorisation mistake. A missing `USING` clause is a data breach, not a bug. The harness must exist **before** the first domain table, so that "add a table" always means "add a table and its policy test". Retrofitting this after 30 tables never happens.

---

## 8. Open decisions

| ID | Decision needed | Options | Recommendation |
|---|---|---|---|
| **D1** | Planner (multi-wedding) support | Build now / design-for-later / never | **Design-for-later.** `wedding_members` already supports a user across weddings; add an `orgs` layer post-GA only if planners actually ask. |
| **D2** | Template traditions at launch | Poruwa only / +Christian +Hindu +Muslim | **Poruwa only for M1–M3.** Adding traditions is content work, not code, once §1 is built. |
| **D3** | Pricing | Free / one-off per wedding / subscription | **One-off per wedding, paid at ~90 days out.** A wedding is a project, not a subscription; churn is 100% by design. |
| **D4** | Excel import on signup | Yes / guests-only / no | **Guests-only (4.2).** Importing a whole workbook is a support nightmare; the guest list is the painful part to retype. |
| **D5** | Realtime collaboration | Supabase Realtime / polling / none | **None in v1.** Two people rarely edit at once; revisit if beta shows conflicts. |
| **D6** | Where the day-of pack renders | Print CSS / client PDF / Edge Function PDF | **Print CSS.** Zero dependencies, works offline, and the browser already paginates. |

**Settled so far.** D2 — **Poruwa only** (2026-09-03). Template content (1.3) covers the
Poruwa tradition alone for M1–M3; other traditions are content work to add later, and
the `template` schema must not hard-code the assumption of a single tradition.

D1 and D3–D6 remain open. None of them block Phase 1.

---

## 9. Immediate next steps

1. **Approve or amend this plan** — particularly the non-goals (§6) and D1–D6.
2. **Run Phase 0** — foundations plus the RLS harness. Nothing domain-specific until 0.7 is green.
3. **Start template extraction (1.3) in parallel** — it is content work, independent of code, and it is the critical path. The workbook already holds every row; this is a scripted export to seed SQL, not authoring from scratch.
4. **Build Phase 2 against the golden fixture** — if `905,500 / 735,500` doesn't come out of the database, stop and fix it before building any UI on top.

---

### Appendix A — Derived vs stored, at a glance

| Value | Excel | Postgres | Why |
|---|---|---|---|
| Forecast | `IF(actual>0,...)` | generated column, STORED | Immutable expression |
| Paid | `SUMIFS(payments)` | view | Aggregate |
| Outstanding | `forecast - paid` | view | Depends on aggregate |
| Variance | `forecast - budgeted` | view (or generated) | Either works |
| Payment status | `IF(due<TODAY(),...)` | view | `current_date` is not immutable |
| Days to go | `date - TODAY()` | client or view | Never store |
| Readiness % | `COUNTIFS/COUNTIF` | view | Aggregate |
| Contingency | `sum × pct` | view | Depends on aggregate |
| Cater-for count | `confirmed × 1.05 + crew` | view | Aggregate + config |
| Alerts | 23 formulas | one view | See 7.1 |

### Appendix B — Table count

**~42 domain tables + 18 template tables + ~12 views.** Eighteen of the domain tables share one shape (§2), so the real modelling effort is concentrated in money (§4.2), vendors (§4.4) and guests (§4.5).
