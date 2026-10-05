import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applications,
  committees,
  membershipPaymentCampaigns,
  membershipPayments,
  membershipPaymentSubmissions,
  positions,
} from "../../db/schema";
import { MembershipPaymentError } from "./errors";
import { normalizeDriveReceiptUrl } from "./receipt-link";
import {
  createMemberPhotoDownload,
  createMemberPhotoUpload,
  MAX_MEMBER_PHOTO_SIZE_BYTES,
  persistMemberPhoto,
  type MemberPhotoMetadata,
} from "./member-photo";
import { isExecutiveOfficeCommittee } from "../apply/committee-office-groups";
import { memberPositionLabel } from "./member-position";
import { createPaymentQrDownload } from "./payment-qr";

export type SubmitPaymentInput = {
  method: "gcash" | "bpi";
  referenceNumber: string;
  receiptUrl: string;
};

function normalizeReferenceNumber(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function effectiveDeadline(row: {
  deadlineAt: Date;
  status: string;
  resubmissionDeadlineAt: Date | null;
}) {
  return row.status === "needs_resubmission" && row.resubmissionDeadlineAt
    ? row.resubmissionDeadlineAt
    : row.deadlineAt;
}

function canSubmit(
  row: {
    isOpen: boolean;
    opensAt: Date;
    deadlineAt: Date;
    status: string;
    resubmissionDeadlineAt: Date | null;
    archivedAt: Date | null;
  },
  now = new Date(),
) {
  return (
    row.isOpen &&
    !row.archivedAt &&
    now >= row.opensAt &&
    now <= effectiveDeadline(row) &&
    (row.status === "awaiting_payment" || row.status === "needs_resubmission")
  );
}

async function loadApplicantPayment(applicationId: string) {
  const [row] = await db
    .select({
      paymentId: membershipPayments.id,
      campaignId: membershipPaymentCampaigns.id,
      applicationId: applications.id,
      applicationCode: applications.applicationCode,
      applicationType: applications.applicationType,
      applicationStatus: applications.status,
      archivedAt: applications.archivedAt,
      memberId: applications.memberId,
      memberPhotoKey: applications.memberPhotoKey,
      recruitmentYear: applications.recruitmentYear,
      positionName: positions.name,
      committeeName: committees.name,
      generalChatLink: membershipPaymentCampaigns.generalChatLink,
      coreTeamChatLink: membershipPaymentCampaigns.coreTeamChatLink,
      paymentStatus: membershipPayments.status,
      membershipStatus: membershipPayments.membershipStatus,
      confirmationStatus: membershipPayments.confirmationStatus,
      assignedChatLink: membershipPayments.assignedChatLink,
      confirmationReleasedAt: membershipPayments.confirmationReleasedAt,
      resubmissionDeadlineAt: membershipPayments.resubmissionDeadlineAt,
      amountCents: membershipPaymentCampaigns.amountCents,
      opensAt: membershipPaymentCampaigns.opensAt,
      deadlineAt: membershipPaymentCampaigns.deadlineAt,
      isOpen: membershipPaymentCampaigns.isOpen,
      gcashAccountName: membershipPaymentCampaigns.gcashAccountName,
      gcashAccountNumber: membershipPaymentCampaigns.gcashAccountNumber,
      gcashQrImageUrl: membershipPaymentCampaigns.gcashQrImageUrl,
      gcashQrImageKey: membershipPaymentCampaigns.gcashQrImageKey,
      gcashCoreQrImageKey: membershipPaymentCampaigns.gcashCoreQrImageKey,
      bpiAccountName: membershipPaymentCampaigns.bpiAccountName,
      bpiAccountNumber: membershipPaymentCampaigns.bpiAccountNumber,
      bpiQrImageUrl: membershipPaymentCampaigns.bpiQrImageUrl,
      bpiQrImageKey: membershipPaymentCampaigns.bpiQrImageKey,
    })
    .from(membershipPayments)
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(membershipPayments.applicationId, applicationId))
    .limit(1);
  if (!row) return null;
  const amountCents = row.amountCents;
  if (amountCents === null) {
    throw new MembershipPaymentError(
      "Payment amount is not configured.",
      409,
    );
  }

  const deadline = effectiveDeadline({
    deadlineAt: row.deadlineAt,
    status: row.paymentStatus,
    resubmissionDeadlineAt: row.resubmissionDeadlineAt,
  });
  if (
    (row.paymentStatus === "awaiting_payment" ||
      row.paymentStatus === "needs_resubmission") &&
    new Date() > deadline
  ) {
    await db
      .update(membershipPayments)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(membershipPayments.id, row.paymentId));
    row.paymentStatus = "expired";
  }

  const [latestSubmission] = await db
    .select({
      id: membershipPaymentSubmissions.id,
      attemptNumber: membershipPaymentSubmissions.attemptNumber,
      method: membershipPaymentSubmissions.method,
      referenceNumber: membershipPaymentSubmissions.referenceNumber,
      status: membershipPaymentSubmissions.status,
      submittedAt: membershipPaymentSubmissions.submittedAt,
      reviewedAt: membershipPaymentSubmissions.reviewedAt,
      reviewReason: membershipPaymentSubmissions.reviewReason,
    })
    .from(membershipPaymentSubmissions)
    .where(eq(membershipPaymentSubmissions.paymentId, row.paymentId))
    .orderBy(desc(membershipPaymentSubmissions.attemptNumber))
    .limit(1);
  return { ...row, amountCents, latestSubmission: latestSubmission ?? null };
}

