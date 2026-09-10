import { INTERVIEW_SEASON } from "@/lib/constants"

export const INTERVIEW_GRID_START_HOUR = 9
export const INTERVIEW_GRID_END_HOUR = 17
export const INTERVIEW_SLOT_MINUTES = 30

/** Swap for HR-configured `/interview-window` when the backend supports it. */
export function getInterviewSeasonBounds() {
  return {
    startsAt: new Date(INTERVIEW_SEASON.startsAt),
    endsAt: new Date(INTERVIEW_SEASON.endsAt),
  }
}

export function interviewTimeLabels(): string[] {
  const labels: string[] = []
  for (let hour = INTERVIEW_GRID_START_HOUR; hour < INTERVIEW_GRID_END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      const date = new Date(2000, 0, 1, hour, minute)
      labels.push(
        date.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })
      )
    }
  }
  return labels
}

export function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function weekDaysInSeason(weekStart: Date): Date[] {
  const { startsAt, endsAt } = getInterviewSeasonBounds()
  const days: Date[] = []
  for (let index = 0; index < 5; index += 1) {
    const day = addDays(weekStart, index)
    if (day < startsAt || day > endsAt) continue
    if (day.getDay() === 0 || day.getDay() === 6) continue
    days.push(day)
  }
  return days
}

export function slotStartsAt(day: Date, rowIndex: number): Date {
  const hour = INTERVIEW_GRID_START_HOUR + Math.floor(rowIndex / 2)
  const minute = rowIndex % 2 === 0 ? 0 : 30
  const startsAt = new Date(day)
  startsAt.setHours(hour, minute, 0, 0)
  return startsAt
}

export function slotKey(startsAt: Date): string {
  return String(startsAt.getTime())
}

export function slotKeyFromIso(iso: string): string {
  return String(new Date(iso).getTime())
}

export function formatWeekRange(weekStart: Date, days: Date[]): string {
  if (days.length === 0) return "No days in season"
  const first = days[0]
  const last = days[days.length - 1]
  const sameMonth = first.getMonth() === last.getMonth()
  const startLabel = first.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
  const endLabel = last.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  })
  return `${startLabel} – ${endLabel}`
}

export function weekQueryRange(weekStart: Date, days: Date[]) {
  if (days.length === 0) {
    return { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() }
  }
  const from = new Date(days[0])
  from.setHours(0, 0, 0, 0)
  const to = new Date(days[days.length - 1])
  to.setDate(to.getDate() + 1)
  to.setHours(0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function clampWeekStart(weekStart: Date): Date {
  const { startsAt, endsAt } = getInterviewSeasonBounds()
  const seasonWeekStart = startOfWeek(startsAt)
  const seasonWeekEnd = startOfWeek(endsAt)
  if (weekStart < seasonWeekStart) return seasonWeekStart
  if (weekStart > seasonWeekEnd) return seasonWeekEnd
  return weekStart
}

export function canGoPrevWeek(weekStart: Date): boolean {
  const { startsAt } = getInterviewSeasonBounds()
  return addDays(weekStart, -7) >= startOfWeek(startsAt)
}

export function canGoNextWeek(weekStart: Date): boolean {
  const { endsAt } = getInterviewSeasonBounds()
  return addDays(weekStart, 7) <= startOfWeek(endsAt)
}
