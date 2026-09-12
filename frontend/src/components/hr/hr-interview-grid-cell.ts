import type { SlotGridCell } from "@/components/interview/slot-grid"
import { slotKeyFromIso } from "@/lib/interview-season"
import type { HrInterviewSlot } from "@/lib/api"

type HrCellClickContext = {
  pending: boolean
  committeeId: string | undefined
  seasonConfigured: boolean
  slots: HrInterviewSlot[]
  openSlot: (startsAt: Date, existing?: HrInterviewSlot) => Promise<void>
  closeSlot: (slot: HrInterviewSlot) => Promise<void>
}

export function handleHrInterviewGridCellClick(
  cell: SlotGridCell,
  ctx: HrCellClickContext,
) {
  if (ctx.pending || !ctx.committeeId || !ctx.seasonConfigured) return

  const slot = cell.slotId
    ? ctx.slots.find((row) => row.id === cell.slotId)
    : ctx.slots.find((row) => slotKeyFromIso(row.startsAt) === cell.key)

  if (cell.state === "booked") return

  if (cell.state === "available" && slot) {
    void ctx.closeSlot(slot)
    return
  }

  if (cell.state === "unavailable") {
    if (slot && !slot.isOpen) {
      void ctx.openSlot(cell.startsAt, slot)
      return
    }
    void ctx.openSlot(cell.startsAt)
  }
}
