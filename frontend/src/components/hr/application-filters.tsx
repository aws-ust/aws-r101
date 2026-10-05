"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { HrCommitteeFilterPicker } from "@/components/hr/hr-committee-filter-picker"
import { groupedCommitteesForPicker } from "@/lib/apply/committee-groups"
import { fieldControlClasses, hrFilterSelectClasses } from "@/lib/site/surface"
import { useOpenPositions } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ApplicationType } from "@/lib/types/application"
import type { ApplicantListStatusTag } from "@/lib/hr/application-display"

// Search gets its own row on medium screens; all four filters share one row on wide screens.
const rowClasses =
  "grid grid-cols-1 gap-3 md:grid-cols-3 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
const searchClasses = cn(fieldControlClasses, "border border-blue-chalk/20 md:col-span-3 2xl:col-span-1")
const statusSelectClasses = cn(hrFilterSelectClasses, "w-full")
const typeSelectClasses = cn(hrFilterSelectClasses, "w-full")

const STATUS_LABELS: Record<ApplicantListStatusTag, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  redirected: "Redirected",
}

function statusFilterLabel(status: HrFilters["status"]) {
  if (!status) return "All Statuses"
  if (status === "approved") return STATUS_LABELS.accepted
  return STATUS_LABELS[status]
}

const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  position: "Committee Positions",
  member: "Member-Only",
}

export type HrFilters = {
  query: string
  committee: string
  status: "" | "pending" | "approved" | "rejected" | "redirected"
  applicationType: "" | ApplicationType
}

type ApplicationFiltersProps = {
  value: HrFilters
  onChange: (patch: Partial<HrFilters>) => void
}

export function ApplicationFilters({ value, onChange }: ApplicationFiltersProps) {
  const { committees } = useOpenPositions()
  const committeeGroups = useMemo(
    () => groupedCommitteesForPicker(committees),
    [committees]
  )

  return (
    <div className={rowClasses}>
      <Input
        value={value.query}
        onChange={(event) => onChange({ query: event.target.value })}
        placeholder="Search applicant name..."
        className={searchClasses}
        aria-label="Search applicant name"
      />
      <Select
        value={value.applicationType || "all"}
        onValueChange={(next) =>
          onChange({
            applicationType: (!next || next === "all"
              ? ""
              : next) as HrFilters["applicationType"],
          })
        }
      >
        <SelectTrigger
          className={typeSelectClasses}
          aria-label="Filter by application type"
        >
          <SelectValue placeholder="All Application Types">
            {value.applicationType
              ? APPLICATION_TYPE_LABELS[value.applicationType]
              : "All Application Types"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Application Types</SelectItem>
          <SelectItem value="position">Committee Positions</SelectItem>
          <SelectItem value="member">Member-Only</SelectItem>
        </SelectContent>
      </Select>
      <HrCommitteeFilterPicker
        value={value.committee}
        groups={committeeGroups}
        onChange={(committee) => onChange({ committee })}
      />
      <Select
        value={value.status || "all"}
        onValueChange={(next) =>
          onChange({
            status: (!next || next === "all"
              ? ""
              : next) as HrFilters["status"],
          })
        }
      >
        <SelectTrigger className={statusSelectClasses} aria-label="Filter by status">
          <SelectValue placeholder="All Statuses">
            {statusFilterLabel(value.status)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Accepted</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="redirected">Redirected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
