# Build Prompt: PropBook (multi-account forex and prop-firm trading journal)

## How to use this file

Don't paste the whole thing into one session and ask for "everything". Large single-shot builds go wrong. Instead:

1. **Part A** is the permanent project context. In Phase 0 the agent copies it into `CLAUDE.md` at the repo root, so every later session loads it automatically.
2. **Part B** is the product and domain specification that every phase refers to.
3. **Part C** contains one prompt per phase. Run them **in order, one per session or PR**. Review and merge each phase before starting the next.

Each phase prompt ends with acceptance criteria and a required report, so you can check the work.

---

# PART A: Project context (becomes `CLAUDE.md`)

```markdown
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
- `src/app/(marketing)/...`  public pages (landing, pricing, public tools)
- `src/app/(auth)/...`       sign-in / callback
- `src/app/(app)/...`        authenticated app (layout enforces session)
- `src/app/api/...`          route handlers (Stripe webhook, import commit)
- `src/server/db/`           Drizzle schema, client, query modules (the ONLY place SQL lives)
- `src/server/actions/`      server actions (thin: auth → validate → call domain/query → revalidate)
- `src/domain/`              pure, framework-free TypeScript: metrics, rule engine, MT5 parser,
                             position sizing, copy-group matching. 100% unit-tested. No I/O.
- `src/components/`          UI; `src/components/ui` primitives
- `tests/fixtures/mt5/`      anonymised MT5 report fixtures
- `e2e/`                     Playwright specs

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
```

---

# PART B: Product and domain specification

## B1. Product summary

PropBook is a **trading journal for traders who run several accounts, especially prop-firm accounts**. Users:

- manage multiple trading accounts (personal broker, prop challenge, verification, funded, demo);
- record trades manually or import them from MT5 HTML reports;
- see a **combined dashboard** across all accounts and a **dashboard per account**;
- configure **prop-firm rules** per account and see live rule status (Rule Guard);
- size positions against remaining risk buffers ("Can I take this trade?");
- track **prop fees and payouts** and see real ROI (Prop Ledger);
- link mirrored accounts into **copy groups** so they journal one idea instead of five executions;
- tag, review, and analyse behaviour, with a **weekly review** ritual.

## B2. Plans and entitlements

| Capability | Free | Pro | Elite |
|---|---|---|---|
| Accounts | 1 active | Unlimited | Unlimited |
| Manual trades and MT5 import | ✓ | ✓ | ✓ |
| Journal, trade detail, tags | ✓ | ✓ | ✓ |
| Dashboards | ✓ | ✓ | ✓ |
| Analytics window | Last 90 days | All time | All time |
| Rule Guard and position sizer | Preview (read-only demo) | ✓ | ✓ |
| Prop Ledger and ROI | – | ✓ | ✓ |
| Copy groups | – | ✓ | ✓ |
| Weekly reviews | – | ✓ | ✓ |
| CSV export | ✓ (data portability is always free) | ✓ | ✓ |
| AI weekly summary, limit alerts, auto-sync | – | – | ✓ (later phases) |

Implement entitlements in one place, `src/server/entitlements.ts`, as `getEntitlements(userId)`. Server actions and queries check it. The UI uses it only to show upgrade prompts.

## B3. Data model

All tables have `id uuid pk default gen_random_uuid()`, `created_at`, and `updated_at`, and all user-owned tables carry `user_id uuid not null references auth.users`. Enable RLS on each with `user_id = auth.uid()` policies. Money is `numeric(18,2)`, prices are `numeric(18,6)`, and volume is `numeric(12,2)`.

**profiles**: `user_id pk`, `display_name`, `timezone` (IANA, default from the browser at signup), `week_starts_on` (0/1), `breakeven_threshold numeric(18,2) default 0`, `session_windows jsonb` (default Asia 00:00–08:00, London 07:00–16:00, New York 12:00–21:00 UTC; editable).

