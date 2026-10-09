import { and, asc, eq, gt, inArray, isNotNull, isNull, like, lt, lte, min, notLike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { applications, emailNotifications, emailOutboxLease } from "../../db/schema";
import { emailEnabled, hasGmailCredentials, senderEmail } from "./config";
import { sendViaGmail } from "./gmail-client";
import { classifySendError, retryAfterFromError } from "./retry";
import type { EmailMessageType, RenderedEmail, SendEmailInput, SendEmailResult } from "./types";

/**
 * Bulk emails (results, payment invitations, membership verified) are
 * queued as `pending` rows and sent here one at a time, slowly enough to stay
 * under Gmail's per-user rate limit. A row is moved to `sending` before the
 * Gmail call, so if the process dies mid-send it is never re-sent
 * automatically: it is flagged "Uncertain" for HR instead.
 */
export const OUTBOX_MESSAGE_TYPES = [
  "result_accepted",
  "result_rejected",
  "result_redirected",
  "payment_invitation",
  "membership_verified",
  "officer_welcome",
] as const satisfies readonly EmailMessageType[];
export type OutboxMessageType = (typeof OUTBOX_MESSAGE_TYPES)[number];

export const RESULT_MESSAGE_TYPES = [
  "result_accepted",
  "result_rejected",
  "result_redirected",
] as const satisfies readonly OutboxMessageType[];

export const UNCERTAIN_PREFIX = "Uncertain:";
const UNCERTAIN_MESSAGE = `${UNCERTAIN_PREFIX} delivery may have completed before the sender stopped. Check the Sent folder before resending.`;

/**
 * Minimum time between the starts of two sends. Gmail allows about 2.5
 * sends/second per user and limits concurrent requests, so sends stay
 * sequential and this only stops a fast Gmail from being hit too quickly.
 */
const DEFAULT_SPACING_MS = 600;
const STALE_SENDING_MS = 10 * 60 * 1000;
const MAX_TRANSIENT_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const DAILY_LIMIT_BACKOFF_MS = 60 * 60 * 1000;

export type PreparedEmail =
  | {
      kind: "ready";
      rendered: RenderedEmail;
      onSent?: () => Promise<void>;
      onFailed?: () => Promise<void>;
    }
  | { kind: "invalid"; error: string; onFailed?: () => Promise<void> };

export type PrepareEmail = (row: ClaimedNotification) => Promise<PreparedEmail>;
export type SendEmail = (input: SendEmailInput) => Promise<SendEmailResult>;

export type ClaimedNotification = {
  id: string;
  messageType: EmailMessageType;
  recipient: string;
  attempts: number;
};

type DeliveryOutcome =
  | { kind: "sent" | "failed" | "deferred" }
  /** Gmail asked to slow down: pause all sending until `until`. */
  | { kind: "stop"; until: Date };

function backoffMs(attempts: number) {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(attempts - 1, 0), MAX_BACKOFF_MS);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

/** Message-ID derived from the notification, so a resent copy is recognisable as the same email. */
function messageIdFor(notificationId: string) {
  const domain = senderEmail().split("@")[1] ?? "aws-ust.local";
  return `${notificationId}@${domain}`;
}

/**
 * Due rows: fresh queue entries (never attempted) or rows the outbox itself
 * rescheduled (next_attempt_at set). Old rows that were attempted without a
 * schedule come from the previous all-at-once sender and may already have
 * gone out, so they are left for sweepStaleSending to flag.
 */
function dueCondition(now: Date) {
  return and(
    eq(emailNotifications.status, "pending"),
    inArray(emailNotifications.messageType, [...OUTBOX_MESSAGE_TYPES]),
    or(
      and(isNull(emailNotifications.nextAttemptAt), eq(emailNotifications.attempts, 0)),
      lte(emailNotifications.nextAttemptAt, now),
    ),
  );
}

async function claimNext(ids?: string[]): Promise<ClaimedNotification | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .select({
        id: emailNotifications.id,
        messageType: emailNotifications.messageType,
        recipient: emailNotifications.recipient,
        attempts: emailNotifications.attempts,
      })
      .from(emailNotifications)
      .where(ids ? and(dueCondition(now), inArray(emailNotifications.id, ids)) : dueCondition(now))
      .orderBy(asc(emailNotifications.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    await tx
      .update(emailNotifications)
      .set({ status: "sending", claimedAt: now })
      .where(eq(emailNotifications.id, row.id));
    return row;
  });
}

async function recordAttempt(id: string, attempts: number) {
  await db
    .update(emailNotifications)
    .set({ attempts })
    .where(eq(emailNotifications.id, id));
}

