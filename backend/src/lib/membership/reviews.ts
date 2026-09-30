import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../../auth";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPaymentChatLinks,
  membershipPayments,
  membershipPaymentSubmissions,
  positions,
  users,
} from "../../db/schema";
import { recruitmentYearInt } from "../applications/application-code";
import { allocateMemberIds } from "../core/member-id";
import { MembershipPaymentError } from "./errors";
import { createPaymentReceiptDownload } from "./receipts";

function displayStatus(row: {
  status: (typeof membershipPayments.$inferSelect)["status"];
  deadlineAt: Date;
  resubmissionDeadlineAt: Date | null;
}) {
  if (
    (row.status === "awaiting_payment" || row.status === "needs_resubmission") &&
    new Date() > (row.resubmissionDeadlineAt ?? row.deadlineAt)
  ) {
    return "expired" as const;
  }
  return row.status;
}

export async function listMembershipPayments() {
  const recruitmentYear = recruitmentYearInt();
  const rows = await db
    .select({
      paymentId: membershipPayments.id,
      applicationId: applications.id,
      applicationCode: applications.applicationCode,
      applicationType: applications.applicationType,
      applicationStatus: applications.status,
      archivedAt: applications.archivedAt,
      memberId: applications.memberId,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
      email: applicants.email,
      status: membershipPayments.status,
      membershipStatus: membershipPayments.membershipStatus,
      confirmationStatus: membershipPayments.confirmationStatus,
      verifiedAt: membershipPayments.verifiedAt,
      resubmissionDeadlineAt: membershipPayments.resubmissionDeadlineAt,
      deadlineAt: membershipPaymentCampaigns.deadlineAt,
      finalPosition: positions.name,
      committee: committees.name,
    })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYear))
    .orderBy(desc(membershipPayments.updatedAt));

  const paymentIds = rows.map((row) => row.paymentId);
  const submissions =
    paymentIds.length === 0
      ? []
      : await db
          .select({
            paymentId: membershipPaymentSubmissions.paymentId,
            id: membershipPaymentSubmissions.id,
            attemptNumber: membershipPaymentSubmissions.attemptNumber,
            method: membershipPaymentSubmissions.method,
            referenceNumber: membershipPaymentSubmissions.referenceNumber,
            status: membershipPaymentSubmissions.status,
            submittedAt: membershipPaymentSubmissions.submittedAt,
            reviewReason: membershipPaymentSubmissions.reviewReason,
          })
          .from(membershipPaymentSubmissions)
          .where(inArray(membershipPaymentSubmissions.paymentId, paymentIds))
          .orderBy(desc(membershipPaymentSubmissions.attemptNumber));
  const latestByPayment = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    if (!latestByPayment.has(submission.paymentId)) {
      latestByPayment.set(submission.paymentId, submission);
    }
  }

  const payments = rows.map((row) => ({
    ...row,
    status: displayStatus(row),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    resubmissionDeadlineAt: row.resubmissionDeadlineAt?.toISOString() ?? null,
    deadlineAt: row.deadlineAt.toISOString(),
    latestSubmission: latestByPayment.has(row.paymentId)
      ? {
          ...latestByPayment.get(row.paymentId)!,
          submittedAt: latestByPayment
            .get(row.paymentId)!
            .submittedAt.toISOString(),
        }
      : null,
  }));
  const count = (status: string) =>
    payments.filter((payment) => payment.status === status).length;
  return {
    summary: {
      totalEligible: payments.length,
      awaitingPayment: count("awaiting_payment"),
      pendingVerification: count("pending_verification"),
      verified: count("verified"),
      needsResubmission: count("needs_resubmission"),
      expired: count("expired"),
    },
    payments,
  };
}