**accounts**
- `name`, `broker`, `platform` enum(`mt5`,`mt4`,`ctrader`,`other`)
- `account_number text null`: the platform login, used to match reports
- `server text null`, `currency char(3) not null`
- `kind` enum(`personal`,`prop_challenge`,`prop_verification`,`prop_funded`,`demo`)
- `prop_firm text null`, `program_name text null`
- `initial_balance numeric not null`
- `broker_timezone text not null`: IANA zone or `Etc/GMT±N`; default `Etc/GMT-2`, with a clear explanation in the UI
- `symbol_suffixes text[] default '{}'`: e.g. `{".r","m","+"}`, stripped when normalising symbols
- `status` enum(`active`,`passed`,`breached`,`archived`)
- `copy_group_id uuid null`
- `phase_parent_account_id uuid null`: links Phase 2 → Phase 1 → … for the lifecycle view
- Unique `(user_id, platform, account_number, server)` when `account_number` is not null.

**account_snapshots**: `account_id`, `as_of timestamptz`, `balance`, `equity null`, `source` enum(`mt5_report`,`manual`,`sync`). Only written when the value is **explicitly present** in a report or entered by the user.

**trades**
- `account_id not null`, `position_id text null`
- `source` enum(`manual`,`mt5_html`,`csv`,`sync`), `import_batch_id null`
- `symbol_raw text`, `symbol text` (normalised), `direction` enum(`buy`,`sell`)
- `volume`, `entry_price`, `stop_loss null`, `take_profit null`
- `open_time timestamptz not null`, `close_time timestamptz null` (null = open), `close_price null`
- `commission numeric default 0`, `swap numeric default 0`, `profit numeric null`
- `net_pnl numeric generated always as (coalesce(profit,0)+commission+swap) stored`
- `risk_amount numeric null`: initial risk in account currency (see B5)
- `r_multiple numeric null`
- `setup_tag_id null`, `rating smallint null` (1–5), `notes text`, `screenshot_paths text[]` (images in Supabase Storage, owner-only bucket)
- `trade_idea_id uuid null`
- **Unique index `(account_id, position_id)` where `position_id is not null`.**
- Indexes: `(user_id, open_time desc)`, `(account_id, open_time desc)`, `(account_id, close_time)`.

**tags**: `name`, `kind` enum(`setup`,`mistake`,`emotion`,`custom`), `color`; unique `(user_id, kind, lower(name))`.
**trade_tags**: `(trade_id, tag_id)` pk.

**import_batches**: `account_id`, `source`, `file_name`, `file_sha256`, `report_account_number null`, `report_generated_at null`, `rows_total`, `imported_count`, `duplicate_count`, `failed_count`, `errors jsonb` (array of `{row, positionId, field, message}`, with **no raw HTML**), `reverted_at null`.

**rule_templates** (global, read-only to users): `firm text null`, `program text`, `phase text`, `params jsonb`, `version int`, `last_reviewed_on date`, `source_note text`. Seed with **generic** templates: "Generic 2-step Phase 1 (10% target, 5% daily, 10% max)", "Generic 2-step Phase 2", "Generic 1-step (trailing)", "Generic funded". Firm-specific templates are added later through an admin script, always with `last_reviewed_on`.

**account_rules**: `account_id`, `rule_type` enum (see B6), `params jsonb` (validated with a per-type Zod schema), `enabled bool`, `template_id null`, `confirmed_at timestamptz null`. A rule only counts once the user has confirmed it.

**rule_events**: `account_id`, `rule_type`, `level` enum(`caution`,`danger`,`breached`), `occurred_at`, `trade_id null`, `details jsonb`. Written when an evaluation crosses a threshold. Idempotent per `(account_id, rule_type, level, trading_day)`.

**ledger_entries**: `account_id null`, `firm text`, `kind` enum(`challenge_fee`,`reset_fee`,`addon_fee`,`payout`,`refund`,`other_cost`,`other_income`), `amount numeric` (always positive; sign comes from `kind`), `currency char(3)`, `occurred_on date`, `note`.