export async function getApplicantPayment(applicationId: string) {
  const row = await loadApplicantPayment(applicationId);
  if (!row) return null;
  // A failed email does not hide the details: they are released either way.
  const released =
    row.confirmationStatus === "released" ||
    row.confirmationStatus === "email_failed";
  const acceptedIntoCommittee =
    row.applicationType === "position" &&
    row.applicationStatus === "approved" &&
    Boolean(row.positionName);
  // Anyone accepted into a committee (EAs and staff, including accepted
  // redirects) pays through the CFO's QR. General members (member-only,
  // rejected, and redirected applicants who declined or haven't answered) use
  // the Director for Finance's. Fall back to that one if the CFO's is missing.
  const gcashQrKey =
    acceptedIntoCommittee && row.gcashCoreQrImageKey
      ? row.gcashCoreQrImageKey
      : row.gcashQrImageKey;
  const [gcashQrImageUrl, bpiQrImageUrl] = await Promise.all([
    gcashQrKey ? createPaymentQrDownload(gcashQrKey) : row.gcashQrImageUrl,
    row.bpiQrImageKey
      ? createPaymentQrDownload(row.bpiQrImageKey)
      : row.bpiQrImageUrl,
  ]);
  const memberCard =
    row.paymentStatus === "verified" &&
    row.membershipStatus === "active" &&
    row.memberId
      ? {
          memberId: row.memberId,
          recruitmentYear: row.recruitmentYear,
          position: memberPositionLabel(row),
          photoUrl: row.memberPhotoKey
            ? await createMemberPhotoDownload(row.memberPhotoKey)
            : null,
        }
      : null;
  return {
    applicationCode: row.applicationCode,
    applicationType: row.applicationType,
    applicationStatus: row.applicationStatus,
    paymentStatus: row.paymentStatus,
    membershipStatus: row.membershipStatus,
    confirmationStatus: row.confirmationStatus,
    amountCents: row.amountCents,
    opensAt: row.opensAt.toISOString(),
    deadlineAt: row.deadlineAt.toISOString(),
    resubmissionDeadlineAt: row.resubmissionDeadlineAt?.toISOString() ?? null,
    paymentMethods: {
      gcash: row.gcashAccountNumber || gcashQrImageUrl
        ? {
            accountName: row.gcashAccountName,
            accountNumber: row.gcashAccountNumber,
            qrImageUrl: gcashQrImageUrl,
          }
        : null,
      bpi: row.bpiAccountNumber || bpiQrImageUrl
        ? {
            accountName: row.bpiAccountName,
            accountNumber: row.bpiAccountNumber,
            qrImageUrl: bpiQrImageUrl,
          }
        : null,
    },
    canSubmit: canSubmit({
      isOpen: row.isOpen,
      opensAt: row.opensAt,
      deadlineAt: row.deadlineAt,
      status: row.paymentStatus,
      resubmissionDeadlineAt: row.resubmissionDeadlineAt,
      archivedAt: row.archivedAt,
    }),
    latestSubmission: row.latestSubmission
      ? {
          ...row.latestSubmission,
          submittedAt: row.latestSubmission.submittedAt.toISOString(),
          reviewedAt: row.latestSubmission.reviewedAt?.toISOString() ?? null,
        }
      : null,
    memberCard,
    memberId: released ? row.memberId : null,
    membersGroupLink: released ? row.generalChatLink : null,
    committeeChatLink:
      released && acceptedIntoCommittee ? row.assignedChatLink : null,
    committeeName: released && acceptedIntoCommittee ? row.committeeName : null,
    coreTeamChatLink:
      released &&
      acceptedIntoCommittee &&
      row.committeeName &&
      isExecutiveOfficeCommittee(row.committeeName)
        ? row.coreTeamChatLink
        : null,
    confirmationReleasedAt:
      row.confirmationReleasedAt?.toISOString() ?? null,
  };
}

