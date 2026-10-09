import { apiFetch } from "@/lib/api/client"

export type SeasonStages = {
  applied: number
  interviewBooked: number
  decided: number
  released: number
  paymentSent: number
  member: number
}

export type SeasonAttention = {
  undecided: number
  readyToRelease: number
  emailProblems: number
  emailsInFlight: number
  paymentsToVerify: number
  noInterview: number
}

/** ISO timestamps, or null when an officer has not set that period yet. */
export type SeasonPeriod = { startsAt: string; endsAt: string } | null

export type SeasonSchedule = {
  applications: SeasonPeriod
  interviews: SeasonPeriod
  /** Membership payment: opens at `startsAt`, due at `endsAt`. */
  payments: SeasonPeriod
}

export type SeasonOverview = {
  recruitmentYear: number
  stages: SeasonStages
  attention: SeasonAttention
  schedule: SeasonSchedule
}

export function getSeasonOverview() {
  return apiFetch<SeasonOverview>("/season-overview")
}
