import { Hono } from "hono";
import { requireAuth } from "../auth";
import { recruitmentYearInt } from "../lib/applications/application-code";
import { outboxLeaseActive, outboxStatus, RESULT_MESSAGE_TYPES } from "../lib/email/outbox";
import { kickEmailOutbox } from "../lib/email/outbox-kick";
import { retryFailedResultEmails } from "../lib/hr/result-email-delivery";
import {
  releaseResults,
  ResultsReleaseBlockedError,
} from "../lib/hr/results-release";
import { getResultsPreview } from "../lib/hr/results-preview";
import { logHrAudit } from "../lib/hr/audit";

export const resultsRoutes = new Hono();

resultsRoutes.use("*", requireAuth);

resultsRoutes.get("/preview", async (c) => {
  const preview = await getResultsPreview();
  return c.json(preview);
});

resultsRoutes.post("/release", async (c) => {
  try {
    const payload = c.get("jwtPayload") as { sub?: unknown };
    const actorEmail =
      typeof payload.sub === "string" ? payload.sub : undefined;
    const release = await releaseResults(actorEmail);
    logHrAudit({
      actorEmail,
      action: "results.release",
      resourceType: "results_batch",
    });
    // Emails are sent by the background outbox, a few per second, so the
    // request returns right away instead of racing Gmail's rate limit.
    if (release.notificationIds.length > 0) await kickEmailOutbox();
    return c.json({
      ...release.summary,
      emailDelivery: { queued: release.notificationIds.length },
    });
  } catch (error) {
    if (error instanceof ResultsReleaseBlockedError) {
      return c.json(
        { error: error.message, incomplete: error.incomplete },
        409,
      );
    }
    throw error;
  }
});

resultsRoutes.get("/emails/status", async (c) => {
  const status = await outboxStatus({
    messageTypes: RESULT_MESSAGE_TYPES,
    recruitmentYear: recruitmentYearInt(),
  });
  // HR polls this while emails go out; restart the worker if it stopped with
  // emails still queued (e.g. after waiting out a Gmail limit).
  if (status.queued > 0 && !(await outboxLeaseActive())) await kickEmailOutbox();
  return c.json(status);
});

resultsRoutes.post("/emails/retry-failed", async (c) => {
  const result = await retryFailedResultEmails();
  if (result.retried > 0) await kickEmailOutbox();
  return c.json(result);
});

/** Resends emails that may already have been delivered; HR checks the Sent folder first. */
resultsRoutes.post("/emails/retry-uncertain", async (c) => {
  const result = await retryFailedResultEmails({ uncertain: true });
  if (result.retried > 0) await kickEmailOutbox();
  return c.json(result);
});
