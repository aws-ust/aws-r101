/** Recruitment headcount shown on the positions browser ("N spots available"). */
const POSITION_OPEN_SLOTS: Partial<Record<string, number>> = {
  "Executive Assistant to the CEO": 2,
  "Executive Assistant to the COO": 2,
  "Executive Assistant to the CTO": 2,
  "Executive Assistant to the CRO": 2,
  "Secretariat Committee Staff": 8,
  "Community Development Committee Staff": 7,
  "Logistics Committee Staff": 7,
  "External Affairs Committee Staff": 5,
  "Sponsorship Committee Staff": 5,
  "Marketing Committee Staff": 5,
  "Finance Committee Staff": 5,
  "Human Resources Committee Staff": 5,
  "Development Committee Staff": 4,
  "Technicals Committee Staff": 7,
  "Publicity Committee Staff": 10,
  "Media Committee Staff": 10,
  "Documentation Committee Staff": 4,
}

export function resolvePositionOpenSlots(positionName: string): number {
  const explicit = POSITION_OPEN_SLOTS[positionName]
  if (explicit !== undefined) return explicit
  if (positionName.startsWith("Executive Assistant")) return 1
  return 4
}
