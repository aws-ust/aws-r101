import { and, eq, inArray, isNotNull, lt, or } from "drizzle-orm";
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
import { markFailed } from "../email/notifications";

export type ResultEmailDeliverySummary = {
  sent: number;
  failed: number;
  failures: { recipient: string; error: string }[];
};

export async function deliverResultNotifications(
  notificationIds: string[],
): Promise<ResultEmailDeliverySummary> {
  if (notificationIds.length === 0) {
    return { sent: 0, failed: 0, failures: [] };
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
      const failed = async (error: string) => {
        console.error(
          `[email] result delivery failed for ${row.recipient}: ${error}`,
        );
        await markFailed(row.id, error);
        return { status: "failed" as const, recipient: row.recipient, error };
      };
      if (
        row.messageType !== "result_accepted" &&
        row.messageType !== "result_rejected" &&
        row.messageType !== "result_redirected"
      ) {
        return failed("Notification is not a result email.");
      }
      if (row.messageType === "result_accepted" && !row.position) {
        return failed("Accepted result has no final position.");
      }
      if (row.messageType === "result_redirected") {
        const redirect = row.redirectPositionId
          ? redirectById.get(row.redirectPositionId)
          : null;
        if (!redirect) {
          return failed("Redirected result has no redirect position.");
        }
        try {
          const status = await deliverQueuedResultEmail({
            notificationId: row.id,
            messageType: "result_redirected",
            recipient: row.recipient,
            lastName: row.lastName,
            position: redirect.title,
            committee: redirect.committee,
          });
          if (status !== "sent") {
            return {
              status: "failed" as const,
              recipient: row.recipient,
              error: "Result email was not sent.",
            };
          }
          return { status: "sent" as const, recipient: row.recipient, error: "" };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(
            `[email] result delivery failed for ${row.recipient}: ${message}`,
          );
          return { status: "failed" as const, recipient: row.recipient, error: message };
        }
      }
      try {
        const status = await deliverQueuedResultEmail({
          notificationId: row.id,
          messageType: row.messageType,
          recipient: row.recipient,
          lastName: row.lastName,
          position: row.position,
        });
        if (status !== "sent") {
          return {
            status: "failed" as const,
            recipient: row.recipient,
            error: "Result email was not sent.",
          };
        }
        return { status: "sent" as const, recipient: row.recipient, error: "" };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `[email] result delivery failed for ${row.recipient}: ${message}`,
        );
        return { status: "failed" as const, recipient: row.recipient, error: message };
      }
    }),
  );
  const outcomes = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const sent = outcomes.filter((result) => result.status === "sent").length;
  const failures = outcomes
    .filter((result) => result.status === "failed")
    .map((result) => ({ recipient: result.recipient, error: result.error }));
  const missing = notificationIds.length - outcomes.length;
  if (missing > 0) {
    console.error(
      `[email] ${missing} result notification(s) were queued but not delivered`,
    );
  }
  return {
    sent,
    failed: notificationIds.length - sent,
    failures,
  };
}

async function claimRetryableResultNotifications(
  pendingBefore: Date,
): Promise<string[]> {
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
          or(
            eq(emailNotifications.status, "failed"),
            and(
              eq(emailNotifications.status, "pending"),
              lt(emailNotifications.createdAt, pendingBefore),
            ),
          ),
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

export async function retryFailedResultEmails(options?: {
  includeFreshPending?: boolean;
}) {
  const pendingBefore = options?.includeFreshPending
    ? new Date()
    : new Date(Date.now() - 15_000);
  const notificationIds = await claimRetryableResultNotifications(pendingBefore);
  const delivery = await deliverResultNotifications(notificationIds);
  return {
    retried: notificationIds.length,
    sent: delivery.sent,
    failed: delivery.failed,
  };
}
