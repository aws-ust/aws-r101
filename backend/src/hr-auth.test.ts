import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import { app } from "./app";
import { db } from "./db";
import { users } from "./db/schema";
import { verifyHrCredentials } from "./auth";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.replace(/^\/+/, "")
  : "";
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for HR auth tests.");
}
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("HR auth tests require a test database.");
}

process.env.JWT_SECRET = "hr-auth-test-secret";
process.env.CORS_ORIGIN = "http://localhost:3000";

// The login tests use the seeded HR account. Create it when the test database
// has not been seeded, and remove only what this file created.
let createdHrUserId: string | null = null;

before(async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: "hr@aws-ust.org",
      passwordHash: await bcrypt.hash("password123", 10),
      firstName: "Hazel",
      lastName: "Reyes",
      role: "hr",
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  createdHrUserId = created?.id ?? null;
});

after(async () => {
  if (createdHrUserId) await db.delete(users).where(eq(users.id, createdHrUserId));
  await db.$client.end();
});

test("verifyHrCredentials accepts seeded bcrypt user", async () => {
    const result = await verifyHrCredentials("hr@aws-ust.org", "password123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.email, "hr@aws-ust.org");
    }
});

test("verifyHrCredentials rejects wrong password", async () => {
    const result = await verifyHrCredentials("hr@aws-ust.org", "wrong-password");
    assert.equal(result.ok, false);
});

test("legacy Finance users cannot authenticate or reuse a session", async () => {
  const id = randomUUID();
  const email = `legacy-finance-${id}@test.dev`;
  await db.insert(users).values({
    id,
    email,
    passwordHash: await bcrypt.hash("password123", 10),
    firstName: "Legacy",
    lastName: "Finance",
    role: "finance",
  });

  try {
    assert.deepEqual(
      await verifyHrCredentials(email, "password123"),
      { ok: false },
    );
    const token = await sign(
      { sub: email, exp: Math.floor(Date.now() / 1000) + 60 },
      process.env.JWT_SECRET!,
      "HS256",
    );
    const response = await app.request("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 401);
  } finally {
    await db.delete(users).where(eq(users.id, id));
  }
});

test("expired HR JWT returns 401 on protected route", async () => {
  const exp = Math.floor(Date.now() / 1000) - 60;
  const token = await sign(
    { sub: "hr@aws-ust.org", exp },
    process.env.JWT_SECRET!,
    "HS256",
  );
  const response = await app.request("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 401);
});

test("login omits token from JSON when ALLOW_LOGIN_TOKEN_RESPONSE is unset", async () => {
    const previous = process.env.ALLOW_LOGIN_TOKEN_RESPONSE;
    delete process.env.ALLOW_LOGIN_TOKEN_RESPONSE;
    const response = await app.request("/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email: "hr@aws-ust.org",
        password: "password123",
      }),
    });
    if (previous) process.env.ALLOW_LOGIN_TOKEN_RESPONSE = previous;
    assert.equal(response.status, 200);
    const body = (await response.json()) as { token?: string; email?: string };
    assert.equal(body.email, "hr@aws-ust.org");
    assert.equal(body.token, undefined);
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /hr_token=/);
});