export async function getMembershipPaymentDetails(paymentId: string) {
  const list = await listMembershipPayments();
  const payment = list.payments.find((row) => row.paymentId === paymentId);
  if (!payment) throw new MembershipPaymentError("Payment not found.", 404);
  const submissions = await db
    .select({
      id: membershipPaymentSubmissions.id,
      attemptNumber: membershipPaymentSubmissions.attemptNumber,
      method: membershipPaymentSubmissions.method,
      referenceNumber: membershipPaymentSubmissions.referenceNumber,
      amountCents: membershipPaymentSubmissions.amountCents,
      receiptFileName: membershipPaymentSubmissions.receiptFileName,
      receiptMimeType: membershipPaymentSubmissions.receiptMimeType,
      receiptSizeBytes: membershipPaymentSubmissions.receiptSizeBytes,
      status: membershipPaymentSubmissions.status,
      submittedAt: membershipPaymentSubmissions.submittedAt,
      reviewedAt: membershipPaymentSubmissions.reviewedAt,
      reviewReason: membershipPaymentSubmissions.reviewReason,
      reviewerEmail: users.email,
    })
    .from(membershipPaymentSubmissions)
    .leftJoin(users, eq(membershipPaymentSubmissions.reviewedBy, users.id))
    .where(eq(membershipPaymentSubmissions.paymentId, paymentId))
    .orderBy(desc(membershipPaymentSubmissions.attemptNumber));
  return {
    ...payment,
    submissions: submissions.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    })),
  };
}

async function lockedPendingSubmission(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  paymentId: string,
) {
  const [payment] = await tx
    .select({
      id: membershipPayments.id,
      applicationId: membershipPayments.applicationId,
      status: membershipPayments.status,
      recruitmentYear: applications.recruitmentYear,
      memberId: applications.memberId,
      archivedAt: applications.archivedAt,
      deadlineAt: membershipPaymentCampaigns.deadlineAt,
    })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .where(eq(membershipPayments.id, paymentId))
    .for("update")
    .limit(1);
  if (!payment) throw new MembershipPaymentError("Payment not found.", 404);
  if (payment.status !== "pending_verification") {
    throw new MembershipPaymentError(
      "Only pending payments can be reviewed.",
      409,
    );
  }
  const [submission] = await tx
    .select()
    .from(membershipPaymentSubmissions)
    .where(
      and(
        eq(membershipPaymentSubmissions.paymentId, paymentId),
        eq(membershipPaymentSubmissions.status, "pending"),
      ),
    )
    .orderBy(desc(membershipPaymentSubmissions.attemptNumber))
    .for("update")
    .limit(1);
  if (!submission) {
    throw new MembershipPaymentError("Pending receipt not found.", 409);
  }
  return { payment, submission };
}

export async function verifyMembershipPayment(
  paymentId: string,
  actor: AuthenticatedUser,
) {
  return db.transaction(async (tx) => {
    const { payment, submission } = await lockedPendingSubmission(tx, paymentId);
    if (payment.archivedAt) {
      throw new MembershipPaymentError(
        "Restore this application before verifying its payment.",
        409,
      );
    }
    let memberId = payment.memberId;
    if (!memberId) {
      [memberId] = await allocateMemberIds(tx, payment.recruitmentYear, 1);
      await tx
        .update(applications)
        .set({ memberId, updatedAt: new Date() })
        .where(eq(applications.id, payment.applicationId));
    }
    const reviewedAt = new Date();
    await tx
      .update(membershipPaymentSubmissions)
      .set({
        status: "verified",
        reviewedAt,
        reviewedBy: actor.id,
        reviewReason: null,
      })
      .where(eq(membershipPaymentSubmissions.id, submission.id));
    await tx
      .update(membershipPayments)
      .set({
        status: "verified",
        membershipStatus: "active",
        confirmationStatus: "not_released",
        verifiedAt: reviewedAt,
        verifiedBy: actor.id,
        reversedAt: null,
        reversedBy: null,
        reversalReason: null,
        updatedAt: reviewedAt,
      })
      .where(eq(membershipPayments.id, paymentId));
    return { paymentId, memberId, verifiedAt: reviewedAt.toISOString() };
  });
}

