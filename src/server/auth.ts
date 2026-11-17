import "server-only";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SIGN_IN_PATH } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string | null };

/**
 * Data Access Layer entry point: the verified current user, or null.
 * `getClaims()` verifies the JWT signature (via JWKS for asymmetric keys, or the Auth server
 * otherwise), so the returned id can be trusted. Deduplicated per request.
 *
 * `connection()` marks this as request-time work: session validation depends on the current time
 * (token expiry), so it must never run during a (runtime) prerender.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") return null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return { id: sub, email };
});

/** Use in every server action, route handler and data loader for user data. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(SIGN_IN_PATH);
  return user;
}
