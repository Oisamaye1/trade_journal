CREATE TYPE "public"."account_kind" AS ENUM('personal', 'prop_challenge', 'prop_verification', 'prop_funded', 'demo');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('active', 'passed', 'breached', 'archived');--> statement-breakpoint
CREATE TYPE "public"."asset_class" AS ENUM('fx', 'metal', 'index', 'energy', 'crypto', 'other');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."journal_period" AS ENUM('day', 'week');--> statement-breakpoint
CREATE TYPE "public"."ledger_kind" AS ENUM('challenge_fee', 'reset_fee', 'addon_fee', 'payout', 'refund', 'other_cost', 'other_income');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'elite');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('mt5', 'mt4', 'ctrader', 'other');--> statement-breakpoint
CREATE TYPE "public"."rule_level" AS ENUM('caution', 'danger', 'breached');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('daily_loss', 'max_loss_static', 'max_loss_trailing', 'profit_target', 'min_trading_days', 'consistency', 'max_lots_per_trade', 'weekend_holding_forbidden', 'require_stop_loss');--> statement-breakpoint
CREATE TYPE "public"."snapshot_source" AS ENUM('mt5_report', 'manual', 'sync');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused');--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('setup', 'mistake', 'emotion', 'custom');--> statement-breakpoint
CREATE TYPE "public"."trade_source" AS ENUM('manual', 'mt5_html', 'csv', 'sync');--> statement-breakpoint
CREATE TABLE "account_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"rule_type" "rule_type" NOT NULL,
	"params" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"template_id" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_rules_account_type_key" UNIQUE("account_id","rule_type")
);
--> statement-breakpoint
ALTER TABLE "account_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "account_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"balance" numeric(18, 2) NOT NULL,
	"equity" numeric(18, 2),
	"source" "snapshot_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"broker" text,
	"platform" "platform" DEFAULT 'mt5' NOT NULL,
	"account_number" text,
	"server" text,
	"currency" char(3) NOT NULL,
	"kind" "account_kind" DEFAULT 'personal' NOT NULL,
	"prop_firm" text,
	"program_name" text,
	"initial_balance" numeric(18, 2) NOT NULL,
	"broker_timezone" text DEFAULT 'Etc/GMT-2' NOT NULL,
	"symbol_suffixes" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"copy_group_id" uuid,
	"phase_parent_account_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_user_key" UNIQUE("id","user_id"),
	CONSTRAINT "accounts_initial_balance_check" CHECK ("accounts"."initial_balance" > 0),
	CONSTRAINT "accounts_currency_check" CHECK ("accounts"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "copy_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"match_window_seconds" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copy_groups_id_user_key" UNIQUE("id","user_id"),
	CONSTRAINT "copy_groups_match_window_check" CHECK ("copy_groups"."match_window_seconds" between 1 and 3600)
);
--> statement-breakpoint
ALTER TABLE "copy_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"source" "trade_source" NOT NULL,
	"file_name" text NOT NULL,
	"file_sha256" char(64) NOT NULL,
	"report_account_number" text,
	"report_generated_at" timestamp with time zone,
	"rows_total" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reverted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_id_user_key" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "import_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instruments" (
	"symbol" text PRIMARY KEY NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"pip_size" numeric(18, 8) NOT NULL,
	"base_currency" char(3),
	"quote_currency" char(3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "instruments_pip_size_check" CHECK ("instruments"."pip_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "instruments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"period" "journal_period" NOT NULL,
	"period_start" date NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mood" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "journal_entries_period_key" UNIQUE NULLS NOT DISTINCT("user_id","account_id","period","period_start"),
	CONSTRAINT "journal_entries_mood_check" CHECK ("journal_entries"."mood" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid,
	"firm" text NOT NULL,
	"kind" "ledger_kind" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" char(3) NOT NULL,
	"occurred_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_amount_check" CHECK ("ledger_entries"."amount" > 0),
	CONSTRAINT "ledger_entries_currency_check" CHECK ("ledger_entries"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"week_starts_on" smallint DEFAULT 1 NOT NULL,
	"breakeven_threshold" numeric(18, 2) DEFAULT '0' NOT NULL,
	"session_windows" jsonb DEFAULT '[{"name":"Asia","startUtc":"00:00","endUtc":"08:00"},{"name":"London","startUtc":"07:00","endUtc":"16:00"},{"name":"New York","startUtc":"12:00","endUtc":"21:00"}]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_week_starts_on_check" CHECK ("profiles"."week_starts_on" in (0, 1)),
	CONSTRAINT "profiles_breakeven_threshold_check" CHECK ("profiles"."breakeven_threshold" >= 0)
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"rule_type" "rule_type" NOT NULL,
	"level" "rule_level" NOT NULL,
	"trading_day" date NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"trade_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_events_idempotency_key" UNIQUE("account_id","rule_type","level","trading_day")
);
--> statement-breakpoint
ALTER TABLE "rule_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"firm" text,
	"program" text NOT NULL,
	"phase" text NOT NULL,
	"params" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"last_reviewed_on" date NOT NULL,
	"source_note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "rule_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status",
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "tag_kind" NOT NULL,
	"color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_id_user_key" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trade_idea_tags" (
	"user_id" uuid NOT NULL,
	"trade_idea_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_idea_tags_pkey" PRIMARY KEY("trade_idea_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "trade_idea_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trade_ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"copy_group_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"direction" "direction" NOT NULL,
	"first_open_time" timestamp with time zone NOT NULL,
	"notes" text,
	"setup_tag_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_ideas_id_user_key" UNIQUE("id","user_id")
);
--> statement-breakpoint
ALTER TABLE "trade_ideas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trade_tags" (
	"user_id" uuid NOT NULL,
	"trade_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_tags_pkey" PRIMARY KEY("trade_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "trade_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"position_id" text,
	"source" "trade_source" DEFAULT 'manual' NOT NULL,
	"import_batch_id" uuid,
	"symbol_raw" text NOT NULL,
	"symbol" text NOT NULL,
	"direction" "direction" NOT NULL,
	"volume" numeric(12, 2) NOT NULL,
	"entry_price" numeric(18, 6) NOT NULL,
	"stop_loss" numeric(18, 6),
	"take_profit" numeric(18, 6),
	"open_time" timestamp with time zone NOT NULL,
	"close_time" timestamp with time zone,
	"close_price" numeric(18, 6),
	"commission" numeric(18, 2) DEFAULT '0' NOT NULL,
	"swap" numeric(18, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(18, 2),
	"net_pnl" numeric(18, 2) GENERATED ALWAYS AS (coalesce(profit, 0) + commission + swap) STORED,
	"risk_amount" numeric(18, 2),
	"r_multiple" numeric(12, 4),
	"setup_tag_id" uuid,
	"rating" smallint,
	"notes" text,
	"screenshot_paths" text[] DEFAULT '{}'::text[] NOT NULL,
	"trade_idea_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_id_user_key" UNIQUE("id","user_id"),
	CONSTRAINT "trades_account_position_key" UNIQUE("account_id","position_id"),
	CONSTRAINT "trades_volume_check" CHECK ("trades"."volume" > 0),
	CONSTRAINT "trades_entry_price_check" CHECK ("trades"."entry_price" > 0),
	CONSTRAINT "trades_rating_check" CHECK ("trades"."rating" between 1 and 5),
	CONSTRAINT "trades_close_after_open_check" CHECK ("trades"."close_time" is null or "trades"."close_time" >= "trades"."open_time"),
	CONSTRAINT "trades_closed_fields_check" CHECK ("trades"."close_time" is null or ("trades"."close_price" is not null and "trades"."profit" is not null))
);
--> statement-breakpoint
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_instrument_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"pip_size" numeric(18, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_instrument_overrides_user_symbol_key" UNIQUE("user_id","symbol"),
	CONSTRAINT "user_instrument_overrides_pip_size_check" CHECK ("user_instrument_overrides"."pip_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "user_instrument_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_rules" ADD CONSTRAINT "account_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_rules" ADD CONSTRAINT "account_rules_template_id_rule_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."rule_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_rules" ADD CONSTRAINT "account_rules_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_copy_group_id_copy_groups_id_fk" FOREIGN KEY ("copy_group_id") REFERENCES "public"."copy_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_phase_parent_fk" FOREIGN KEY ("phase_parent_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_groups" ADD CONSTRAINT "copy_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_events" ADD CONSTRAINT "rule_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_events" ADD CONSTRAINT "rule_events_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_events" ADD CONSTRAINT "rule_events_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_idea_tags" ADD CONSTRAINT "trade_idea_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_idea_tags" ADD CONSTRAINT "trade_idea_tags_idea_fk" FOREIGN KEY ("trade_idea_id","user_id") REFERENCES "public"."trade_ideas"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_idea_tags" ADD CONSTRAINT "trade_idea_tags_tag_fk" FOREIGN KEY ("tag_id","user_id") REFERENCES "public"."tags"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_ideas" ADD CONSTRAINT "trade_ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_ideas" ADD CONSTRAINT "trade_ideas_setup_tag_id_tags_id_fk" FOREIGN KEY ("setup_tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_ideas" ADD CONSTRAINT "trade_ideas_copy_group_fk" FOREIGN KEY ("copy_group_id","user_id") REFERENCES "public"."copy_groups"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_trade_fk" FOREIGN KEY ("trade_id","user_id") REFERENCES "public"."trades"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_tag_fk" FOREIGN KEY ("tag_id","user_id") REFERENCES "public"."tags"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_setup_tag_id_tags_id_fk" FOREIGN KEY ("setup_tag_id") REFERENCES "public"."tags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_trade_idea_id_trade_ideas_id_fk" FOREIGN KEY ("trade_idea_id") REFERENCES "public"."trade_ideas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_instrument_overrides" ADD CONSTRAINT "user_instrument_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_snapshots_account_as_of_idx" ON "account_snapshots" USING btree ("account_id","as_of" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_platform_number_server_key" ON "accounts" USING btree ("user_id","platform","account_number","server") WHERE "accounts"."account_number" is not null;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_batches_account_sha_idx" ON "import_batches" USING btree ("account_id","file_sha256");--> statement-breakpoint
CREATE INDEX "ledger_entries_user_occurred_idx" ON "ledger_entries" USING btree ("user_id","occurred_on" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_kind_name_key" ON "tags" USING btree ("user_id","kind",lower("name"));--> statement-breakpoint
CREATE INDEX "trade_tags_tag_idx" ON "trade_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "trades_user_open_time_idx" ON "trades" USING btree ("user_id","open_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trades_account_open_time_idx" ON "trades" USING btree ("account_id","open_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trades_account_close_time_idx" ON "trades" USING btree ("account_id","close_time");--> statement-breakpoint
CREATE INDEX "trades_import_batch_idx" ON "trades" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "trades_trade_idea_idx" ON "trades" USING btree ("trade_idea_id");--> statement-breakpoint
CREATE POLICY "account_rules_owner_all" ON "account_rules" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "account_rules"."user_id") WITH CHECK ((select auth.uid()) = "account_rules"."user_id");--> statement-breakpoint
CREATE POLICY "account_snapshots_owner_all" ON "account_snapshots" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "account_snapshots"."user_id") WITH CHECK ((select auth.uid()) = "account_snapshots"."user_id");--> statement-breakpoint
CREATE POLICY "accounts_owner_all" ON "accounts" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "accounts"."user_id") WITH CHECK ((select auth.uid()) = "accounts"."user_id");--> statement-breakpoint
CREATE POLICY "copy_groups_owner_all" ON "copy_groups" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "copy_groups"."user_id") WITH CHECK ((select auth.uid()) = "copy_groups"."user_id");--> statement-breakpoint
CREATE POLICY "import_batches_owner_all" ON "import_batches" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "import_batches"."user_id") WITH CHECK ((select auth.uid()) = "import_batches"."user_id");--> statement-breakpoint
CREATE POLICY "instruments_authenticated_read" ON "instruments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "journal_entries_owner_all" ON "journal_entries" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "journal_entries"."user_id") WITH CHECK ((select auth.uid()) = "journal_entries"."user_id");--> statement-breakpoint
CREATE POLICY "ledger_entries_owner_all" ON "ledger_entries" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "ledger_entries"."user_id") WITH CHECK ((select auth.uid()) = "ledger_entries"."user_id");--> statement-breakpoint
CREATE POLICY "profiles_owner_all" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "profiles"."user_id") WITH CHECK ((select auth.uid()) = "profiles"."user_id");--> statement-breakpoint
CREATE POLICY "rule_events_owner_all" ON "rule_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "rule_events"."user_id") WITH CHECK ((select auth.uid()) = "rule_events"."user_id");--> statement-breakpoint
CREATE POLICY "rule_templates_authenticated_read" ON "rule_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "subscriptions_owner_read" ON "subscriptions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "subscriptions"."user_id");--> statement-breakpoint
CREATE POLICY "tags_owner_all" ON "tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "tags"."user_id") WITH CHECK ((select auth.uid()) = "tags"."user_id");--> statement-breakpoint
CREATE POLICY "trade_idea_tags_owner_all" ON "trade_idea_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "trade_idea_tags"."user_id") WITH CHECK ((select auth.uid()) = "trade_idea_tags"."user_id");--> statement-breakpoint
CREATE POLICY "trade_ideas_owner_all" ON "trade_ideas" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "trade_ideas"."user_id") WITH CHECK ((select auth.uid()) = "trade_ideas"."user_id");--> statement-breakpoint
CREATE POLICY "trade_tags_owner_all" ON "trade_tags" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "trade_tags"."user_id") WITH CHECK ((select auth.uid()) = "trade_tags"."user_id");--> statement-breakpoint
CREATE POLICY "trades_owner_all" ON "trades" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "trades"."user_id") WITH CHECK ((select auth.uid()) = "trades"."user_id");--> statement-breakpoint
CREATE POLICY "user_instrument_overrides_owner_all" ON "user_instrument_overrides" AS PERMISSIVE FOR ALL TO "authenticated" USING ((select auth.uid()) = "user_instrument_overrides"."user_id") WITH CHECK ((select auth.uid()) = "user_instrument_overrides"."user_id");