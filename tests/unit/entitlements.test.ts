import { describe, expect, it } from "vitest";
import { entitlementsForPlan, resolvePlan } from "@/domain/entitlements";

const NOW = new Date("2026-06-01T00:00:00Z");
const FUTURE = new Date("2026-07-01T00:00:00Z");
const PAST = new Date("2026-05-01T00:00:00Z");

describe("resolvePlan", () => {
  it("defaults to free without a subscription", () => {
    expect(resolvePlan(null, NOW)).toBe("free");
  });

  it.each(["trialing", "active", "past_due"] as const)("grants the plan when %s", (status) => {
    expect(resolvePlan({ plan: "pro", status, currentPeriodEnd: FUTURE }, NOW)).toBe("pro");
  });

  it.each(["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"] as const)(
    "falls back to free when %s",
    (status) => {
      expect(resolvePlan({ plan: "elite", status, currentPeriodEnd: FUTURE }, NOW)).toBe("free");
    },
  );

  it("falls back to free after the period ends", () => {
    expect(resolvePlan({ plan: "pro", status: "active", currentPeriodEnd: PAST }, NOW)).toBe(
      "free",
    );
  });

  it("falls back to free when status is missing", () => {
    expect(resolvePlan({ plan: "pro", status: null, currentPeriodEnd: null }, NOW)).toBe("free");
  });
});

describe("entitlementsForPlan", () => {
  it("free: one account, 90-day analytics, preview-only prop tools, export always on", () => {
    const e = entitlementsForPlan("free");
    expect(e.maxActiveAccounts).toBe(1);
    expect(e.analyticsWindowDays).toBe(90);
    expect(e.ruleGuard).toBe("preview");
    expect(e.propLedger).toBe(false);
    expect(e.csvExport).toBe(true);
  });

  it("pro unlocks prop features but not elite extras", () => {
    const e = entitlementsForPlan("pro");
    expect(e.maxActiveAccounts).toBeNull();
    expect(e.ruleGuard).toBe("full");
    expect(e.propLedger && e.copyGroups && e.weeklyReviews).toBe(true);
    expect(e.aiWeeklySummary || e.limitAlerts || e.autoSync).toBe(false);
  });

  it("elite includes everything", () => {
    const e = entitlementsForPlan("elite");
    expect(e.aiWeeklySummary && e.limitAlerts && e.autoSync && e.propLedger).toBe(true);
  });
});
