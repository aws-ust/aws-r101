"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PaymentListItem, PaymentStatus } from "@/lib/api/payments"
import { fieldControlClasses, hrFilterSelectClasses } from "@/lib/site/surface"
import { cn } from "@/lib/utils"

const filtersClasses =
  "mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_12rem_12rem_12rem_12rem]"
const searchClasses = fieldControlClasses
const listClasses = "flex flex-col gap-2"
const rowClasses =
  "flex w-full flex-col gap-2 rounded-[14px] border border-blue-chalk/20 bg-haiti/35 px-4 py-3 text-left transition-colors hover:border-aquamarine/40 hover:bg-meteorite/45 md:flex-row md:items-center md:justify-between"
const nameClasses = "font-sans text-sm font-semibold text-blue-chalk"
const detailClasses = "font-mono text-[10px] text-prelude"
const statusClasses =
  "w-fit rounded-pill border px-3 py-1 font-mono text-[10px] tracking-wide"
const emptyClasses = "font-sans text-sm text-prelude"

const STATUS_LABELS: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting Payment",
  pending_verification: "Pending Verification",
  verified: "Verified",
  needs_resubmission: "Needs Resubmission",
  expired: "Expired",
}

const TYPE_LABELS = {
  all: "All Applicant Types",
  position: "Committee Applicants",
  member: "General Members",
} as const

const RESULT_LABELS = {
  all: "All Results",
  approved: "Accepted",
  rejected: "Not Selected",
} as const

function statusFilterLabel(value: string) {
  if (value === "all") return "All Statuses"
  return STATUS_LABELS[value as PaymentStatus] ?? value
}

function typeFilterLabel(value: string) {
  return TYPE_LABELS[value as keyof typeof TYPE_LABELS] ?? value
}

function resultFilterLabel(value: string) {
  return RESULT_LABELS[value as keyof typeof RESULT_LABELS] ?? value
}

function committeeFilterLabel(value: string) {
  return value === "all" ? "All Committees" : value
}

export function HrPaymentList({
  payments,
  onSelect,
}: {
  payments: PaymentListItem[]
  onSelect: (payment: PaymentListItem) => void
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [type, setType] = useState("all")
  const [result, setResult] = useState("all")
  const [committee, setCommittee] = useState("all")
  const committees = useMemo(
    () =>
      [
        ...new Set(
          payments.flatMap((payment) =>
            payment.committee ? [payment.committee] : [],
          ),
        ),
      ].sort(),
    [payments],
  )
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return payments.filter((payment) => {
      const matchesSearch =
        !search ||
        `${payment.firstName} ${payment.lastName} ${payment.applicationCode} ${payment.email}`
          .toLowerCase()
          .includes(search)
      return (
        matchesSearch &&
        (status === "all" || payment.status === status) &&
        (type === "all" || payment.applicationType === type) &&
        (result === "all" || payment.applicationStatus === result) &&
        (committee === "all" || payment.committee === committee)
      )
    })
  }, [committee, payments, query, result, status, type])

  return (
    <div>
      <div className={filtersClasses}>
        <Input
          aria-label="Search payments"
          placeholder="Search name, email, or Application ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className={searchClasses}
        />
        <Select
          value={status}
          onValueChange={(value) => setStatus(value ?? "all")}
        >
          <SelectTrigger
            className={hrFilterSelectClasses}
            aria-label="Filter by payment status"
          >
            <SelectValue placeholder="All Statuses">
              {statusFilterLabel(status)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(value) => setType(value ?? "all")}
        >
          <SelectTrigger
            className={hrFilterSelectClasses}
            aria-label="Filter by applicant type"
          >
            <SelectValue placeholder="All Applicant Types">
              {typeFilterLabel(type)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Applicant Types</SelectItem>
            <SelectItem value="position">Committee Applicants</SelectItem>
            <SelectItem value="member">General Members</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={result}
          onValueChange={(value) => setResult(value ?? "all")}
        >
          <SelectTrigger
            className={hrFilterSelectClasses}
            aria-label="Filter by application result"
          >
            <SelectValue placeholder="All Results">
              {resultFilterLabel(result)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="approved">Accepted</SelectItem>
            <SelectItem value="rejected">Not Selected</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={committee}
          onValueChange={(value) => setCommittee(value ?? "all")}
        >
          <SelectTrigger
            className={hrFilterSelectClasses}
            aria-label="Filter by committee"
          >
            <SelectValue placeholder="All Committees">
              {committeeFilterLabel(committee)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Committees</SelectItem>
            {committees.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={listClasses}>
        {filtered.map((payment) => (
          <button
            key={payment.paymentId}
            type="button"
            className={rowClasses}
            onClick={() => onSelect(payment)}
          >
            <span>
              <span className={nameClasses}>
                {payment.firstName} {payment.lastName}
              </span>
              <span className={`${detailClasses} mt-1 block`}>
                {payment.applicationCode} ·{" "}
                {payment.applicationType === "member"
                  ? "General Member"
                  : (payment.committee ?? "Committee applicant")}
              </span>
            </span>
            <span
              className={cn(
                statusClasses,
                payment.status === "verified"
                  ? "border-aquamarine/40 text-aquamarine"
                  : payment.status === "pending_verification"
                    ? "border-amber-300/40 text-amber-200"
                    : "border-blue-chalk/25 text-prelude",
              )}
            >
              {STATUS_LABELS[payment.status]}
            </span>
          </button>
        ))}
        {filtered.length === 0 ? (
          <p className={emptyClasses}>No payments match these filters.</p>
        ) : null}
      </div>
    </div>
  )
}
