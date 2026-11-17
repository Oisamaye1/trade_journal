# PropBook: engineering context

## What this is

PropBook is a responsive web app for forex and prop-firm traders. It records trades across multiple
trading accounts (manual entry or MT5 HTML report import), shows combined and per-account dashboards,
tracks prop-firm rules (daily loss, drawdown, targets) and a prop fee/payout ledger, and provides
journaling and behaviour analytics. Full spec: docs/build-prompt.md (Part B). Strategy: docs/product-strategy.md.

## Stack (do not swap without asking)

- Next.js (App Router, React Server Components, Server Actions), TypeScript strict mode
- Tailwind CSS; shadcn/ui-style components built on Radix primitives in `src/components/ui`
- PostgreSQL on Supabase; Supabase Auth (email magic link + Google)
- Drizzle ORM + drizzle-kit SQL migrations in `drizzle/` (committed, never edited after merge)
- Zod for every input boundary (forms, server actions, route handlers, import rows, rule params)
- decimal.js for all money/price math on the server and in shared domain code
- Recharts for charts; date-fns + date-fns-tz for time
- Stripe (Checkout + Customer Portal + webhooks) for billing
- Vitest for unit tests, Playwright for end-to-end tests
- pnpm; deploy target Vercel

## Directory conventions

- `src/app/(marketing)/...` public pages (landing, pricing, public tools)
- `src/app/(auth)/...` sign-in / callback
- `src/app/(app)/...` authenticated app (layout enforces session)
- `src/app/api/...` route handlers (Stripe webhook, import commit)
- `src/server/db/` Drizzle schema, client, query modules (the ONLY place SQL lives)
- `src/server/actions/` server actions (thin: auth → validate → call domain/query → revalidate)
- `src/domain/` pure, framework-free TypeScript: metrics, rule engine, MT5 parser,
  position sizing, copy-group matching. 100% unit-tested. No I/O.
- `src/components/` UI; `src/components/ui` primitives
- `tests/fixtures/mt5/` anonymised MT5 report fixtures
- `e2e/` Playwright specs

## Non-negotiable rules

1. **Tenant isolation.** Every query on user data filters by the authenticated `user_id`, and every
   account-scoped query also filters by `account_id` after verifying that account belongs to the user.
   Never trust an `account_id`/`trade_id` from the client without the ownership check. RLS is enabled on
   all user tables as defence-in-depth.
2. **Only the all-accounts dashboard and cross-account analytics aggregate across accounts**, and they
   do so intentionally through dedicated query functions named `*AllAccounts`.
3. **Parameterised queries only** (Drizzle query builder or `sql` template tags). No string-built SQL.
4. **Server-side validation** with Zod on every mutation, even if the client validated too.
5. **Money is never a JS float in storage or math.** DB uses `numeric`; domain code uses decimal.js;
   values cross the wire as strings. Format only at the UI edge.
6. **Times are stored as UTC `timestamptz`.** Broker/server-time conversion happens at import using the
   account's configured broker time zone. Display in the user's profile time zone.
7. **Never store uploaded report files** (not in DB, storage, logs, or analytics). Parse in the browser,
   send structured rows. Storing a SHA-256 hash of the file is allowed (for re-import warnings).
8. **No app data in localStorage/sessionStorage/IndexedDB.** Persist preferences in the DB (or a cookie
   for purely presentational prefs like theme).
9. **Mobile-first, no horizontal page scroll** at 360px width. Wide tables become card lists below `md`.
   Tables that remain must scroll inside their own container, never the page.
10. **Accessibility:** semantic HTML, labelled inputs, visible focus, full keyboard operation, ARIA only
    when semantics are insufficient, WCAG AA contrast, charts have a text/table alternative.
11. **Every page has loading, empty, and error states.**
12. **Every route exports metadata** (`metadata` or `generateMetadata`) with a specific title and
    description; authenticated pages are `noindex`.
13. **Domain logic is pure and tested.** Don't put rule/metric/parse logic in components or actions.
14. **No financial advice.** Copy is descriptive. Rule templates are user-confirmed starting points.
15. Entitlements (plan limits) are enforced on the server, not only hidden in the UI.

## Before changing anything

Read the relevant schema (`src/server/db/schema.ts`), query module, and existing components first. Extend
existing patterns; don't create parallel ones. If a migration is needed, generate it with drizzle-kit and
commit it.

## Checks to run before declaring work done

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus the relevant Playwright specs. For UI work,
open the affected pages in a browser at 375px and 1280px widths and confirm there's no horizontal scroll
(`document.documentElement.scrollWidth <= window.innerWidth`).
In the final report, state what you verified, what you couldn't verify, and any required
configuration/migrations/env vars.

## Phase 0 implementation notes (these refine the rules above)

@AGENTS.md

- **Next.js 16**: middleware is `src/proxy.ts`. **Cache Components** and Partial Prefetching are on:
  anything that reads cookies/session/DB must render inside `<Suspense>` (see the dashboard page
  pattern). `getCurrentUser()` calls `connection()` so session checks never run during prerender.
  Route prop types (`PageProps<"/x">`, `LayoutProps`) come from `next typegen` (run by `pnpm typecheck`).
  Read `node_modules/next/dist/docs/` before using an unfamiliar Next API.
- **Migrations** live in `drizzle/` (drizzle-kit, not `supabase/migrations`). Workflow: edit
  `src/server/db/schema.ts` → `pnpm db:generate --name <change>` → `pnpm db:migrate` → commit the SQL.
  `pnpm db:seed` (idempotent) loads instruments + generic rule templates.
- **Tenant integrity in the DB**: child tables use composite FKs `(account_id, user_id) →
accounts(id, user_id)`; keep that pattern for new account-scoped tables. RLS policies are declared
  in the schema with `pgPolicy`; every new user table needs `ownerPolicy(...)` and `.enableRLS()`.
- **Duplicate imports**: `trades` has `unique (account_id, position_id)` (NULLs distinct), so use
  `onConflictDoNothing({ target: [trades.accountId, trades.positionId] })`.
- **Auth**: `src/server/auth.ts` is the Data Access Layer (`requireUser()`); account access goes
  through `requireAccount()` / `findOwnedAccount()` in `src/server/queries/accounts.ts`.
  Plan limits: `getEntitlements()` in `src/server/entitlements.ts` (pure logic in `src/domain/entitlements.ts`).
- **Navigation**: `src/components/app-shell/nav-config.ts`. Set `available: true` on an item in the
  phase that ships its route; unavailable items render as disabled "Soon" entries, never 404 links.
- **Server → client props**: never pass functions/components (e.g. lucide icons) from a Server
  Component to a Client Component; pass keys or render the icon in the client component.
- **Tests**: unit/integration with Vitest (`pnpm test`; DB tests run when `TEST_DATABASE_URL` is set).
  E2E with Playwright (`pnpm e2e`) runs the production build against `e2e/support/mock-auth-server.ts`,
  a TEST-ONLY Supabase Auth stub, plus a real Postgres (`E2E_DATABASE_URL`). Plain Postgres needs
  `tests/db/supabase-auth-shim.sql` applied before migrating — never run that shim on Supabase.
