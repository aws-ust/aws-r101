"use client"

import { useState } from "react"
import { ActionFeedback } from "@/components/action-feedback"
import { SectionHeader } from "@/components/section-header"
import {
  ApplicationFilters,
  type HrFilters,
} from "@/components/hr/application-filters"
import { APPLICATION_PAGE_SIZE } from "@/components/hr/application-pagination-utils"
import { ApplicationListResults } from "@/components/hr/application-list-results"
import { hrApplicationListNoticeFeedback } from "@/components/hr/application-list-feedback"
import { ApplicationExportButton } from "@/components/hr/application-export-button"
import { HrArchiveApplicantDialog } from "@/components/hr/hr-archive-applicant-dialog"
import { useApplications } from "@/lib/api"
import { pageShellClasses } from "@/lib/surface"
import { cn } from "@/lib/utils"
import type { HrApplication } from "@/lib/hr-application-types"

const toolbarClasses =
  "mt-8 flex flex-col gap-3 xl:flex-row xl:items-center"
const filtersClasses = "min-w-0 flex-1"

const emptyFilters: HrFilters = {
  query: "",
  committee: "",
  status: "",
  archive: "active",
}

export function HrApplicationList({ notice }: { notice?: string }) {
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const { applications, total, loading, error, refreshApplications } =
    useApplications({
      query: filters.query.trim(),
      committeeName: filters.committee || undefined,
      status: filters.status || undefined,
      archive: filters.archive,
      page,
      pageSize: APPLICATION_PAGE_SIZE,
    })
  const [archiveTarget, setArchiveTarget] = useState<HrApplication | null>(null)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const visibleFeedback = feedback ?? hrApplicationListNoticeFeedback(notice)

  function onFiltersChange(patch: Partial<HrFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  return (
    <main className={cn(pageShellClasses, "min-w-0 max-w-full overflow-x-clip")}>
      <SectionHeader
        eyebrow="// APPLICATIONS"
        title="Applications Results"
        titleClassName="max-w-none text-balance"
        subtitle="Every R101 application so far."
      />
      {visibleFeedback ? (
        <ActionFeedback
          type={visibleFeedback.type}
          message={visibleFeedback.message}
        />
      ) : null}
      <div className={toolbarClasses}>
        <div className={filtersClasses}>
          <ApplicationFilters value={filters} onChange={onFiltersChange} />
        </div>
        <ApplicationExportButton
          filters={{
            query: filters.query.trim(),
            committeeName: filters.committee || undefined,
            status: filters.status || undefined,
            archive: filters.archive,
          }}
          total={total}
          onError={(message) => setFeedback({ type: "error", message })}
        />
      </div>
      <ApplicationListResults
        loading={loading}
        error={error}
        applications={applications}
        total={total}
        page={page}
        onPageChange={setPage}
        onArchive={setArchiveTarget}
      />
      <HrArchiveApplicantDialog
        application={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        onChanged={(updated) => {
          setPage(1)
          refreshApplications()
          setFeedback({
            type: "success",
            message: updated.archivedAt
              ? "Applicant archived."
              : "Applicant restored.",
          })
        }}
      />
    </main>
  )
}
