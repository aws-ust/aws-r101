"use client"

import { useEffect, useRef, useState } from "react"
<<<<<<< HEAD
import { usePathname, useRouter } from "next/navigation"
=======
import { usePathname } from "next/navigation"
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
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
import { HrDeleteApplicantDialog } from "@/components/hr/hr-delete-applicant-dialog"
import { useApplications } from "@/lib/api"
import {
  buildHrListQueryString,
  hrFiltersFromListSearch,
  hrPageFromListSearch,
  mergeHrFilters,
  type HrListSearchParamsInput,
} from "@/lib/hr-filters-search-params"
import { pageShellClasses } from "@/lib/surface"
import { cn } from "@/lib/utils"
import type { HrApplication } from "@/lib/hr-application-types"

const toolbarClasses =
  "mt-8 flex flex-col gap-3 xl:flex-row xl:items-center"
const filtersClasses = "min-w-0 flex-1"
const QUERY_URL_DEBOUNCE_MS = 400

type HrApplicationListProps = {
  variant?: "active" | "archived"
  notice?: string
  listSearch?: HrListSearchParamsInput
}

export function HrApplicationList({
  variant = "active",
  notice,
  listSearch,
}: HrApplicationListProps) {
  const isArchivedView = variant === "archived"
<<<<<<< HEAD
  const router = useRouter()
=======
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  const pathname = usePathname()
  const [filters, setFilters] = useState(() =>
    hrFiltersFromListSearch(listSearch),
  )
  const [page, setPage] = useState(() => hrPageFromListSearch(listSearch))
  const urlSyncTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
<<<<<<< HEAD
    setFilters(hrFiltersFromListSearch(listSearch))
    setPage(hrPageFromListSearch(listSearch))
  }, [listSearch])

  useEffect(() => {
=======
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
    return () => {
      if (urlSyncTimeoutRef.current !== null) {
        window.clearTimeout(urlSyncTimeoutRef.current)
      }
    }
  }, [])

  const { applications, total, loading, error, refreshApplications } =
    useApplications({
      query: filters.query.trim(),
      committeeName: filters.committee || undefined,
      status: filters.status || undefined,
      applicationType: filters.applicationType || undefined,
      archive: variant,
      page,
      pageSize: APPLICATION_PAGE_SIZE,
    })
  const [archiveTarget, setArchiveTarget] = useState<HrApplication | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HrApplication | null>(null)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const visibleFeedback = feedback ?? hrApplicationListNoticeFeedback(notice)

  function replaceListUrl(nextFilters: HrFilters, nextPage: number) {
    const query = buildHrListQueryString(nextFilters, nextPage, { notice })
<<<<<<< HEAD
    router.replace(`${pathname}${query}`)
=======
    window.history.replaceState(null, "", `${pathname}${query}`)
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
  }

  function scheduleListUrlSync(
    nextFilters: HrFilters,
    nextPage: number,
    debounceMs: number,
  ) {
    if (urlSyncTimeoutRef.current !== null) {
      window.clearTimeout(urlSyncTimeoutRef.current)
    }
    urlSyncTimeoutRef.current = window.setTimeout(() => {
      replaceListUrl(nextFilters, nextPage)
      urlSyncTimeoutRef.current = null
    }, debounceMs)
  }

  function onFiltersChange(patch: Partial<HrFilters>) {
    const next = mergeHrFilters(filters, patch)
    const nextPage = 1
    setFilters(next)
    setPage(nextPage)
    const debounceMs = "query" in patch ? QUERY_URL_DEBOUNCE_MS : 0
    scheduleListUrlSync(next, nextPage, debounceMs)
  }

  function onPageChange(nextPage: number) {
    setPage(nextPage)
    replaceListUrl(filters, nextPage)
  }
<<<<<<< HEAD
=======

  function onDetailNavigate() {
    if (urlSyncTimeoutRef.current !== null) {
      window.clearTimeout(urlSyncTimeoutRef.current)
      urlSyncTimeoutRef.current = null
    }
    replaceListUrl(filters, page)
  }

  const listHref = `${pathname}${buildHrListQueryString(filters, page, {
    notice,
  })}`
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3

  return (
    <main className={cn(pageShellClasses, "min-w-0 max-w-full overflow-x-clip")}>
      <SectionHeader
        eyebrow={isArchivedView ? "// ARCHIVE" : "// APPLICATIONS"}
        title={
          isArchivedView ? "Archived applications" : "Applications Results"
        }
        titleClassName="max-w-none text-balance"
        subtitle={
          isArchivedView
            ? "Restore applicants to active review or delete permanently to free their interview slot."
            : "Every R101 application so far."
        }
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
            applicationType: filters.applicationType || undefined,
            archive: variant,
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
<<<<<<< HEAD
        onPageChange={onPageChange}
=======
        returnTo={listHref}
        onPageChange={onPageChange}
        onDetailNavigate={onDetailNavigate}
>>>>>>> f44a685539fd8a7e005776c9ad19bf0f12fc28b3
        onArchive={setArchiveTarget}
        onDelete={isArchivedView ? setDeleteTarget : undefined}
      />
      <HrArchiveApplicantDialog
        application={archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        onChanged={(updated) => {
          setPage(1)
          replaceListUrl(filters, 1)
          refreshApplications()
          setFeedback({
            type: "success",
            message: updated.archivedAt
              ? "Applicant archived."
              : "Applicant restored.",
          })
        }}
      />
      <HrDeleteApplicantDialog
        application={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDeleted={() => {
          setPage(1)
          replaceListUrl(filters, 1)
          refreshApplications()
          setFeedback({
            type: "success",
            message: "Applicant deleted. Their interview slot is now open.",
          })
        }}
      />
    </main>
  )
}
