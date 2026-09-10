"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { SlotGrid, type SlotGridCell } from "@/components/interview/slot-grid"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createInterviewSlot,
  listInterviewSlots,
  patchInterviewSlotOpen,
  useOpenPositions,
  type HrInterviewSlot,
} from "@/lib/api"
import { groupedCommitteesForPicker } from "@/lib/committee-groups"
import {
  addDays,
  canGoNextWeek,
  canGoPrevWeek,
  clampWeekStart,
  formatWeekRange,
  getInterviewSeasonBounds,
  slotKey,
  slotKeyFromIso,
  slotStartsAt,
  startOfWeek,
  weekDaysInSeason,
  weekQueryRange,
  INTERVIEW_GRID_END_HOUR,
  INTERVIEW_GRID_START_HOUR,
} from "@/lib/interview-season"
import { fieldControlClasses, glassPanelClasses } from "@/lib/surface"

const panelClasses = `${glassPanelClasses} mt-8 px-5 py-5`
const toolbarClasses = "mt-4 flex flex-wrap items-end justify-between gap-4"
const weekNavClasses = "flex flex-wrap items-center gap-2"
const weekLabelClasses = "min-w-[10rem] text-center font-sans text-sm text-blue-chalk"
const navButtonClasses = "h-9 px-4 text-xs"
const hintClasses = "mt-2 font-sans text-sm text-prelude"
const seasonClasses = "font-mono text-xs text-aquamarine"

type CloseTarget = {
  slot: HrInterviewSlot
  startsAt: Date
}

function committeeOptions(
  positions: { committee: string; committee_id?: string }[]
) {
  const map = new Map<string, string>()
  for (const position of positions) {
    if (!position.committee_id || map.has(position.committee)) continue
    map.set(position.committee, position.committee_id)
  }
  return map
}

function buildHrCells(
  days: Date[],
  slots: HrInterviewSlot[]
): Map<string, SlotGridCell> {
  const byStart = new Map(slots.map((slot) => [slotKeyFromIso(slot.startsAt), slot]))
  const cells = new Map<string, SlotGridCell>()
  const rowCount = (INTERVIEW_GRID_END_HOUR - INTERVIEW_GRID_START_HOUR) * 2

  for (const day of days) {
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const startsAt = slotStartsAt(day, rowIndex)
      const key = slotKey(startsAt)
      const slot = byStart.get(key)

      if (!slot) {
        cells.set(key, { key, startsAt, state: "unavailable" })
        continue
      }

      if (slot.booking) {
        cells.set(key, {
          key,
          startsAt,
          state: "booked",
          slotId: slot.id,
          detail: slot.booking.applicantName,
        })
        continue
      }

      cells.set(key, {
        key,
        startsAt,
        state: slot.isOpen ? "available" : "unavailable",
        slotId: slot.id,
        detail: slot.isOpen ? "Open" : "Closed",
      })
    }
  }

  return cells
}