**copy_groups**: `name`, `match_window_seconds int default 60`.
**trade_ideas**: `copy_group_id`, `symbol`, `direction`, `first_open_time`, `notes`, `setup_tag_id`. Tags on an idea propagate to its trades through `trade_idea_tags`, or tag resolution reads the idea's tags. Pick one approach and document it.

**journal_entries**: `account_id null`, `period` enum(`day`,`week`), `period_start date`, `content text`, `answers jsonb` (weekly prompts), `mood smallint null`; unique `(user_id, account_id, period, period_start)`.

**subscriptions**: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan` enum(`free`,`pro`,`elite`), `status`, `current_period_end`, `cancel_at_period_end`.

## B4. Symbols and instruments

- Normalise: uppercase, strip the account's configured suffixes, and strip common separators (`EUR/USD` → `EURUSD`). Always keep `symbol_raw`.
- An `instruments` reference table (`symbol`, `pip_size`, `asset_class`) is seeded for majors, minors, crosses, XAUUSD, XAGUSD, and major indices. Defaults: JPY-quoted pairs → 0.01, other FX → 0.0001, XAUUSD → 0.1 (configurable). Users can override per symbol in settings (`user_instrument_overrides`).
- Pips = `|close − entry| / pip_size` with a direction sign. If the symbol is unknown, show "–". Never guess.

## B5. Metric definitions (implement in `src/domain/metrics.ts`; document them in the UI with tooltips)

- **Net P&L** = profit + commission + swap. MT5 commission and swap are already signed.
- **Win / loss / breakeven:** a trade is a win if `net_pnl > threshold`, a loss if `net_pnl < −threshold`, and breakeven otherwise. Only closed trades count.
- **Win rate** = wins / (wins + losses). Breakevens are shown separately.
- **Profit factor** = Σ wins / |Σ losses|. Show "–" when there are no losses.
- **Expectancy** = mean net P&L per closed trade, plus mean R where R is available.
- **Average win, average loss, largest win, largest loss, average hold time, total trades, total volume.**
- **Balance curve** = initial balance plus cumulative net P&L of closed trades ordered by close time, plus non-trade balance operations if available.
- **Max drawdown** = the largest peak-to-trough fall of the balance curve, in currency and as % of the peak.
- **Risk amount (imported trades):** when the SL is set and `close_price ≠ entry`, derive the account-currency value per price unit from the trade itself:
  `value_per_unit = profit / ((close − entry) × dirSign)`, so `risk_amount = |entry − SL| × value_per_unit`.
  This avoids needing FX conversion tables. When it can't be derived, `risk_amount` stays null. Manual trades let the user enter it directly.
- **R-multiple** = net_pnl / risk_amount, or null.
- **Streaks:** longest win and loss streaks, and the current streak.
- **Multi-currency:** currency totals are **grouped by currency** when accounts differ. Percentages, counts and R-based metrics aggregate across currencies. Never convert with invented rates.
- **Copy-group dedupe:** analytics has a toggle "Count by: Executions | Trade ideas". In idea mode, P&L is summed per idea, and win/loss is decided from the idea's summed R (or the sign of its summed P&L when R is missing).

## B6. Rule engine (implement in `src/domain/rules/`)

A pure function:

```ts
evaluateRules(input: {
  account: { initialBalance: Decimal; currency: string };
  rules: ConfirmedRule[];
  trades: ClosedTrade[];          // this account only, sorted by close_time
  openTrades: OpenTrade[];        // for lot/exposure rules
  snapshots: AccountSnapshot[];   // optional explicit balance/equity points
  asOf: Date;
}): RuleStatus[]  // one per rule: { type, level: 'safe'|'caution'|'danger'|'breached', used, limit, remaining, basis, explanation, breachedAt?, breachingTradeId? }
```

Rule types and their params (each validated by Zod):
- `daily_loss`: `{ mode: 'percent'|'amount', value, basis: 'initial_balance'|'start_of_day_balance', reset_timezone, reset_time: 'HH:mm' }`
- `max_loss_static`: `{ mode, value }`. The floor is initial balance minus the limit.
- `max_loss_trailing`: `{ mode, value, trail_on: 'closed_balance', lock_at_initial: boolean }`. The floor trails the high-water mark and optionally stops trailing once it reaches the initial balance.
- `profit_target`: `{ mode, value }`
- `min_trading_days`: `{ days }`. A trading day is a day, in the rule's reset timezone, with at least one trade opened.
- `consistency`: `{ max_single_day_share_percent }`. The best day's profit divided by total profit must stay ≤ X%.
- `max_lots_per_trade`: `{ lots }`
- `weekend_holding_forbidden`: `{ weekend_start: 'Fri HH:mm', weekend_end: 'Sun HH:mm', timezone }`
- `require_stop_loss`: `{}`

Thresholds: **caution** at ≥ 50% of a loss limit used, **danger** at ≥ 80%, **breached** at ≥ 100% (these are user-adjustable per account). For targets and day counts, show progress instead of danger levels.

**Honesty labels:** any rule that a firm measures on equity, which we can only compute from closed trades, shows "Calculated from closed trades. Floating losses aren't visible until auto-sync." Every status shows "as of <latest close_time or snapshot>".

The engine must have exhaustive unit tests: boundaries at exactly 100%, day resets across DST changes, trailing floor locking, empty accounts, and trades closing exactly at the reset time.

## B7. Position sizer ("Can I take this trade?")

Inputs: account, symbol, direction, entry (optional), SL distance in pips **or** SL price, personal risk % (default from account settings), and value-per-pip-per-lot. Value per pip is pre-filled from the instrument when the account currency equals the quote currency, otherwise the user enters it. It is never fetched or guessed from external rates in v1.

Output:
- The **max lots** under each constraint: personal risk, remaining daily-loss buffer, remaining max-drawdown buffer, and the max-lots rule.
- The binding constraint, highlighted, with the resulting lots rounded **down** to the lot step.

Pure function in `src/domain/position-size.ts`.

## B8. Copy-group matching

When trades are created or imported into an account that's in a copy group, match them against other accounts in the same group: same normalised symbol, same direction, `|open_time difference| ≤ match_window_seconds`. Attach the match to the existing `trade_idea` or create a new one. This is deterministic and idempotent. Users can unlink or re-link a trade manually.

## B9. MT5 HTML import (detailed spec)

### File handling
- The client accepts `.html`/`.htm` only, checking the extension **and** content sniffing (it must contain `<table` and a recognisable report header). Max size 15 MB.
- Read it with `FileReader.readAsArrayBuffer` and **detect the encoding**. MT5 commonly writes **UTF-16LE with BOM**. Handle the UTF-16LE/BE BOM, UTF-8 BOM, and fall back to UTF-8. Decode with `TextDecoder`.
- Parse with `DOMParser` in the browser. **Nothing about the file leaves the browser** except the structured rows, the file name, and the SHA-256 hash (`crypto.subtle.digest`).
- The parser lives in `src/domain/mt5/parse-report.ts`. It takes a `Document` (or HTML string plus a DOM implementation) so it runs both in the browser and in Vitest via `linkedom` or `jsdom`.

### Locating the Positions table
- Find the **first** element whose trimmed text is exactly `Positions` and that acts as a section heading (typically a `<th>`/`<td>` with `colspan`, or a `<b>` inside one). Use the table that contains it.
- The **column header row** is the next row after the heading whose cells read (case-insensitive, whitespace-collapsed, `S / L` ≡ `S/L`):
  `Time | Position | Symbol | Type | Volume | Price | S/L | T/P | Time | Price | Commission | Swap | Profit`
- Data rows are the rows after the header row **until** the next section heading row (`Orders`, `Deals`, `Open Positions`, `Working Orders`, `Results`, `Summary`, etc.), a blank separator row, or the end of the table.
- Ignore every other table and section.
- If no Positions section or header row is found, show a clear error: "This doesn't look like an MT5 trade history report (no Positions table found)."

### Column mapping (resolved by header position, not by guessing)
Build a column index map from the header row, **expanding `colspan`** so each logical column gets the right index. The duplicate headers are resolved by order:

| Trade field | Source header |
|---|---|
| `position_id` | `Position` |
| `open_time` | 1st `Time` (before `Position`) |
| `symbol_raw` | `Symbol` |
| `direction` | `Type` (`buy`/`sell`; any other value fails the row) |
| `volume` | `Volume` |
| `entry_price` | 1st `Price` (between `Volume` and `S/L`) |
| `stop_loss` | `S/L` |
| `take_profit` | `T/P` |
| `close_time` | 2nd `Time` (after `T/P`) |
| `close_price` | 2nd `Price` (directly before `Commission`) |
| `commission` | `Commission` |
| `swap` | `Swap` |
| `profit` | `Profit` |

- For each data row, expand that row's `colspan` too, then read cells **by the mapped index**. If a cell is empty, the field is empty. **Never shift to a neighbouring cell.**
- If a data row's expanded cell count doesn't match the header's, fail that row ("unexpected column layout"). Don't attempt to realign it.
- Ignore cells with class `hidden` only if the header row also treats them that way. The expanded index logic must stay consistent between the header and the data rows. Write fixtures that cover this.

### Value parsing
- **Numbers:** strip spaces and non-breaking or thin spaces used as thousands separators (`1 234.56`). Accept a leading `-`. Reject anything else (no locale guessing; if a fixture shows comma decimals, add explicit support with a test). Keep values as strings into decimal.js.
- **Required:** `position_id` (non-empty, digits), `open_time`, `symbol`, `direction`, `volume > 0`, `entry_price > 0`.
- **Optional, blank allowed:** `stop_loss`, `take_profit` (blank **or `0`** means "not set"), `close_time`, `close_price`, `commission` (blank → 0), `swap` (blank → 0), `profit`.
- If `close_time` is present then `close_price` and `profit` must be present, and `close_time ≥ open_time`. Otherwise the row fails.
- **Dates:** MT5 format `YYYY.MM.DD HH:mm[:ss]`. These are **broker server time**. Convert to UTC with the selected account's `broker_timezone`. The review step shows the time zone it used, with a link to change it in account settings, and re-parses when it changes.

### Report header and summary (optional extraction, never fabricated)
- From the header block, extract `Account` (login number, plus currency in parentheses if present), `Name`, `Company`, `Date` **only when the labelled cell is present**.
- If the report's account number is present and the selected account has an `account_number` that **differs**, block the import with an explicit "Import anyway" override. If the selected account has no `account_number`, offer to save the detected one.
- From the Results/Summary section, extract `Balance` and `Equity` **only if** those exact labels exist with a parseable value. Offer to save them as an `account_snapshot` (the user opts in, and the default is on). Never derive drawdown or balance values that aren't printed.

### Review step (before saving)
- Summary chips: rows found, valid, invalid, **already imported** (a pre-check against the server for the selected account's existing `position_id`s), and new.
- A table (cards on mobile) showing **every mapped column, including Position ID**, with invalid rows highlighted and their reason. Filter: All / New / Duplicates / Errors.
- A re-import warning if the same `file_sha256` was already imported into this account, with the date.
- Buttons: "Import N new trades" (disabled when N = 0) and "Cancel".

### Commit (server)
- `POST /api/imports` (route handler) with `{ accountId, fileName, fileSha256, reportMeta, snapshot?, rows[] }`. Rows are capped at 5,000 per request; the client chunks larger reports.
- The server checks auth and account ownership, applies entitlement checks, **re-validates every row with Zod**, recomputes normalised symbols, `risk_amount`, and `r_multiple`, and converts times.
- In a single transaction: create the `import_batch`, then `INSERT … ON CONFLICT (account_id, position_id) WHERE position_id IS NOT NULL DO NOTHING RETURNING id, position_id`. Duplicates = submitted − inserted − failed. This holds up against double-submits and concurrent imports.
- Then run copy-group matching for the inserted trades, rule evaluation for the account (writing `rule_events`), and update the batch counts.
- Response: `{ batchId, imported, skippedDuplicate, failed, errors[] }`. The UI shows a result screen with the three counts and links to "View imported trades" (a journal filtered by batch) and "Undo import".
- **Undo:** deletes the trades from that batch (only that batch, only that account) and sets `reverted_at`.

### Tests (required)
- Fixtures: UTF-16LE and UTF-8 files; a single row; many rows; blank SL/TP/commission/swap; still-open positions (no close time); a hidden/colspan layout; a report with a second Positions-like table later (it must be ignored); thousands separators; malformed dates; unknown type; wrong file. **All fixtures anonymised.**
- Server tests: duplicate import into the same account (skipped), the same position ID in a different account (allowed), a concurrent double submit (no duplicates), and an account that doesn't belong to the user (403).

## B10. Pages and routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing | Prop-trader positioning, demo screenshots, pricing teaser |
| `/pricing` | Plans | Stripe Checkout entry |
| `/tools/prop-roi-calculator` | Public ROI calculator | No signup, inputs stay in the page (no storage), CTA to sign up |
| `/tools/position-size-calculator` | Public sizer | Stripped-down B7 |
| `/sign-in`, `/auth/callback` | Auth | |
| `/dashboard` | **All-accounts dashboard** | KPI tiles (per currency), Rule Guard summary for every prop account, combined balance curve per currency, recent trades across accounts with an account badge |
| `/accounts` | Account list | Cards with kind, status, balance as of, rule status pill |
| `/accounts/new` | Create account | Template picker for prop kinds |
| `/accounts/[accountId]` | **Account dashboard** | Everything scoped to this account: KPIs, balance curve, Rule Guard detail, recent trades for this account only, lifecycle |
| `/accounts/[accountId]/settings` | Account settings and rules | Broker timezone, suffixes, rules editor with confirm step |
| `/journal` | Trade journal | Search (symbol, notes, position ID), filters (account, date range, direction, result, tags, setup, session, source, import batch), sort, pagination; cards on mobile |
| `/trades/new` | Manual trade entry | Account select (required), all trade fields, tags, notes, screenshots |
| `/trades/[tradeId]` | Trade detail and edit | Metrics, R, pips, tags, notes, screenshots, linked idea |
| `/import` | MT5 import wizard | Account select → file → review → result |
| `/analytics` | Analytics | Account filter (all or one), date range, executions/ideas toggle |
| `/reviews`, `/reviews/[weekStart]` | Weekly reviews | |
| `/prop` | Prop Ledger and ROI | Entries CRUD, per-firm ROI, lifecycle board |
| `/copy-groups` | Copy groups | Manage groups, unmatched trades |
| `/settings` | Profile, tags, instruments, billing, export, delete account | |

## B11. UX standards

- App shell: a sidebar on desktop, and a top bar plus bottom navigation on mobile (Dashboard, Journal, Add, Accounts, More). A global **account switcher** sets the account filter in the URL (`?account=`) so filtered views are shareable and back-button friendly.
- Data tables are tables on desktop and **cards below `md`**. Card fields: symbol, direction badge, open→close time, net P&L (coloured and signed, with a text sign as well, never colour alone), R, account badge, tags.
- P&L colour tokens work in both light and dark themes, and every number is formatted with the account currency.
- Forms: inline validation messages tied to inputs with `aria-describedby`; submit buttons show a pending state; mutations use optimistic UI only where rollback is simple.
- Empty states always offer the next action: "No trades yet. Import an MT5 report or add a trade."
- Charts: Recharts inside responsive containers, with an accessible summary and a "View as table" toggle.

---

# PART C: Phase prompts (run one at a time)

Each prompt assumes Part A is in `CLAUDE.md` and Part B is in `docs/build-prompt.md`.

## Phase 0: Foundation

```
Read CLAUDE.md-to-be (Part A of docs/build-prompt.md) and Part B.

