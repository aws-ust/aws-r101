"use client"

import { MembersFilterSelect, type FilterOption } from "@/components/hr/members-filter-select"
import { MembersToolbar } from "@/components/hr/members-toolbar"
import type { PaymentListItem } from "@/lib/api/payments"
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_ORDER,
  type PaymentFilters,
} from "@/lib/payments/workspace"

const selectWrapClasses = "w-full lg:w-44"

function count(payments: PaymentListItem[], match: (payment: PaymentListItem) => boolean) {
  return payments.filter(match).length
}

function options(payments: PaymentListItem[]) {
  const committees = [...new Set(payments.flatMap((payment) => (payment.committee ? [payment.committee] : [])))].sort()
  const status: FilterOption[] = [
    { value: "all", label: "All statuses", count: payments.length },
    ...PAYMENT_STATUS_ORDER.map((value) => ({
      value,
      label: PAYMENT_STATUS_LABELS[value],
      count: count(payments, (payment) => payment.status === value),
    })),
  ]
  const type: FilterOption[] = [
    { value: "all", label: "All applicants", count: payments.length },
    { value: "position", label: "Committee applicants", count: count(payments, (p) => p.applicationType === "position") },
    { value: "member", label: "General members", count: count(payments, (p) => p.applicationType === "member") },
    { value: "officer", label: "Officers", count: count(payments, (p) => p.applicationType === "officer") },
  ]
  const result: FilterOption[] = [
    { value: "all", label: "All results", count: payments.length },
    { value: "approved", label: "Accepted", count: count(payments, (p) => p.applicationStatus === "approved") },
    { value: "rejected", label: "Not selected", count: count(payments, (p) => p.applicationStatus === "rejected") },
  ]
  const committee: FilterOption[] = [
    { value: "all", label: "All committees", count: payments.length },
    ...committees.map((name) => ({ value: name, label: name, count: count(payments, (p) => p.committee === name) })),
  ]
  return { status, type, result, committee }
}

type PaymentsFiltersProps = {
  payments: PaymentListItem[]
  filters: PaymentFilters
  onFiltersChange: (filters: PaymentFilters) => void
}

/** Search plus the four filters for the All payments tab, on the Members toolbar. */
export function PaymentsFilters({ payments, filters, onFiltersChange }: PaymentsFiltersProps) {
  const all = options(payments)
  const set = (patch: Partial<PaymentFilters>) => onFiltersChange({ ...filters, ...patch })
  const active = [filters.status, filters.type, filters.result, filters.committee].filter((value) => value !== "all").length

  return (
    <MembersToolbar
      query={filters.query}
      onQueryChange={(query) => set({ query })}
      placeholder="Name, code or reference"
      activeFilters={active}
      filters={
        <>
          <div className={selectWrapClasses}>
            <MembersFilterSelect label="Filter by payment status" value={filters.status} options={all.status} onChange={(value) => set({ status: value as PaymentFilters["status"] })} />
          </div>
          <div className={selectWrapClasses}>
            <MembersFilterSelect label="Filter by applicant type" value={filters.type} options={all.type} onChange={(value) => set({ type: value as PaymentFilters["type"] })} />
          </div>
          <div className={selectWrapClasses}>
            <MembersFilterSelect label="Filter by result" value={filters.result} options={all.result} onChange={(value) => set({ result: value as PaymentFilters["result"] })} />
          </div>
          <div className={selectWrapClasses}>
            <MembersFilterSelect label="Filter by committee" value={filters.committee} options={all.committee} onChange={(value) => set({ committee: value })} />
          </div>
        </>
      }
      actions={null}
    />
  )
}
