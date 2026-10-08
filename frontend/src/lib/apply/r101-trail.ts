import type { ApplicantApplication, ApplicantPayment } from "@/lib/api/applicant"
import { isRedirectPending } from "@/lib/apply/dashboard-state"

/**
 * Where the applicant is on the R101 path. Every station before `current` is
 * done; `current` is "you are here"; the rest are still ahead. `action` marks
 * a station where the applicant has something to do right now (the only one
 * drawn in aquamarine), `waiting` one where the org is working on it, and
 * `problem` one that went wrong (an expired payment).
 */
export type TrailMood = "action" | "waiting" | "problem" | "complete"

export type R101Trail = {
  stations: string[]
  current: number
  mood: TrailMood
}

type TrailInput = Pick<ApplicantApplication, "applicationType" | "canEdit" | "result"> &
  Partial<Pick<ApplicantApplication, "officer">>

const COMMITTEE_STATIONS = ["Applied", "Interview", "Results", "Payment", "Member"]
const MEMBER_ONLY_STATIONS = ["Registered", "R101", "Payment", "Member"]
const OFFICER_STATIONS = ["Elected", "Payment", "Member"]

/** The payment and membership end of the path, shared by both kinds of applicant. */
function paymentLeg(payment: ApplicantPayment | null, paymentIndex: number): Omit<R101Trail, "stations"> {
  if (payment?.memberCard) return { current: paymentIndex + 1, mood: "complete" }
  const status = payment?.paymentStatus
  if (status === "awaiting_payment" || status === "needs_resubmission") {
    return { current: paymentIndex, mood: payment?.canSubmit ? "action" : "waiting" }
  }
  if (status === "verified") return { current: paymentIndex + 1, mood: "waiting" }
  if (status === "expired") return { current: paymentIndex, mood: "problem" }
  // No payment record yet (payment not open), or the receipt is in review.
  return { current: paymentIndex, mood: "waiting" }
}

export function r101Trail(application: TrailInput, payment: ApplicantPayment | null): R101Trail {
  const { result } = application

  if (application.officer) {
    // Advisers hold their ID already; everyone else pays to release it.
    if (application.officer.kind === "adviser") return { stations: OFFICER_STATIONS, current: 2, mood: "complete" }
    return { stations: OFFICER_STATIONS, ...paymentLeg(payment, 1) }
  }

  if (application.applicationType !== "position") {
    if (!result) return { stations: MEMBER_ONLY_STATIONS, current: 1, mood: "waiting" }
    return { stations: MEMBER_ONLY_STATIONS, ...paymentLeg(payment, 2) }
  }

  if (!result) {
    // During the edit window the trail cannot see whether a slot is booked, so
    // it does not claim an action; the interview section says what is needed.
    return application.canEdit
      ? { stations: COMMITTEE_STATIONS, current: 1, mood: "waiting" }
      : { stations: COMMITTEE_STATIONS, current: 2, mood: "waiting" }
  }
  if (isRedirectPending(result)) return { stations: COMMITTEE_STATIONS, current: 2, mood: "action" }
  return { stations: COMMITTEE_STATIONS, ...paymentLeg(payment, 3) }
}
