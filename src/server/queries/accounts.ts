import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { accounts } from "@/server/db/schema";

export type Account = typeof accounts.$inferSelect;

const uuidSchema = z.uuid();

/**
 * Ownership gate for every account-scoped query and mutation (CLAUDE.md rule 1).
 * Returns the account only if it exists AND belongs to `userId`; otherwise renders 404 so we
 * don't leak whether another user's account id exists.
 */
export async function requireAccount(userId: string, accountId: unknown): Promise<Account> {
  const account = await findOwnedAccount(userId, accountId);
  if (!account) notFound();
  return account;
}

/** Non-throwing variant for route handlers that need to return their own status code. */
export async function findOwnedAccount(
  userId: string,
  accountId: unknown,
): Promise<Account | null> {
  const parsed = uuidSchema.safeParse(accountId);
  if (!parsed.success) return null;
  const [account] = await db()
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, parsed.data), eq(accounts.userId, userId)))
    .limit(1);
  return account ?? null;
}

/** The user's non-archived accounts, oldest first. */
export async function listActiveAccounts(userId: string): Promise<Account[]> {
  return db()
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.createdAt));
}
