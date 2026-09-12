export const PERSON_AVATAR_PLACEHOLDER = "/people/person-placeholder.png"

import { staffCommitteeSeedNamesInOrgOrder } from "@/lib/committee-groups"

export type PersonTerm = {
  name: string
  title: string
  academicYear: string
  photo?: string
}

export type OfficerSeat = {
  id: string
  rank: number
  current: PersonTerm
  previous: PersonTerm
}

export type DirectorSeat = {
  id: string
  rank: number
  current: PersonTerm
}

const CURRENT_AY = "AY 2026-2027"
const PREVIOUS_AY = "AY 2025-2026"

/** Photos in `public/people/current-ebs/` keyed by `OfficerSeat.id`. */
const CURRENT_EB_PHOTOS: Partial<Record<string, string>> = {
  ceo: "/people/current-ebs/CEO_Padua.JPG",
  coo: "/people/current-ebs/COO_Axalan.jpg",
  cro: "/people/current-ebs/CRO_Olmedo.jpg",
  "corp-sec": "/people/current-ebs/SEC_Muñoz.jpg",
  cfo: "/people/current-ebs/CFO_So.jpg",
  cco: "/people/current-ebs/CCO_Escosia.png",
}

/** Outgoing EB photos in `public/people/previous-ebs/` keyed by `OfficerSeat.id`. */
const PREVIOUS_EB_PHOTOS: Partial<Record<string, string>> = {
  ceo: "/people/previous-ebs/CEO_Viray.JPG",
  chro: "/people/previous-ebs/CHRO_To.png",
  "corp-sec": "/people/previous-ebs/Sec_Elleazar.JPG",
}

/** Committee director photos in `public/people/directors/` keyed by seeded committee name. */
const DIRECTOR_PHOTOS_BY_COMMITTEE: Partial<Record<string, string>> = {
  "Marketing Committee": "/people/directors/Marketing_Lopez.jpg",
}

/** Matches office order in `committee-groups.ts` (CEO → COO → CRO → …). */
function officer(
  rank: number,
  id: string,
  name: string,
  title: string,
  previousName: string,
): OfficerSeat {
  return {
    id,
    rank,
    current: {
      name,
      title,
      academicYear: CURRENT_AY,
      photo: CURRENT_EB_PHOTOS[id],
    },
    previous: {
      name: previousName,
      title,
      academicYear: PREVIOUS_AY,
      photo: PREVIOUS_EB_PHOTOS[id],
    },
  }
}

export const EXECUTIVE_BOARD: OfficerSeat[] = [
  officer(1, "ceo", "Sydney Padua", "Chief Executive Officer", "Josh Kenn Viray"),
  officer(2, "coo", "Marc Axalan", "Chief Operating Officer", "Marc Axalan"),
  officer(
    3,
    "cro",
    "Alden Olmedo",
    "Chief Relations Officer",
    "Leigh Andrei Sigua",
  ),
  officer(
    4,
    "corp-sec",
    "Hannah Muñoz",
    "Corporate Secretary",
    "Jan Vincent Elleazar",
  ),
  officer(5, "cto", "Neil Casas", "Chief Technology Officer", "Lance Owen Gulinao"),
  officer(6, "cfo", "Kyan So", "Chief Finance Officer", "Alexa Palanog"),
  officer(7, "chro", "Claire Abas", "Chief Human Resource Officer", "Denzel To"),
  officer(
    8,
    "cco",
    "Lyka Escosia",
    "Chief Creative Officer",
    "Sydney Padua",
  ),
].sort((a, b) => a.rank - b.rank)

const COMMITTEE_DIRECTOR_BY_COMMITTEE: Record<
  string,
  { title: string; name: string }
> = {
  "Logistics Committee": {
    title: "Logistics Committee Director",
    name: "Jaren Maxene Ladia",
  },
  "Community Development Committee": {
    title: "Community Development Committee Director",
    name: "Christian Gabriel Mariveles",
  },
  "Sponsorship Committee": {
    title: "Sponsorships Committee Director",
    name: "Antionio Axellance III Paco",
  },
  "Marketing Committee": {
    title: "Marketing Committee Director",
    name: "John Benedict Lopez",
  },
  "External Affairs Committee": {
    title: "External Affairs Committee Director",
    name: "Nicole Alcantara",
  },
  "Secretariat Committee": {
    title: "Secretariat Committee Director",
    name: "Angeline Alby de Mesa",
  },
  "Technicals Committee": {
    title: "Technical Committee Director",
    name: "Pete Andrei Lapuebla",
  },
  "Development Committee": {
    title: "Development Committee Director",
    name: "Juan Marcus Ferrer",
  },
  "Finance Committee": {
    title: "Finance Committee Director",
    name: "Paulyn Gamban",
  },
  "Human Resources Committee": {
    title: "Human Resources Committee Director",
    name: "Lorraine Alexandra Tamondong",
  },
  "Documentation Committee": {
    title: "Documentation Committee Director",
    name: "Aldrhey Jave Agsunod",
  },
  "Media Committee": {
    title: "Media Committee Director",
    name: "Zander Belen Estuista",
  },
  "Publicity Committee": {
    title: "Publication Committee Director",
    name: "Elleinrich Jarina",
  },
}

export const COMMITTEE_DIRECTORS: DirectorSeat[] =
  staffCommitteeSeedNamesInOrgOrder().map((committee, index) => {
    const seat = COMMITTEE_DIRECTOR_BY_COMMITTEE[committee]
    if (!seat) {
      throw new Error(`Missing committee director for "${committee}"`)
    }
    return {
      id: `director-${index + 1}`,
      rank: index + 1,
      current: {
        name: seat.name,
        title: seat.title,
        academicYear: CURRENT_AY,
        photo: DIRECTOR_PHOTOS_BY_COMMITTEE[committee],
      },
    }
  })
