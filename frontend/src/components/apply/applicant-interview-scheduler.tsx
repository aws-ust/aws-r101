"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { SlotGrid, type SlotGridCell } from "@/components/interview/slot-grid"
import { Button } from "@/components/ui/button"
import {
  getApplicantInterviewSlots,
  putApplicantInterviewBooking,
  type ApplicantInterviewSchedule,
  type ApplicantInterviewSlot,
} from "@/lib/applicant-api"
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

const sectionClasses = "mt-8 border-t border-biloba-flower/20 pt-8"
const headingClasses = "font-sans text-lg font-semibold text-blue-chalk"
const hintClasses = "mt-1 font-sans text-sm text-prelude"
const committeeClasses = "mt-2 font-mono text-xs text-aquamarine"
const weekNavClasses = "mt-4 flex flex-wrap items-center gap-2"
const weekLabelClasses = "min-w-[10rem] text-center font-sans text-sm text-blue-chalk"
const navButtonClasses = "h-9 px-4 text-xs"
const bookingClasses =
  "mt-4 rounded-[14px] border border-aquamarine/40 bg-aquamarine/10 px-4 py-3 font-sans text-sm text-blue-chalk"
const lockClasses =
  "mt-4 rounded-[14px] border border-rose-blush/45 bg-rose-deep/20 px-4 py-3 font-sans text-sm text-rose-glow"
const actionsClasses = "mt-4 flex flex-wrap gap-3"

type ApplicantInterviewSchedulerProps = {
  positionId?: string
  compact?: boolean
  previewMode?: boolean
  selectedSlotId?: string
  onSelectedSlotIdChange?: (slotId: string) => void
  onScheduleLoaded?: (schedule: ApplicantInterviewSchedule) => void
}

function formatSlotLabel(slot: ApplicantInterviewSlot | { startsAt: string; endsAt: string }) {
  const start = new Date(slot.startsAt)
  const end = new Date(slot.endsAt)
  return `${start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })} – ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`
}

