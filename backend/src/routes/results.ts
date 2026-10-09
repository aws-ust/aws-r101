import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../auth";
import {
  parseTrackParam,
  resolveScope,
  type RecruitmentTrack,
} from "../lib/applications/recruitment-scope";
import { getOfficerHuntSettings } from "../lib/officer-hunt/settings";
import { outboxLeaseActive, outboxStatus, RESULT_MESSAGE_TYPES } from "../lib/email/outbox";
import { kickEmailOutbox } from "../lib/email/outbox-kick";
import {
  markUncertainResultEmailsDelivered,
  resendUncertainResultEmails,
  retryFailedResultEmails,
} from "../lib/hr/result-email-delivery";
import {
  releaseResults,
  ResultsReleaseBlockedError,
} from "../lib/hr/results-release";
import { getResultsPreview } from "../lib/hr/results-preview";
import { logHrAudit } from "../lib/hr/audit";

export const resultsRoutes = new Hono<{ Variables: { track: RecruitmentTrack } }>();

resultsRoutes.use("*", requireAuth);

resultsRoutes.use("*", async (c, next) => {
  const track = parseTrackParam(c.req.query("track"));
  if (!track) return c.json({ error: "track must be r101 or officer_hunt." }, 400);
  if (track === "officer_hunt" && !(await getOfficerHuntSettings())) {
    return c.json({ error: "Set up the officer hunt first." }, 409);
  }
  c.set("track", track);
  await next();
});

resultsRoutes.get("/preview", async (c) => {
  const preview = await getResultsPreview(c.get("track"));
  return c.json(preview);
});

resultsRoutes.post("/release", async (c) => {
  try {
    const payload = c.get("jwtPayload") as { sub?: unknown };
    const actorEmail =
      typeof payload.sub === "string" ? payload.sub : undefined;
    const release = await releaseResults(actorEmail, c.get("track"));
    logHrAudit({
      actorEmail,
      action: c.get("track") === "officer_hunt" ? "officer_hunt.results.release" : "results.release",
      resourceType: "results_batch",
    });
    // Emails are sent by the background outbox, a few per second, so the
    // request returns right away instead of racing Gmail's rate limit.
    if (release.notificationIds.length > 0) await kickEmailOutbox();
    return c.json({
      ...release.summary,
      // Only the officer hunt seats people, so R101's response keeps its shape.
      ...(c.get("track") === "officer_hunt" ? { seated: release.seated } : {}),
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
    recruitmentYear: (await resolveScope(c.get("track"))).year,
    track: c.get("track"),
  });
  // HR polls this while emails go out; restart the worker if it stopped with
  // emails still queued (e.g. after waiting out a Gmail limit).
  if (status.queued > 0 && !(await outboxLeaseActive())) await kickEmailOutbox();
  return c.json(status);
});

resultsRoutes.post("/emails/retry-failed", async (c) => {
  const result = await retryFailedResultEmails(c.get("track"));
  if (result.retried > 0) await kickEmailOutbox();
  return c.json(result);
});

const selectedEmailsSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });

/** Resends the uncertain emails HR ticked; they checked the Sent folder and found them missing. */
resultsRoutes.post("/emails/resend-selected", async (c) => {
  const parsed = selectedEmailsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Pick at least one email." }, 400);
  const result = await resendUncertainResultEmails(parsed.data.ids, c.get("track"));
  if (result.retried > 0) await kickEmailOutbox();
  return c.json(result);
});

/** Counts the uncertain emails HR ticked as sent; they found them in the Sent folder. */
resultsRoutes.post("/emails/mark-delivered", async (c) => {
  const parsed = selectedEmailsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Pick at least one email." }, 400);
  return c.json(await markUncertainResultEmailsDelivered(parsed.data.ids, c.get("track")));
});
