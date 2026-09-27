import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ApplicationRowActionsMenu } from "@/components/hr/application-row-actions-menu"
import { StatusPill } from "@/components/hr/status-pill"
import { cn } from "@/lib/utils"
import { firstChoiceCommittee, fullName } from "@/lib/api"
import type { HrApplication } from "@/lib/types/hr-application"

const rowClasses =
  "glass flex min-w-0 items-center gap-2 rounded-[22px] border border-blue-chalk/20 bg-meteorite/40 px-3 py-3 transition-colors hover:border-biloba-flower/70 sm:gap-3 sm:rounded-pill sm:px-5 sm:py-3.5"
const firstRowClasses = "border-biloba-flower/70"
const linkClasses =
  "flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4"
const nameBlockClasses = "flex min-w-0 flex-col gap-0.5"
const nameClasses =
  "font-sans text-base font-semibold text-balance text-blue-chalk"
const codeClasses = "font-mono text-xs text-prelude"
const committeeClasses =
  "min-w-0 font-sans text-sm leading-snug text-prelude line-clamp-2 md:max-w-[14rem] md:truncate md:text-right lg:max-w-xs"
const metaClasses =
  "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 md:shrink-0 md:flex-nowrap md:justify-end md:gap-3"
const metaTrailingClasses = "flex shrink-0 items-center gap-2 md:gap-3"
const rowActionsClasses = "flex shrink-0 items-center"
const archivedClasses =
  "rounded-pill bg-daisy-bush/55 px-3 py-0.5 font-mono text-[11px] text-blue-chalk"

type ApplicationRowProps = {
  application: HrApplication
  emphasized?: boolean
  returnTo: string
  onArchive: (application: HrApplication) => void
  onDelete?: (application: HrApplication) => void
  onEditEmail?: (application: HrApplication) => void
  onResendEmail?: (application: HrApplication) => void
  onNavigate: () => void
}

export function ApplicationRow({
  application,
  emphasized,
  returnTo,
  onArchive,
  onDelete,
  onEditEmail,
  onResendEmail,
  onNavigate,
}: ApplicationRowProps) {
  const name = fullName(application)
  const archived = Boolean(application.archivedAt)

  return (
    <div className={cn(rowClasses, emphasized && firstRowClasses)}>
      <div className={rowActionsClasses}>
        <ApplicationRowActionsMenu
          application={application}
          onArchive={onArchive}
          onDelete={onDelete}
          onEditEmail={onEditEmail}
          onResendEmail={onResendEmail}
        />
      </div>
      <Link
        href={`/admin/hr/${application.id}?returnTo=${encodeURIComponent(returnTo)}`}
        className={linkClasses}
        onClick={onNavigate}
      >
        <div className={nameBlockClasses}>
          <span className={nameClasses}>{name}</span>
          <span className={codeClasses}>{application.applicationCode}</span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
          <span className={committeeClasses}>
            {firstChoiceCommittee(application)}
          </span>
          <span className={metaClasses}>
            {archived ? <span className={archivedClasses}>Archived</span> : null}
            <span className={metaTrailingClasses}>
              <StatusPill status={application.status} />
              <ChevronRight className="size-4 shrink-0 text-prelude" />
            </span>
          </span>
        </div>
      </Link>
    </div>
  )
}
