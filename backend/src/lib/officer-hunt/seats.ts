import { and, asc, eq, inArray, like } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  emailNotifications,
  officerSeats,
  positions,
} from "../../db/schema";
import { inviteToOpenCampaign } from "../membership/campaigns";
import {
  executiveOfficeCommittees,
  staffCommittees,
} from "../apply/committee-office-groups";
import { directorSeatTitles, executiveSeatTitles } from "../../db/officer-seeds";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type HuntSeatKind = "eb" | "director" | "ea";

export type OfficerHuntSeat = {
  id: string;
  kind: HuntSeatKind;
  title: string;
  committee: string;
  isOpen: boolean;
  openSlots: number;
};

const KIND_ORDER: Record<HuntSeatKind, number> = { eb: 0, ea: 1, director: 2 };

/**
 * Creates the hunt's seats as positions, so the apply form, interviews and
 * decisions treat them like any other position. One board seat per executive
 * office, one executive-assistant seat per R101 EA position, and one director
 * seat per staff committee. New seats start closed, and the call is safe to
 * repeat: seats that exist are left as HR set them.
 */
export async function ensureOfficerHuntSeats(): Promise<number> {
  const offices = executiveOfficeCommittees();
  const staff = staffCommittees();
  const rows = await db
    .select({ id: committees.id, name: committees.name })
    .from(committees)
    .where(inArray(committees.name, [...offices, ...staff]));
  const committeeId = new Map(rows.map((row) => [row.name, row.id]));
  if (committeeId.size === 0) return 0;

  const wanted: {
    committeeId: string;
    name: string;
    office: string | null;
    description: string | null;
    responsibilities: string | null;
    seatKind: HuntSeatKind;
    openSlots: number;
  }[] = [];
  const executiveTitles = executiveSeatTitles();
  offices.forEach((office, index) => {
    const id = committeeId.get(office);
    if (id) {
      wanted.push({
        committeeId: id,
        name: executiveTitles[index],
        office,
        description: null,
        responsibilities: null,
        seatKind: "eb",
        openSlots: 1,
      });
    }
  });
  const directorTitles = directorSeatTitles();
  staff.forEach((name, index) => {
    const id = committeeId.get(name);
    if (id) {
      wanted.push({
        committeeId: id,
        name: directorTitles[index],
        office: null,
        description: null,
        responsibilities: null,
        seatKind: "director",
        openSlots: 1,
      });
    }
  });
  const assistants = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.track, "r101"),
        like(positions.name, "Executive Assistant%"),
        inArray(positions.committeeId, [...offices.flatMap((office) => committeeId.get(office) ?? [])]),
      ),
    );
  for (const assistant of assistants) {
    wanted.push({
      committeeId: assistant.committeeId,
      name: assistant.name,
      office: assistant.office,
      description: assistant.description,
      responsibilities: assistant.responsibilities,
      seatKind: "ea",
      openSlots: 1,
    });
  }
  if (wanted.length === 0) return 0;

  const created = await db
    .insert(positions)
    .values(wanted.map((seat) => ({ ...seat, track: "officer_hunt" as const, isOpen: false })))
    .onConflictDoNothing({ target: [positions.committeeId, positions.name, positions.track] })
    .returning({ id: positions.id });
  return created.length;
}

export async function listOfficerHuntSeats(): Promise<OfficerHuntSeat[]> {
  const rows = await db
    .select({
      id: positions.id,
      kind: positions.seatKind,
      title: positions.name,
      committee: committees.name,
      isOpen: positions.isOpen,
      openSlots: positions.openSlots,
    })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(positions.track, "officer_hunt"))
    .orderBy(asc(committees.name), asc(positions.name));
  const offices = executiveOfficeCommittees();
  const staff = staffCommittees();
  const hierarchy = (committee: string) => {
    const office = offices.indexOf(committee);
    return office >= 0 ? office : offices.length + staff.indexOf(committee);
  };
  return rows
    .flatMap((row) => (row.kind && row.kind !== "adviser" ? [{ ...row, kind: row.kind }] : []))
    .sort(
      (a, b) =>
        hierarchy(a.committee) - hierarchy(b.committee) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
    );
}

export class OfficerHuntSeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficerHuntSeatError";
  }
}

/** Opens or closes a seat to applicants and sets how many people it takes. */
export async function updateOfficerHuntSeat(
  id: string,
  input: { isOpen?: boolean; openSlots?: number },
) {
  const [seat] = await db
    .select({ kind: positions.seatKind })
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.track, "officer_hunt")))
    .limit(1);
  if (!seat?.kind) throw new OfficerHuntSeatError("That seat was not found.");
  // A board or director seat has one holder; only executive assistants come in numbers.
  if (input.openSlots !== undefined && seat.kind !== "ea" && input.openSlots > 1) {
    throw new OfficerHuntSeatError("This seat has a single holder.");
  }
  const openSlots = input.openSlots;
  await db
    .update(positions)
    .set({
      ...(openSlots === undefined ? {} : { openSlots }),
      ...(input.isOpen === undefined ? {} : { isOpen: input.isOpen }),
    })
    .where(eq(positions.id, id));
}

/**
 * Turns an accepted hunt application into the officer it was for: a seat for
 * the position they won, with the application becoming an `officer` one so
 * sign-in, payment and the Member ID work exactly as for seeded officers.
 * Returns the seat's kind, or null if the position is not a hunt seat.
 */
export async function createOfficerSeatForApplication(
  tx: Tx,
  applicationId: string,
): Promise<HuntSeatKind | null> {
  const [won] = await tx
    .select({
      recruitmentYear: applications.recruitmentYear,
      kind: positions.seatKind,
      title: positions.name,
      committee: committees.name,
    })
    .from(applications)
    .innerJoin(positions, eq(applications.finalPositionId, positions.id))
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    .where(and(eq(applications.id, applicationId), eq(applications.track, "officer_hunt")))
    .limit(1);
  if (!won?.kind || won.kind === "adviser") return null;

  await tx.insert(officerSeats).values({
    applicationId,
    recruitmentYear: won.recruitmentYear,
    kind: won.kind,
    // The board and directors are one per seat; assistants share an office, so each gets their own key.
    seatKey: won.kind === "ea" ? `ea:${won.committee}:${applicationId}` : won.committee,
    title: won.title,
    committee: won.committee,
    sortOrder: 0,
  });
  await tx
    .update(applications)
    .set({ applicationType: "officer" })
    .where(eq(applications.id, applicationId));
  return won.kind;
}

/**
 * Seats an accepted hunt applicant and tells them: the welcome email, plus the
 * payment invitation when this year's payments are already open. Returns the
 * queued email ids, or null if their placement is not a hunt seat.
 */
export async function seatHuntWinner(tx: Tx, applicationId: string): Promise<string[] | null> {
  const kind = await createOfficerSeatForApplication(tx, applicationId);
  if (!kind) return null;
  const [applicant] = await tx
    .select({ email: applicants.email })
    .from(applications)
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  const [welcome] = await tx
    .insert(emailNotifications)
    .values({ applicationId, messageType: "officer_welcome", recipient: applicant.email })
    .returning({ id: emailNotifications.id });
  return [welcome.id, ...(await inviteToOpenCampaign(tx, [applicationId]))];
}
