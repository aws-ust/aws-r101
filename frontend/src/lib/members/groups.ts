import { compareCommitteeNames, isExecutiveOfficeCommittee } from "@/lib/apply/committee-groups"
import type { MemberEntry } from "@/lib/members/directory"

export const GENERAL_GROUP = "General members"

export type CommitteeGroup = {
  name: string
  /** 0 for an executive office (and General members), 1 for a committee that sits under an office. */
  level: 0 | 1
  /** The Executive Board member or director who leads it. */
  leads: MemberEntry[]
  /** Executive associates, staff, and general members. */
  members: MemberEntry[]
  total: number
}

const ROLE_ORDER: Record<MemberEntry["role"], number> = { eb: 0, director: 1, ea: 2, staff: 3, general: 4 }

function byRoleThenName(a: MemberEntry, b: MemberEntry) {
  return ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName)
}

function levelOf(name: string): 0 | 1 {
  return name === GENERAL_GROUP || isExecutiveOfficeCommittee(name) ? 0 : 1
}

/**
 * Groups people by executive office or committee in organisation order (CEO to
 * CCO), each led by its EB member or director, with general members last.
 */
export function buildCommitteeGroups(entries: MemberEntry[]): CommitteeGroup[] {
  const byName = new Map<string, MemberEntry[]>()
  for (const entry of entries) {
    const name = entry.committee ?? GENERAL_GROUP
    byName.set(name, [...(byName.get(name) ?? []), entry])
  }
  return [...byName.entries()]
    .sort(([a], [b]) => {
      if (a === GENERAL_GROUP) return 1
      if (b === GENERAL_GROUP) return -1
      return compareCommitteeNames(a, b) || a.localeCompare(b)
    })
    .map(([name, people]) => {
      const sorted = [...people].sort(byRoleThenName)
      return {
        name,
        level: levelOf(name),
        leads: sorted.filter((person) => person.role === "eb" || person.role === "director"),
        members: sorted.filter((person) => person.role !== "eb" && person.role !== "director"),
        total: sorted.length,
      }
    })
}
