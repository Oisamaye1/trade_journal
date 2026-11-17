/**
 * Zod schemas for prop-firm rule parameters (Part B §B6 of docs/build-prompt.md).
 * Stored in account_rules.params and inside rule_templates.params. The rule engine itself lands in
 * Phase 4; these schemas exist now so seeded templates are validated from day one.
 */
import { z } from "zod";
import { isValidTimeZone } from "@/domain/time/timezone";

/** Decimal values travel as strings to avoid float error (CLAUDE.md rule 5). */
const positiveDecimal = z
  .string()
  .regex(/^\d+(\.\d+)?$/, "must be a non-negative decimal string")
  .refine((v) => Number(v) > 0, "must be greater than zero");

const percentOrAmount = z.object({
  mode: z.enum(["percent", "amount"]),
  value: positiveDecimal,
});

const timeZone = z.string().refine(isValidTimeZone, "must be a valid IANA time zone");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "must be HH:mm (24h)");
const weekdayTime = z
  .string()
  .regex(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([01]\d|2[0-3]):[0-5]\d$/, "must be like 'Fri 21:00'");

export const ruleParamsSchemas = {
  daily_loss: percentOrAmount.extend({
    basis: z.enum(["initial_balance", "start_of_day_balance"]),
    resetTimezone: timeZone,
    resetTime: hhmm,
  }),
  max_loss_static: percentOrAmount,
  max_loss_trailing: percentOrAmount.extend({
    trailOn: z.literal("closed_balance"),
    lockAtInitial: z.boolean(),
  }),
  profit_target: percentOrAmount,
  min_trading_days: z.object({ days: z.int().min(1).max(365) }),
  consistency: z.object({ maxSingleDaySharePercent: z.number().gt(0).max(100) }),
  max_lots_per_trade: z.object({ lots: positiveDecimal }),
  weekend_holding_forbidden: z.object({
    weekendStart: weekdayTime,
    weekendEnd: weekdayTime,
    timezone: timeZone,
  }),
  require_stop_loss: z.object({}),
} as const;

export type RuleType = keyof typeof ruleParamsSchemas;
export const RULE_TYPES = Object.keys(ruleParamsSchemas) as RuleType[];

export type RuleParams<T extends RuleType> = z.infer<(typeof ruleParamsSchemas)[T]>;

/** A rule as stored: type + its params, validated as a discriminated union. */
export const ruleDefinitionSchema = z.discriminatedUnion("ruleType", [
  z.object({ ruleType: z.literal("daily_loss"), params: ruleParamsSchemas.daily_loss }),
  z.object({ ruleType: z.literal("max_loss_static"), params: ruleParamsSchemas.max_loss_static }),
  z.object({
    ruleType: z.literal("max_loss_trailing"),
    params: ruleParamsSchemas.max_loss_trailing,
  }),
  z.object({ ruleType: z.literal("profit_target"), params: ruleParamsSchemas.profit_target }),
  z.object({ ruleType: z.literal("min_trading_days"), params: ruleParamsSchemas.min_trading_days }),
  z.object({ ruleType: z.literal("consistency"), params: ruleParamsSchemas.consistency }),
  z.object({
    ruleType: z.literal("max_lots_per_trade"),
    params: ruleParamsSchemas.max_lots_per_trade,
  }),
  z.object({
    ruleType: z.literal("weekend_holding_forbidden"),
    params: ruleParamsSchemas.weekend_holding_forbidden,
  }),
  z.object({
    ruleType: z.literal("require_stop_loss"),
    params: ruleParamsSchemas.require_stop_loss,
  }),
]);

export type RuleDefinition = z.infer<typeof ruleDefinitionSchema>;

/** Shape of rule_templates.params. Each rule type may appear at most once per template. */
export const ruleTemplateParamsSchema = z
  .object({ rules: z.array(ruleDefinitionSchema).min(1) })
  .refine(
    (t) => new Set(t.rules.map((r) => r.ruleType)).size === t.rules.length,
    "a template may contain each rule type at most once",
  );

export type RuleTemplateParams = z.infer<typeof ruleTemplateParamsSchema>;