1. Scaffold a Next.js App Router + TypeScript (strict) + Tailwind project with pnpm, ESLint, Prettier,
   Vitest, Playwright. Add scripts: dev, build, lint, typecheck, test, e2e, db:generate, db:migrate.
2. Create CLAUDE.md at the repo root containing Part A verbatim.
3. Set up Supabase (env vars in .env.example only, never commit secrets), Drizzle schema for ALL tables in
   Part B §B3 (including the partial unique index on trades(account_id, position_id) and the generated
   net_pnl column), RLS policies, and seed data for instruments and generic rule_templates.
4. Supabase Auth with magic link + Google; middleware protecting (app) routes; profile row created on
   first sign-in with the browser time zone.
5. App shell (sidebar / mobile bottom nav), theme tokens (light/dark), UI primitives (Button, Input,
   Select, Dialog, Sheet, Badge, Card, Table, Tabs, Toast, Skeleton, EmptyState), and route metadata.
6. Implement src/server/entitlements.ts (everyone is 'free' until billing exists) and a helper
   `requireAccount(userId, accountId)` that every account-scoped query uses.

Acceptance: sign-in works locally; /dashboard renders an empty state; migrations apply cleanly to a
fresh DB; lint/typecheck/test/build pass; no horizontal scroll at 360px.
Report: files created, env vars needed, migration commands, anything unverified.
```

## Phase 1: Accounts, manual trades, journal

```
Implement accounts CRUD (/accounts, /accounts/new, account settings basics: broker timezone, suffixes,
currency, kind, prop firm/program, account number), manual trade entry (/trades/new) with required
account selection, trade detail/edit (/trades/[tradeId]), tags (setup/mistake/emotion/custom) management
and tagging, and the /journal page with search, filters (Part B §B10), sort and pagination. Mobile uses
cards; desktop uses a table that scrolls inside its own container.

