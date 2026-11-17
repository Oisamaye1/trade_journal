import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { entitlementsForPlan, resolvePlan, type Entitlements } from "@/domain/entitlements";
import { db } from "@/server/db";
import { subscriptions } from "@/server/db/schema";

/**
 * The single source of plan limits (Part B §B2). Server actions and queries must check this;
 * the UI only uses it to show upgrade prompts. Until billing ships (Phase 6) there are no
 * subscription rows, so everyone resolves to the free plan.
 */
export const getEntitlements = cache(async (userId: string): Promise<Entitlements> => {
  const [subscription] = await db()
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return entitlementsForPlan(resolvePlan(subscription ?? null));
});
