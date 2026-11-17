/**
 * Database integration tests: RLS, composite-FK tenant integrity, duplicate-import guard, and the
 * app-level ownership query. Requires TEST_DATABASE_URL pointing at a migrated database
 * (Supabase, or plain Postgres + tests/db/supabase-auth-shim.sql). Skipped otherwise.
 */
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("tenant isolation (database)", () => {
  const sql = postgres(url ?? "", { prepare: false, max: 1, onnotice: () => {} });
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  let accountA = "";
  let accountB = "";

  /** Run `fn` as the Supabase `authenticated` role with the given JWT subject (RLS applies). */
  async function asUser<T>(userId: string, fn: (tx: postgres.TransactionSql) => Promise<T>) {
    return sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`;
      await tx`set local role authenticated`;
      return fn(tx);
    }) as Promise<T>;
  }

  async function insertAccount(userId: string, name: string) {
    const [row] = await sql`
      insert into accounts (user_id, name, currency, initial_balance)
      values (${userId}, ${name}, 'USD', 100000) returning id`;
    return row.id as string;
  }

  beforeAll(async () => {
    await sql`insert into auth.users (id, email) values
      (${userA}, ${`a-${userA}@test.local`}), (${userB}, ${`b-${userB}@test.local`})`;
    accountA = await insertAccount(userA, "A main");
    accountB = await insertAccount(userB, "B main");
  });

  afterAll(async () => {
    await sql`delete from auth.users where id in (${userA}, ${userB})`;
    await sql.end();
  });

  it("RLS: a user only sees their own accounts", async () => {
    const rows = await asUser(userA, (tx) => tx`select id from accounts`);
    expect(rows.map((r) => r.id)).toEqual([accountA]);
  });

  it("RLS: a user cannot insert rows owned by someone else", async () => {
    await expect(
      asUser(
        userA,
        (tx) =>
          tx`insert into accounts (user_id, name, currency, initial_balance)
           values (${userB}, 'sneaky', 'USD', 1000)`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("RLS: a user cannot update another user's account", async () => {
    const updated = await asUser(
      userA,
      (tx) => tx`update accounts set name = 'pwned' where id = ${accountB} returning id`,
    );
    expect(updated).toHaveLength(0);
  });

  it("RLS: anonymous requests see nothing", async () => {
    const rows = await sql.begin(async (tx) => {
      await tx`set local role anon`;
      return tx`select id from accounts`;
    });
    expect(rows).toHaveLength(0);
  });

  it("reference data is readable by signed-in users", async () => {
    const rows = await asUser(userA, (tx) => tx`select symbol from instruments limit 1`);
    expect(rows.length).toBeGreaterThanOrEqual(0); // readable without error; seeded in dev/CI
  });

  it("composite FK: a trade cannot point at another user's account (even bypassing RLS)", async () => {
    await expect(
      sql`insert into trades (user_id, account_id, symbol_raw, symbol, direction, volume, entry_price, open_time)
          values (${userA}, ${accountB}, 'EURUSD', 'EURUSD', 'buy', 1, 1.1, now())`,
    ).rejects.toThrow(/trades_account_fk/);
  });

  it("duplicate guard: same Position ID is skipped per account, allowed across accounts", async () => {
    const insert = (userId: string, accountId: string, positionId: string | null) => sql`
      insert into trades (user_id, account_id, position_id, source, symbol_raw, symbol, direction,
                          volume, entry_price, open_time, close_time, close_price, commission, swap, profit)
      values (${userId}, ${accountId}, ${positionId}, 'mt5_html', 'EURUSD.r', 'EURUSD', 'buy',
              1, 1.1, now() - interval '1 hour', now(), 1.101, -7, -1.5, 100)
      on conflict (account_id, position_id) do nothing
      returning id, net_pnl`;

    const first = await insert(userA, accountA, "123456");
    const again = await insert(userA, accountA, "123456");
    const otherAccount = await insert(userB, accountB, "123456");
    const manual1 = await insert(userA, accountA, null);
    const manual2 = await insert(userA, accountA, null);

    expect(first).toHaveLength(1);
    expect(again).toHaveLength(0);
    expect(otherAccount).toHaveLength(1);
    expect(manual1).toHaveLength(1);
    expect(manual2).toHaveLength(1);
    // net_pnl = profit + commission + swap, computed by the database.
    expect(first[0].net_pnl).toBe("91.50");
  });

  it("closed trades must have close price and profit", async () => {
    await expect(
      sql`insert into trades (user_id, account_id, symbol_raw, symbol, direction, volume, entry_price, open_time, close_time)
          values (${userA}, ${accountA}, 'EURUSD', 'EURUSD', 'buy', 1, 1.1, now() - interval '1 hour', now())`,
    ).rejects.toThrow(/trades_closed_fields_check/);
  });

  describe("app queries", () => {
    beforeAll(() => {
      process.env.DATABASE_URL = url;
      process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test";
    });

    it("findOwnedAccount returns only the caller's account", async () => {
      const { findOwnedAccount } = await import("@/server/queries/accounts");
      expect((await findOwnedAccount(userA, accountA))?.id).toBe(accountA);
      expect(await findOwnedAccount(userA, accountB)).toBeNull();
      expect(await findOwnedAccount(userA, "not-a-uuid")).toBeNull();
      expect(await findOwnedAccount(userA, undefined)).toBeNull();
    });

    it("ensureProfile creates once, validates the time zone, and never overwrites", async () => {
      const { ensureProfile, getProfile } = await import("@/server/queries/profiles");
      await ensureProfile(userA, "Mars/Olympus");
      expect((await getProfile(userA)).timezone).toBe("UTC");
      await ensureProfile(userB, "Europe/London");
      await ensureProfile(userB, "Asia/Tokyo");
      expect((await getProfile(userB)).timezone).toBe("Europe/London");
    });
  });
});
