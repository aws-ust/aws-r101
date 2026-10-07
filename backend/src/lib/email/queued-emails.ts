import { randomUUID } from "node:crypto";
import { prepareResultNotification } from "../hr/result-email-delivery";
import { prepareMembershipNotification } from "../membership/email-delivery";
import {
  acquireOutboxLease,
  releaseOutboxLease,
  runOutbox,
  sweepStaleSending,
  type ClaimedNotification,
  type PreparedEmail,
  type SendEmail,
} from "./outbox";

export function prepareQueuedEmail(notification: ClaimedNotification): Promise<PreparedEmail> {
  switch (notification.messageType) {
    case "result_accepted":
    case "result_rejected":
    case "result_redirected":
      return prepareResultNotification(notification);
    case "payment_invitation":
    case "membership_confirmation":
    case "membership_verified":
      return prepareMembershipNotification(notification);
    default:
      return Promise.resolve({ kind: "invalid", error: "This email type is not sent from the queue." });
  }
}

const LEASE_MS = 2 * 60 * 1000;

/**
 * One background pass: flag possibly-delivered stragglers, then send what's
 * due. Skips if another worker already holds the lease.
 */
export async function runEmailOutbox(options: { budgetMs: number; send?: SendEmail; spacingMs?: number }) {
  const holder = randomUUID();
  if (!(await acquireOutboxLease(holder, LEASE_MS))) {
    return { skipped: true, sent: 0, failed: 0, deferred: 0, uncertain: 0 };
  }
  try {
    const uncertain = await sweepStaleSending();
    const summary = await runOutbox({
      ...options,
      prepare: prepareQueuedEmail,
      waitForDeferred: true,
      onTick: async () => {
        await acquireOutboxLease(holder, LEASE_MS);
      },
    });
    return { skipped: false, ...summary, uncertain };
  } finally {
    await releaseOutboxLease(holder);
  }
}

/**
 * Sends a few specific queued emails right away (e.g. the single "membership
 * verified" email after HR verifies a payment). If Gmail asks to slow down,
 * the email stays queued for the background sender.
 */
export async function sendQueuedNow(ids: string[]) {
  const summary = await runOutbox({ budgetMs: 20_000, prepare: prepareQueuedEmail, ids });
  return { sent: summary.sent, failed: summary.failed, queued: summary.deferred };
}
