import { escapeCell } from "@/lib/hr/applications-csv"
import type { MemberEntry } from "@/lib/members/directory"
import { ROLE_LABELS } from "@/lib/members/directory"
import type { UnpaidEntry } from "@/lib/members/unpaid"
import { UNPAID_FILTER_LABELS } from "@/lib/members/unpaid"

function toCsv(headers: string[], rows: (string | null)[][]) {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n")
}

export function membersToCsv(entries: MemberEntry[]) {
  return toCsv(
    ["Full name", "Position", "Role", "Committee", "Member ID", "Student number", "Section", "ID issued"],
    entries.map((entry) => [
      entry.fullName,
      entry.position,
      ROLE_LABELS[entry.role],
      entry.committee,
      entry.memberId,
      entry.studentNumber,
      entry.section,
      entry.issuedAt,
    ]),
  )
}

export function unpaidToCsv(entries: UnpaidEntry[]) {
  return toCsv(
    ["Full name", "Email", "Position", "Committee", "Payment status", "Pay by", "Last reference sent"],
    entries.map((entry) => [
      entry.fullName,
      entry.email,
      entry.position,
      entry.committee,
      UNPAID_FILTER_LABELS[entry.status],
      entry.dueAt,
      entry.lastSubmittedAt,
    ]),
  )
}
