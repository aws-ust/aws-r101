"use client"

import Link from "next/link"
import { Download } from "lucide-react"
import { ApplicationPagination } from "@/components/hr/application-pagination"
import { MemberCommitteeGroups } from "@/components/hr/member-committee-groups"
import { MemberTable } from "@/components/hr/member-table"
import { MembersFilterSelect, type FilterOption } from "@/components/hr/members-filter-select"
import { MembersError, MembersMessage, MembersSkeleton } from "@/components/hr/members-states"
import { MembersScopeTabs, MembersViewSwitch } from "@/components/hr/members-tabs"
import { MembersToolbar } from "@/components/hr/members-toolbar"
import { UnpaidTable } from "@/components/hr/unpaid-table"
import { useMembersData } from "@/components/hr/use-members-data"
import { useMembersView } from "@/components/hr/use-members-view"
import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import { FILTER_LABELS, type MemberFilter } from "@/lib/members/directory"
import { MEMBERS_PAGE_SIZE } from "@/lib/members/format"
import { UNPAID_FILTER_LABELS, type UnpaidFilter } from "@/lib/members/unpaid"
import { dashboardTitleClasses } from "@/lib/site/dashboard-surface"
import { hrPageShellClasses } from "@/lib/site/surface"

const exportClasses = "h-12 w-full gap-2 px-5 font-mono text-xs lg:w-auto"
const paymentsLinkClasses =
  "inline-flex min-h-11 items-center rounded-md px-1 font-sans text-sm text-blue-chalk underline underline-offset-4 outline-none hover:text-aquamarine focus-visible:ring-2 focus-visible:ring-aquamarine/60"
const contentClasses = "mt-6"
const ROLE_ORDER: MemberFilter[] = ["all", "eb", "ea", "director", "staff", "general"]
const UNPAID_ORDER: UnpaidFilter[] = [
  "all",
  "awaiting_payment",
  "needs_resubmission",
  "pending_verification",
  "expired",
]

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export function HrMembersPage() {
  const { data, error, retry } = useMembersData()
  const members = useMembersView(data)
  const paid = members.scope === "paid"
  const empty = members.total === 0

  const roleOptions: FilterOption[] = ROLE_ORDER.map((value) => ({
    value,
    label: FILTER_LABELS[value],
    count: members.roleCounts[value],
  }))
  const unpaidOptions: FilterOption[] = UNPAID_ORDER.map((value) => ({
    value,
    label: UNPAID_FILTER_LABELS[value],
    count: members.unpaidCounts[value],
  }))

  return (
    <main className={hrPageShellClasses}>
      <SectionHeader
        eyebrow="// MEMBERSHIP"
        title="Members"
        titleClassName={dashboardTitleClasses}
        subtitle={
          data
            ? `${plural(members.split.withId, "paid member", "paid members")} · ${plural(members.split.officers, "officer", "officers")} without an ID yet · ${members.unpaidTotal} not paid yet`
            : undefined
        }
      />
      {error ? (
        <MembersError message={error} onRetry={retry} />
      ) : !data ? (
        <MembersSkeleton />
      ) : (
        <>
          <MembersScopeTabs
            scope={members.scope}
            onScopeChange={members.setScope}
            paidCount={members.roleCounts.all}
            unpaidCount={members.unpaidTotal}
          />
          <MembersToolbar
            query={members.query}
            onQueryChange={members.setQuery}
            placeholder={paid ? "Search name or ID" : "Search name or email"}
            activeFilters={(paid ? members.role !== "all" : members.unpaidStatus !== "all") ? 1 : 0}
            filters={
              <>
                <div className="w-full lg:w-60">
                  {paid ? (
                    <MembersFilterSelect label="Filter by role" value={members.role} options={roleOptions} onChange={(value) => members.setRole(value as MemberFilter)} />
                  ) : (
                    <MembersFilterSelect label="Filter by payment status" value={members.unpaidStatus} options={unpaidOptions} onChange={(value) => members.setUnpaidStatus(value as UnpaidFilter)} />
                  )}
                </div>
                {paid ? (
                  <MembersViewSwitch view={members.view} onViewChange={members.setView} />
                ) : (
                  <Link href="/admin/hr/payments?tab=all" className={paymentsLinkClasses}>
                    Open payments
                  </Link>
                )}
              </>
            }
            actions={
              <Button color="purple" className={exportClasses} disabled={empty} onClick={members.exportCurrent}>
                <Download />
                Export CSV ({members.total})
              </Button>
            }
          />
          <div className={contentClasses}>
            {paid && members.split.withId === 0 ? (
              <MembersMessage
                title="No paid members yet"
                body="Members appear here with their Member ID once a payment is verified."
                linkHref="/admin/hr/payments?tab=review"
                linkLabel="Open receipts to review"
              />
            ) : null}
            {empty ? (
              <MembersMessage
                title={paid ? "No one matches that" : members.unpaidTotal === 0 ? "Everyone has paid" : "No one matches that"}
                body={paid || members.unpaidTotal > 0 ? "Try a different search or filter." : "Nobody is waiting on a payment right now."}
              />
            ) : paid && members.view === "committee" ? (
              <MemberCommitteeGroups groups={members.groups} />
            ) : paid ? (
              <MemberTable entries={members.paidPage} />
            ) : (
              <UnpaidTable entries={members.unpaidPage} />
            )}
          </div>
          {!empty && !(paid && members.view === "committee") ? (
            <ApplicationPagination
              total={members.total}
              page={members.page}
              onPageChange={members.setPage}
              noun={paid ? "people" : "people not paid yet"}
              pageSize={MEMBERS_PAGE_SIZE}
            />
          ) : null}
        </>
      )}
    </main>
  )
}