export async function rejectMembershipPayment(
  paymentId: string,
  actor: AuthenticatedUser,
  reason: string,
  resubmissionDeadlineAt: Date | null,
) {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new MembershipPaymentError("A rejection reason is required.");
  }
  if (resubmissionDeadlineAt && resubmissionDeadlineAt <= new Date()) {
    throw new MembershipPaymentError("Resubmission deadline must be in the future.");
  }
  return db.transaction(async (tx) => {
    const { payment, submission } = await lockedPendingSubmission(tx, paymentId);
    const reviewedAt = new Date();
    if (reviewedAt > payment.deadlineAt && !resubmissionDeadlineAt) {
      throw new MembershipPaymentError(
        "Set a future resubmission deadline because the payment period has ended.",
      );
    }
    await tx
      .update(membershipPaymentSubmissions)
      .set({
        status: "rejected",
        reviewedAt,
        reviewedBy: actor.id,
        reviewReason: cleanReason,
      })
      .where(eq(membershipPaymentSubmissions.id, submission.id));
    await tx
      .update(membershipPayments)
      .set({
        status: "needs_resubmission",
        resubmissionDeadlineAt,
        updatedAt: reviewedAt,
      })
      .where(eq(membershipPayments.id, paymentId));
    return { paymentId, status: "needs_resubmission" as const };
  });
}

export async function reverseMembershipPayment(
  paymentId: string,
  actor: AuthenticatedUser,
  reason: string,
  resubmissionDeadlineAt: Date | null,
) {
  const cleanReason = reason.trim();
  if (!cleanReason) {
    throw new MembershipPaymentError("A reversal reason is required.");
  }
  if (resubmissionDeadlineAt && resubmissionDeadlineAt <= new Date()) {
    throw new MembershipPaymentError("Resubmission deadline must be in the future.");
  }
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select({
        status: membershipPayments.status,
        deadlineAt: membershipPaymentCampaigns.deadlineAt,
      })
      .from(membershipPayments)
      .innerJoin(
        membershipPaymentCampaigns,
        eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
      )
      .where(eq(membershipPayments.id, paymentId))
      .for("update", { of: membershipPayments })
      .limit(1);
    if (!payment) throw new MembershipPaymentError("Payment not found.", 404);
    if (payment.status !== "verified") {
      throw new MembershipPaymentError(
        "Only verified payments can be reversed.",
        409,
      );
    }
    if (new Date() > payment.deadlineAt && !resubmissionDeadlineAt) {
      throw new MembershipPaymentError(
        "Set a future resubmission deadline because the payment period has ended.",
      );
    }
    const [submission] = await tx
      .select({ id: membershipPaymentSubmissions.id })
      .from(membershipPaymentSubmissions)
      .where(
        and(
          eq(membershipPaymentSubmissions.paymentId, paymentId),
          eq(membershipPaymentSubmissions.status, "verified"),
        ),
      )
      .orderBy(desc(membershipPaymentSubmissions.attemptNumber))
      .for("update")
      .limit(1);
    const reversedAt = new Date();
    if (submission) {
      await tx
        .update(membershipPaymentSubmissions)
        .set({ status: "reversed" })
        .where(eq(membershipPaymentSubmissions.id, submission.id));
    }
    await tx
      .update(membershipPayments)
      .set({
        status: "needs_resubmission",
        membershipStatus: "revoked",
        confirmationStatus: "not_released",
        confirmationReleasedAt: null,
        confirmationReleasedBy: null,
        assignedChatLink: null,
        resubmissionDeadlineAt,
        reversedAt,
        reversedBy: actor.id,
        reversalReason: cleanReason,
        updatedAt: reversedAt,
      })
      .where(eq(membershipPayments.id, paymentId));
    return { paymentId, status: "needs_resubmission" as const };
  });
}

export async function getPaymentReceiptUrl(
  paymentId: string,
  submissionId: string,
) {
  const [submission] = await db
    .select({
      key: membershipPaymentSubmissions.receiptKey,
      fileName: membershipPaymentSubmissions.receiptFileName,
    })
    .from(membershipPaymentSubmissions)
    .where(
      and(
        eq(membershipPaymentSubmissions.id, submissionId),
        eq(membershipPaymentSubmissions.paymentId, paymentId),
      ),
    )
    .limit(1);
  if (!submission) throw new MembershipPaymentError("Receipt not found.", 404);
  return createPaymentReceiptDownload(submission.key, submission.fileName);
}

