"use client"

import { ApplyForm } from "@/components/apply/apply-form"
import { ApplySeasonClosed } from "@/components/apply/apply-season-closed"
import { useRecruitmentWindow } from "@/hooks/use-recruitment-window"
import { glassPanelClasses, pageShellClasses } from "@/lib/surface"
import { SectionHeader } from "@/components/section-header"

const loadingPanelClasses = `mx-auto mt-10 w-full max-w-2xl ${glassPanelClasses} px-6 py-10 font-sans text-sm text-prelude md:px-10`

type ApplyFormGateProps = {
  initialPositionId?: string
}

export function ApplyFormGate({ initialPositionId }: ApplyFormGateProps) {
  const { window, loading, error, applicationsOpen } = useRecruitmentWindow()

  if (loading) {
    return (
      <main className={pageShellClasses}>
        <SectionHeader
          eyebrow="// RECRUITMENT 101"
          title="Apply to AWS Builders – UST"
          titleClassName="max-w-none whitespace-nowrap"
          subtitle="Every member lands on a committee that fits how they like to build, organize, or create."
        />
        <div className={loadingPanelClasses}>Loading application availability…</div>
      </main>
    )
  }

  if (error || !window || !applicationsOpen) {
    return (
      <ApplySeasonClosed
        window={
          window ?? {
            startsAt: null,
            endsAt: null,
            open: false,
            code: "not_configured",
            message: error || "Applications are not open right now.",
          }
        }
      />
    )
  }

  return <ApplyForm initialPositionId={initialPositionId} />
}
