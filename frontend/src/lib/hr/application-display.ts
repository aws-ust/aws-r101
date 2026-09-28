import { officeForCommittee } from "@/lib/apply/committee-groups"
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

function officeLabel(committee: string, office?: string | null) {
  return office || officeForCommittee(committee) || committee
}

/** Applied role title, or destination office after accept/redirect. */
export function applicationListPlacementLabel(application: HrApplication) {
  const tag = applicantListStatusTag(application)
  if (tag === "redirected" && application.redirectPlacement) {
    return officeLabel(
      application.redirectPlacement.committee,
      application.redirectPlacement.office,
    )
  }
  if (tag === "accepted") {
    const committee =
      application.finalPlacement?.committee ??
      application.choices.find((choice) => choice.decisionStatus === "approved")
        ?.committee
    if (committee) return officeLabel(committee)
  }
  if (application.applicationType === "member") return "Member-only"
  return (
    application.choices.find((choice) => choice.preferenceRank === 1)?.title ??
    "—"
  )
}
