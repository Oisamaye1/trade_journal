import { expect, type Page } from "@playwright/test";

/** CLAUDE.md rule 9: the page itself must never scroll horizontally. */
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    scrollWidth,
    `page scrollWidth ${scrollWidth} > viewport ${innerWidth}`,
  ).toBeLessThanOrEqual(innerWidth);
}

/** Ask the auth stub for the magic link "emailed" to `email`. */
export async function magicLinkFor(email: string): Promise<string> {
  const res = await fetch(
    `http://127.0.0.1:54321/__test/magic-link?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) throw new Error(`no magic link for ${email}: ${res.status}`);
  return ((await res.json()) as { url: string }).url;
}

export function uniqueEmail(prefix = "trader") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}
