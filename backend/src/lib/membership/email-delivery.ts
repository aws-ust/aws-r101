import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPayments,
  officerSeats,
  positions,
} from "../../db/schema";
import {
  requeueFailed,
  type ClaimedNotification,
  type PreparedEmail,
} from "../email/outbox";
import {
  renderMembershipVerified,
  renderPaymentDeadlineExtended,
  renderPaymentInvitation,
} from "../email/service";
import { recruitmentYearInt } from "../applications/application-code";
import { memberPositionLabel } from "./member-position";

/** Renders a queued payment invitation or verified-member email. */
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
      officerTitle: officerSeats.title,
      amountCents: membershipPaymentCampaigns.amountCents,
      deadlineAt: membershipPaymentCampaigns.deadlineAt,
      resubmissionDeadlineAt: membershipPayments.resubmissionDeadlineAt,
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
    .leftJoin(officerSeats, eq(officerSeats.applicationId, applications.id))
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
  if (notification.messageType === "payment_deadline_extended") {
    return {
      kind: "ready",
      rendered: renderPaymentDeadlineExtended({
        lastName: row.lastName,
        applicationCode: row.applicationCode,
        amountCents: row.amountCents,
        // Someone asked to resubmit has their own deadline, which may be later than the campaign's.
        deadlineAt: row.resubmissionDeadlineAt ?? row.deadlineAt,
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
          officerTitle: row.officerTitle,
        }),
      }),
    };
  }
  return { kind: "invalid", error: "Unsupported membership email type." };
}

/** Requeues failed membership emails of one type for the background sender. */
export async function retryFailedMembershipEmails(
  messageType: "payment_invitation" | "membership_verified",
) {
  const retried = await requeueFailed({
    messageTypes: [messageType],
    recruitmentYear: recruitmentYearInt(),
    uncertain: false,
  });
  return { retried };
}
