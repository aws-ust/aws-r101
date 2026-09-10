"use client"

import { useEffect, useMemo, useState } from "react"
import { SlotGrid, type SlotGridCell } from "@/components/interview/slot-grid"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/field"
import { listPositionInterviewSlots } from "@/lib/api-client"
import {
  addDays,
  canGoNextWeek,
  canGoPrevWeek,
  clampWeekStart,
  formatWeekRange,
  getInterviewSeasonBounds,
  slotKeyFromIso,
  startOfWeek,
  weekDaysInSeason,
} from "@/lib/interview-season"

const hintClasses = "font-sans text-sm text-prelude"
const committeeClasses = "mt-1 font-mono text-xs text-aquamarine"
const weekNavClasses = "mt-4 flex flex-wrap items-center gap-2"
const weekLabelClasses = "min-w-[10rem] text-center font-sans text-sm text-blue-chalk"
const navButtonClasses = "h-9 px-4 text-xs"
const errorClasses = "mt-2 font-sans text-sm text-aquamarine"

type ApplyInterviewSlotPickerProps = {
  positionId: string
  selectedSlotId: string
  onSelectedSlotIdChange: (slotId: string) => void
}

function slotInWeek(slotIso: string, days: Date[]): boolean {
  if (days.length === 0) return false
  const time = new Date(slotIso).getTime()
  const start = new Date(days[0])
  start.setHours(0, 0, 0, 0)
  const end = new Date(days[days.length - 1])
  end.setDate(end.getDate() + 1)
  end.setHours(0, 0, 0, 0)
  return time >= start.getTime() && time < end.getTime()
}

function formatSlotLabel(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  return `${start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })} – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`
}

export function ApplyInterviewSlotPicker({
  positionId,
  selectedSlotId,
  onSelectedSlotIdChange,
}: ApplyInterviewSlotPickerProps) {
  const [committeeName, setCommitteeName] = useState("")
  const [slots, setSlots] = useState<
    { id: string; startsAt: string; endsAt: string }[]
  >([])
  const [weekStart, setWeekStart] = useState(() =>
    clampWeekStart(startOfWeek(new Date()))
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const days = useMemo(() => weekDaysInSeason(weekStart), [weekStart])
  const weekLabel = formatWeekRange(weekStart, days)
  const seasonBounds = getInterviewSeasonBounds()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError("")
    listPositionInterviewSlots(positionId)
      .then((payload) => {
        if (cancelled) return
        setCommitteeName(payload.committee.name)
        setSlots(payload.slots)
        onSelectedSlotIdChange("")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCommitteeName("")
        setSlots([])
        onSelectedSlotIdChange("")
        setError(
          err instanceof Error
            ? err.message
            : "Could not load interview slots."
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [positionId])

  const weekSlots = useMemo(
    () => slots.filter((slot) => slotInWeek(slot.startsAt, days)),
    [days, slots]
  )

  const cells = useMemo(() => {
    const map = new Map<string, SlotGridCell>()
    for (const slot of weekSlots) {
      const key = slotKeyFromIso(slot.startsAt)
      map.set(key, {
        key,
        startsAt: new Date(slot.startsAt),
        state: selectedSlotId === slot.id ? "selected" : "available",
        slotId: slot.id,
        detail: formatSlotLabel(slot.startsAt, slot.endsAt),
      })
    }
    return map
  }, [selectedSlotId, weekSlots])

  function onCellClick(cell: SlotGridCell) {
    if (!cell.slotId) return
    onSelectedSlotIdChange(cell.slotId)
  }

  return (
    <Field label="Interview time slot" required>
      <p className={hintClasses}>
        Pick one open slot for your first-choice committee. Season{" "}
        {seasonBounds.startsAt.toLocaleDateString()} –{" "}
        {seasonBounds.endsAt.toLocaleDateString()}.
      </p>
      {committeeName ? (
        <p className={committeeClasses}>{committeeName}</p>
      ) : null}

      <div className={weekNavClasses}>
        <Button
          type="button"
          color="purple"
          className={navButtonClasses}
          disabled={!canGoPrevWeek(weekStart)}
          onClick={() =>
            setWeekStart((current) => clampWeekStart(addDays(current, -7)))
          }
        >
          ← Prev
        </Button>
        <p className={weekLabelClasses}>{weekLabel}</p>
        <Button
          type="button"
          color="purple"
          className={navButtonClasses}
          disabled={!canGoNextWeek(weekStart)}
          onClick={() =>
            setWeekStart((current) => clampWeekStart(addDays(current, 7)))
          }
        >
          Next →
        </Button>
      </div>

      <div className="mt-4">
        <SlotGrid
          days={days}
          cells={cells}
          loading={loading}
          sparse
          onCellClick={onCellClick}
          emptyMessage="No open interview slots this week. Try another week or check back later."
        />
      </div>

      {error ? <p className={errorClasses} role="alert">{error}</p> : null}
    </Field>
  )
}
