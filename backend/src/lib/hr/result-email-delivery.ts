import { asRecruitmentType } from "../applications/recruitment-scope";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  positions,
} from "../../db/schema";
import { recruitmentYearInt } from "../applications/application-code";
import {
  RESULT_MESSAGE_TYPES,
  requeueFailed,
  type ClaimedNotification,
  type PreparedEmail,
} from "../email/outbox";
import { renderResultEmail } from "../email/service";

async function loadRedirectPosition(positionId: string) {
  const [row] = await db
    .select({ title: positions.name, committee: committees.name })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(positions.id, positionId))
    .limit(1);
  return row ?? null;
}

/** Renders a queued result email (accepted, member-only accepted, rejected or redirected). */
export async function prepareResultNotification(
  notification: ClaimedNotification,
): Promise<PreparedEmail> {
  const messageType = notification.messageType;
  if (
    messageType !== "result_accepted" &&
    messageType !== "result_rejected" &&
    messageType !== "result_redirected"
  ) {
    return { kind: "invalid", error: "Notification is not a result email." };
  }
  const [row] = await db
    .select({
      lastName: applicants.lastName,
      position: positions.name,
      redirectPositionId: applications.redirectPositionId,
      applicationType: applications.applicationType,
    })
    .from(emailNotifications)
    .innerJoin(applications, eq(emailNotifications.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .where(eq(emailNotifications.id, notification.id))
    .limit(1);
  if (!row) return { kind: "invalid", error: "Application for this email was not found." };

  if (messageType === "result_accepted" && row.applicationType !== "member" && !row.position) {
    return { kind: "invalid", error: "Accepted result has no final position." };
  }
  if (messageType === "result_redirected") {
    const redirect = row.redirectPositionId
      ? await loadRedirectPosition(row.redirectPositionId)
      : null;
    if (!redirect) return { kind: "invalid", error: "Redirected result has no redirect position." };
    return {
      kind: "ready",
      rendered: renderResultEmail({
        messageType,
        lastName: row.lastName,
        position: redirect.title,
        committee: redirect.committee,
      }),
    };
  }
  return {
    kind: "ready",
    rendered: renderResultEmail({
      messageType,
      lastName: row.lastName,
      position: row.position,
      applicationType: asRecruitmentType(row.applicationType),
    }),
  };
}

/**
 * Requeues failed result emails for the background sender. Uncertain ones
 * (possibly already delivered) are only requeued when HR asks for them.
 */
export async function retryFailedResultEmails(options?: { uncertain?: boolean }) {
  const retried = await requeueFailed({
    messageTypes: RESULT_MESSAGE_TYPES,
    recruitmentYear: recruitmentYearInt(),
    uncertain: options?.uncertain ?? false,
  });
  return { retried };
}
