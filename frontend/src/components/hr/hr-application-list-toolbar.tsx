import Link from "next/link"
import {
  ApplicationFilters,
  type HrFilters,
} from "@/components/hr/application-filters"
import { ApplicationExportButton } from "@/components/hr/application-export-button"
import { Button } from "@/components/ui/button"

const toolbarClasses = "mt-6"
const addButtonClasses = "h-12 gap-2 px-5 font-mono text-xs"

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
      <ApplicationFilters
        value={filters}
        onChange={onFiltersChange}
        actions={
          <>
            {variant === "active" ? (
              <Button
                color="cyan"
                className={addButtonClasses}
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
          </>
        }
      />
    </div>
  )
}
