/**
 * Idempotent seed for reference data (instruments, generic rule templates).
 * Run with `pnpm db:seed`. Safe to run repeatedly in any environment.
 */
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ruleTemplateParamsSchema } from "@/domain/rules/params";
import { instruments, ruleTemplates } from "./schema";
import { INSTRUMENT_SEED, RULE_TEMPLATE_SEED } from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  for (const t of RULE_TEMPLATE_SEED) ruleTemplateParamsSchema.parse(t.params);

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(instruments)
        .values(INSTRUMENT_SEED)
        .onConflictDoUpdate({
          target: instruments.symbol,
          set: {
            assetClass: sql`excluded.asset_class`,
            pipSize: sql`excluded.pip_size`,
            baseCurrency: sql`excluded.base_currency`,
            quoteCurrency: sql`excluded.quote_currency`,
            updatedAt: sql`now()`,
          },
        });

      await tx
        .insert(ruleTemplates)
        .values(RULE_TEMPLATE_SEED)
        .onConflictDoUpdate({
          target: ruleTemplates.slug,
          set: {
            firm: sql`excluded.firm`,
            program: sql`excluded.program`,
            phase: sql`excluded.phase`,
            params: sql`excluded.params`,
            version: sql`excluded.version`,
            lastReviewedOn: sql`excluded.last_reviewed_on`,
            sourceNote: sql`excluded.source_note`,
            updatedAt: sql`now()`,
          },
        });
    });
    console.log(
      `Seeded ${INSTRUMENT_SEED.length} instruments and ${RULE_TEMPLATE_SEED.length} rule templates.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
