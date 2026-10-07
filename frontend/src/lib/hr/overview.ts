import type { SeasonAttention, SeasonOverview, SeasonStages } from "@/lib/api/overview"

export type StageKey = keyof SeasonStages

export type StageStation = {
  key: StageKey
  label: string
  count: number
  href: string
  /** The station an officer should look at first, if any work is waiting. */
  needsWork: boolean
}

export type AttentionItem = {
  key: keyof SeasonAttention
  count: number
  text: string
  href: string
}

const STAGES: { key: StageKey; label: string; href: string }[] = [
  { key: "applied", label: "Applied", href: "/admin/hr" },
  { key: "interviewBooked", label: "Interview booked", href: "/admin/hr/season" },
  { key: "decided", label: "Decided", href: "/admin/hr" },
  { key: "released", label: "Released", href: "/admin/hr/results" },
  { key: "paymentSent", label: "Payment sent", href: "/admin/hr/membership" },
  { key: "member", label: "Member", href: "/admin/hr/members" },
]

function pick(count: number, one: string, many: string) {
  return count === 1 ? one : many
}

/** Which stage the open attention items belong to, so that station is lit. */
function stagesNeedingWork(attention: SeasonAttention): Set<StageKey> {
  const waiting = new Set<StageKey>()
  if (attention.undecided > 0) waiting.add("decided")
  if (attention.readyToRelease > 0 || attention.emailProblems > 0) waiting.add("released")
  if (attention.paymentsToVerify > 0) waiting.add("paymentSent")
  return waiting
}

export function buildStations({ stages, attention }: SeasonOverview): StageStation[] {
  const waiting = stagesNeedingWork(attention)
  const first = STAGES.find((stage) => waiting.has(stage.key))?.key
  return STAGES.map((stage) => ({
    ...stage,
    count: stages[stage.key],
    needsWork: stage.key === first,
  }))
}

/** What needs an officer, most urgent first. Items with nothing waiting are left out. */
export function buildAttentionItems({ attention }: SeasonOverview): AttentionItem[] {
  const items: AttentionItem[] = [
    {
      key: "undecided",
      count: attention.undecided,
      text: `${pick(attention.undecided, "application is", "applications are")} waiting on a committee decision`,
      href: "/admin/hr?status=pending",
    },
    {
      key: "emailProblems",
      count: attention.emailProblems,
      text: `${pick(attention.emailProblems, "result email", "result emails")} failed or may not have arrived`,
      href: "/admin/hr/results",
    },
    {
      key: "readyToRelease",
      count: attention.readyToRelease,
      text: `${pick(attention.readyToRelease, "decided application has", "decided applications have")} no released result yet`,
      href: "/admin/hr/results",
    },
    {
      key: "paymentsToVerify",
      count: attention.paymentsToVerify,
      text: `${pick(attention.paymentsToVerify, "membership payment is", "membership payments are")} waiting for verification`,
      href: "/admin/hr/membership",
    },
    {
      key: "emailsInFlight",
      count: attention.emailsInFlight,
      text: `${pick(attention.emailsInFlight, "result email is", "result emails are")} still sending`,
      href: "/admin/hr/results",
    },
  ]
  return items.filter((item) => item.count > 0)
}
