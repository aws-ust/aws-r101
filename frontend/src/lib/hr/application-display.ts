import type { HrApplication } from "@/lib/types/hr-application"

/** HR application list/detail status — one of four tags. */
export type ApplicantListStatusTag =
  | "pending"
  | "accepted"
  | "rejected"
  | "redirected"

export function applicantListStatusTag(
  application: HrApplication,
): ApplicantListStatusTag {
  if (application.redirectPlacement && !application.redirectResponse) {
    return "redirected"
  }
  if (application.status === "approved") return "accepted"
  if (application.status === "rejected") return "rejected"
  return "pending"
}

function byPreference(application: HrApplication) {
  return [...application.choices].sort(
    (a, b) => a.preferenceRank - b.preferenceRank,
  )
}

/**
 * The position shown next to an applicant: the redirected position when they
 * were redirected, the accepted first or second choice once accepted, and
 * their first choice while they are still being reviewed.
 */
export function applicationListPlacementLabel(application: HrApplication) {
  if (application.applicationType === "member") return "Member-only"
  const choices = byPreference(application)
  if (
    application.redirectPlacement &&
    application.redirectResponse !== "declined"
  ) {
    return application.redirectPlacement.title
  }
  if (applicantListStatusTag(application) === "accepted") {
    const accepted = choices.find((choice) => choice.decisionStatus === "approved")
    const title = accepted?.title ?? application.finalPlacement?.title
    if (title) return title
  }
  return choices[0]?.title ?? "—"
}

export function redirectPlacementLabel(application: HrApplication): string | null {
  if (!application.redirectPlacement) return null
  if (!application.redirectResponse) return "Redirected"
  if (application.redirectResponse === "accepted") return "Accepted redirect"
  return "Declined — member"
}
