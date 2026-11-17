/**
 * Plan → capability mapping (Part B §B2). Pure so it can be unit-tested and shared with the UI.
 * Enforcement happens on the server via src/server/entitlements.ts.
 */

export type Plan = "free" | "pro" | "elite";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type Entitlements = {
  plan: Plan;
  /** null = unlimited */
  maxActiveAccounts: number | null;
  /** null = all time */
  analyticsWindowDays: number | null;
  manualTradesAndImport: boolean;
  csvExport: boolean;
  ruleGuard: "preview" | "full";
  positionSizer: "preview" | "full";
  propLedger: boolean;
  copyGroups: boolean;
  weeklyReviews: boolean;
  aiWeeklySummary: boolean;
  limitAlerts: boolean;
  autoSync: boolean;
};

const FREE: Entitlements = {
  plan: "free",
  maxActiveAccounts: 1,
  analyticsWindowDays: 90,
  manualTradesAndImport: true,
  csvExport: true,
  ruleGuard: "preview",
  positionSizer: "preview",
  propLedger: false,
  copyGroups: false,
  weeklyReviews: false,
  aiWeeklySummary: false,
  limitAlerts: false,
  autoSync: false,
};

const PRO: Entitlements = {
  ...FREE,
  plan: "pro",
  maxActiveAccounts: null,
  analyticsWindowDays: null,
  ruleGuard: "full",
  positionSizer: "full",
  propLedger: true,
  copyGroups: true,
  weeklyReviews: true,
};

const ELITE: Entitlements = {
  ...PRO,
  plan: "elite",
  aiWeeklySummary: true,
  limitAlerts: true,
  autoSync: true,
};

const BY_PLAN: Record<Plan, Entitlements> = { free: FREE, pro: PRO, elite: ELITE };

export function entitlementsForPlan(plan: Plan): Entitlements {
  return BY_PLAN[plan];
}

/** Statuses that grant the paid plan. `past_due` keeps access during Stripe's retry window. */
const GRANTING_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "trialing",
  "active",
  "past_due",
]);

/**
 * Effective plan for a (possibly missing) subscription row. Anything that isn't a currently
 * granting status falls back to free; data is kept, features re-lock.
 */
export function resolvePlan(
  subscription: {
    plan: Plan;
    status: SubscriptionStatus | null;
    currentPeriodEnd: Date | null;
  } | null,
  now: Date = new Date(),
): Plan {
  if (!subscription || subscription.plan === "free") return "free";
  if (!subscription.status || !GRANTING_STATUSES.has(subscription.status)) return "free";
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < now.getTime()) {
    return "free";
  }
  return subscription.plan;
}
