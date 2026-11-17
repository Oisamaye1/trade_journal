import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"], quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
  // Only manage the public schema; Supabase owns auth/storage/etc.
  schemaFilter: ["public"],
  // Supabase manages its own roles (anon, authenticated, service_role).
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