Put metric calculations in src/domain/metrics.ts per §B5 with full unit tests (risk_amount derivation,
R, win/loss/BE threshold, profit factor edge cases, drawdown). Symbol normalisation per §B4 with tests.

Enforce Free plan account limit server-side. Every query scoped per CLAUDE.md rules 1–2.

Acceptance: create 2 accounts, add trades to each, journal filter by account shows only that account's
trades; editing a trade of another user's account returns 404/403 (add a test); Playwright spec for
create-account → add-trade → find it in journal at 375px and 1280px with no horizontal scroll.
```

## Phase 2: MT5 HTML import

```
Implement the MT5 import exactly as specified in Part B §B9: browser-only parsing with encoding
detection, header-driven column mapping with colspan expansion, strict per-row validation, broker
timezone conversion, report-header account-number check, optional Balance/Equity snapshot only when
explicitly present, review step showing every mapped column including Position ID, duplicate
pre-check, server commit with ON CONFLICT DO NOTHING in a transaction, result screen with
imported/skipped-duplicate/failed counts, and batch undo.

Create the anonymised fixtures listed in §B9 under tests/fixtures/mt5/ (build realistic synthetic
reports that mirror the MT5 structure; include a UTF-16LE file). Unit-test the parser against all
fixtures and integration-test the commit endpoint (duplicates, cross-account, concurrency, ownership).

