import {
  ApiError,
  type UploadPresignRequest,
  type UploadPresignResponse,
} from "@/lib/api/client"
import {
  readApiErrorMessage,
  userFacingApiError,
} from "@/lib/api/error-message"
import type { ApplicationStatus, ApplicationType, DocumentType } from "@/lib/types/application"

export type ApplicantChoice = {
  preferenceRank: 1 | 2
  positionId: string
  title: string
  committeeId: string
  committee: string
}

export type ApplicantDocument = {
  documentType: DocumentType
  fileName: string
}

export type ApplicantResult = {
  status: "approved" | "rejected"
  releasedAt: string
  memberId: string | null
  redirectPlacement: {
    positionId: string
    title: string
    committeeId: string
    committee: string
  } | null
  redirectResponse: "accepted" | "declined" | null
  finalPlacement: {
    positionId: string
    title: string
    committeeId: string
    committee: string
  } | null
  choices: {
    preferenceRank: 1 | 2
    decisionStatus: "approved" | "rejected"
  }[]
}

export type ApplicantApplication = {
  applicationCode: string
  status: ApplicationStatus
  applicationType: ApplicationType
  memberId: string | null
  firstName: string
  lastName: string
  email: string
  age: number | null
  birthday: string | null
  gender: string | null
  section: string | null
  studentNumber: string | null
  contactNumber: string | null
  facebookUrl: string | null
  motivation: string
  portfolioUrl: string | null
  githubUrl: string | null
  choices: ApplicantChoice[]
  documents: ApplicantDocument[]
  canEdit: boolean
  editDeadline: string | null
  lockReason: string | null
  result: ApplicantResult | null
}

export type ApplicantInterviewSlot = {
  id: string
  startsAt: string
  endsAt: string
}

export type ApplicantInterviewSlotTime = {
  startsAt: string
  endsAt: string
}

export type ApplicantInterviewSchedule = {
  committee: { id: string; name: string }
  canSchedule: boolean
  lockReason: string | null
  booking: {
    id: string
    slotId: string
    startsAt: string
    endsAt: string
    bookedAt: string
  } | null
  slots: ApplicantInterviewSlot[]
  booked: ApplicantInterviewSlotTime[]
}

export type ApplicantPayment = {
  applicationCode: string
  applicationType: "position" | "member"
  applicationStatus: "pending" | "approved" | "rejected"
  paymentStatus:
    | "awaiting_payment"
    | "pending_verification"
    | "verified"
    | "needs_resubmission"
    | "expired"
  membershipStatus: "inactive" | "active" | "revoked"
  confirmationStatus: "not_released" | "released" | "email_failed"
  amountCents: number
  opensAt: string
  deadlineAt: string
  resubmissionDeadlineAt: string | null
  paymentMethods: {
    gcash: {
      accountName: string | null
      accountNumber: string | null
      qrImageUrl: string | null
    } | null
    bpi: {
      accountName: string | null
      accountNumber: string | null
      qrImageUrl: string | null
    } | null
  }
  canSubmit: boolean
  latestSubmission: {
    id: string
    attemptNumber: number
    method: "gcash" | "bpi"
    referenceNumber: string
    status: "pending" | "verified" | "rejected" | "reversed"
    submittedAt: string
    reviewedAt: string | null
    reviewReason: string | null
  } | null
  memberId: string | null
  chatLink: string | null
  confirmationReleasedAt: string | null
}

async function applicantFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 204) return undefined as T

  if (!response.ok) {
    const serverMessage = await readApiErrorMessage(response)
    throw new ApiError(
      response.status,
      userFacingApiError(
        response.status,
        serverMessage,
        "Could not reach your application. Try signing in again."
      )
    )
  }

  return response.json() as Promise<T>
}

export function getApplicantApplication() {
  return applicantFetch<ApplicantApplication>("/applicant/application")
}

export function updateApplicantChoices(body: {
  choices: { positionId: string; preferenceRank: 1 | 2 }[]
  slotId?: string
  portfolioUrl?: string
  githubUrl?: string
}) {
  return applicantFetch<ApplicantApplication>("/applicant/application", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function updateApplicantDocuments(body: {
  uploadSessionId: string
  documentTypes: ApplicantDocument["documentType"][]
}) {
  return applicantFetch<ApplicantApplication>("/applicant/application", {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

export function createApplicantUploadSession(input: UploadPresignRequest) {
  return applicantFetch<UploadPresignResponse>("/applicant/uploads/presign", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getApplicantInterviewSlots(positionId?: string) {
  const query = positionId
    ? `?positionId=${encodeURIComponent(positionId)}`
    : ""
  return applicantFetch<ApplicantInterviewSchedule>(
    `/applicant/interview-slots${query}`
  )
}

export function putApplicantInterviewBooking(slotId: string) {
  return applicantFetch<{
    booking: {
      id: string
      slotId: string
      committeeId: string
      committeeName: string
      startsAt: string
      endsAt: string
      bookedAt: string
      rescheduled: boolean
    }
  }>("/applicant/interview-booking", {
    method: "PUT",
    body: JSON.stringify({ slotId }),
  })
}

export function getApplicantPayment() {
  return applicantFetch<{ payment: ApplicantPayment | null }>(
    "/applicant/payment",
  )
}

export function submitApplicantPayment(body: {
  method: "gcash" | "bpi"
  referenceNumber: string
  receiptUrl: string
}) {
  return applicantFetch("/applicant/payment/submit", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export async function logoutApplicant() {
  try {
    await applicantFetch<void>("/applicant-auth/logout", { method: "POST" })
  } catch {
    // Still leave the dashboard even if logout fails.
  }
}
