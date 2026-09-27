import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  positions,
} from "../../db/schema";
import { recruitmentYearInt } from "../applications/application-code";
import { deliverQueuedResultEmail } from "../email/service";
import { redirectPlacementCcEmails } from "../email/redirect-recipients";
import { markFailed } from "../email/notifications";

export type ResultEmailDeliverySummary = {
  sent: number;
  failed: number;
};

export async function deliverResultNotifications(
  notificationIds: string[],
): Promise<ResultEmailDeliverySummary> {
  if (notificationIds.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const rows = await db
    .select({
      id: emailNotifications.id,
      messageType: emailNotifications.messageType,
      recipient: emailNotifications.recipient,
      lastName: applicants.lastName,
      position: positions.name,
      redirectPositionId: applications.redirectPositionId,
    })
    .from(emailNotifications)
    .innerJoin(
      applications,
      eq(emailNotifications.applicationId, applications.id),
    )
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .where(inArray(emailNotifications.id, notificationIds));

  const redirectPositionIds = [
    ...new Set(
      rows
        .map((row) => row.redirectPositionId)
        .filter((id): id is string => id !== null),
    ),
  ];
  const redirectRows =
    redirectPositionIds.length === 0
      ? []
      : await db
          .select({
            id: positions.id,
            title: positions.name,
            committee: committees.name,
          })
          .from(positions)
          .innerJoin(committees, eq(positions.committeeId, committees.id))
          .where(inArray(positions.id, redirectPositionIds));
  const redirectById = new Map(redirectRows.map((row) => [row.id, row]));

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      if (
        row.messageType !== "result_accepted" &&
        row.messageType !== "result_rejected" &&
        row.messageType !== "result_redirected"
      ) {
        await markFailed(row.id, "Notification is not a result email.");
        return "failed" as const;
      }
      if (row.messageType === "result_accepted" && !row.position) {
        await markFailed(row.id, "Accepted result has no final position.");
        return "failed" as const;
      }
      if (row.messageType === "result_redirected") {
        const redirect = row.redirectPositionId
          ? redirectById.get(row.redirectPositionId)
          : null;
        if (!redirect) {
          await markFailed(row.id, "Redirected result has no redirect position.");
          return "failed" as const;
        }
        const cc = redirectPlacementCcEmails({
          committee: redirect.committee,
          positionTitle: redirect.title,
        });
        return deliverQueuedResultEmail({
          notificationId: row.id,
          messageType: "result_redirected",
          recipient: row.recipient,
          lastName: row.lastName,
          position: redirect.title,
          committee: redirect.committee,
          cc,
        });
      }
      return deliverQueuedResultEmail({
        notificationId: row.id,
        messageType: row.messageType,
        recipient: row.recipient,
        lastName: row.lastName,
        position: row.position,
      });
    }),
  );
  const sent = results.filter(
    (result) => result.status === "fulfilled" && result.value === "sent",
  ).length;
  return { sent, failed: notificationIds.length - sent };
}

async function claimFailedResultNotifications(): Promise<string[]> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .innerJoin(
        applications,
        eq(emailNotifications.applicationId, applications.id),
      )
      .where(
        and(
          eq(emailNotifications.status, "failed"),
          inArray(emailNotifications.messageType, [
            "result_accepted",
            "result_rejected",
            "result_redirected",
          ]),
          eq(applications.recruitmentYear, recruitmentYearInt()),
          isNotNull(applications.resultsReleasedAt),
        ),
      )
      .for("update");
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    await tx
      .update(emailNotifications)
      .set({ status: "pending", lastError: null })
      .where(inArray(emailNotifications.id, ids));
    return ids;
  });
}

export async function retryFailedResultEmails() {
  const notificationIds = await claimFailedResultNotifications();
  const delivery = await deliverResultNotifications(notificationIds);
  return {
    retried: notificationIds.length,
    ...delivery,
  };
}
