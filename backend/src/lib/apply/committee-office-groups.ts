/** Office headers and committee names aligned with seeded position data. */
const COMMITTEE_OFFICE_GROUPS: { office: string; committees: readonly string[] }[] =
  [
    {
      office: "Chief Executive Officer",
      committees: ["Office of the Chief Executive Officer"],
    },
    {
      office: "Chief Operating Officer",
      committees: [
        "Office of the Chief Operating Officer",
        "Logistics Committee",
        "Community Development Committee",
      ],
    },
    {
      office: "Chief Relations Officer",
      committees: [
        "Office of the Chief Relations Officer",
        "Sponsorship Committee",
        "Marketing Committee",
        "External Affairs Committee",
      ],
    },
    {
      office: "Corporate Secretary",
      committees: [
        "Office of the Corporate Secretary",
        "Secretariat Committee",
      ],
    },
    {
      office: "Chief Technology Officer",
      committees: [
        "Office of the Chief Technology Officer",
        "Technicals Committee",
        "Development Committee",
      ],
    },
    {
      office: "Chief Finance Officer",
      committees: ["Office of the Chief Finance Officer", "Finance Committee"],
    },
    {
      office: "Chief Human Resources Officer",
      committees: [
        "Office of the Chief Human Resources Officer",
        "Human Resources Committee",
      ],
    },
    {
      office: "Chief Creatives Officer",
      committees: [
        "Office of the Chief Creative Officer",
        "Documentation Committee",
        "Media Committee",
        "Publicity Committee",
      ],
    },
  ];

/** Executive board lookup key in `officer-recipients.ts` for a committee or office. */
export function executiveBoardCommitteeKey(committee: string): string | null {
  if (committee.startsWith("Office of the ")) {
    return committee;
  }
  for (const group of COMMITTEE_OFFICE_GROUPS) {
    if (group.committees.includes(committee)) {
      const officeCommittee = group.committees.find((name) =>
        name.startsWith("Office of the "),
      );
      return officeCommittee ?? null;
    }
  }
  return null;
}

export function officeLabelForCommittee(committee: string): string {
  if (committee.startsWith("Office of the ")) {
    return committee.replace(/^Office of the /, "");
  }
  return (
    COMMITTEE_OFFICE_GROUPS.find((group) => group.committees.includes(committee))
      ?.office ?? committee
  );
}

const OFFICE_PREFIX = "Office of the ";

export function isExecutiveOfficeCommittee(committee: string): boolean {
  return committee.startsWith(OFFICE_PREFIX);
}

/** "Office of the ..." committees in hierarchy order (CEO -> CCO), one per executive board seat. */
export function executiveOfficeCommittees(): string[] {
  return COMMITTEE_OFFICE_GROUPS.flatMap((group) =>
    group.committees.filter(isExecutiveOfficeCommittee),
  );
}

/** Staff committees in hierarchy order, one per committee director. */
export function staffCommittees(): string[] {
  return COMMITTEE_OFFICE_GROUPS.flatMap((group) =>
    group.committees.filter((committee) => !isExecutiveOfficeCommittee(committee)),
  );
}
