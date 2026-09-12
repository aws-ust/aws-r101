"use client"

import {
  ApplicantInterviewSchedulerCompact,
  ApplicantInterviewSchedulerFull,
} from "@/components/apply/applicant-interview-scheduler-ui"
import { useApplicantInterviewScheduler } from "@/components/apply/use-applicant-interview-scheduler"
import type { ApplicantInterviewSchedule } from "@/lib/applicant-api"

type ApplicantInterviewSchedulerProps = {
  positionId?: string
  compact?: boolean
  previewMode?: boolean
  selectedSlotId?: string
  onSelectedSlotIdChange?: (slotId: string) => void
  onScheduleLoaded?: (schedule: ApplicantInterviewSchedule) => void
}

export function ApplicantInterviewScheduler({
  positionId,
  compact = false,
  previewMode = false,
  selectedSlotId: controlledSlotId,
  onSelectedSlotIdChange,
  onScheduleLoaded,
}: ApplicantInterviewSchedulerProps) {
  const scheduler = useApplicantInterviewScheduler({
    positionId,
    previewMode,
    selectedSlotId: controlledSlotId,
    onSelectedSlotIdChange,
    onScheduleLoaded,
  })

  if (!compact) {
    return (
      <ApplicantInterviewSchedulerFull
        {...scheduler.shellProps}
        previewMode={scheduler.previewMode}
        success={scheduler.success}
        canConfirm={Boolean(scheduler.canConfirm)}
        pending={scheduler.pending}
        onConfirm={() => void scheduler.confirmBooking()}
        showConfirm={scheduler.showConfirm}
        gridEmptyMessage="No open interview slots this week. Try another week or check back later."
      />
    )
  }

  return (
    <ApplicantInterviewSchedulerCompact
      {...scheduler.shellProps}
      gridEmptyMessage="No open slots for this committee yet."
    />
  )
}