export async function submitApplicantPayment(
  applicationId: string,
  input: SubmitPaymentInput,
) {
  const receiptUrl = normalizeDriveReceiptUrl(input.receiptUrl);
  const referenceNumber = input.referenceNumber.trim();
  const referenceNumberNormalized = normalizeReferenceNumber(referenceNumber);
  if (referenceNumberNormalized.length < 4) {
    throw new MembershipPaymentError("Enter a valid payment reference number.");
  }

  const payment = await loadApplicantPayment(applicationId);
  if (!payment) {
    throw new MembershipPaymentError("Payment invitation not found.", 404);
  }
  if (
    input.method === "gcash" &&
    !payment.gcashAccountNumber &&
    !payment.gcashQrImageKey &&
    !payment.gcashCoreQrImageKey &&
    !payment.gcashQrImageUrl
  ) {
    throw new MembershipPaymentError("GCash is not available for this payment period.");
  }
  if (
    input.method === "bpi" &&
    !payment.bpiAccountNumber &&
    !payment.bpiQrImageKey &&
    !payment.bpiQrImageUrl
  ) {
    throw new MembershipPaymentError("BPI is not available for this payment period.");
  }
  if (
    !canSubmit({
      isOpen: payment.isOpen,
      opensAt: payment.opensAt,
      deadlineAt: payment.deadlineAt,
      status: payment.paymentStatus,
      resubmissionDeadlineAt: payment.resubmissionDeadlineAt,
      archivedAt: payment.archivedAt,
    })
  ) {
    throw new MembershipPaymentError("Payment submission is not available.", 409);
  }

  const [duplicate] = await db
    .select({ id: membershipPaymentSubmissions.id })
    .from(membershipPaymentSubmissions)
    .where(
      and(
        eq(membershipPaymentSubmissions.campaignId, payment.campaignId),
        eq(
          membershipPaymentSubmissions.referenceNumberNormalized,
          referenceNumberNormalized,
        ),
      ),
    )
    .limit(1);
  if (duplicate) {
    throw new MembershipPaymentError(
      "This payment reference number has already been submitted.",
      409,
    );
  }

  try {
    return await db.transaction(async (tx) => {
      const [locked] = await tx
        .select({
          id: membershipPayments.id,
          status: membershipPayments.status,
          resubmissionDeadlineAt: membershipPayments.resubmissionDeadlineAt,
          isOpen: membershipPaymentCampaigns.isOpen,
          opensAt: membershipPaymentCampaigns.opensAt,
          deadlineAt: membershipPaymentCampaigns.deadlineAt,
          archivedAt: applications.archivedAt,
        })
        .from(membershipPayments)
        .innerJoin(
          membershipPaymentCampaigns,
          eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
        )
        .innerJoin(
          applications,
          eq(membershipPayments.applicationId, applications.id),
        )
        .where(
          and(
            eq(membershipPayments.id, payment.paymentId),
            eq(membershipPayments.applicationId, applicationId),
          ),
        )
        .for("update", { of: membershipPayments })
        .limit(1);
      if (!locked || !canSubmit(locked)) {
        throw new MembershipPaymentError(
          "Payment submission is no longer available.",
          409,
        );
      }
      const [latest] = await tx
        .select({ attemptNumber: membershipPaymentSubmissions.attemptNumber })
        .from(membershipPaymentSubmissions)
        .where(eq(membershipPaymentSubmissions.paymentId, locked.id))
        .orderBy(desc(membershipPaymentSubmissions.attemptNumber))
        .limit(1);
      const [submission] = await tx
        .insert(membershipPaymentSubmissions)
        .values({
          paymentId: locked.id,
          campaignId: payment.campaignId,
          attemptNumber: (latest?.attemptNumber ?? 0) + 1,
          method: input.method,
          referenceNumber,
          referenceNumberNormalized,
          amountCents: payment.amountCents,
          receiptUrl,
        })
        .returning({
          id: membershipPaymentSubmissions.id,
          attemptNumber: membershipPaymentSubmissions.attemptNumber,
          submittedAt: membershipPaymentSubmissions.submittedAt,
        });
      await tx
        .update(membershipPayments)
        .set({
          status: "pending_verification",
          resubmissionDeadlineAt: null,
          updatedAt: new Date(),
        })
        .where(eq(membershipPayments.id, locked.id));
      return {
        ...submission,
        status: "pending_verification" as const,
        submittedAt: submission.submittedAt.toISOString(),
      };
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new MembershipPaymentError(
        "This payment reference number has already been submitted.",
        409,
      );
    }
    throw error;
  }
}

export async function createApplicantMemberPhotoUpload(
  applicationId: string,
  input: MemberPhotoMetadata,
) {
  await requireMemberCard(applicationId);
  if (input.sizeBytes > MAX_MEMBER_PHOTO_SIZE_BYTES) {
    throw new MembershipPaymentError("Photo must be 5 MB or smaller.");
  }
  return createMemberPhotoUpload(applicationId, input);
}

export async function completeApplicantMemberPhoto(
  applicationId: string,
  input: MemberPhotoMetadata & { key: string },
) {
  await requireMemberCard(applicationId);
  const key = await persistMemberPhoto(applicationId, input);
  await db
    .update(applications)
    .set({ memberPhotoKey: key, updatedAt: new Date() })
    .where(eq(applications.id, applicationId));
  const payment = await getApplicantPayment(applicationId);
  return { memberCard: payment?.memberCard ?? null };
}

async function requireMemberCard(applicationId: string) {
  const payment = await getApplicantPayment(applicationId);
  if (!payment?.memberCard) {
    throw new MembershipPaymentError(
      "Your member ID is not available yet.",
      409,
    );
  }
}
