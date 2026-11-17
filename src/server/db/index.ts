import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof createDb>;

function createDb() {
  const client = postgres(serverEnv().DATABASE_URL, {
    // Required for Supabase's transaction pooler (pgbouncer) and harmless elsewhere.
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 3,
  });
  return drizzle(client, { schema });
}

const globalForDb = globalThis as unknown as { __propbookDb?: Db };

/** Lazily-created Drizzle client. Reused across hot reloads in development. */
export function db(): Db {
  if (!globalForDb.__propbookDb) globalForDb.__propbookDb = createDb();
  return globalForDb.__propbookDb;
}

export { schema };
