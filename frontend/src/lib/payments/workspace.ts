import type {
  PaymentCampaign,
  PaymentDashboard,
  PaymentListItem,
  PaymentStatus,
} from "@/lib/api/payments"
import { formatDisplayDate } from "@/lib/datetime/display"

/** The Payments page: clear the receipt queue, or see everyone. Setup has its own page. */
export type PaymentTab = "review" | "all"

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: "Pending verification",
  needs_resubmission: "Needs resubmission",
  awaiting_payment: "Awaiting payment",
  expired: "Expired",
  verified: "Verified",
}

/** Work first: receipts to check, then people who owe a fix or a payment. */
export const PAYMENT_STATUS_ORDER: PaymentStatus[] = [
  "pending_verification",
  "needs_resubmission",
  "awaiting_payment",
  "expired",
  "verified",
]

export type PaymentFilters = {
  query: string
  status: PaymentStatus | "all"
  type: "all" | PaymentListItem["applicationType"]
  result: "all" | "approved" | "rejected"
  committee: string
}

export const EMPTY_PAYMENT_FILTERS: PaymentFilters = {
  query: "",
  status: "all",
  type: "all",
  result: "all",
  committee: "all",
}

export function fullName(payment: Pick<PaymentListItem, "firstName" | "lastName">) {
  return `${payment.firstName} ${payment.lastName}`
}

/** What the row's committee column says: who they pay as, in one rule. */
export function placementLabel(payment: Pick<PaymentListItem, "applicationType" | "applicationStatus" | "committee">) {
  if (payment.applicationType === "member") return "General member"
  if (payment.applicationStatus !== "approved") return "Not selected"
  return payment.committee ?? "Committee"
}

/** Committee members pay the CFO's QR; everyone else pays as a general member. */
export function paysAsCommitteeMember(payment: Pick<PaymentListItem, "applicationType" | "applicationStatus">) {
  return payment.applicationType === "position" && payment.applicationStatus === "approved"
}

/** The "Pays as" line in the review panel. */
export function paysAsLabel(payment: Pick<PaymentListItem, "applicationType" | "applicationStatus">) {
  if (payment.applicationType === "officer") return "Officer"
  return paysAsCommitteeMember(payment) ? "Committee member" : "General member"
}

export function filterPayments(payments: PaymentListItem[], filters: PaymentFilters) {
  const search = filters.query.trim().toLowerCase()
  return payments.filter((payment) => {
    const haystack = `${fullName(payment)} ${payment.applicationCode} ${payment.email} ${payment.latestSubmission?.referenceNumber ?? ""}`
    return (
      (!search || haystack.toLowerCase().includes(search)) &&
      (filters.status === "all" || payment.status === filters.status) &&
      (filters.type === "all" || payment.applicationType === filters.type) &&
      (filters.result === "all" || payment.applicationStatus === filters.result) &&
      (filters.committee === "all" || payment.committee === filters.committee)
    )
  })
}

/** Status order first, then by name, so the list reads like a worklist. */
export function sortPayments(payments: PaymentListItem[]) {
  const rank = (status: PaymentStatus) => PAYMENT_STATUS_ORDER.indexOf(status)
  return [...payments].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      a.lastName.localeCompare(b.lastName) ||
      a.firstName.localeCompare(b.firstName),
  )
}

/** Receipts waiting for a decision, oldest submission first: first in, first checked. */
export function reviewQueue(payments: PaymentListItem[]) {
  const submitted = (payment: PaymentListItem) =>
    payment.latestSubmission ? Date.parse(payment.latestSubmission.submittedAt) : Number.MAX_SAFE_INTEGER
  return payments
    .filter((payment) => payment.status === "pending_verification")
    .sort((a, b) => submitted(a) - submitted(b))
}

/** The row Previous / Next lands on, or null at either end. */
export function stepInList(list: PaymentListItem[], id: string, delta: 1 | -1) {
  const index = list.findIndex((payment) => payment.paymentId === id)
  if (index === -1) return list[0]?.paymentId ?? null
  return list[index + delta]?.paymentId ?? null
}

/** After deciding on `id`, the receipt to show next: the one after it, else the one before. */
export function nextAfterDecision(queue: PaymentListItem[], id: string) {
  return stepInList(queue, id, 1) ?? stepInList(queue, id, -1)
}

export function parsePaymentTab(value: string | string[] | undefined): PaymentTab | null {
  return value === "review" || value === "all" ? value : null
}

/** The queue while anything waits; otherwise everyone. */
export function defaultPaymentTab(summary: PaymentDashboard["summary"] | null): PaymentTab {
  return summary && summary.pendingVerification > 0 ? "review" : "all"
}

export const PAYMENT_SETUP_HREF = "/admin/hr/payments/setup"

/** No period yet, or no amount: the officer still has to visit Payment Setup. */
export function needsPaymentSetup(campaign: PaymentCampaign | null) {
  return !campaign || campaign.amountCents === null
}

const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })

export function formatPeso(amountCents: number) {
  return pesoFormatter.format(amountCents / 100)
}

/** The one line under the page title: is the period open, how much, until when. */
export function periodLine(campaign: PaymentCampaign | null) {
  if (!campaign) return "Not set up yet. Set the payment period, amount and GCash QRs in Payment Setup."
  const amount = campaign.amountCents === null ? "amount not set" : formatPeso(campaign.amountCents)
  const deadline = formatDisplayDate(new Date(campaign.deadlineAt), {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  return `${campaign.isOpen ? "Open" : "Closed"} · ${amount} · deadline ${deadline}`
}
