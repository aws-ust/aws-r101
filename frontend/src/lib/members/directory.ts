import type { DirectoryMember } from "@/lib/api/payments"
import { COMMITTEE_DIRECTORS, EXECUTIVE_BOARD } from "@/lib/people"

export type MemberFilter = "all" | "eb" | "ea" | "director" | "staff" | "general"

/** One row in the HR Members list. Officers have no application, so no Member ID. */
export type MemberEntry = {
  key: string
  fullName: string
  position: string
  role: Exclude<MemberFilter, "all">
  memberId: string | null
  studentNumber: string | null
  section: string | null
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

/** This year's Executive Board and committee directors, from the public people list. */
function officerEntries(): MemberEntry[] {
  const officer = (id: string, role: "eb" | "director", person: { name: string; title: string }) => ({
    key: id,
    fullName: person.name,
    position: person.title,
    role,
    memberId: null,
    studentNumber: null,
    section: null,
  })
  return [
    ...EXECUTIVE_BOARD.map((seat) => officer(`eb-${seat.id}`, "eb", seat.current)),
    ...COMMITTEE_DIRECTORS.map((seat) => officer(seat.id, "director", seat.current)),
  ]
}

/** Officers first, then verified members in Member ID order. */
export function buildMemberEntries(verified: DirectoryMember[]): MemberEntry[] {
  return [
    ...officerEntries(),
    ...verified.map((member) => ({
      key: member.memberId,
      fullName: member.fullName,
      position: member.position,
      role: member.role,
      memberId: member.memberId,
      studentNumber: member.studentNumber,
      section: member.section,
    })),
  ]
}

export function countByFilter(entries: MemberEntry[]): Record<MemberFilter, number> {
  const counts: Record<MemberFilter, number> = { all: entries.length, eb: 0, ea: 0, director: 0, staff: 0, general: 0 }
  for (const entry of entries) counts[entry.role] += 1
  return counts
}

export function filterMemberEntries(entries: MemberEntry[], filter: MemberFilter, query: string) {
  const needle = query.trim().toLowerCase()
  return entries.filter((entry) => {
    if (filter !== "all" && entry.role !== filter) return false
    if (!needle) return true
    return [entry.fullName, entry.position, entry.memberId ?? "", entry.studentNumber ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })
}
