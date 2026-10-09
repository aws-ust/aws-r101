import type { ApplicantApplication, ApplicantResult } from "@/lib/api/applicant"
import { formatDisplayDateTime } from "@/lib/datetime/display"

/**
 * One honest status per applicant: the chip beside their name and the line
 * under the page title. `action` is the only tone drawn in aquamarine, so it
 * is kept for states where the applicant has something to answer.
 */
export type DashboardTone = "action" | "positive" | "neutral"

export type ApplicantDashboardState = {
  chip: { label: string; tone: DashboardTone }
  title: string
  subtitle: string
}

export type Placement = NonNullable<ApplicantResult["finalPlacement"]>

type StateInput = Pick<
  ApplicantApplication,
  "applicationType" | "canEdit" | "editDeadline" | "result"
>

export function isRedirectPending(result: ApplicantResult) {
  return result.redirectPlacement !== null && result.redirectResponse === null
}

export function isAccepted(result: ApplicantResult) {
  return (
    result.redirectResponse === "accepted" ||
    (result.status === "approved" && !isRedirectPending(result))
  )
}

/** The placement to show: an open offer while it waits, else the final one. */
export function resolvePlacement(result: ApplicantResult): Placement | null {
  if (result.redirectResponse === "accepted" && result.finalPlacement) {
    return result.finalPlacement
  }
  if (result.redirectPlacement && isRedirectPending(result)) return result.redirectPlacement
  return result.finalPlacement
}

export function formatEditDeadline(iso: string) {
  return formatDisplayDateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" })
}

function memberOnlyState(result: ApplicantResult | null): ApplicantDashboardState {
  if (result?.status === "approved") {
    return {
      chip: { label: "Member", tone: "positive" },
      title: "Your Results",
      subtitle: "Your membership registration was accepted.",
    }
  }
  return {
    chip: { label: "Member-only application", tone: "neutral" },
    title: "Your application",
    subtitle: "You registered as a general member.",
  }
}

function pendingState(canEdit: boolean, editDeadline: string | null): ApplicantDashboardState {
  if (canEdit) {
    const until = editDeadline ? formatEditDeadline(editDeadline) : "the end of recruitment week"
    return {
      chip: { label: "Applied", tone: "neutral" },
      title: "Your application",
      subtitle: `Recruitment week is open. You can edit your application until ${until}.`,
    }
  }
  return {
    chip: { label: "In review", tone: "neutral" },
    title: "Your application",
    subtitle: "Editing is closed. Your result will appear here once it's released.",
  }
}

function releasedState(result: ApplicantResult): ApplicantDashboardState {
  if (isRedirectPending(result)) {
    return {
      chip: { label: "Reply needed", tone: "action" },
      title: "Your Results",
      subtitle: "Results are out. You have a placement offer to answer below.",
    }
  }
  const placement = resolvePlacement(result)
  if (isAccepted(result) && placement) {
    return {
      chip: { label: "Accepted", tone: "positive" },
      title: "Your Results",
      subtitle: `Results are out. You're in ${placement.committee}.`,
    }
  }
  return {
    chip: { label: "Not selected", tone: "neutral" },
    title: "Your Results",
    subtitle:
      result.redirectResponse === "declined" ? "You declined the offered placement." : "Results are out.",
  }
}

export function applicantDashboardState(application: StateInput): ApplicantDashboardState {
  if (application.applicationType !== "position") return memberOnlyState(application.result)
  if (!application.result) return pendingState(application.canEdit, application.editDeadline)
  return releasedState(application.result)
}