async function markSent(id: string, providerMessageId: string) {
  await db
    .update(emailNotifications)
    .set({ status: "sent", providerMessageId, lastError: null, sentAt: new Date(), nextAttemptAt: null })
    .where(eq(emailNotifications.id, id));
}

async function markFailed(id: string, lastError: string) {
  await db
    .update(emailNotifications)
    .set({ status: "failed", lastError, nextAttemptAt: null })
    .where(eq(emailNotifications.id, id));
}

async function requeue(id: string, nextAttemptAt: Date, lastError: string) {
  await db
    .update(emailNotifications)
    .set({ status: "pending", nextAttemptAt, lastError, claimedAt: null })
    .where(eq(emailNotifications.id, id));
}

async function deliverClaimed(
  row: ClaimedNotification,
  prepare: PrepareEmail,
  send: SendEmail,
): Promise<DeliveryOutcome> {
  let prepared: PreparedEmail;
  try {
    prepared = await prepare(row);
  } catch (err) {
    await markFailed(row.id, `Could not prepare email: ${errorMessage(err)}`);
    return { kind: "failed" };
  }
  if (prepared.kind === "invalid") {
    await markFailed(row.id, prepared.error);
    await prepared.onFailed?.();
    return { kind: "failed" };
  }

  const attempts = row.attempts + 1;
  await recordAttempt(row.id, attempts);
  try {
    const result = await send({
      to: row.recipient,
      cc: prepared.rendered.cc,
      subject: prepared.rendered.subject,
      text: prepared.rendered.text,
      html: prepared.rendered.html,
      inline: prepared.rendered.inline,
      attachments: prepared.rendered.attachments,
      messageId: messageIdFor(row.id),
    });
    await markSent(row.id, result.providerMessageId);
    await prepared.onSent?.();
    return { kind: "sent" };
  } catch (err) {
    const message = errorMessage(err);
    const kind = classifySendError(err);
    const now = Date.now();
    if (kind === "rate_limited" || kind === "daily_limit") {
      const fallback = kind === "daily_limit" ? DAILY_LIMIT_BACKOFF_MS : backoffMs(attempts);
      const at = retryAfterFromError(err) ?? new Date(now + fallback);
      await requeue(row.id, at, message);
      console.warn(`[email-outbox] ${kind} on ${row.recipient}; pausing until ${at.toISOString()}`);
      return { kind: "stop", until: at };
    }
    if (kind === "unknown_outcome") {
      // Resending could duplicate the email, so leave it for HR to check.
      await markFailed(row.id, `${UNCERTAIN_PREFIX} ${message}; the email may have been sent. Check the Sent folder before resending.`);
      return { kind: "failed" };
    }
    if (kind === "transient" && attempts < MAX_TRANSIENT_ATTEMPTS) {
      await requeue(row.id, new Date(now + backoffMs(attempts)), message);
      return { kind: "deferred" };
    }
    await markFailed(row.id, message);
    await prepared.onFailed?.();
    console.error(`[email-outbox] ${row.messageType} to ${row.recipient} failed: ${message}`);
    return { kind: "failed" };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type OutboxRunSummary = { sent: number; failed: number; deferred: number };

/**
 * Sends due emails one at a time until the time budget runs out, the queue is
 * empty, or Gmail says to slow down.
 */
export async function runOutbox(options: {
  budgetMs: number;
  prepare: PrepareEmail;
  send?: SendEmail;
  spacingMs?: number;
  ids?: string[];
  /**
   * Keep the run alive through rate-limit pauses and scheduled retries that
   * fall inside the budget, instead of stopping at the first one.
   */
  waitForDeferred?: boolean;
  /** Called before each send, e.g. to renew the worker lease. */
  onTick?: () => Promise<void>;
}): Promise<OutboxRunSummary> {
  const summary: OutboxRunSummary = { sent: 0, failed: 0, deferred: 0 };
  const send = options.send ?? sendViaGmail;
  if (!options.send && !(emailEnabled() && hasGmailCredentials())) {
    // Keep the old behaviour when email is switched off: fail instead of
    // leaving rows queued forever.
    const reason = !emailEnabled() ? "EMAIL_ENABLED=false" : "missing Gmail credentials";
    for (let row = await claimNext(options.ids); row; row = await claimNext(options.ids)) {
      const prepared = await options.prepare(row).catch(() => null);
      await markFailed(row.id, reason);
      await prepared?.onFailed?.();
      summary.failed += 1;
    }
    return summary;
  }

  const deadline = Date.now() + options.budgetMs;
  const spacingMs = options.spacingMs ?? DEFAULT_SPACING_MS;
  // Waits until `until` if that is inside the budget; false means stop the run.
  // Sleeps in short steps so onTick can keep the worker lease alive.
  const waitUntil = async (until: Date | null) => {
    if (!options.waitForDeferred || !until || until.getTime() >= deadline) return false;
    const target = Math.max(until.getTime(), Date.now() + spacingMs);
    while (Date.now() < target) {
      await sleep(Math.min(target - Date.now(), 30_000));
      await options.onTick?.();
    }
    return true;
  };
  while (Date.now() < deadline) {
    await options.onTick?.();
    const row = await claimNext(options.ids);
    if (!row) {
      if (await waitUntil(await nextScheduledAt(options.ids))) continue;
      break;
    }
    const sendStartedAt = Date.now();
    const outcome = await deliverClaimed(row, options.prepare, send);
    if (outcome.kind === "stop") {
      summary.deferred += 1;
      if (await waitUntil(outcome.until)) continue;
      break;
    }
    summary[outcome.kind] += 1;
    // Count the gap from when this send started, so a slow Gmail response
    // is not followed by another full pause.
    await sleep(Math.max(spacingMs - (Date.now() - sendStartedAt), 0));
  }
  return summary;
}

/** Earliest retry time among queued emails that the outbox rescheduled. */
async function nextScheduledAt(ids?: string[]): Promise<Date | null> {
  const [row] = await db
    .select({ at: min(emailNotifications.nextAttemptAt) })
    .from(emailNotifications)
    .where(
      and(
        eq(emailNotifications.status, "pending"),
        inArray(emailNotifications.messageType, [...OUTBOX_MESSAGE_TYPES]),
        isNotNull(emailNotifications.nextAttemptAt),
        ids ? inArray(emailNotifications.id, ids) : undefined,
      ),
    );
  return row?.at ?? null;
}

/** Whether queued emails are due now or within `withinMs`. */
export async function hasDueEmails(withinMs = 0): Promise<boolean> {
  const [row] = await db
    .select({ id: emailNotifications.id })
    .from(emailNotifications)
    .where(dueCondition(new Date(Date.now() + withinMs)))
    .limit(1);
  return Boolean(row);
}

const LEASE_ID = 1;

/** Takes (or renews) the single worker lease; false if another worker holds it. */
export async function acquireOutboxLease(holder: string, ttlMs: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlMs);
  const rows = await db
    .insert(emailOutboxLease)
    .values({ id: LEASE_ID, holder, expiresAt })
    .onConflictDoUpdate({
      target: emailOutboxLease.id,
      set: { holder, expiresAt },
      setWhere: or(
        lt(emailOutboxLease.expiresAt, new Date()),
        eq(emailOutboxLease.holder, holder),
      ),
    })
    .returning({ holder: emailOutboxLease.holder });
  return rows[0]?.holder === holder;
}

export async function releaseOutboxLease(holder: string): Promise<void> {
  await db
    .update(emailOutboxLease)
    .set({ expiresAt: new Date() })
    .where(eq(emailOutboxLease.holder, holder));
}

export async function outboxLeaseActive(): Promise<boolean> {
  const [row] = await db
    .select({ id: emailOutboxLease.id })
    .from(emailOutboxLease)
    .where(and(eq(emailOutboxLease.id, LEASE_ID), gt(emailOutboxLease.expiresAt, new Date())))
    .limit(1);
  return Boolean(row);
}

/**
 * Flags rows that may already have been delivered so they are never resent
 * automatically: rows stuck in `sending` (the worker died mid-send) and
 * attempted rows left `pending` by the previous all-at-once sender.
 */
export async function sweepStaleSending(): Promise<number> {
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);
  const rows = await db
    .update(emailNotifications)
    .set({ status: "failed", lastError: UNCERTAIN_MESSAGE, claimedAt: null })
    .where(
      and(
        inArray(emailNotifications.messageType, [...OUTBOX_MESSAGE_TYPES]),
        or(
          and(eq(emailNotifications.status, "sending"), lt(emailNotifications.claimedAt, staleBefore)),
          and(
            eq(emailNotifications.status, "pending"),
            isNull(emailNotifications.nextAttemptAt),
            gt(emailNotifications.attempts, 0),
          ),
        ),
      ),
    )
    .returning({ id: emailNotifications.id });
  return rows.length;
}

