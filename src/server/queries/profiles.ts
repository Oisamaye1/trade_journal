import "server-only";
import { eq } from "drizzle-orm";
import { normalizeTimeZone } from "@/domain/time/timezone";
import { db } from "@/server/db";
import { profiles } from "@/server/db/schema";

export type Profile = typeof profiles.$inferSelect;

/**
 * Creates the profile on first sign-in. Never overwrites an existing profile, so a later sign-in
 * from a different device doesn't change the user's chosen time zone.
 */
export async function ensureProfile(userId: string, browserTimeZone: unknown): Promise<void> {
  await db()
    .insert(profiles)
    .values({ userId, timezone: normalizeTimeZone(browserTimeZone) })
    .onConflictDoNothing({ target: profiles.userId });
}

/** The user's profile, creating a default one if it is missing (e.g. created outside the app). */
export async function getProfile(userId: string): Promise<Profile> {
  const [existing] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (existing) return existing;
  await ensureProfile(userId, "UTC");
  const [created] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!created) throw new Error("Failed to create profile");
  return created;
}
