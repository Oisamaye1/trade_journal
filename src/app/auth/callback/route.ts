import { NextResponse, type NextRequest } from "next/server";
import { SIGN_IN_PATH, safeNextPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/server/queries/profiles";

/**
 * OAuth / magic-link landing route (PKCE). Exchanges the code for a session cookie, creates the
 * profile on first sign-in using the browser time zone captured on the sign-in form, then
 * redirects to the (validated, same-origin) `next` path.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const failure = NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=link`, request.url));

  if (!code) return failure;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failure;

  await ensureProfile(data.user.id, searchParams.get("tz"));

  return NextResponse.redirect(new URL(next, request.url));
}
