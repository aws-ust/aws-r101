import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { app } from "./app";
import { db } from "./db";
import { recruitmentWindows } from "./db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for recruitment season tests.");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Recruitment season tests require a test database.");
}

async function setRecruitmentWindow(startsAt: Date, endsAt: Date) {
  await db
    .insert(recruitmentWindows)
    .values({ singleton: 1, startsAt, endsAt })
    .onConflictDoUpdate({
      target: recruitmentWindows.singleton,
      set: { startsAt, endsAt },
    });
}

test("new applications are blocked before recruitment starts", async (t) => {
  const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await setRecruitmentWindow(futureStart, futureEnd);

  await t.test("POST /applications returns 403", async () => {
    const response = await app.request("/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 403);
    const body = (await response.json()) as { error: string };
    assert.match(body.error, /not started/i);
  });

  await t.test("POST /uploads/presign returns 403", async () => {
    const response = await app.request("/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documents: [] }),
    });
    assert.equal(response.status, 403);
  });

  await t.test("GET /recruitment-window is public", async () => {
    const response = await app.request("/recruitment-window");
    assert.equal(response.status, 200);
    const body = (await response.json()) as { open: boolean; code: string };
    assert.equal(body.open, false);
    assert.equal(body.code, "recruitment_not_started");
  });
});

before(async () => {
  await db.delete(recruitmentWindows);
});

after(async () => {
  await setRecruitmentWindow(
    new Date(Date.now() - 60 * 1000),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
});
