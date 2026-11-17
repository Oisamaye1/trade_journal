/** Route constants shared by the proxy, auth flows and navigation. */

export const SIGN_IN_PATH = "/sign-in";
export const AUTH_CALLBACK_PATH = "/auth/callback";
export const DEFAULT_APP_PATH = "/dashboard";

/** Path prefixes that require a signed-in user. Keep in sync with the (app) route group. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/accounts",
  "/journal",
  "/trades",
  "/import",
  "/analytics",
  "/reviews",
  "/prop",
  "/copy-groups",
  "/settings",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Only allow same-origin relative redirect targets (prevents open redirects via ?next=).
 * Returns DEFAULT_APP_PATH for anything suspicious.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return DEFAULT_APP_PATH;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_APP_PATH;
  }
  try {
    const url = new URL(next, "http://placeholder.local");
    if (url.origin !== "http://placeholder.local") return DEFAULT_APP_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_APP_PATH;
  }
}
