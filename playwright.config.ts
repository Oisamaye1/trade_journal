import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs the production build against a TEST-ONLY auth stub (e2e/support/mock-auth-server.ts)
 * and a real Postgres database. Set E2E_DATABASE_URL to a migrated + seeded database
 * (plain Postgres needs tests/db/supabase-auth-shim.sql first).
 *
 * PLAYWRIGHT_CHROMIUM_PATH: optional Chromium binary when the bundled browser isn't installed.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/propbook_test";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "off",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: [
    {
      command: "pnpm exec tsx e2e/support/mock-auth-server.ts",
      url: "http://127.0.0.1:54321/health",
      env: { DATABASE_URL },
      reuseExistingServer: false,
    },
    {
      // NEXT_PUBLIC_SUPABASE_URL must point at the stub when building, since it's inlined.
      command: `pnpm build && pnpm start -p ${PORT}`,
      url: BASE_URL,
      timeout: 180_000,
      env: {
        DATABASE_URL,
        NEXT_PUBLIC_SITE_URL: BASE_URL,
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
      },
      reuseExistingServer: false,
    },
  ],
});
