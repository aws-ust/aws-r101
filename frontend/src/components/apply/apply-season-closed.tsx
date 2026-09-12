"use client"

import Link from "next/link"
import { SectionHeader } from "@/components/section-header"
import { Button } from "@/components/ui/button"
import { recruitmentClosedMessage } from "@/lib/recruitment-season"
import type { RecruitmentWindow } from "@/lib/api-client"
import { glassPanelClasses, ghostPillButtonClasses, pageShellClasses } from "@/lib/surface"

const panelClasses = `mx-auto mt-10 w-full max-w-2xl ${glassPanelClasses} px-6 py-10 md:px-10`
const copyClasses = "font-sans text-base leading-relaxed text-prelude"
const actionsClasses = "mt-8 flex flex-wrap gap-3"

type ApplySeasonClosedProps = {
  window: RecruitmentWindow
}

export function ApplySeasonClosed({ window }: ApplySeasonClosedProps) {
  const message = recruitmentClosedMessage(window)

  return (
    <main className={pageShellClasses}>
      <SectionHeader
        eyebrow="// RECRUITMENT 101"
        title="Apply to AWS Builders – UST"
        titleClassName="max-w-none whitespace-nowrap"
        subtitle="Every member lands on a committee that fits how they like to build, organize, or create."
      />
      <div className={panelClasses}>
        <p className={copyClasses} role="status">{message}</p>
        <p className={`${copyClasses} mt-4`}>
          You can still browse open roles or check an application you already submitted.
        </p>
        <div className={actionsClasses}>
          <Button
            color="purple"
            className={ghostPillButtonClasses}
            nativeButton={false}
            render={<Link href="/apply/positions" />}
          >
            Browse positions
          </Button>
          <Button
            color="cyan"
            nativeButton={false}
            render={<Link href="/apply/status" />}
          >
            Already applied?
          </Button>
        </div>
      </div>
    </main>
  )
}
