import Link from "next/link"
import {
  ApplicationFilters,
  type HrFilters,
} from "@/components/hr/application-filters"
import { ApplicationExportButton } from "@/components/hr/application-export-button"
import { Button } from "@/components/ui/button"

const toolbarClasses = "mt-8 flex flex-col gap-3 xl:flex-row xl:items-center"
const filtersClasses = "min-w-0 flex-1"
const actionsClasses = "flex flex-col gap-3 sm:flex-row sm:justify-end"

export function HrApplicationListToolbar({
  variant,
  filters,
  total,
  onFiltersChange,
  onExportError,
}: {
  variant: "active" | "archived"
  filters: HrFilters
  total: number
  onFiltersChange: (patch: Partial<HrFilters>) => void
  onExportError: (message: string) => void
}) {
  return (
    <div className={toolbarClasses}>
      <div className={filtersClasses}>
        <ApplicationFilters value={filters} onChange={onFiltersChange} />
      </div>
      <div className={actionsClasses}>
        {variant === "active" ? (
          <Button
            color="cyan"
            className="h-10 gap-2 px-5 font-mono text-xs"
            nativeButton={false}
            render={<Link href="/admin/hr/add" />}
          >
            Add Applicant
          </Button>
        ) : null}
        <ApplicationExportButton
          filters={{
            query: filters.query.trim(),
            committeeName: filters.committee || undefined,
            status: filters.status || undefined,
            applicationType: filters.applicationType || undefined,
            archive: variant,
          }}
          total={total}
          onError={onExportError}
        />
      </div>
    </div>
  )
}
