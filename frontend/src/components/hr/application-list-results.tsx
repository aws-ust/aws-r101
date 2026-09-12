import { ApplicationPagination } from "@/components/hr/application-pagination"
import { ApplicationRow } from "@/components/hr/application-row"
import { ApplicationListSkeleton } from "@/components/hr/application-list-skeleton"
import { pageCount } from "@/components/hr/application-pagination-utils"
import type { HrApplication } from "@/lib/hr-application-types"

const listClasses = "mt-8 flex min-w-0 flex-col gap-3"
const emptyClasses = "mt-8 font-sans text-sm text-prelude"

type ApplicationListResultsProps = {
  loading: boolean
  error: string | null
  applications: HrApplication[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onArchive: (application: HrApplication) => void
}

export function ApplicationListResults({
  loading,
  error,
  applications,
  total,
  page,
  onPageChange,
  onArchive,
}: ApplicationListResultsProps) {
  if (loading) {
    return <ApplicationListSkeleton />
  }
  if (error) {
    return <p className={emptyClasses}>{error}</p>
  }
  if (applications.length === 0) {
    return <p className={emptyClasses}>No applications match those filters.</p>
  }

  const totalPages = pageCount(total)
  const safePage = Math.min(page, totalPages)

  return (
    <>
      <ul className={listClasses}>
        {applications.map((application, index) => (
          <li key={application.id}>
            <ApplicationRow
              application={application}
              emphasized={safePage === 1 && index === 0}
              onArchive={onArchive}
            />
          </li>
        ))}
      </ul>
      <ApplicationPagination
        total={total}
        page={safePage}
        onPageChange={onPageChange}
      />
    </>
  )
}