export function HrInterviewGrid() {
  const { positions, committees, loading: positionsLoading } = useOpenPositions()
  const committeeIds = useMemo(() => committeeOptions(positions), [positions])
  const groups = groupedCommitteesForPicker(committees)

  const [committeeName, setCommitteeName] = useState("")
  const [weekStart, setWeekStart] = useState(() =>
    clampWeekStart(startOfWeek(new Date()))
  )
  const [slots, setSlots] = useState<HrInterviewSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [closeTarget, setCloseTarget] = useState<CloseTarget | null>(null)

  const committeeId = committeeName ? committeeIds.get(committeeName) : undefined
  const days = useMemo(() => weekDaysInSeason(weekStart), [weekStart])
  const weekLabel = formatWeekRange(weekStart, days)
  const cells = useMemo(() => buildHrCells(days, slots), [days, slots])

  const loadSlots = useCallback(async () => {
    if (!committeeId) {
      setSlots([])
      return
    }
    setLoading(true)
    setError("")
    try {
      const range = weekQueryRange(weekStart, days)
      setSlots(
        await listInterviewSlots({
          committeeId,
          from: range.from,
          to: range.to,
        })
      )
    } catch (err) {
      setSlots([])
      setError(
        err instanceof Error ? err.message : "Could not load interview slots."
      )
    } finally {
      setLoading(false)
    }
  }, [committeeId, days, weekStart])

  useEffect(() => {
    void loadSlots()
  }, [loadSlots])

  async function openSlot(startsAt: Date, existing?: HrInterviewSlot) {
    if (!committeeId) return
    setPending(true)
    setError("")
    setSuccess("")
    try {
      if (existing) {
        await patchInterviewSlotOpen(existing.id, true)
        setSuccess("Slot reopened.")
      } else {
        await createInterviewSlot(committeeId, startsAt.toISOString())
        setSuccess("Slot opened.")
      }
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open slot.")
    } finally {
      setPending(false)
    }
  }

  async function closeSlot(slot: HrInterviewSlot) {
    setPending(true)
    setError("")
    setSuccess("")
    try {
      await patchInterviewSlotOpen(slot.id, false)
      setSuccess("Slot closed.")
      setCloseTarget(null)
      await loadSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close slot.")
    } finally {
      setPending(false)
    }
  }

  function onCellClick(cell: SlotGridCell) {
    if (pending || !committeeId) return

    const slot = cell.slotId
      ? slots.find((row) => row.id === cell.slotId)
      : slots.find((row) => slotKeyFromIso(row.startsAt) === cell.key)

    if (cell.state === "booked") return

    if (cell.state === "available" && slot) {
      setCloseTarget({ slot, startsAt: cell.startsAt })
      return
    }

    if (cell.state === "unavailable") {
      if (slot && !slot.isOpen) {
        void openSlot(cell.startsAt, slot)
        return
      }
      void openSlot(cell.startsAt)
    }
  }

  const seasonBounds = getInterviewSeasonBounds()

  return (
    <section className={panelClasses}>
      <h2 className="font-sans text-lg font-semibold text-blue-chalk">
        Interview slots
      </h2>
      <p className={hintClasses}>
        Open 30-minute cells when the director or EB is free. Booked slots stay
        locked until the interview passes.
      </p>
      <p className={`${hintClasses} ${seasonClasses}`}>
        Interview season:{" "}
        {seasonBounds.startsAt.toLocaleDateString()} –{" "}
        {seasonBounds.endsAt.toLocaleDateString()} (from{" "}
        <code className="text-prelude">INTERVIEW_SEASON</code>)
      </p>

      <div className={toolbarClasses}>
        <Field label="Committee" htmlFor="hr-interview-committee" className="min-w-[14rem] flex-1">
          <Select
            value={committeeName || null}
            disabled={positionsLoading}
            onValueChange={(value: string | null) => setCommitteeName(value ?? "")}
          >
            <SelectTrigger id="hr-interview-committee" className={fieldControlClasses}>
              <SelectValue placeholder="Select a committee" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group.office}>
                  <SelectLabel>{group.office}</SelectLabel>
                  {group.committees.map((committee) => (
                    <SelectItem key={committee} value={committee}>
                      {committee}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </Field>

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
      </div>

      {!committeeId ? (
        <p className={`${hintClasses} mt-6`}>Select a committee to manage its weekly grid.</p>
      ) : (
        <div className="mt-6">
          <SlotGrid
            days={days}
            cells={cells}
            loading={loading}
            onCellClick={onCellClick}
            emptyMessage="No weekdays fall in this interview week."
          />
        </div>
      )}

      {error ? <ActionFeedback type="error" message={error} /> : null}
      {success ? <ActionFeedback type="success" message={success} /> : null}

      <Dialog
        open={closeTarget !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setCloseTarget(null)
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Close this slot?</DialogTitle>
            <DialogDescription>
              {closeTarget
                ? `Applicants will no longer be able to book ${closeTarget.startsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              color="purple"
              disabled={pending}
              onClick={() => setCloseTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              color="danger"
              disabled={pending}
              onClick={() => {
                if (closeTarget) void closeSlot(closeTarget.slot)
              }}
            >
              {pending ? "Closing…" : "Close slot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
