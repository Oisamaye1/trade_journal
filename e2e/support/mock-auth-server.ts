/**
 * TEST-ONLY stand-in for the Supabase Auth (GoTrue) endpoints PropBook uses, so the real app code
 * (server actions, PKCE callback, proxy, getClaims JWT verification, DAL) can be exercised in
 * Playwright without Docker or a hosted project. Never used outside e2e.
 *
 * Implements: POST /auth/v1/otp, POST /auth/v1/token (pkce, refresh_token), GET /auth/v1/user,
 * POST /auth/v1/logout, GET /auth/v1/.well-known/jwks.json,
 * plus GET /__test/magic-link?email=… which returns the link the email would contain.
 *
 * Users are inserted into auth.users of DATABASE_URL so app FKs (profiles → auth.users) hold.
 */
import { createHash, createSign, generateKeyPairSync, randomBytes, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import postgres from "postgres";

const PORT = Number(process.env.MOCK_AUTH_PORT ?? 54321);
const ISSUER = `http://127.0.0.1:${PORT}/auth/v1`;
const sql = postgres(process.env.DATABASE_URL ?? "", { prepare: false, max: 2 });

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const KID = randomUUID();
const publicJwk = { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "ES256", use: "sig" };

type User = { id: string; email: string };
const usersByEmail = new Map<string, User>();
const usersById = new Map<string, User>();
/** email → pending magic link { redirectTo, codeChallenge } */
const pendingOtp = new Map<string, { redirectTo: string; codeChallenge: string | null }>();
/** auth code → { email, codeChallenge } */
const authCodes = new Map<string, { email: string; codeChallenge: string | null }>();
const refreshTokens = new Map<string, string>(); // token → userId

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

function signJwt(user: User, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: KID }));
  const payload = b64url(
    JSON.stringify({
      iss: ISSUER,
      sub: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      iat: now,
      exp: now + ttlSeconds,
      session_id: randomUUID(),
      aal: "aal1",
      is_anonymous: false,
    }),
  );
  const signer = createSign("SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${header}.${payload}.${b64url(signature)}`;
}

function userJson(user: User) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };
}

function session(user: User) {
  const expiresIn = Number(process.env.MOCK_AUTH_TTL ?? 3600);
  const refreshToken = b64url(randomBytes(24));
  refreshTokens.set(refreshToken, user.id);
  return {
    access_token: signJwt(user, expiresIn),
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: refreshToken,
    user: userJson(user),
  };
}

async function ensureUser(email: string): Promise<User> {
  const existing = usersByEmail.get(email);
  if (existing) return existing;
  const [row] = await sql<{ id: string }[]>`
    insert into auth.users (email) values (${email})
    on conflict (email) do update set email = excluded.email
    returning id`;
  const user = { id: row.id, email };
  usersByEmail.set(email, user);
  usersById.set(user.id, user);
  return user;
}

function userFromBearer(req: IncomingMessage): User | null {
  const token = req.headers.authorization?.replace(/^Bearer /i, "");
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString());
    return usersById.get(payload.sub) ?? null;
  } catch {
    return null;
  }
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString();
  return text ? JSON.parse(text) : {};
}

function send(res: ServerResponse, status: number, body?: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const path = url.pathname;

    if (req.method === "GET" && path === "/health") return send(res, 200, { ok: true });

    if (req.method === "GET" && path === "/auth/v1/.well-known/jwks.json") {
      return send(res, 200, { keys: [publicJwk] });
    }

    if (req.method === "POST" && path === "/auth/v1/otp") {
      const body = await readJson(req);
      const email = String(body.email ?? "").toLowerCase();
      if (!email.includes("@")) return send(res, 400, { msg: "invalid email" });
      if (email.startsWith("ratelimited")) return send(res, 429, { msg: "rate limited" });
      pendingOtp.set(email, {
        redirectTo: url.searchParams.get("redirect_to") ?? "",
        codeChallenge: typeof body.code_challenge === "string" ? body.code_challenge : null,
      });
      return send(res, 200, {});
    }

    // What clicking the emailed link would do: GoTrue verifies, then redirects to redirect_to?code=…
    if (req.method === "GET" && path === "/__test/magic-link") {
      const email = String(url.searchParams.get("email") ?? "").toLowerCase();
      const pending = pendingOtp.get(email);
      if (!pending) return send(res, 404, { msg: "no pending link" });
      const code = randomUUID();
      authCodes.set(code, { email, codeChallenge: pending.codeChallenge });
      const target = new URL(pending.redirectTo);
      target.searchParams.set("code", code);
      return send(res, 200, { url: target.toString() });
    }

    if (req.method === "POST" && path === "/auth/v1/token") {
      const grant = url.searchParams.get("grant_type");
      const body = await readJson(req);
      if (grant === "pkce") {
        const entry = authCodes.get(String(body.auth_code));
        authCodes.delete(String(body.auth_code));
        if (!entry) return send(res, 400, { error: "invalid_grant", msg: "invalid code" });
        if (entry.codeChallenge) {
          const verifier = String(body.code_verifier ?? "");
          const challenge = createHash("sha256").update(verifier).digest("base64url");
          if (challenge !== entry.codeChallenge) {
            return send(res, 400, { error: "invalid_grant", msg: "code verifier mismatch" });
          }
        }
        return send(res, 200, session(await ensureUser(entry.email)));
      }
      if (grant === "refresh_token") {
        const userId = refreshTokens.get(String(body.refresh_token));
        const user = userId ? usersById.get(userId) : undefined;
        if (!user) return send(res, 400, { error: "invalid_grant", msg: "invalid refresh token" });
        return send(res, 200, session(user));
      }
      return send(res, 400, { error: "unsupported_grant_type" });
    }

    if (req.method === "GET" && path === "/auth/v1/user") {
      const user = userFromBearer(req);
      return user ? send(res, 200, userJson(user)) : send(res, 401, { msg: "invalid token" });
    }

    if (req.method === "POST" && path === "/auth/v1/logout") {
      res.writeHead(204);
      return res.end();
    }

    send(res, 404, { msg: `mock auth: no route for ${req.method} ${path}` });
  } catch (error) {
    send(res, 500, { msg: String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock auth listening on ${ISSUER}`);
});
