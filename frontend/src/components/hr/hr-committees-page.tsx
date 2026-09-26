"use client"

import { SectionHeader } from "@/components/shared/section-header"
import { HrCommitteeApplicationControls } from "@/components/hr/hr-committee-application-controls"
import { HrPositionApprovalTargets } from "@/components/hr/hr-position-approval-targets"
import { pageShellClasses } from "@/lib/site/surface"

const stackClasses = "mt-8 flex flex-col gap-4"

export function HrCommitteesPage() {
  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// COMMITTEES"
        title="Committees"
        subtitle="Control which committees accept applications and set approval targets by position, ordered from executive assistants through committee staff."
      />
      <div className={stackClasses}>
        <HrCommitteeApplicationControls />
        <HrPositionApprovalTargets />
      </div>
    </main>
  )
}
