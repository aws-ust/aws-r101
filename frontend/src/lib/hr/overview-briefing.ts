import type { SeasonOverview } from "@/lib/api/overview"
import { pick } from "@/lib/hr/overview"
import { periodState } from "@/lib/hr/overview-schedule"
import { formatDisplayDate } from "@/lib/datetime/display"

export type Briefing = {
  /** One sentence on where the season stands. */
  headline: string
  /** At most one supporting sentence: what blocks the next step, or that it is open. */
  lines: string[]
}

function shortDate(iso: string) {
  return formatDisplayDate(new Date(iso), { month: "short", day: "numeric" })
}

function headlineBeforeApplications(overview: SeasonOverview, now: Date) {
  const period = overview.schedule.applications
  const state = periodState(period, now)
  if (!period || state === "not-set") return "Applications have not been set up yet."
  if (state === "upcoming") return `Applications open on ${shortDate(period.startsAt)}.`
  if (state === "open") return "Applications are open and none have come in yet."
  return "Applications closed without any applications."
}

function headline(overview: SeasonOverview, now: Date) {
  const { stages, attention, schedule } = overview
  if (stages.applied === 0) return headlineBeforeApplications(overview, now)

  const applications = `${stages.applied} ${pick(stages.applied, "application", "applications")}`
  if (periodState(schedule.applications, now) === "open" && schedule.applications) {
    return `${applications} so far. Applications close on ${shortDate(schedule.applications.endsAt)}.`
  }
  if (attention.undecided > 0) {
    return `${stages.decided} of ${stages.applied} ${pick(stages.applied, "application is", "applications are")} decided.`
  }
  if (attention.readyToRelease > 0) return `All ${applications} are decided.`
  if (attention.emailProblems > 0) {
    return `Results are out, but ${attention.emailProblems} ${pick(attention.emailProblems, "email needs", "emails need")} attention.`
  }
  return `Results are out. ${stages.member} of ${stages.applied} ${pick(stages.member, "is a member", "are members")} so far.`
}

/** Only what the worklist rows cannot say: the reason the next step is blocked, or that it is open. */
function supportingLines({ attention }: SeasonOverview) {
  if (attention.undecided > 0) return ["Results cannot be released until every decision is in."]
  if (attention.readyToRelease > 0) return ["Results are ready to release."]
  return []
}

export function buildBriefing(overview: SeasonOverview, now: Date): Briefing {
  return { headline: headline(overview, now), lines: supportingLines(overview) }
}