function yearCondition(recruitmentYear: number) {
  return inArray(
    emailNotifications.applicationId,
    db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.recruitmentYear, recruitmentYear)),
  );
}

/**
 * Puts failed emails back in the queue. Uncertain ones are only requeued when
 * HR explicitly asks, since they may already have reached the applicant.
 */
export async function requeueFailed(options: {
  messageTypes: readonly OutboxMessageType[];
  recruitmentYear: number;
  uncertain: boolean;
}): Promise<number> {
  const rows = await db
    .update(emailNotifications)
    .set({ status: "pending", nextAttemptAt: new Date(), claimedAt: null })
    .where(
      and(
        eq(emailNotifications.status, "failed"),
        inArray(emailNotifications.messageType, [...options.messageTypes]),
        yearCondition(options.recruitmentYear),
        options.uncertain
          ? like(emailNotifications.lastError, `${UNCERTAIN_PREFIX}%`)
          : or(
              isNull(emailNotifications.lastError),
              notLike(emailNotifications.lastError, `${UNCERTAIN_PREFIX}%`),
            ),
      ),
    )
    .returning({ id: emailNotifications.id });
  return rows.length;
}

type UncertainSelection = {
  ids: readonly string[];
  messageTypes: readonly OutboxMessageType[];
  recruitmentYear: number;
};

