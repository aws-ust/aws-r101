import { useCallback, useEffect, useMemo, useState } from "react"
import type { SlotGridCell } from "@/components/interview/slot-grid"
import {
  createInterviewSlot,
  listInterviewSlots,
  patchInterviewSlotOpen,
  resetInterviewSchedule,
  useOpenPositions,
  type HrInterviewSlot,
} from "@/lib/api"
import { groupedCommitteesForPicker } from "@/lib/committee-groups"
import type { InterviewSeasonBounds } from "@/lib/interview-season"
import {
  clampWeekStart,
  formatWeekRange,
  startOfWeek,
  weekDaysInSeason,
  weekQueryRange,
} from "@/lib/interview-season"
import { handleHrInterviewGridCellClick } from "@/components/hr/hr-interview-grid-cell"
import {
  buildHrInterviewGridCells,
  committeeOptions,
  upsertHrInterviewSlot,
} from "@/components/hr/hr-interview-grid-utils"

export function useHrInterviewGrid(seasonBounds: InterviewSeasonBounds, seasonConfigured: boolean) {
  const { positions, committees, loading: positionsLoading } = useOpenPositions()
  const committeeIds = useMemo(() => committeeOptions(positions), [positions])
  const groups = useMemo(
    () => groupedCommitteesForPicker(committees),
    [committees],
  )

  const [committeeName, setCommitteeName] = useState("")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [slots, setSlots] = useState<HrInterviewSlot[]>([])
  const [gridReady, setGridReady] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resetOpen, setResetOpen] = useState(false)
  const committeeId = committeeName ? committeeIds.get(committeeName) : undefined
  const displayedWeekStart = useMemo(
    () => clampWeekStart(weekStart, seasonBounds),
    [weekStart, seasonBounds],
  )
  const days = useMemo(
    () => weekDaysInSeason(displayedWeekStart, seasonBounds),
    [displayedWeekStart, seasonBounds],
  )
  const weekLabel = formatWeekRange(displayedWeekStart, days)
  const cells = useMemo(() => buildHrInterviewGridCells(days, slots), [days, slots])

  const fetchSlots = useCallback(() => {
    if (!committeeId || !seasonConfigured) {
      return Promise.resolve<HrInterviewSlot[]>([])
    }
    const range = weekQueryRange(displayedWeekStart, days)
    return listInterviewSlots({
      committeeId,
      from: range.from,
      to: range.to,
    })
  }, [committeeId, days, displayedWeekStart, seasonConfigured])

  useEffect(() => {
    if (!committeeId || !seasonConfigured) {
      setFetching(false)
      return
    }
    let cancelled = false
    setFetching(true)
    fetchSlots()
      .then((rows) => {
        if (!cancelled) {
          setSlots(rows)
          setGridReady(true)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : "Could not load interview slots.",
        )
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [committeeId, fetchSlots, seasonConfigured])

  const openSlot = useCallback(
    async (startsAt: Date, existing?: HrInterviewSlot) => {
      if (!committeeId) return
      setPending(true)
      setError("")
      try {
        const next = existing
          ? await patchInterviewSlotOpen(existing.id, true)
          : await createInterviewSlot(committeeId, startsAt.toISOString())
        setSlots((current) => upsertHrInterviewSlot(current, next))
        setSuccess(existing ? "Slot reopened." : "Slot opened.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open slot.")
      } finally {
        setPending(false)
      }
    },
    [committeeId],
  )

  const resetSchedule = useCallback(async () => {
    if (!committeeId) return
    setPending(true)
    setError("")
    try {
      const result = await resetInterviewSchedule(committeeId)
      const parts = [
        `Removed ${result.deletedSlots} slot${result.deletedSlots === 1 ? "" : "s"}.`,
      ]
      if (result.deletedBookings > 0) {
        parts.push(
          `${result.deletedBookings} applicant booking${result.deletedBookings === 1 ? "" : "s"} cleared.`,
        )
      }
      setSuccess(parts.join(" "))
      setResetOpen(false)
      setSlots(await fetchSlots())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset the schedule.",
      )
    } finally {
      setPending(false)
    }
  }, [committeeId, fetchSlots])

  const closeSlot = useCallback(async (slot: HrInterviewSlot) => {
    setPending(true)
    setError("")
    try {
      const next = await patchInterviewSlotOpen(slot.id, false)
      setSlots((current) => upsertHrInterviewSlot(current, next))
      setSuccess("Slot closed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close slot.")
    } finally {
      setPending(false)
    }
  }, [])

  const onCellClick = useCallback(
    (cell: SlotGridCell) => {
      handleHrInterviewGridCellClick(cell, {
        pending,
        committeeId,
        seasonConfigured,
        slots,
        openSlot,
        closeSlot,
      })
    },
    [closeSlot, committeeId, openSlot, pending, seasonConfigured, slots],
  )

  const selectCommittee = useCallback((name: string) => {
    setCommitteeName(name)
    setSlots([])
    setGridReady(false)
    setError("")
  }, [])

  const loading = fetching && !gridReady

  return {
    groups,
    positionsLoading,
    committeeName,
    selectCommittee,
    committeeId,
    displayedWeekStart,
    seasonBounds: seasonBounds,
    days,
    cells,
    loading,
    fetching,
    pending,
    error,
    setError,
    success,
    weekLabel,
    weekStart,
    setWeekStart,
    resetOpen,
    setResetOpen,
    onCellClick,
    resetSchedule,
  }
}
