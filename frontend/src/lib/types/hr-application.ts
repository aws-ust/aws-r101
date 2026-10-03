import type {
  Application,
  ApplicationChoice,
} from "@/lib/types/application"

export type ChoiceDecisionStatus = "pending" | "approved" | "rejected"

export type HrApplicationChoice = ApplicationChoice & {
  decisionStatus: ChoiceDecisionStatus
}

export type HrApplication = Omit<Application, "choices"> & {
  archivedAt: string | null
  canResendSubmittedEmail: boolean
  choices: HrApplicationChoice[]
  finalPlacement: {
    positionId: string
    committee: string
    title: string
  } | null
  redirectPlacement: {
    positionId: string
    committee: string
    title: string
    office: string | null
  } | null
  redirectResponse: "accepted" | "declined" | null
  resultsReleasedAt: string | null
}

export type UpdateApplicationDecisionInput = {
  positionId?: string
  decisionStatus?: Exclude<ChoiceDecisionStatus, "pending">
  finalPositionId?: string | null
}
