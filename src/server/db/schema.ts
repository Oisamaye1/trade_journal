/**
 * PropBook database schema (Drizzle). Source of truth for `drizzle/` migrations.
 *
 * Conventions (see CLAUDE.md):
 * - Every user-owned table has `user_id` → auth.users(id) ON DELETE CASCADE and an RLS policy
 *   restricting rows to `auth.uid()`. The app server connects with a privileged role and therefore
 *   ALSO filters by user_id explicitly in every query (RLS is defence-in-depth for the Data API).
 * - Tables that reference an account use a composite FK (account_id, user_id) → accounts(id, user_id)
 *   so a row can never point at another user's account, even through a buggy query.
 * - Money: numeric(18,2). Prices: numeric(18,6). Volume: numeric(12,2). Drizzle returns numerics as
 *   strings; convert with decimal.js, never with Number().
 * - Times: timestamptz in UTC.
 */
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  char,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/* ------------------------------------------------------------------------------------------------
 * Enums
 * ---------------------------------------------------------------------------------------------- */

export const platformEnum = pgEnum("platform", ["mt5", "mt4", "ctrader", "other"]);
export const accountKindEnum = pgEnum("account_kind", [
  "personal",
  "prop_challenge",
  "prop_verification",
  "prop_funded",
  "demo",
]);
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "passed",
  "breached",
  "archived",
]);
export const snapshotSourceEnum = pgEnum("snapshot_source", ["mt5_report", "manual", "sync"]);
export const tradeSourceEnum = pgEnum("trade_source", ["manual", "mt5_html", "csv", "sync"]);
export const directionEnum = pgEnum("direction", ["buy", "sell"]);
export const tagKindEnum = pgEnum("tag_kind", ["setup", "mistake", "emotion", "custom"]);
export const ruleTypeEnum = pgEnum("rule_type", [
  "daily_loss",
  "max_loss_static",
  "max_loss_trailing",
  "profit_target",
  "min_trading_days",
  "consistency",
  "max_lots_per_trade",
  "weekend_holding_forbidden",
  "require_stop_loss",
]);
export const ruleLevelEnum = pgEnum("rule_level", ["caution", "danger", "breached"]);
export const ledgerKindEnum = pgEnum("ledger_kind", [
  "challenge_fee",
  "reset_fee",
  "addon_fee",
  "payout",
  "refund",
  "other_cost",
  "other_income",
]);
export const journalPeriodEnum = pgEnum("journal_period", ["day", "week"]);
export const planEnum = pgEnum("plan", ["free", "pro", "elite"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);
export const assetClassEnum = pgEnum("asset_class", [
  "fx",
  "metal",
  "index",
  "energy",
  "crypto",
  "other",
]);

/* ------------------------------------------------------------------------------------------------
 * Shared column helpers
 * ---------------------------------------------------------------------------------------------- */

const id = () => uuid("id").primaryKey().defaultRandom();
const userId = () =>
  uuid("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" });
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
const price = (name: string) => numeric(name, { precision: 18, scale: 6 });
const volume = (name: string) => numeric(name, { precision: 12, scale: 2 });

/** RLS: owner-only access for the `authenticated` role on any table with a user_id column. */
const ownerPolicy = (table: string, userIdColumn: AnyPgColumn) =>
  pgPolicy(`${table}_owner_all`, {
    as: "permissive",
    for: "all",
    to: authenticatedRole,
    using: sql`${authUid} = ${userIdColumn}`,
    withCheck: sql`${authUid} = ${userIdColumn}`,
  });

