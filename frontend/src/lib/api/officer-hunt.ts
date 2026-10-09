import { apiFetch, type RecruitmentWindow } from "@/lib/api/client"

/** The officer hunt's own calendar, as HR saves it. Dates are ISO timestamps. */
export type OfficerHuntSettings = {
  termYear: number | null
  applicationsOpenAt: string | null
  applicationsCloseAt: string | null
  interviewsStartAt: string | null
  interviewsEndAt: string | null
}

export type OfficerHuntSeatKind = "eb" | "director" | "ea"

export type OfficerHuntSeat = {
  id: string
  kind: OfficerHuntSeatKind
  title: string
  committee: string
  isOpen: boolean
  openSlots: number
}

/** Public: whether people can apply right now, and for which term. */
export function getOfficerHuntStatus() {
  return apiFetch<{ termYear: number | null; season: RecruitmentWindow }>("/officer-hunt/status")
}

export function getOfficerHuntSettings() {
  return apiFetch<OfficerHuntSettings>("/officer-hunt/settings")
}

export function saveOfficerHuntSettings(body: OfficerHuntSettings & { termYear: number }) {
  return apiFetch<OfficerHuntSettings>("/officer-hunt/settings", {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function listOfficerHuntSeats() {
  return apiFetch<OfficerHuntSeat[]>("/officer-hunt/seats")
}

/** Opens or closes a seat, or sets how many people it takes. Returns every seat. */
export function patchOfficerHuntSeat(id: string, body: { isOpen?: boolean; openSlots?: number }) {
  return apiFetch<OfficerHuntSeat[]>(`/officer-hunt/seats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}
