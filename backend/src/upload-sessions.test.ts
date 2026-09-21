import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { db } from "./db";
import { recruitmentWindows, uploadSessions } from "./db/schema";
import { originHeaders } from "./test-support/request";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for upload-session tests.");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Upload-session tests require a test database.");
}

test("the upload-session cap only counts active unexpired sessions", async (t) => {
  const now = new Date();
  const consumedIds = Array.from({ length: 200 }, () => randomUUID());
  const activeIds = Array.from({ length: 200 }, () => randomUUID());
  let createdSessionId: string | undefined;

  const [originalWindow] = await db.select().from(recruitmentWindows).limit(1);
  const originalFreePlanEndDate = process.env.FREE_PLAN_END_DATE;
  const originalBucket = process.env.S3_BUCKET;
  const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

  t.after(async () => {
    if (createdSessionId) {
      await db.delete(uploadSessions).where(eq(uploadSessions.id, createdSessionId));
    }
    await db.delete(uploadSessions).where(inArray(uploadSessions.id, consumedIds));
    await db.delete(uploadSessions).where(inArray(uploadSessions.id, activeIds));

    if (originalWindow) {
      await db
        .insert(recruitmentWindows)
        .values(originalWindow)
        .onConflictDoUpdate({
          target: recruitmentWindows.singleton,
          set: {
            startsAt: originalWindow.startsAt,
            endsAt: originalWindow.endsAt,
          },
        });
    } else {
      await db.delete(recruitmentWindows);
    }

    restoreEnv("FREE_PLAN_END_DATE", originalFreePlanEndDate);
    restoreEnv("S3_BUCKET", originalBucket);
    restoreEnv("AWS_ACCESS_KEY_ID", originalAccessKey);
    restoreEnv("AWS_SECRET_ACCESS_KEY", originalSecretKey);
    await db.$client.end();
  });

  process.env.FREE_PLAN_END_DATE = "2099-01-01T00:00:00.000Z";
  process.env.S3_BUCKET = "upload-session-test";
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "test";

  await db
    .insert(recruitmentWindows)
    .values({
      singleton: 1,
      startsAt: new Date(now.getTime() - 60_000),
      endsAt: new Date(now.getTime() + 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: recruitmentWindows.singleton,
      set: {
        startsAt: new Date(now.getTime() - 60_000),
        endsAt: new Date(now.getTime() + 60 * 60 * 1000),
      },
    });

  await db.insert(uploadSessions).values(
    consumedIds.map((id) => ({
      id,
      status: "consumed" as const,
      uploadExpiresAt: new Date(now.getTime() - 60_000),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      consumedAt: now,
    })),
  );

  const response = await requestUploadSession();

  assert.equal(response.status, 201);
  const body = (await response.json()) as { uploadSessionId: string };
  createdSessionId = body.uploadSessionId;

  await db.delete(uploadSessions).where(eq(uploadSessions.id, createdSessionId));
  createdSessionId = undefined;
  await db.insert(uploadSessions).values(
    activeIds.map((id) => ({
      id,
      status: "active" as const,
      uploadExpiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
    })),
  );

  const cappedResponse = await requestUploadSession();
  assert.equal(cappedResponse.status, 409);
  const cappedBody = (await cappedResponse.json()) as { error: string };
  assert.match(cappedBody.error, /upload-session cap/i);
});

function requestUploadSession() {
  return app.request("/uploads/presign", {
    method: "POST",
    headers: originHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({
      documents: [
        {
          documentType: "resume",
          fileName: "resume.pdf",
          sizeBytes: 1,
          checksumSha256: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        },
      ],
    }),
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
