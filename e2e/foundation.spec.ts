import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, magicLinkFor, uniqueEmail } from "./support/helpers";

test.describe("public pages", () => {
  test("landing page renders with metadata and no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PropBook/);
    await expect(
      page.getByRole("heading", { level: 1, name: /keeps your funded accounts alive/i }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("protected routes redirect to sign-in and keep the destination", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "Sign in to PropBook" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("invalid email shows an accessible inline error", async ({ page }) => {
    await page.goto("/sign-in");
    const email = page.getByLabel("Email");
    await email.fill("not-an-email");
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
  });

  test("expired or invalid link shows a helpful message", async ({ page }) => {
    await page.goto("/auth/callback?code=bogus");
    await expect(page).toHaveURL(/\/sign-in\?error=link/);
    await expect(
      page.getByRole("alert").filter({ hasText: /invalid or has expired/i }),
    ).toBeVisible();
  });
});

test.describe("magic-link sign-in", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("signs in, creates the profile with the browser time zone, and signs out", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await page.goto("/dashboard");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("status")).toContainText(email);

    // Simulate clicking the link in the email (same browser, so the PKCE verifier cookie matches).
    await page.goto(await magicLinkFor(email));

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No accounts yet" })).toBeVisible();
    await expect(page.getByTestId("profile-timezone")).toContainText("Asia/Tokyo");
    await expectNoHorizontalScroll(page);

    // Signed-in users skip the sign-in page.
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/\/dashboard$/);

    // Sign out: on mobile it lives in the "More" sheet, on desktop in the sidebar.
    const more = page.getByRole("button", { name: "More" });
    if (await more.isVisible()) await more.click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
});
