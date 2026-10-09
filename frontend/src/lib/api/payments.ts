import { apiFetch } from "@/lib/api/client"

export type PaymentStatus =
  | "awaiting_payment"
  | "pending_verification"
  | "verified"
  | "needs_resubmission"
  | "expired"

export type PaymentCampaign = {
  id: string
  recruitmentYear: number
  amountCents: number | null
  opensAt: string
  deadlineAt: string
  isOpen: boolean
  gcashAccountName: string | null
  gcashAccountNumber: string | null
  gcashQrImageUrl: string | null
  gcashQrImageKey: string | null
  /** CFO's QR for everyone accepted into a committee (EAs and staff). */
  gcashCoreQrImageKey?: string | null
  gcashCoreQrFileName?: string | null
  gcashCoreQrPreviewUrl?: string | null
  gcashQrFileName?: string | null
  bpiAccountName: string | null
  bpiAccountNumber: string | null
  bpiQrImageUrl: string | null
  bpiQrImageKey: string | null
  bpiQrFileName?: string | null
  /** Short-lived signed URLs for previewing the saved QR images. */
  gcashQrPreviewUrl?: string | null
  bpiQrPreviewUrl?: string | null
  generalChatLink: string | null
  coreTeamChatLink: string | null
  committeeChatLinks: { committeeId: string; chatLink: string }[]
}

export type PaymentListItem = {
  paymentId: string
  applicationId: string
  applicationCode: string
  applicationType: "position" | "member" | "officer"
  applicationStatus: "pending" | "approved" | "rejected"
  archivedAt: string | null
  memberId: string | null
  firstName: string
  lastName: string
  email: string
  status: PaymentStatus
  membershipStatus: "inactive" | "active" | "revoked"
  verifiedAt: string | null
  resubmissionDeadlineAt: string | null
  deadlineAt: string
  finalPosition: string | null
  committee: string | null
  latestSubmission: {
    id: string
    attemptNumber: number
    method: "gcash" | "bpi"
    referenceNumber: string
    status: "pending" | "verified" | "rejected" | "reversed"
    submittedAt: string
    reviewReason: string | null
  } | null
}

export type PaymentDashboard = {
  summary: {
    totalEligible: number
    awaitingPayment: number
    pendingVerification: number
    verified: number
    needsResubmission: number
    expired: number
  }
  payments: PaymentListItem[]
}

export type PaymentSubmission = {
  id: string
  attemptNumber: number
  method: "gcash" | "bpi"
  referenceNumber: string
  amountCents: number
  /** Google Drive link; older submissions have an uploaded file instead. */
  receiptUrl: string | null
  receiptFileName: string | null
  receiptMimeType: string | null
  receiptSizeBytes: number | null
  status: "pending" | "verified" | "rejected" | "reversed"
  submittedAt: string
  reviewedAt: string | null
  reviewReason: string | null
  reviewerEmail: string | null
}

export type PaymentDetails = PaymentListItem & {
  submissions: PaymentSubmission[]
}

export type PaymentScheduleInput = Pick<
  PaymentCampaign,
  "opensAt" | "deadlineAt" | "generalChatLink" | "coreTeamChatLink" | "committeeChatLinks"
>

export type PaymentDetailsInput = Pick<
  PaymentCampaign,
  | "amountCents"
  | "gcashAccountName"
  | "gcashAccountNumber"
  | "bpiAccountName"
  | "bpiAccountNumber"
> & { amountCents: number }

export type PaymentQrProvider = "gcash" | "gcash_core" | "bpi"
export type PaymentQrMimeType = "image/jpeg" | "image/png" | "image/webp"
export type PaymentQrUploadInput = {
  provider: PaymentQrProvider
  mimeType: PaymentQrMimeType
  sizeBytes: number
  checksumSha256: string
}

export function getPaymentCampaign() {
  return apiFetch<{ campaign: PaymentCampaign | null }>(
    "/membership-payments/campaign",
  )
}

/** `extensionEmails` counts the "deadline extended" emails queued for people who still owe a payment. */
export type SavedPaymentSchedule = PaymentCampaign & { extensionEmails: { queued: number } }

export function savePaymentSchedule(body: PaymentScheduleInput) {
  return apiFetch<SavedPaymentSchedule>("/membership-payments/campaign/schedule", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function savePaymentDetails(body: PaymentDetailsInput) {
  return apiFetch<PaymentCampaign>("/membership-payments/campaign/payment-details", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function createPaymentQrUpload(body: PaymentQrUploadInput) {
  return apiFetch<{
    url: string
    fields: Record<string, string>
    key: string
  }>("/membership-payments/campaign/payment-qr/presign", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function completePaymentQrUpload(
  body: PaymentQrUploadInput & { key: string; fileName?: string },
) {
  return apiFetch<PaymentCampaign>(
    "/membership-payments/campaign/payment-qr/complete",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  )
}

export function openPaymentCampaign() {
  return apiFetch<{
    eligible: number
    created: number
    emailDelivery: { queued: number }
  }>("/membership-payments/campaign/open", { method: "POST" })
}

export function closePaymentCampaign() {
  return apiFetch<PaymentCampaign>("/membership-payments/campaign/close", {
    method: "POST",
  })
}

export function getPaymentDashboard() {
  return apiFetch<PaymentDashboard>("/membership-payments")
}

export function getPaymentDetails(paymentId: string) {
  return apiFetch<PaymentDetails>(`/membership-payments/${paymentId}`)
}

export function getPaymentReceiptUrl(paymentId: string, submissionId: string) {
  return apiFetch<{ url: string }>(
    `/membership-payments/${paymentId}/receipts/${submissionId}`,
  )
}

export function verifyPayment(paymentId: string) {
  return apiFetch<{
    memberId: string
    /** queued: Gmail asked to slow down, so the email will go out shortly in the background. */
    emailDelivery: { sent: number; failed: number; queued: number }
  }>(`/membership-payments/${paymentId}/verify`, {
    method: "POST",
  })
}

export function rejectPayment(
  paymentId: string,
  body: { reason: string; resubmissionDeadlineAt: string | null },
) {
  return apiFetch(`/membership-payments/${paymentId}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function reversePayment(
  paymentId: string,
  body: { reason: string; resubmissionDeadlineAt: string | null },
) {
  return apiFetch(`/membership-payments/${paymentId}/reverse`, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function retryPaymentInvitationEmails() {
  return apiFetch<{ retried: number }>(
    "/membership-payments/emails/retry-invitations",
    { method: "POST" },
  )
}

export type DirectoryMemberRole = "eb" | "director" | "adviser" | "ea" | "staff" | "general"

export type DirectoryMember = {
  memberId: string
  fullName: string
  studentNumber: string | null
  section: string | null
  role: DirectoryMemberRole
  position: string
  committee: string | null
  verifiedAt: string | null
}

/** A board member or director who has not paid yet, with the Member ID held for their seat. */
export type PendingOfficer = {
  fullName: string
  position: string
  role: "eb" | "director"
  committee: string
  reservedMemberId: string
  applicationCode: string
  studentNumber: string | null
  section: string | null
}

/** Verified members of the current recruitment year, and the officers still to pay. */
export function getDirectoryMembers() {
  return apiFetch<{ members: DirectoryMember[]; pendingOfficers: PendingOfficer[] }>(
    "/membership-payments/members",
  )
}
