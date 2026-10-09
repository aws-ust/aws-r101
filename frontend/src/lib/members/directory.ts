import { staffCommitteeSeedNamesInOrgOrder } from "@/lib/apply/committee-groups"
import type { DirectoryMember } from "@/lib/api/payments"
import { COMMITTEE_DIRECTORS, EXECUTIVE_BOARD } from "@/lib/people"

export type MemberFilter = "all" | "eb" | "ea" | "director" | "staff" | "general"

/** One row in the HR Members list. Officers have no application, so no Member ID. */
export type MemberEntry = {
  key: string
  fullName: string
  position: string
  role: Exclude<MemberFilter, "all">
  /** The executive office or committee this person belongs to; null for general members. */
  committee: string | null
  memberId: string | null
  studentNumber: string | null
  section: string | null
  /** When the Member ID was issued (the payment was verified); null when there is no ID. */
  issuedAt: string | null
}

export const ROLE_LABELS: Record<Exclude<MemberFilter, "all">, string> = {
  eb: "Executive Board",
  ea: "Executive Associate",
  director: "Director",
  staff: "Staff",
  general: "General Member",
}

export const FILTER_LABELS: Record<MemberFilter, string> = {
  all: "Everyone",
  eb: "Executive Board",
  ea: "Executive Associates",
  director: "Directors",
  staff: "Staff",
  general: "General Members",
}

/** Executive Board seat id to the executive office it heads. */
const OFFICE_BY_EB_SEAT: Record<string, string> = {
  ceo: "Office of the Chief Executive Officer",
  coo: "Office of the Chief Operating Officer",
  cro: "Office of the Chief Relations Officer",
  "corp-sec": "Office of the Corporate Secretary",
  cto: "Office of the Chief Technology Officer",
  cfo: "Office of the Chief Finance Officer",
  chro: "Office of the Chief Human Resources Officer",
  cco: "Office of the Chief Creative Officer",
}

/** This year's Executive Board and committee directors, from the public people list. */
function officerEntries(): MemberEntry[] {
  const officer = (
    id: string,
    role: "eb" | "director",
    committee: string | null,
    person: { name: string; title: string },
  ): MemberEntry => ({
    key: id,
    fullName: person.name,
    position: person.title,
    role,
    committee,
    memberId: null,
    studentNumber: null,
    section: null,
    issuedAt: null,
  })
  // Director seats are built in the same order as the staff committees.
  const committees = staffCommitteeSeedNamesInOrgOrder()
  return [
    ...EXECUTIVE_BOARD.map((seat) =>
      officer(`eb-${seat.id}`, "eb", OFFICE_BY_EB_SEAT[seat.id] ?? null, seat.current),
    ),
    ...COMMITTEE_DIRECTORS.map((seat, index) =>
      officer(seat.id, "director", committees[index] ?? null, seat.current),
    ),
  ]
}

/** Paid members in Member ID order first, then the officers, who have no ID. */
export function buildMemberEntries(verified: DirectoryMember[]): MemberEntry[] {
  return [
    ...verified.map((member) => ({
      key: member.memberId,
      fullName: member.fullName,
      position: member.position,
      role: member.role,
      committee: member.committee,
      memberId: member.memberId,
      studentNumber: member.studentNumber,
      section: member.section,
      issuedAt: member.verifiedAt,
    })),
    ...officerEntries(),
  ]
}

export function countByFilter(entries: MemberEntry[]): Record<MemberFilter, number> {
  const counts: Record<MemberFilter, number> = { all: entries.length, eb: 0, ea: 0, director: 0, staff: 0, general: 0 }
  for (const entry of entries) counts[entry.role] += 1
  return counts
}

/** People with a Member ID, versus officers who are listed without one. */
export function splitByMemberId(entries: MemberEntry[]) {
  const withId = entries.filter((entry) => entry.memberId !== null).length
  return { withId, officers: entries.length - withId }
}

export function filterMemberEntries(entries: MemberEntry[], filter: MemberFilter, query: string) {
  const needle = query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (filter !== "all" && entry.role !== filter) return false
    if (!needle) return true
    return [entry.fullName, entry.position, entry.committee ?? "", entry.memberId ?? "", entry.studentNumber ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })
}