Confirm in code review that the uploaded file is never sent to the server, logged, or stored.

Acceptance: importing the same report twice yields 0 new / N duplicates; a single-row report creates
exactly one trade; blank SL/TP don't shift columns; wrong-account report is blocked unless overridden;
Playwright spec covers upload → review → import → undo on mobile and desktop.
```

## Phase 3: Dashboards

```
Build /dashboard (all accounts, intentionally aggregated via *AllAccounts query functions) and
/accounts/[accountId] (strictly scoped). Include KPI tiles (net P&L per currency, win rate, profit
factor, expectancy, avg R, max drawdown, trades), balance curve, recent trades (account badge on the
combined view; account-only on the account view), calendar heatmap of daily P&L, and loading/empty/error
states. Use the domain metrics module; do not compute metrics in components. Follow the dataviz
guidance for colours and accessible chart alternatives.

Acceptance: a trade added to account A appears in the combined dashboard and A's dashboard, never in
B's; multi-currency accounts show per-currency totals; tests for the scoping.
```

## Phase 4: Prop features (Rule Guard, position sizer, ledger)

```
Implement the rule engine (§B6) as pure, exhaustively tested domain code; the rules editor in account
settings (pick template → review values → confirm; user can edit any value; show template
last_reviewed_on and "verify with your firm"); Rule Guard panels on the account dashboard and a summary
on /dashboard with honesty labels and "as of" timestamps; rule_events written idempotently after trade
create/import/edit/delete; the position sizer (§B7) on the account page and the public
/tools/position-size-calculator; the Prop Ledger at /prop with per-firm ROI, pass rate, cost per
funded account and an account lifecycle board; the public /tools/prop-roi-calculator.
Gate Pro features via entitlements (server-side), with a read-only demo for Free users.

