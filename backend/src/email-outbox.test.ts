import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { applicants, applications, emailNotifications, emailOutboxLease } from "./db/schema";
import {
  acquireOutboxLease,
  releaseOutboxLease,
  runOutbox,
  sweepStaleSending,
  type SendEmail,
} from "./lib/email/outbox";
import { prepareQueuedEmail } from "./lib/email/queued-emails";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for email outbox tests.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Email outbox tests require a test database.");
}

const applicantId = randomUUID();
const applicationId = randomUUID();

after(async () => {
  try {
    await db.delete(applicants).where(eq(applicants.id, applicantId));
    await db.delete(emailOutboxLease);
  } finally {
    await db.$client.end();
  }
});

async function queue(count: number, values: Partial<typeof emailNotifications.$inferInsert> = {}) {
  const rows = await db
    .insert(emailNotifications)
    .values(
      Array.from({ length: count }, (_, index) => ({
        applicationId,
        messageType: "result_rejected" as const,
        recipient: `outbox-${index}-${randomUUID()}@ust.edu.ph`,
        ...values,
      })),
    )
    .returning({ id: emailNotifications.id });
  return rows.map((row) => row.id);
}

async function statuses(ids: string[]) {
  const rows = await db
    .select({ id: emailNotifications.id, status: emailNotifications.status, lastError: emailNotifications.lastError, nextAttemptAt: emailNotifications.nextAttemptAt })
    .from(emailNotifications)
    .where(inArray(emailNotifications.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

function rateLimitError() {
  return Object.assign(new Error("Gmail send failed (403): User-rate limit exceeded"), {
    status: 403,
    reason: "userRateLimitExceeded",
  });
}

test("email outbox", async (t) => {
  await db.insert(applicants).values({
    id: applicantId,
    firstName: "Outbox",
    lastName: "Tester",
    email: `outbox-${applicantId}@ust.edu.ph`,
  });
  await db.insert(applications).values({
    id: applicationId,
    applicantId,
    applicationCode: "AP-2097-700001",
    recruitmentYear: 2097,
    motivation: "Outbox test",
    status: "rejected",
  });

  await t.test("sends queued emails one at a time with a stable Message-ID", async () => {
    const ids = await queue(5);
    let inFlight = 0;
    let maxInFlight = 0;
    const messageIds: string[] = [];
    const send: SendEmail = async (input) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      messageIds.push(input.messageId ?? "");
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { providerMessageId: `gmail-${messageIds.length}` };
    };
    const summary = await runOutbox({ budgetMs: 10_000, prepare: prepareQueuedEmail, send, spacingMs: 1, ids });
    assert.deepEqual(summary, { sent: 5, failed: 0, deferred: 0 });
    assert.equal(maxInFlight, 1);
    assert.deepEqual(
      new Set(messageIds.map((id) => id.split("@")[0])),
      new Set(ids),
    );
    assert.ok([...(await statuses(ids)).values()].every((row) => row.status === "sent"));
  });

  await t.test("counts the spacing from when a send starts, not when it ends", async () => {
    const ids = await queue(5);
    const send: SendEmail = async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return { providerMessageId: randomUUID() };
    };
    const startedAt = Date.now();
    await runOutbox({ budgetMs: 10_000, prepare: prepareQueuedEmail, send, spacingMs: 100, ids });
    // 5 sends at 100ms apart is about 500ms; adding the pause after each 60ms send would be about 800ms.
    assert.ok(Date.now() - startedAt < 700, `took ${Date.now() - startedAt}ms`);
  });

  await t.test("backs off and stops when Gmail says to slow down", async () => {
    const ids = await queue(3);
    let calls = 0;
    const send: SendEmail = async () => {
      calls += 1;
      throw rateLimitError();
    };
    const summary = await runOutbox({ budgetMs: 10_000, prepare: prepareQueuedEmail, send, spacingMs: 1, ids });
    assert.deepEqual(summary, { sent: 0, failed: 0, deferred: 1 });
    assert.equal(calls, 1);
    const rows = [...(await statuses(ids)).values()];
    assert.ok(rows.every((row) => row.status === "pending"));
    const deferred = rows.filter((row) => row.nextAttemptAt && row.nextAttemptAt > new Date());
    assert.equal(deferred.length, 1);
    assert.match(deferred[0].lastError ?? "", /User-rate limit/);
  });

  await t.test("overlapping runs never send the same email twice", async () => {
    const ids = await queue(8);
    const sent: string[] = [];
    const send: SendEmail = async (input) => {
      sent.push(input.to);
      await new Promise((resolve) => setTimeout(resolve, 10));
      return { providerMessageId: randomUUID() };
    };
    const runs = await Promise.all([
      runOutbox({ budgetMs: 10_000, prepare: prepareQueuedEmail, send, spacingMs: 1, ids }),
      runOutbox({ budgetMs: 10_000, prepare: prepareQueuedEmail, send, spacingMs: 1, ids }),
    ]);
    assert.equal(runs[0].sent + runs[1].sent, 8);
    assert.equal(sent.length, 8);
    assert.equal(new Set(sent).size, 8);
  });

  await t.test("flags possibly-delivered emails as uncertain and never resends them", async () => {
    const [stuck] = await queue(1, { status: "sending", claimedAt: new Date(Date.now() - 11 * 60 * 1000), attempts: 1 });
    const [legacy] = await queue(1, { status: "pending", attempts: 1 });
    assert.equal(await sweepStaleSending(), 2);
    let calls = 0;
    const send: SendEmail = async () => {
      calls += 1;
      return { providerMessageId: "should-not-send" };
    };
    await runOutbox({ budgetMs: 2_000, prepare: prepareQueuedEmail, send, spacingMs: 1, ids: [stuck, legacy] });
    assert.equal(calls, 0);
    const rows = await statuses([stuck, legacy]);
    for (const id of [stuck, legacy]) {
      assert.equal(rows.get(id)?.status, "failed");
      assert.match(rows.get(id)?.lastError ?? "", /^Uncertain:/);
    }
  });

  await t.test("only one worker holds the lease at a time", async () => {
    assert.equal(await acquireOutboxLease("worker-a", 60_000), true);
    assert.equal(await acquireOutboxLease("worker-b", 60_000), false);
    assert.equal(await acquireOutboxLease("worker-a", 60_000), true);
    await releaseOutboxLease("worker-a");
    assert.equal(await acquireOutboxLease("worker-b", 60_000), true);
    await releaseOutboxLease("worker-b");
  });
});
