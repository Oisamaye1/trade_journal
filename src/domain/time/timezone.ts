/**
 * IANA time-zone helpers. Pure; safe in browser, server and tests.
 */

/** True when `tz` is a time zone the runtime's Intl implementation accepts (e.g. "Europe/London", "Etc/GMT-2", "UTC"). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Returns `tz` when valid, otherwise `fallback` (default "UTC"). */
export function normalizeTimeZone(tz: unknown, fallback = "UTC"): string {
  return isValidTimeZone(tz) ? tz : fallback;
}
