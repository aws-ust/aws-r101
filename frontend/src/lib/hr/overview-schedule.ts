import type { SeasonOverview, SeasonPeriod } from "@/lib/api/overview"
import { formatDisplayDate } from "@/lib/datetime/display"

export type PeriodState = "not-set" | "upcoming" | "open" | "closed"

export type ScheduleRow = {
  key: "applications" | "interviews" | "payments"
  label: string
  range: string | null
  state: PeriodState
  /** "Closes in 3 days", "Opens tomorrow", "Closed", "Not set". */
  note: string
  /** Where an officer changes it. */
  href: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export function periodState(period: SeasonPeriod, now: Date): PeriodState {
  if (!period) return "not-set"
  const time = now.getTime()
  if (time < new Date(period.startsAt).getTime()) return "upcoming"
  if (time >= new Date(period.endsAt).getTime()) return "closed"
  return "open"
}

function daysUntil(iso: string, now: Date) {
  return Math.ceil((new Date(iso).getTime() - now.getTime()) / DAY_MS)
}

function inDays(count: number) {
  return count === 1 ? "1 day" : `${count} days`
}

function note(state: PeriodState, period: SeasonPeriod, now: Date, due: boolean) {
  if (!period) return "Not set"
  if (state === "closed") return "Closed"
  if (state === "upcoming") {
    const left = daysUntil(period.startsAt, now)
    return left <= 1 ? "Opens tomorrow" : `Opens in ${inDays(left)}`
  }
  const verb = due ? "Due" : "Closes"
  const left = daysUntil(period.endsAt, now)
  return left <= 1 ? `${verb} today` : `${verb} in ${inDays(left)}`
}

function rangeLabel(period: SeasonPeriod) {
  if (!period) return null
  const options = { month: "short", day: "numeric" } as const
  const start = formatDisplayDate(new Date(period.startsAt), options)
  const end = formatDisplayDate(new Date(period.endsAt), options)
  return start === end ? start : `${start} – ${end}`
}

const ROWS = [
  { key: "applications", label: "Applications", href: "/admin/hr/season", due: false },
  { key: "interviews", label: "Interviews", href: "/admin/hr/season", due: false },
  { key: "payments", label: "Membership payment", href: "/admin/hr/payments", due: true },
] as const

export function buildSchedule({ schedule }: SeasonOverview, now: Date): ScheduleRow[] {
  const rows = ROWS.map(({ key, label, href, due }) => {
    const period = schedule[key]
    const state = periodState(period, now)
    const start = period ? new Date(period.startsAt).getTime() : Number.POSITIVE_INFINITY
    return { start, row: { key, label, range: rangeLabel(period), state, note: note(state, period, now, due), href } }
  })
  // By start date, with anything not set yet last.
  return rows.sort((a, b) => a.start - b.start).map(({ row }) => row)
}
