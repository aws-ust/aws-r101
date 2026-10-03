import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applications,
  membershipPaymentCampaigns,
  membershipPayments,
  membershipPaymentSubmissions,
} from "../../db/schema";
import { MembershipPaymentError } from "./errors";
import {
  createPaymentReceiptUpload,
  MAX_RECEIPT_SIZE_BYTES,
  persistPaymentReceipt,
  RECEIPT_MIME_TYPES,
  type ReceiptMimeType,
  validatePaymentReceipt,
} from "./receipts";
import { deleteKeys } from "../applications/documents";
import { createPaymentQrDownload } from "./payment-qr";

export type ReceiptUploadInput = {
  mimeType: ReceiptMimeType;
  sizeBytes: number;
  checksumSha256: string;
};

export type SubmitPaymentInput = ReceiptUploadInput & {
  method: "gcash" | "bpi";
  referenceNumber: string;
  receiptKey: string;
  receiptFileName: string;
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
  const released = row.confirmationStatus === "released";
  const [gcashQrImageUrl, bpiQrImageUrl] = await Promise.all([
    row.gcashQrImageKey
      ? createPaymentQrDownload(row.gcashQrImageKey)
      : row.gcashQrImageUrl,
    row.bpiQrImageKey
      ? createPaymentQrDownload(row.bpiQrImageKey)
      : row.bpiQrImageUrl,
  ]);
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
    memberId: released ? row.memberId : null,
    chatLink: released ? row.assignedChatLink : null,
    confirmationReleasedAt:
      row.confirmationReleasedAt?.toISOString() ?? null,
  };
}

function validateReceiptInput(input: ReceiptUploadInput) {
  if (!RECEIPT_MIME_TYPES.includes(input.mimeType)) {
    throw new MembershipPaymentError("Receipt must be a JPEG, PNG, or WebP image.");
  }
  if (
    !Number.isInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_RECEIPT_SIZE_BYTES
  ) {
    throw new MembershipPaymentError("Receipt image must be 10 MB or smaller.");
  }
  if (!/^[A-Za-z0-9+/]{43}=$/.test(input.checksumSha256)) {
    throw new MembershipPaymentError("Receipt checksum is invalid.");
  }
}

export async function createApplicantReceiptUpload(
  applicationId: string,
  input: ReceiptUploadInput,
) {
  validateReceiptInput(input);
  const payment = await loadApplicantPayment(applicationId);
  if (!payment) {
    throw new MembershipPaymentError("Payment invitation not found.", 404);
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
  return createPaymentReceiptUpload({
    applicationId,
    uploadId: randomUUID(),
    ...input,
  });
}

export async function submitApplicantPayment(
  applicationId: string,
  input: SubmitPaymentInput,
) {
  validateReceiptInput(input);
  const referenceNumber = input.referenceNumber.trim();
  const referenceNumberNormalized = normalizeReferenceNumber(referenceNumber);
  if (referenceNumberNormalized.length < 4) {
    throw new MembershipPaymentError("Enter a valid payment reference number.");
  }
  if (!input.receiptFileName.trim()) {
    throw new MembershipPaymentError("Receipt file name is required.");
  }

  const payment = await loadApplicantPayment(applicationId);
  if (!payment) {
    throw new MembershipPaymentError("Payment invitation not found.", 404);
  }
  if (
    input.method === "gcash" &&
    !payment.gcashAccountNumber &&
    !payment.gcashQrImageKey &&
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

  await validatePaymentReceipt({
    key: input.receiptKey,
    applicationId,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    checksumSha256: input.checksumSha256,
  });

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

  const submissionId = randomUUID();
  const storedReceiptKey = await persistPaymentReceipt({
    incomingKey: input.receiptKey,
    paymentId: payment.paymentId,
    submissionId,
    mimeType: input.mimeType,
  });

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
          id: submissionId,
          paymentId: locked.id,
          campaignId: payment.campaignId,
          attemptNumber: (latest?.attemptNumber ?? 0) + 1,
          method: input.method,
          referenceNumber,
          referenceNumberNormalized,
          amountCents: payment.amountCents,
          receiptKey: storedReceiptKey,
          receiptFileName: input.receiptFileName.trim().slice(0, 255),
          receiptMimeType: input.mimeType,
          receiptSizeBytes: input.sizeBytes,
          receiptChecksumSha256: input.checksumSha256,
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
    await deleteKeys([storedReceiptKey]).catch(() => undefined);
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