Acceptance: unit tests cover all rule types and the boundary cases listed in §B6; importing a losing
day that crosses 80% of a daily limit shows Danger with the causing trade; ledger ROI matches a
hand-calculated example in a test.
```

## Phase 5: Analytics, weekly reviews, copy groups

```
Build /analytics: account filter (all or one), date range, executions/ideas toggle; breakdowns by
symbol, session (profile session_windows), weekday, hour, setup, mistake tag (with "mistake cost"),
hold-time buckets, direction; after-loss performance (trades opened within 60 min after a loss) and
overtrading days (trade count > user's 90th percentile); performance when an account was in
caution/danger. Free plan limited to the last 90 days server-side.

Weekly reviews: generate /reviews/[weekStart] from the user's week (profile week_starts_on and
timezone): numbers, best/worst trades, rule near-misses, top mistake by cost, three prompts saved to
journal_entries.answers.

Copy groups (§B8): CRUD, matching on create/import, idea view in the journal, manual link/unlink,
idea-mode analytics.

Acceptance: unit tests for each analytics aggregation and the matcher (window edges, idempotency);
toggling ideas mode changes trade counts as expected on a fixture with 3 mirrored accounts.
```

## Phase 6: Billing, marketing site, data portability

```
Stripe: products/prices for Pro and Elite (monthly/annual) via env-configured price IDs, Checkout,
Customer Portal, webhook route handler (verify signature, idempotent upserts to subscriptions),
14-day Pro trial without card, entitlements now read from subscriptions. Landing page and /pricing
using the positioning in docs/product-strategy.md, with honest copy (no performance claims, a
"not financial advice" footer). CSV export of trades/ledger (all plans). Account deletion that
removes all user data and storage objects after a typed confirmation.

Acceptance: webhook tests with Stripe fixtures; downgrade keeps data but re-locks Pro features;
export round-trips all trade fields including position_id.
```

## Phase 7: Hardening

```
Run an accessibility pass (keyboard-only walkthrough of every page, axe checks in Playwright), a
responsive pass at 360/375/768/1280 with the no-horizontal-scroll assertion on every route, a security
pass (ownership checks on every action/route, RLS policies reviewed, headers/CSP, rate limiting on
import and auth), performance (indexes used by journal/analytics queries, pagination everywhere,
streaming with Suspense), error monitoring hook-up, and README with setup/migration/deploy steps.

Report: findings fixed, findings deferred, and the final verification checklist with results.
```

## Later phases (backlog)

- MT4 statement and cTrader import; a generic CSV column-mapping wizard reusing the review/commit pipeline
- Auto-sync for MT4/MT5 accounts through a broker-connection API (Elite; budget the per-account cost)
- Email/push alerts when an account enters Danger
- AI weekly summary (Elite), descriptive only, built on the review data, with the user's opt-in
- Firm-specific rule templates maintained through an admin tool, each with `last_reviewed_on`
- Mentor/student read-only sharing
