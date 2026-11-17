import { describe, expect, it } from "vitest";
import { RULE_TYPES, ruleDefinitionSchema, ruleTemplateParamsSchema } from "@/domain/rules/params";
import { ruleTypeEnum } from "@/server/db/schema";
import { INSTRUMENT_SEED, RULE_TEMPLATE_SEED } from "@/server/db/seed-data";

describe("rule params", () => {
  it("covers exactly the rule types in the database enum", () => {
    expect([...RULE_TYPES].sort()).toEqual([...ruleTypeEnum.enumValues].sort());
  });

  it("rejects malformed params", () => {
    const bad = [
      {
        ruleType: "daily_loss",
        params: {
          mode: "percent",
          value: "5",
          basis: "initial_balance",
          resetTimezone: "Nowhere/City",
          resetTime: "00:00",
        },
      },
      {
        ruleType: "daily_loss",
        params: {
          mode: "percent",
          value: "5",
          basis: "initial_balance",
          resetTimezone: "UTC",
          resetTime: "24:00",
        },
      },
      { ruleType: "max_loss_static", params: { mode: "percent", value: "-1" } },
      { ruleType: "max_loss_static", params: { mode: "percent", value: "0" } },
      { ruleType: "profit_target", params: { mode: "percent", value: 10 } },
      { ruleType: "min_trading_days", params: { days: 0 } },
      { ruleType: "consistency", params: { maxSingleDaySharePercent: 120 } },
      {
        ruleType: "weekend_holding_forbidden",
        params: { weekendStart: "Friday 21:00", weekendEnd: "Sun 22:00", timezone: "UTC" },
      },
      { ruleType: "unknown_rule", params: {} },
    ];
    for (const rule of bad) {
      expect(ruleDefinitionSchema.safeParse(rule).success, JSON.stringify(rule)).toBe(false);
    }
  });

  it("rejects a template that repeats a rule type", () => {
    const rule = { ruleType: "max_loss_static", params: { mode: "percent", value: "10" } };
    expect(ruleTemplateParamsSchema.safeParse({ rules: [rule, rule] }).success).toBe(false);
  });
});

describe("rule template seed", () => {
  it.each(RULE_TEMPLATE_SEED.map((t) => [t.slug, t] as const))("%s is valid", (_slug, t) => {
    expect(ruleTemplateParamsSchema.safeParse(t.params).success).toBe(true);
    expect(t.lastReviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(t.sourceNote.length).toBeGreaterThan(0);
  });

  it("ships generic templates only (no firm claims)", () => {
    expect(RULE_TEMPLATE_SEED.every((t) => t.firm === null)).toBe(true);
  });

  it("has unique slugs", () => {
    const slugs = RULE_TEMPLATE_SEED.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("instrument seed", () => {
  const bySymbol = new Map(INSTRUMENT_SEED.map((i) => [i.symbol, i]));

  it("uses 0.01 pips for JPY-quoted pairs and 0.0001 for other FX", () => {
    expect(bySymbol.get("USDJPY")?.pipSize).toBe("0.01");
    expect(bySymbol.get("GBPJPY")?.pipSize).toBe("0.01");
    expect(bySymbol.get("EURUSD")?.pipSize).toBe("0.0001");
    expect(bySymbol.get("EURGBP")?.pipSize).toBe("0.0001");
  });

  it("uses 0.1 for gold", () => {
    expect(bySymbol.get("XAUUSD")?.pipSize).toBe("0.1");
  });

  it("has unique, normalised symbols", () => {
    expect(bySymbol.size).toBe(INSTRUMENT_SEED.length);
    for (const i of INSTRUMENT_SEED) expect(i.symbol).toMatch(/^[A-Z0-9]+$/);
  });
});
