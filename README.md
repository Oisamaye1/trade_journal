# PropBook

A multi-account trading journal for forex and prop-firm traders. Product strategy:
[`docs/product-strategy.md`](docs/product-strategy.md). Build plan and spec:
[`docs/build-prompt.md`](docs/build-prompt.md). Engineering rules: [`CLAUDE.md`](CLAUDE.md).

**Status:** Phase 0 (foundation): auth, schema, app shell, design system.

## Stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Radix UI ·
Supabase (Auth + Postgres) · Drizzle ORM · Zod · Vitest · Playwright

## Setup

Requirements: Node 20.9+, pnpm 10, and a Supabase project (hosted, or local via Docker).

```bash
pnpm install
```

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable                               | Where to find it                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase → Project Settings → API (local: `http://127.0.0.1:54321`)             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API keys → publishable key                        |
| `DATABASE_URL`                         | Supabase → Connect → ORMs. On Vercel use the **transaction pooler** (port 6543) |
| `NEXT_PUBLIC_SITE_URL`                 | Your app URL (`http://localhost:3000` locally)                                  |

Apply the schema and reference data:

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

Run the app:

```bash
pnpm dev
```

### Supabase Auth configuration

- **Authentication → URL Configuration:** set Site URL to your app URL and add
  `<your app URL>/**` to Redirect URLs (for example `http://localhost:3000/**`).
- **Magic link:** works out of the box. For production, configure custom SMTP (Supabase's
  built-in mailer is rate-limited).
- **Google:** enable under Authentication → Sign In / Providers → Google with an OAuth client from
  Google Cloud. The authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
  Until it's enabled, "Continue with Google" falls back to a friendly error.

### Local Supabase (optional)

With Docker running, `pnpm supabase:start` launches Auth, Postgres, the API gateway and Mailpit
(magic-link emails at http://127.0.0.1:54324). Use the URL and publishable key it prints, and
`DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Scripts

| Command                                        | What it does                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`       | Next.js dev server / production build / serve                         |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | ESLint / route typegen + `tsc` / Prettier                             |
| `pnpm test`                                    | Vitest. DB integration tests also run when `TEST_DATABASE_URL` is set |
| `pnpm e2e`                                     | Playwright on a production build (see below)                          |
| `pnpm db:generate --name <change>`             | Generate a migration from `src/server/db/schema.ts`                   |
| `pnpm db:migrate` / `pnpm db:seed`             | Apply migrations / load reference data (idempotent)                   |

## Tests

- **DB integration tests** cover RLS isolation, the composite-FK tenant guarantees, the
  Position-ID duplicate guard, and the app's ownership query. Point `TEST_DATABASE_URL` at a
  migrated database. Plain Postgres also works: apply `tests/db/supabase-auth-shim.sql` first.
  Never run that shim on Supabase.
- **E2E** builds the app and runs it against `e2e/support/mock-auth-server.ts`, a test-only stub of
  the Supabase Auth endpoints, plus a real Postgres from `E2E_DATABASE_URL`. This exercises the
  real sign-in code paths (server action, PKCE callback, proxy, JWT verification) on mobile and
  desktop viewports. Set `PLAYWRIGHT_CHROMIUM_PATH` if Playwright's bundled Chromium isn't installed.

## Deploying (Vercel)

Set the four env vars in the Vercel project (use the pooler `DATABASE_URL`), run
`pnpm db:migrate && pnpm db:seed` against the production database, and add the deployed URL to
Supabase's redirect URLs.