function buildApplicantCells(
  schedule: ApplicantInterviewSchedule,
  selectedSlotId: string
): Map<string, SlotGridCell> {
  const cells = new Map<string, SlotGridCell>()
  const bookingKey = schedule.booking
    ? slotKeyFromIso(schedule.booking.startsAt)
    : null

  for (const slot of schedule.slots) {
    const key = slotKeyFromIso(slot.startsAt)
    const isCurrent = schedule.booking?.slotId === slot.id
    const isSelected = selectedSlotId === slot.id

    cells.set(key, {
      key,
      startsAt: new Date(slot.startsAt),
      state: isCurrent ? "current" : isSelected ? "selected" : "available",
      slotId: slot.id,
      detail: formatSlotLabel(slot),
    })
  }

  if (
    schedule.booking &&
    bookingKey &&
    !cells.has(bookingKey)
  ) {
    cells.set(bookingKey, {
      key: bookingKey,
      startsAt: new Date(schedule.booking.startsAt),
      state: "current",
      slotId: schedule.booking.slotId,
      detail: formatSlotLabel(schedule.booking),
    })
  }

  return cells
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

export function ApplicantInterviewScheduler({
  positionId,
  compact = false,
  previewMode = false,
  selectedSlotId: controlledSlotId,
  onSelectedSlotIdChange,
  onScheduleLoaded,
}: ApplicantInterviewSchedulerProps) {
  const [schedule, setSchedule] = useState<ApplicantInterviewSchedule | null>(null)
  const [weekStart, setWeekStart] = useState(() =>
    clampWeekStart(startOfWeek(new Date()))
  )
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [internalSelectedId, setInternalSelectedId] = useState("")

  const selectedSlotId = controlledSlotId ?? internalSelectedId
  const setSelectedSlotId = onSelectedSlotIdChange ?? setInternalSelectedId

  const days = useMemo(() => weekDaysInSeason(weekStart), [weekStart])
  const weekLabel = formatWeekRange(weekStart, days)

  const loadSchedule = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const payload = await getApplicantInterviewSlots(positionId)
      setSchedule(payload)
      onScheduleLoaded?.(payload)
      if (!previewMode && payload.booking) {
        setSelectedSlotId(payload.booking.slotId)
        setWeekStart(
          clampWeekStart(startOfWeek(new Date(payload.booking.startsAt)))
        )
      }
    } catch (err) {
      setSchedule(null)
      setError(
        err instanceof Error
          ? err.message
          : "Interview scheduling is temporarily unavailable. Try again in a moment."
      )
    } finally {
      setLoading(false)
    }
  }, [onScheduleLoaded, positionId, previewMode, setSelectedSlotId])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  const weekSlots = useMemo(() => {
    if (!schedule) return []
    const visible = [...schedule.slots]
    if (
      !previewMode &&
      schedule.booking &&
      !visible.some((slot) => slot.id === schedule.booking?.slotId)
    ) {
      visible.push({
        id: schedule.booking.slotId,
        startsAt: schedule.booking.startsAt,
        endsAt: schedule.booking.endsAt,
      })
    }
    return visible.filter((slot) => slotInWeek(slot.startsAt, days))
  }, [days, previewMode, schedule])

  const cells = useMemo(() => {
    if (!schedule) return new Map<string, SlotGridCell>()
    const filtered: ApplicantInterviewSchedule = {
      ...schedule,
      slots: weekSlots.filter(
        (slot) => schedule.booking?.slotId !== slot.id
      ),
    }
    const map = buildApplicantCells(filtered, selectedSlotId)
    if (!previewMode && schedule.booking) {
      const bookingSlot = weekSlots.find(
        (slot) => slot.id === schedule.booking?.slotId
      )
      if (bookingSlot) {
        const key = slotKeyFromIso(bookingSlot.startsAt)
        map.set(key, {
          key,
          startsAt: new Date(bookingSlot.startsAt),
          state:
            selectedSlotId === bookingSlot.id && schedule.canSchedule
              ? "selected"
              : "current",
          slotId: bookingSlot.id,
          detail: `${formatSlotLabel(bookingSlot)} (your booking)`,
        })
      }
    }
    return map
  }, [previewMode, schedule, selectedSlotId, weekSlots])

  const canConfirm =
    schedule?.canSchedule &&
    selectedSlotId &&
    selectedSlotId !== schedule.booking?.slotId

  async function confirmBooking() {
    if (!selectedSlotId || !schedule?.canSchedule) return
    setPending(true)
    setError("")
    setSuccess("")
    try {
      const result = await putApplicantInterviewBooking(selectedSlotId)
      setSuccess(
        result.booking.rescheduled
          ? "Interview rescheduled."
          : "Interview booked."
      )
      await loadSchedule()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not confirm this interview slot."
      )
    } finally {
      setPending(false)
    }
  }

  function onCellClick(cell: SlotGridCell) {
    if (!schedule?.canSchedule || !cell.slotId) return
    if (cell.state === "booked") return
    setSelectedSlotId(cell.slotId)
    setSuccess("")
    setError("")
  }

  const seasonBounds = getInterviewSeasonBounds()

  if (!compact) {
    return (
      <section className={sectionClasses}>
        <h2 className={headingClasses}>Schedule your interview</h2>
        <p className={hintClasses}>
          Pick one open slot for your first-choice committee. You can reschedule
          while your application is still editable.
        </p>
        {schedule ? (
          <p className={committeeClasses}>
            {schedule.committee.name} · season{" "}
            {seasonBounds.startsAt.toLocaleDateString()} –{" "}
            {seasonBounds.endsAt.toLocaleDateString()}
          </p>
        ) : null}

        {schedule && !schedule.canSchedule && schedule.lockReason ? (
          <p className={lockClasses} role="alert">{schedule.lockReason}</p>
        ) : null}

        {!previewMode && schedule?.booking ? (
          <p className={bookingClasses}>
            Your interview: {formatSlotLabel(schedule.booking)}
          </p>
        ) : null}

        <div className={weekNavClasses}>
          <Button
            type="button"
            color="purple"
            className={navButtonClasses}
            disabled={!canGoPrevWeek(weekStart)}
            onClick={() => setWeekStart((current) => clampWeekStart(addDays(current, -7)))}
          >
            ← Prev
          </Button>
          <p className={weekLabelClasses}>{weekLabel}</p>
          <Button
            type="button"
            color="purple"
            className={navButtonClasses}
            disabled={!canGoNextWeek(weekStart)}
            onClick={() => setWeekStart((current) => clampWeekStart(addDays(current, 7)))}
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

        {schedule?.canSchedule ? (
          <div className={actionsClasses}>
            <Button
              type="button"
              color="cyan"
              disabled={pending || !canConfirm}
              onClick={() => void confirmBooking()}
            >
              {pending ? "Confirming…" : "Confirm interview slot"}
            </Button>
          </div>
        ) : null}

        {error ? <ActionFeedback type="error" message={error} /> : null}
        {success ? <ActionFeedback type="success" message={success} /> : null}
      </section>
    )
  }

  return (
    <div className="mt-4">
      {schedule && !schedule.canSchedule && schedule.lockReason ? (
        <p className={lockClasses} role="alert">{schedule.lockReason}</p>
      ) : null}

      <div className={weekNavClasses}>
        <Button
          type="button"
          color="purple"
          className={navButtonClasses}
          disabled={!canGoPrevWeek(weekStart)}
          onClick={() => setWeekStart((current) => clampWeekStart(addDays(current, -7)))}
        >
          ← Prev
        </Button>
        <p className={weekLabelClasses}>{weekLabel}</p>
        <Button
          type="button"
          color="purple"
          className={navButtonClasses}
          disabled={!canGoNextWeek(weekStart)}
          onClick={() => setWeekStart((current) => clampWeekStart(addDays(current, 7)))}
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
          emptyMessage="No open slots for this committee yet."
        />
      </div>

      {error ? <ActionFeedback type="error" message={error} /> : null}
    </div>
  )
}
