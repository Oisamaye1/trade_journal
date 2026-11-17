import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_APP_PATH, SIGN_IN_PATH, isProtectedPath } from "@/lib/routes";

/**
 * Refreshes the Supabase session cookie and performs the *optimistic* auth redirect.
 * This is not the authorization boundary: every data access re-checks the user (src/server/auth.ts).
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Misconfigured environment: fail closed for protected pages, let public pages render.
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=config`, request.url));
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const target = new URL(SIGN_IN_PATH, request.url);
    target.searchParams.set("next", `${pathname}${search}`);
    return withCookies(NextResponse.redirect(target), response);
  }

  if (signedIn && pathname === SIGN_IN_PATH) {
    return withCookies(NextResponse.redirect(new URL(DEFAULT_APP_PATH, request.url)), response);
  }

  return response;
}

/** Carry refreshed auth cookies over to a redirect response. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}
