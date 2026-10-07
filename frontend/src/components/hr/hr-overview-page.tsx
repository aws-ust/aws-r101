"use client"

import { useEffect, useMemo, useState } from "react"
import { HrNeedsYou } from "@/components/hr/hr-needs-you"
import { HrStageLine } from "@/components/hr/hr-stage-line"
import { SectionHeader } from "@/components/shared/section-header"
import { getSeasonOverview, type SeasonOverview } from "@/lib/api/overview"
import { buildAttentionItems, buildStations } from "@/lib/hr/overview"
import { dashboardTitleClasses } from "@/lib/site/dashboard-surface"
import { hrPageShellClasses } from "@/lib/site/surface"

const bodyClasses = "mt-10 flex flex-col gap-10"
const statusClasses = "mt-10 font-sans text-sm text-prelude"
const errorClasses = "mt-10 font-sans text-sm text-rose-glow"

function seasonSubtitle(year: number) {
  return `Recruitment ${year} · A.Y. ${year}–${year + 1}`
}

export function HrOverviewPage() {
  const [overview, setOverview] = useState<SeasonOverview | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getSeasonOverview()
      .then((result) => {
        if (!cancelled) setOverview(result)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load the overview.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stations = useMemo(() => (overview ? buildStations(overview) : []), [overview])
  const items = useMemo(() => (overview ? buildAttentionItems(overview) : []), [overview])

  return (
    <main className={hrPageShellClasses}>
      <SectionHeader
        title="Overview"
        titleClassName={dashboardTitleClasses}
        subtitle={overview ? seasonSubtitle(overview.recruitmentYear) : undefined}
      />
      {error ? (
        <p className={errorClasses} role="alert">
          {error}
        </p>
      ) : overview === null ? (
        <p className={statusClasses} role="status">
          Loading the season…
        </p>
      ) : overview.stages.applied === 0 ? (
        <p className={statusClasses}>No applications yet for this recruitment year.</p>
      ) : (
        <div className={bodyClasses}>
          <HrStageLine stations={stations} />
          <HrNeedsYou items={items} />
        </div>
      )}
    </main>
  )
}
