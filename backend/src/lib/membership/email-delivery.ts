import { eq } from "drizzle-orm";
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
  requeueFailed,
  type ClaimedNotification,
  type PreparedEmail,
} from "../email/outbox";
import {
  renderMembershipConfirmation,
  renderMembershipVerified,
  renderPaymentInvitation,
} from "../email/service";
import { recruitmentYearInt } from "../applications/application-code";
import { memberPositionLabel } from "./member-position";

function setConfirmationStatus(paymentId: string, confirmationStatus: "released" | "email_failed") {
  return async () => {
    await db
      .update(membershipPayments)
      .set({ confirmationStatus, updatedAt: new Date() })
      .where(eq(membershipPayments.id, paymentId));
  };
}

/** Renders a queued payment invitation, verified-member or confirmation email. */
export async function prepareMembershipNotification(
  notification: ClaimedNotification,
): Promise<PreparedEmail> {
  const [row] = await db
    .select({
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
    .innerJoin(membershipPayments, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(emailNotifications.id, notification.id))
    .limit(1);
  if (!row) return { kind: "invalid", error: "Membership payment for this email was not found." };
  if (row.amountCents === null) {
    return { kind: "invalid", error: "Membership payment amount is not configured." };
  }

  if (notification.messageType === "payment_invitation") {
    return {
      kind: "ready",
      rendered: renderPaymentInvitation({
        lastName: row.lastName,
        applicationCode: row.applicationCode,
        amountCents: row.amountCents,
        deadlineAt: row.deadlineAt,
      }),
    };
  }
  if (notification.messageType === "membership_verified") {
    if (!row.memberId) return { kind: "invalid", error: "Member ID has not been assigned." };
    return {
      kind: "ready",
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
    };
  }
  if (notification.messageType === "membership_confirmation") {
    const onFailed = setConfirmationStatus(row.paymentId, "email_failed");
    if (!row.memberId || !row.generalChatLink) {
      return { kind: "invalid", error: "Verified membership details are incomplete.", onFailed };
    }
    const acceptedIntoCommittee =
      row.applicationType === "position" &&
      row.applicationStatus === "approved" &&
      Boolean(row.position);
    return {
      kind: "ready",
      rendered: renderMembershipConfirmation({
        lastName: row.lastName,
        memberId: row.memberId,
        membersGroupLink: row.generalChatLink,
        committeeChatLink: acceptedIntoCommittee ? row.chatLink : null,
        committeeName: acceptedIntoCommittee ? row.committeeName : null,
        placement:
          row.applicationType === "position" && row.applicationStatus === "approved"
            ? row.position
            : null,
      }),
      onSent: setConfirmationStatus(row.paymentId, "released"),
      onFailed,
    };
  }
  return { kind: "invalid", error: "Unsupported membership email type." };
}

/** Requeues failed membership emails of one type for the background sender. */
export async function retryFailedMembershipEmails(
  messageType: "payment_invitation" | "membership_confirmation" | "membership_verified",
) {
  const retried = await requeueFailed({
    messageTypes: [messageType],
    recruitmentYear: recruitmentYearInt(),
    uncertain: false,
  });
  return { retried };
}
