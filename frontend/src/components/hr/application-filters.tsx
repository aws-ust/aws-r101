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
import { groupedCommitteesForPicker } from "@/lib/committee-groups"
import { fieldControlClasses } from "@/lib/surface"
import { useOpenPositions } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ApplicationStatus } from "@/lib/application-types"

const rowClasses =
  "flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center xl:flex-nowrap"
const searchClasses = `${fieldControlClasses} md:flex-1`
const statusSelectClasses = cn(fieldControlClasses, "justify-between md:w-52")

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
}

export type HrFilters = {
  query: string
  committee: string
  status: "" | ApplicationStatus
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
            {value.status ? STATUS_LABELS[value.status] : "All Statuses"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