/** Only uncertain rows among the chosen ids, so a stale selection can't touch anything else. */
function uncertainSelection(options: UncertainSelection) {
  return and(
    inArray(emailNotifications.id, [...options.ids]),
    eq(emailNotifications.status, "failed"),
    like(emailNotifications.lastError, `${UNCERTAIN_PREFIX}%`),
    inArray(emailNotifications.messageType, [...options.messageTypes]),
    yearCondition(options.recruitmentYear),
  );
}

/** Resends just the chosen uncertain emails, after HR found them missing from the Sent folder. */
export async function requeueUncertainByIds(options: UncertainSelection): Promise<number> {
  if (options.ids.length === 0) return 0;
  const rows = await db
    .update(emailNotifications)
    .set({ status: "pending", nextAttemptAt: new Date(), claimedAt: null })
    .where(uncertainSelection(options))
    .returning({ id: emailNotifications.id });
  return rows.length;
}

/** Counts the chosen uncertain emails as sent, after HR found them in the Sent folder. */
export async function markUncertainDelivered(options: UncertainSelection): Promise<number> {
  if (options.ids.length === 0) return 0;
  const rows = await db
    .update(emailNotifications)
    .set({ status: "sent", sentAt: new Date(), lastError: null, nextAttemptAt: null, claimedAt: null })
    .where(uncertainSelection(options))
    .returning({ id: emailNotifications.id });
  return rows.length;
}

export type OutboxStatus = {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  uncertain: number;
  problems: { id: string; recipient: string; error: string | null; uncertain: boolean }[];
};

/** Delivery progress for the HR pages. */
export async function outboxStatus(options: {
  messageTypes: readonly OutboxMessageType[];
  recruitmentYear: number;
}): Promise<OutboxStatus> {
  const scope = and(
    inArray(emailNotifications.messageType, [...options.messageTypes]),
    yearCondition(options.recruitmentYear),
  );
  const uncertain = sql<boolean>`coalesce(${emailNotifications.lastError} like ${`${UNCERTAIN_PREFIX}%`}, false)`;
  const counts = await db
    .select({
      status: emailNotifications.status,
      uncertain,
      count: sql<number>`count(*)::int`,
    })
    .from(emailNotifications)
    .where(scope)
    // By position: the LIKE pattern is a bound parameter, so repeating the
    // expression here would not match the select list and Postgres rejects it.
    .groupBy(emailNotifications.status, sql`2`);
  const status: OutboxStatus = { queued: 0, sending: 0, sent: 0, failed: 0, uncertain: 0, problems: [] };
  for (const row of counts) {
    if (row.status === "pending") status.queued += row.count;
    else if (row.status === "sending") status.sending += row.count;
    else if (row.status === "sent") status.sent += row.count;
    else if (row.uncertain) status.uncertain += row.count;
    else status.failed += row.count;
  }
  const problems = await db
    .select({ id: emailNotifications.id, recipient: emailNotifications.recipient, error: emailNotifications.lastError })
    .from(emailNotifications)
    .where(and(scope, eq(emailNotifications.status, "failed")))
    .orderBy(asc(emailNotifications.recipient))
    .limit(1000);
  status.problems = problems.map((row) => ({
    ...row,
    uncertain: row.error?.startsWith(UNCERTAIN_PREFIX) ?? false,
  }));
  return status;
}
