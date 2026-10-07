import type { SeasonAttention, SeasonOverview, SeasonStages } from "@/lib/api/overview"

export type StageKey = keyof SeasonStages

export type StageStation = {
  key: StageKey
  label: string
  count: number
  href: string
  /** The station an officer should look at first, if any work is waiting. */
  needsWork: boolean
  /** Before the station that needs work, at it, or after it (idle when nothing is waiting). */
  state: "done" | "current" | "ahead" | "idle"
}

const STAGES: { key: StageKey; label: string; href: string }[] = [
  { key: "applied", label: "Applied", href: "/admin/hr" },
  { key: "interviewBooked", label: "Interview booked", href: "/admin/hr/season" },
  { key: "decided", label: "Decided", href: "/admin/hr" },
  { key: "released", label: "Released", href: "/admin/hr/results" },
  { key: "paymentSent", label: "Payment sent", href: "/admin/hr/membership" },
  { key: "member", label: "Member", href: "/admin/hr/members" },
]

/** Which stage the open work belongs to, so that station is lit. */
function stagesNeedingWork(attention: SeasonAttention): Set<StageKey> {
  const waiting = new Set<StageKey>()
  if (attention.undecided > 0) waiting.add("decided")
  if (attention.readyToRelease > 0 || attention.emailProblems > 0) waiting.add("released")
  if (attention.paymentsToVerify > 0) waiting.add("paymentSent")
  return waiting
}

function stationState(index: number, frontier: number, count: number): StageStation["state"] {
  if (frontier < 0) return "idle"
  if (index === frontier) return "current"
  // Before the station that needs work, but only drawn as done when something got there.
  return index < frontier && count > 0 ? "done" : "ahead"
}

export function buildStations({ stages, attention }: SeasonOverview): StageStation[] {
  const waiting = stagesNeedingWork(attention)
  const frontier = STAGES.findIndex((stage) => waiting.has(stage.key))
  return STAGES.map((stage, index) => ({
    ...stage,
    count: stages[stage.key],
    needsWork: index === frontier,
    state: stationState(index, frontier, stages[stage.key]),
  }))
}

/** Picks the singular or plural phrase for a count: pick(1, "is", "are"). */
export function pick(count: number, one: string, many: string) {
  return count === 1 ? one : many
}
