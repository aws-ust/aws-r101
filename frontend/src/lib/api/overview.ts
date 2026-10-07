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
}

export type SeasonOverview = {
  recruitmentYear: number
  stages: SeasonStages
  attention: SeasonAttention
}

export function getSeasonOverview() {
  return apiFetch<SeasonOverview>("/season-overview")
}