/** RLS: read-only reference data visible to any signed-in user. */
const authenticatedReadPolicy = (table: string) =>
  pgPolicy(`${table}_authenticated_read`, {
    as: "permissive",
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

/* ------------------------------------------------------------------------------------------------
 * Profiles & billing
 * ---------------------------------------------------------------------------------------------- */

export type SessionWindow = { name: string; startUtc: string; endUtc: string };

export const DEFAULT_SESSION_WINDOWS: SessionWindow[] = [
  { name: "Asia", startUtc: "00:00", endUtc: "08:00" },
  { name: "London", startUtc: "07:00", endUtc: "16:00" },
  { name: "New York", startUtc: "12:00", endUtc: "21:00" },
];

export const profiles = pgTable(
  "profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    timezone: text("timezone").notNull().default("UTC"),
    weekStartsOn: smallint("week_starts_on").notNull().default(1),
    breakevenThreshold: money("breakeven_threshold").notNull().default("0"),
    sessionWindows: jsonb("session_windows")
      .$type<SessionWindow[]>()
      .notNull()
      .default(DEFAULT_SESSION_WINDOWS),
    ...timestamps(),
  },
  (t) => [
    check("profiles_week_starts_on_check", sql`${t.weekStartsOn} in (0, 1)`),
    check("profiles_breakeven_threshold_check", sql`${t.breakevenThreshold} >= 0`),
    ownerPolicy("profiles", t.userId),
  ],
).enableRLS();

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    userId: userId().unique(),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    plan: planEnum("plan").notNull().default("free"),
    status: subscriptionStatusEnum("status"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    ...timestamps(),
  },
  (t) => [
    // Users may read their own subscription; only the server (Stripe webhook) writes it.
    pgPolicy("subscriptions_owner_read", {
      as: "permissive",
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.userId}`,
    }),
  ],
).enableRLS();

/* ------------------------------------------------------------------------------------------------
 * Reference data
 * ---------------------------------------------------------------------------------------------- */

export const instruments = pgTable(
  "instruments",
  {
    symbol: text("symbol").primaryKey(),
    assetClass: assetClassEnum("asset_class").notNull(),
    pipSize: numeric("pip_size", { precision: 18, scale: 8 }).notNull(),
    baseCurrency: char("base_currency", { length: 3 }),
    quoteCurrency: char("quote_currency", { length: 3 }),
    ...timestamps(),
  },
  (t) => [
    check("instruments_pip_size_check", sql`${t.pipSize} > 0`),
    authenticatedReadPolicy("instruments"),
  ],
).enableRLS();

export const userInstrumentOverrides = pgTable(
  "user_instrument_overrides",
  {
    id: id(),
    userId: userId(),
    symbol: text("symbol").notNull(),
    pipSize: numeric("pip_size", { precision: 18, scale: 8 }).notNull(),
    ...timestamps(),
  },
  (t) => [
    unique("user_instrument_overrides_user_symbol_key").on(t.userId, t.symbol),
    check("user_instrument_overrides_pip_size_check", sql`${t.pipSize} > 0`),
    ownerPolicy("user_instrument_overrides", t.userId),
  ],
).enableRLS();

/**
 * Global rule templates (read-only to users). `params` holds `{ rules: [{ ruleType, params }] }`
 * validated by `ruleTemplateParamsSchema` in src/domain/rules/params.ts.
 */
export const ruleTemplates = pgTable(
  "rule_templates",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    firm: text("firm"),
    program: text("program").notNull(),
    phase: text("phase").notNull(),
    params: jsonb("params").notNull(),
    version: integer("version").notNull().default(1),
    lastReviewedOn: date("last_reviewed_on").notNull(),
    sourceNote: text("source_note").notNull(),
    ...timestamps(),
  },
  () => [authenticatedReadPolicy("rule_templates")],
).enableRLS();

/* ------------------------------------------------------------------------------------------------
 * Accounts
 * ---------------------------------------------------------------------------------------------- */

export const copyGroups = pgTable(
  "copy_groups",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    matchWindowSeconds: integer("match_window_seconds").notNull().default(60),
    ...timestamps(),
  },
  (t) => [
    unique("copy_groups_id_user_key").on(t.id, t.userId),
    check("copy_groups_match_window_check", sql`${t.matchWindowSeconds} between 1 and 3600`),
    ownerPolicy("copy_groups", t.userId),
  ],
).enableRLS();

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    broker: text("broker"),
    platform: platformEnum("platform").notNull().default("mt5"),
    accountNumber: text("account_number"),
    server: text("server"),
    currency: char("currency", { length: 3 }).notNull(),
    kind: accountKindEnum("kind").notNull().default("personal"),
    propFirm: text("prop_firm"),
    programName: text("program_name"),
    initialBalance: money("initial_balance").notNull(),
    brokerTimezone: text("broker_timezone").notNull().default("Etc/GMT-2"),
    symbolSuffixes: text("symbol_suffixes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    status: accountStatusEnum("status").notNull().default("active"),
    copyGroupId: uuid("copy_group_id").references(() => copyGroups.id, { onDelete: "set null" }),
    phaseParentAccountId: uuid("phase_parent_account_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    // Target for composite FKs that pin child rows to the same owner.
    unique("accounts_id_user_key").on(t.id, t.userId),
    uniqueIndex("accounts_user_platform_number_server_key")
      .on(t.userId, t.platform, t.accountNumber, t.server)
      .where(sql`${t.accountNumber} is not null`),
    index("accounts_user_idx").on(t.userId),
    foreignKey({
      name: "accounts_phase_parent_fk",
      columns: [t.phaseParentAccountId],
      foreignColumns: [t.id],
    }).onDelete("set null"),
    check("accounts_initial_balance_check", sql`${t.initialBalance} > 0`),
    check("accounts_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    ownerPolicy("accounts", t.userId),
  ],
).enableRLS();

/** Composite FK helper: (account_id, user_id) → accounts(id, user_id) ON DELETE CASCADE. */
const accountOwnerFk = (name: string, accountIdCol: AnyPgColumn, userIdCol: AnyPgColumn) =>
  foreignKey({
    name,
    columns: [accountIdCol, userIdCol],
    foreignColumns: [accounts.id, accounts.userId],
  }).onDelete("cascade");

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    balance: money("balance").notNull(),
    equity: money("equity"),
    source: snapshotSourceEnum("source").notNull(),
    ...timestamps(),
  },
  (t) => [
    accountOwnerFk("account_snapshots_account_fk", t.accountId, t.userId),
    index("account_snapshots_account_as_of_idx").on(t.accountId, t.asOf.desc()),
    ownerPolicy("account_snapshots", t.userId),
  ],
).enableRLS();

/* ------------------------------------------------------------------------------------------------
 * Tags, imports, trades
 * ---------------------------------------------------------------------------------------------- */

export const tags = pgTable(
  "tags",
  {
    id: id(),
    userId: userId(),
    name: text("name").notNull(),
    kind: tagKindEnum("kind").notNull(),
    color: text("color"),
    ...timestamps(),
  },
  (t) => [
    unique("tags_id_user_key").on(t.id, t.userId),
    uniqueIndex("tags_user_kind_name_key").on(t.userId, t.kind, sql`lower(${t.name})`),
    ownerPolicy("tags", t.userId),
  ],
).enableRLS();

export type ImportRowError = {
  row: number;
  positionId: string | null;
  field: string | null;
  message: string;
};

export const importBatches = pgTable(
  "import_batches",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    source: tradeSourceEnum("source").notNull(),
    fileName: text("file_name").notNull(),
    fileSha256: char("file_sha256", { length: 64 }).notNull(),
    reportAccountNumber: text("report_account_number"),
    reportGeneratedAt: timestamp("report_generated_at", { withTimezone: true }),
    rowsTotal: integer("rows_total").notNull().default(0),
    importedCount: integer("imported_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    errors: jsonb("errors")
      .$type<ImportRowError[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    revertedAt: timestamp("reverted_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique("import_batches_id_user_key").on(t.id, t.userId),
    accountOwnerFk("import_batches_account_fk", t.accountId, t.userId),
    index("import_batches_account_sha_idx").on(t.accountId, t.fileSha256),
    ownerPolicy("import_batches", t.userId),
  ],
).enableRLS();

export const tradeIdeas = pgTable(
  "trade_ideas",
  {
    id: id(),
    userId: userId(),
    copyGroupId: uuid("copy_group_id").notNull(),
    symbol: text("symbol").notNull(),
    direction: directionEnum("direction").notNull(),
    firstOpenTime: timestamp("first_open_time", { withTimezone: true }).notNull(),
    notes: text("notes"),
    setupTagId: uuid("setup_tag_id").references(() => tags.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    unique("trade_ideas_id_user_key").on(t.id, t.userId),
    foreignKey({
      name: "trade_ideas_copy_group_fk",
      columns: [t.copyGroupId, t.userId],
      foreignColumns: [copyGroups.id, copyGroups.userId],
    }).onDelete("cascade"),
    ownerPolicy("trade_ideas", t.userId),
  ],
).enableRLS();

export const trades = pgTable(
  "trades",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    positionId: text("position_id"),
    source: tradeSourceEnum("source").notNull().default("manual"),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
    symbolRaw: text("symbol_raw").notNull(),
    symbol: text("symbol").notNull(),
    direction: directionEnum("direction").notNull(),
    volume: volume("volume").notNull(),
    entryPrice: price("entry_price").notNull(),
    stopLoss: price("stop_loss"),
    takeProfit: price("take_profit"),
    openTime: timestamp("open_time", { withTimezone: true }).notNull(),
    closeTime: timestamp("close_time", { withTimezone: true }),
    closePrice: price("close_price"),
    commission: money("commission").notNull().default("0"),
    swap: money("swap").notNull().default("0"),
    profit: money("profit"),
    netPnl: money("net_pnl").generatedAlwaysAs(sql`coalesce(profit, 0) + commission + swap`),
    riskAmount: money("risk_amount"),
    rMultiple: numeric("r_multiple", { precision: 12, scale: 4 }),
    setupTagId: uuid("setup_tag_id").references(() => tags.id, { onDelete: "set null" }),
    rating: smallint("rating"),
    notes: text("notes"),
    screenshotPaths: text("screenshot_paths")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    tradeIdeaId: uuid("trade_idea_id").references(() => tradeIdeas.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    unique("trades_id_user_key").on(t.id, t.userId),
    accountOwnerFk("trades_account_fk", t.accountId, t.userId),
    // Duplicate-import guard. NULLs are distinct in Postgres, so manual trades without a
    // position_id never collide, while `ON CONFLICT (account_id, position_id) DO NOTHING`
    // works without a partial-index predicate.
    unique("trades_account_position_key").on(t.accountId, t.positionId),
    index("trades_user_open_time_idx").on(t.userId, t.openTime.desc()),
    index("trades_account_open_time_idx").on(t.accountId, t.openTime.desc()),
    index("trades_account_close_time_idx").on(t.accountId, t.closeTime),
    index("trades_import_batch_idx").on(t.importBatchId),
    index("trades_trade_idea_idx").on(t.tradeIdeaId),
    check("trades_volume_check", sql`${t.volume} > 0`),
    check("trades_entry_price_check", sql`${t.entryPrice} > 0`),
    check("trades_rating_check", sql`${t.rating} between 1 and 5`),
    check(
      "trades_close_after_open_check",
      sql`${t.closeTime} is null or ${t.closeTime} >= ${t.openTime}`,
    ),
    check(
      "trades_closed_fields_check",
      sql`${t.closeTime} is null or (${t.closePrice} is not null and ${t.profit} is not null)`,
    ),
    ownerPolicy("trades", t.userId),
  ],
).enableRLS();

export const tradeTags = pgTable(
  "trade_tags",
  {
    userId: userId(),
    tradeId: uuid("trade_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "trade_tags_pkey", columns: [t.tradeId, t.tagId] }),
    foreignKey({
      name: "trade_tags_trade_fk",
      columns: [t.tradeId, t.userId],
      foreignColumns: [trades.id, trades.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "trade_tags_tag_fk",
      columns: [t.tagId, t.userId],
      foreignColumns: [tags.id, tags.userId],
    }).onDelete("cascade"),
    index("trade_tags_tag_idx").on(t.tagId),
    ownerPolicy("trade_tags", t.userId),
  ],
).enableRLS();

/**
 * Tags applied to a copy-group trade idea. Decision (B3): idea tags are NOT copied onto member
 * trades; analytics resolves a trade's effective tags as trade_tags ∪ trade_idea_tags of its idea.
 */
export const tradeIdeaTags = pgTable(
  "trade_idea_tags",
  {
    userId: userId(),
    tradeIdeaId: uuid("trade_idea_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "trade_idea_tags_pkey", columns: [t.tradeIdeaId, t.tagId] }),
    foreignKey({
      name: "trade_idea_tags_idea_fk",
      columns: [t.tradeIdeaId, t.userId],
      foreignColumns: [tradeIdeas.id, tradeIdeas.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "trade_idea_tags_tag_fk",
      columns: [t.tagId, t.userId],
      foreignColumns: [tags.id, tags.userId],
    }).onDelete("cascade"),
    ownerPolicy("trade_idea_tags", t.userId),
  ],
).enableRLS();

/* ------------------------------------------------------------------------------------------------
 * Prop rules
 * ---------------------------------------------------------------------------------------------- */

export const accountRules = pgTable(
  "account_rules",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    ruleType: ruleTypeEnum("rule_type").notNull(),
    params: jsonb("params").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    templateId: uuid("template_id").references(() => ruleTemplates.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    accountOwnerFk("account_rules_account_fk", t.accountId, t.userId),
    unique("account_rules_account_type_key").on(t.accountId, t.ruleType),
    ownerPolicy("account_rules", t.userId),
  ],
).enableRLS();

export const ruleEvents = pgTable(
  "rule_events",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id").notNull(),
    ruleType: ruleTypeEnum("rule_type").notNull(),
    level: ruleLevelEnum("level").notNull(),
    tradingDay: date("trading_day").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    tradeId: uuid("trade_id").references(() => trades.id, { onDelete: "set null" }),
    details: jsonb("details")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    accountOwnerFk("rule_events_account_fk", t.accountId, t.userId),
    unique("rule_events_idempotency_key").on(t.accountId, t.ruleType, t.level, t.tradingDay),
    ownerPolicy("rule_events", t.userId),
  ],
).enableRLS();

/* ------------------------------------------------------------------------------------------------
 * Ledger & journal
 * ---------------------------------------------------------------------------------------------- */

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id"),
    firm: text("firm").notNull(),
    kind: ledgerKindEnum("kind").notNull(),
    amount: money("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    occurredOn: date("occurred_on").notNull(),
    note: text("note"),
    ...timestamps(),
  },
  (t) => [
    // account_id is optional; MATCH SIMPLE skips the check when it is NULL. Deleting the account
    // removes its ledger rows (cascade) — the user is warned in the UI before deletion.
    accountOwnerFk("ledger_entries_account_fk", t.accountId, t.userId),
    index("ledger_entries_user_occurred_idx").on(t.userId, t.occurredOn.desc()),
    check("ledger_entries_amount_check", sql`${t.amount} > 0`),
    check("ledger_entries_currency_check", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    ownerPolicy("ledger_entries", t.userId),
  ],
).enableRLS();

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: id(),
    userId: userId(),
    accountId: uuid("account_id"),
    period: journalPeriodEnum("period").notNull(),
    periodStart: date("period_start").notNull(),
    content: text("content").notNull().default(""),
    answers: jsonb("answers")
      .notNull()
      .default(sql`'{}'::jsonb`),
    mood: smallint("mood"),
    ...timestamps(),
  },
  (t) => [
    accountOwnerFk("journal_entries_account_fk", t.accountId, t.userId),
    unique("journal_entries_period_key")
      .on(t.userId, t.accountId, t.period, t.periodStart)
      .nullsNotDistinct(),
    check("journal_entries_mood_check", sql`${t.mood} between 1 and 5`),
    ownerPolicy("journal_entries", t.userId),
  ],
).enableRLS();
