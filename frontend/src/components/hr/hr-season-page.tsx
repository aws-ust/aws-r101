"use client"

import { SectionHeader } from "@/components/section-header"
import { HrInterviewGrid } from "@/components/hr/hr-interview-grid"
import { HrRecruitmentWindow } from "@/components/hr/hr-recruitment-window"
import { pageShellClasses } from "@/lib/surface"

const stackClasses = "mt-8 flex flex-col gap-10"

export function HrSeasonPage() {
  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// SEASON"
        title="Recruitment week & interviews"
        subtitle="Set the application window and manage interview slot availability."
      />
      <div className={stackClasses}>
        <HrRecruitmentWindow />
        <HrInterviewGrid />
      </div>
    </main>
  )
}