export async function releaseMembershipConfirmations(actor: AuthenticatedUser) {
  const recruitmentYear = recruitmentYearInt();
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(membershipPaymentCampaigns)
      .where(eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYear))
      .for("update")
      .limit(1);
    if (!campaign) throw new MembershipPaymentError("Payment period not found.", 404);

    const rows = await tx
      .select({
        paymentId: membershipPayments.id,
        applicationId: applications.id,
        recipient: applicants.email,
        applicationType: applications.applicationType,
        applicationStatus: applications.status,
        committeeId: committees.id,
      })
      .from(membershipPayments)
      .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
      .innerJoin(applicants, eq(applications.applicantId, applicants.id))
      .leftJoin(positions, eq(applications.finalPositionId, positions.id))
      .leftJoin(committees, eq(positions.committeeId, committees.id))
      .where(
        and(
          eq(membershipPayments.campaignId, campaign.id),
          eq(membershipPayments.status, "verified"),
          eq(membershipPayments.membershipStatus, "active"),
          eq(membershipPayments.confirmationStatus, "not_released"),
          isNull(applications.archivedAt),
        ),
      )
      .for("update", { of: membershipPayments });
    if (rows.length === 0) {
      throw new MembershipPaymentError(
        "There are no verified confirmations to release.",
        409,
      );
    }
    const links = await tx
      .select({
        committeeId: membershipPaymentChatLinks.committeeId,
        chatLink: membershipPaymentChatLinks.chatLink,
      })
      .from(membershipPaymentChatLinks)
      .where(eq(membershipPaymentChatLinks.campaignId, campaign.id));
    const linkByCommittee = new Map(
      links.map((link) => [link.committeeId, link.chatLink]),
    );
    const prepared = rows.map((row) => {
      const acceptedCommitteeApplicant =
        row.applicationType === "position" &&
        row.applicationStatus === "approved";
      const chatLink = acceptedCommitteeApplicant
        ? row.committeeId
          ? linkByCommittee.get(row.committeeId) ?? null
          : null
        : campaign.generalChatLink;
      return { ...row, chatLink };
    });
    const missingLinks = prepared.filter((row) => !row.chatLink).length;
    if (missingLinks > 0) {
      throw new MembershipPaymentError(
        `Add the required group-chat links for ${missingLinks} verified member${missingLinks === 1 ? "" : "s"}.`,
        409,
      );
    }

    const releasedAt = new Date();
    const notifications = await tx
      .insert(emailNotifications)
      .values(
        prepared.map((row) => ({
          applicationId: row.applicationId,
          messageType: "membership_confirmation" as const,
          recipient: row.recipient,
        })),
      )
      .returning({ id: emailNotifications.id });
    for (const row of prepared) {
      await tx
        .update(membershipPayments)
        .set({
          confirmationStatus: "released",
          confirmationReleasedAt: releasedAt,
          confirmationReleasedBy: actor.id,
          assignedChatLink: row.chatLink,
          updatedAt: releasedAt,
        })
        .where(eq(membershipPayments.id, row.paymentId));
    }
    await tx
      .update(membershipPaymentCampaigns)
      .set({
        confirmationsReleasedAt: releasedAt,
        confirmationsReleasedBy: actor.id,
        updatedAt: releasedAt,
      })
      .where(eq(membershipPaymentCampaigns.id, campaign.id));
    return {
      released: prepared.length,
      notificationIds: notifications.map((notification) => notification.id),
    };
  });
}

export async function listVerifiedMembersForExport() {
  const recruitmentYear = recruitmentYearInt();
  return db
    .select({
      memberId: applications.memberId,
      applicationCode: applications.applicationCode,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
      email: applicants.email,
      applicationType: applications.applicationType,
      committee: committees.name,
      position: positions.name,
      verifiedAt: membershipPayments.verifiedAt,
    })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(
      and(
        eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYear),
        eq(membershipPayments.status, "verified"),
        eq(membershipPayments.membershipStatus, "active"),
        isNull(applications.archivedAt),
      ),
    )
    .orderBy(applicants.lastName, applicants.firstName);
}
