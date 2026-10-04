import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPayments,
  positions,
} from "../../db/schema";
import {
  deliverNotification,
  renderMembershipConfirmation,
  renderMembershipVerified,
  renderPaymentInvitation,
} from "../email/service";
import { markFailed } from "../email/notifications";
import { recruitmentYearInt } from "../applications/application-code";
import { memberPositionLabel } from "./member-position";

export type MembershipEmailDeliverySummary = {
  sent: number;
  failed: number;
};

export async function deliverMembershipNotifications(
  notificationIds: string[],
): Promise<MembershipEmailDeliverySummary> {
  if (notificationIds.length === 0) return { sent: 0, failed: 0 };
  const rows = await db
    .select({
      notificationId: emailNotifications.id,
      messageType: emailNotifications.messageType,
      recipient: emailNotifications.recipient,
      applicationId: applications.id,
      applicationCode: applications.applicationCode,
      applicationType: applications.applicationType,
      applicationStatus: applications.status,
      lastName: applicants.lastName,
      memberId: applications.memberId,
      position: positions.name,
      committeeName: committees.name,
      generalChatLink: membershipPaymentCampaigns.generalChatLink,
      amountCents: membershipPaymentCampaigns.amountCents,
      deadlineAt: membershipPaymentCampaigns.deadlineAt,
      paymentId: membershipPayments.id,
      chatLink: membershipPayments.assignedChatLink,
    })
    .from(emailNotifications)
    .innerJoin(applications, eq(emailNotifications.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .innerJoin(
      membershipPayments,
      eq(membershipPayments.applicationId, applications.id),
    )
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(inArray(emailNotifications.id, notificationIds));

  const results = await Promise.allSettled(
    rows.map(async (row) => {
      if (row.amountCents === null) {
        await markFailed(
          row.notificationId,
          "Membership payment amount is not configured.",
        );
        return "failed" as const;
      }
      if (row.messageType === "payment_invitation") {
        const kind =
          row.applicationType === "member"
            ? "member"
            : row.applicationStatus === "approved"
              ? "accepted"
              : "rejected";
        return deliverNotification({
          notificationId: row.notificationId,
          messageType: row.messageType,
          recipient: row.recipient,
          rendered: renderPaymentInvitation({
            lastName: row.lastName,
            applicationCode: row.applicationCode,
            kind,
            amountCents: row.amountCents,
            deadlineAt: row.deadlineAt,
          }),
        });
      }
      if (row.messageType === "membership_verified") {
        if (!row.memberId) {
          await markFailed(row.notificationId, "Member ID has not been assigned.");
          return "failed" as const;
        }
        return deliverNotification({
          notificationId: row.notificationId,
          messageType: row.messageType,
          recipient: row.recipient,
          rendered: renderMembershipVerified({
            lastName: row.lastName,
            memberId: row.memberId,
            position: memberPositionLabel({
              applicationType: row.applicationType,
              applicationStatus: row.applicationStatus,
              positionName: row.position,
              committeeName: row.committeeName,
            }),
          }),
        });
      }
      if (row.messageType === "membership_confirmation") {
        const acceptedIntoCommittee =
          row.applicationType === "position" &&
          row.applicationStatus === "approved" &&
          Boolean(row.position);
        if (!row.memberId || !row.generalChatLink) {
          await markFailed(
            row.notificationId,
            "Verified membership details are incomplete.",
          );
          await db
            .update(membershipPayments)
            .set({ confirmationStatus: "email_failed", updatedAt: new Date() })
            .where(eq(membershipPayments.id, row.paymentId));
          return "failed" as const;
        }
        try {
          const status = await deliverNotification({
            notificationId: row.notificationId,
            messageType: row.messageType,
            recipient: row.recipient,
            rendered: renderMembershipConfirmation({
              lastName: row.lastName,
              memberId: row.memberId,
              membersGroupLink: row.generalChatLink,
              committeeChatLink: acceptedIntoCommittee ? row.chatLink : null,
              committeeName: acceptedIntoCommittee ? row.committeeName : null,
              placement:
                row.applicationType === "position" &&
                row.applicationStatus === "approved"
                  ? row.position
                  : null,
            }),
          });
          await db
            .update(membershipPayments)
            .set({
              confirmationStatus:
                status === "sent" ? "released" : "email_failed",
              updatedAt: new Date(),
            })
            .where(eq(membershipPayments.id, row.paymentId));
          return status;
        } catch {
          await db
            .update(membershipPayments)
            .set({ confirmationStatus: "email_failed", updatedAt: new Date() })
            .where(eq(membershipPayments.id, row.paymentId));
          return "failed" as const;
        }
      }
      await markFailed(row.notificationId, "Unsupported membership email type.");
      return "failed" as const;
    }),
  );
  const sent = results.filter(
    (result) => result.status === "fulfilled" && result.value === "sent",
  ).length;
  return { sent, failed: notificationIds.length - sent };
}

export async function retryFailedMembershipEmails(
  messageType:
    | "payment_invitation"
    | "membership_confirmation"
    | "membership_verified",
) {
  const recruitmentYear = recruitmentYearInt();
  const ids = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .innerJoin(
        membershipPayments,
        eq(emailNotifications.applicationId, membershipPayments.applicationId),
      )
      .innerJoin(
        membershipPaymentCampaigns,
        eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
      )
      .where(
        and(
          eq(emailNotifications.status, "failed"),
          eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYear),
          eq(emailNotifications.messageType, messageType),
        ),
      )
      .for("update");
    const notificationIds = rows.map((row) => row.id);
    if (notificationIds.length > 0) {
      await tx
        .update(emailNotifications)
        .set({ status: "pending", lastError: null })
        .where(inArray(emailNotifications.id, notificationIds));
    }
    return notificationIds;
  });
  const delivery = await deliverMembershipNotifications(ids);
  return { retried: ids.length, ...delivery };
}
