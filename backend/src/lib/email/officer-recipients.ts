export type OfficerRecipient = {
  lastName: string;
  email: string;
};

/** Keys must match `committee` on seeded positions in `position-seeds.ts`. */
const OFFICER_BY_COMMITTEE: Record<string, OfficerRecipient> = {
  "Office of the Chief Executive Officer": {
    lastName: "Padua",
    email: "sydneyalison.padua.cics@ust.edu.ph",
  },
  "Office of the Chief Operating Officer": {
    lastName: "Axalan",
    email: "marcellis.axalan.cics@ust.edu.ph",
  },
  "Office of the Chief Relations Officer": {
    lastName: "Olmedo",
    email: "aldenalexander.olmedo.cics@ust.edu.ph",
  },
  "Office of the Corporate Secretary": {
    lastName: "Muñoz",
    email: "hannah.munoz.cics@ust.edu.ph",
  },
  "Office of the Chief Technology Officer": {
    lastName: "Casas",
    email: "neilalfonz.casas.cics@ust.edu.ph",
  },
  "Office of the Chief Finance Officer": {
    lastName: "So",
    email: "kyancharles.so.cics@ust.edu.ph",
  },
  "Office of the Chief Human Resources Officer": {
    lastName: "Abas",
    email: "claireantonette.abas.cics@ust.edu.ph",
  },
  "Office of the Chief Creative Officer": {
    lastName: "Escosia",
    email: "lykanicole.escosia.cics@ust.edu.ph",
  },
  "Marketing Committee": {
    lastName: "Lopez",
    email: "johnbenedict.lopez.cics@ust.edu.ph",
  },
  "Sponsorship Committee": {
    lastName: "Paco",
    email: "antonioaxellance.paco@ust.edu.ph",
  },
  "External Affairs Committee": {
    lastName: "Alcantara",
    email: "nicole.alcantara.cics@ust.edu.ph",
  },
  "Logistics Committee": {
    lastName: "Ladia",
    email: "jarenmaxene.ladia@ust.edu.ph",
  },
  "Secretariat Committee": {
    lastName: "de Mesa",
    email: "angelinealby.demesa@ust.edu.ph",
  },
  "Finance Committee": {
    lastName: "Gamban",
    email: "paulyn.gamban@ust.edu.ph",
  },
  "Community Development Committee": {
    lastName: "Mariveles",
    email: "christiangabriel.mariveles.cics@ust.edu.ph",
  },
  "Human Resources Committee": {
    lastName: "Tamondong",
    email: "lorrainealexandra.tamondong@ust.edu.ph",
  },
  "Technicals Committee": {
    lastName: "Lapuebla",
    email: "peteandrei.lapuebla@ust.edu.ph",
  },
  "Media Committee": {
    lastName: "Estuista",
    email: "allenzander.estuista@ust.edu.ph",
  },
  "Publicity Committee": {
    lastName: "Jarina",
    email: "elleinrich.jarina.cics@ust.edu.ph",
  },
  "Documentation Committee": {
    lastName: "Agsunod",
    email: "aldrheyjave.agsunod.cics@ust.edu.ph",
  },
  "Development Committee": {
    lastName: "Ferrer",
    email: "juanmarcus.ferrer.cics@ust.edu.ph",
  },
};

export function lookupOfficerRecipient(
  committee: string,
): OfficerRecipient | null {
  return OFFICER_BY_COMMITTEE[committee] ?? null;
}

export function isExecutiveOfficeCommittee(committee: string): boolean {
  return committee.startsWith("Office of the ");
}
