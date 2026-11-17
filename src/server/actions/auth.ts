"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeTimeZone } from "@/domain/time/timezone";
import { publicEnv } from "@/lib/env";
import { AUTH_CALLBACK_PATH, SIGN_IN_PATH, safeNextPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EmailSignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

const emailSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
});

/** Origin for auth redirect links: the request's own origin, falling back to the configured site URL. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  return publicEnv().NEXT_PUBLIC_SITE_URL;
}

async function callbackUrl(formData: FormData): Promise<string> {
  const url = new URL(AUTH_CALLBACK_PATH, await requestOrigin());
  url.searchParams.set("next", safeNextPath(formData.get("next")));
  url.searchParams.set("tz", normalizeTimeZone(formData.get("tz")));
  return url.toString();
}

export async function signInWithEmail(
  _prev: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = emailSchema.safeParse({ email: String(formData.get("email") ?? "").trim() });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
      email: String(formData.get("email") ?? ""),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await callbackUrl(formData), shouldCreateUser: true },
  });

  if (error) {
    const rateLimited = error.status === 429;
    return {
      status: "error",
      email: parsed.data.email,
      message: rateLimited
        ? "Too many sign-in emails requested. Wait a minute and try again."
        : "We couldn't send the sign-in link. Please try again.",
    };
  }
  return { status: "sent", email: parsed.data.email };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(formData) },
  });
  if (error || !data.url) redirect(`${SIGN_IN_PATH}?error=oauth`);
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(SIGN_IN_PATH);
}
