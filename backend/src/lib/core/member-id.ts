import { and, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { applications, committees, positions } from "../../db/schema";
import {
  executiveOfficeCommittees,
  isExecutiveOfficeCommittee,
  staffCommittees,
} from "../apply/committee-office-groups";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | DbTransaction;

/** General members stop below the adviser block. */
const MAX_SEQUENCE = 8999;
const ADVISER_START = 9001;
const ADVISER_COUNT = 3;

/** Where a member sits in the hierarchy, which decides their Member ID block. */
export type MemberPlacement =
  | { kind: "eb"; officeCommittee: string }
  | { kind: "director"; committee: string }
  | { kind: "adviser"; index: number }
  | { kind: "ea"; officeCommittee: string }
  | { kind: "staff" }
  | { kind: "general" };

type Range = { start: number; end: number };

export type MemberIdLayout = {
  /** One fixed number per executive board seat, keyed by office committee. */
  ebSeats: Map<string, number>;
  eaRanges: Map<string, Range>;
  /** One fixed number per committee director, keyed by committee name. */
  directorSeats: Map<string, number>;
  staffRange: Range | null;
  generalStart: number;
};

/**
 * Lays out Member ID numbers by hierarchy:
 * executive board, executive associates (per office, sized by open slots),
 * directors, committee staff, then general members. Board and director
 * numbers are fixed by seat, so they never move.
 */
export function buildMemberIdLayout(input: {
  executiveOffices: string[];
  eaSlotsByOffice: Map<string, number>;
  directorCommittees: string[];
  staffHolds: number;
}): MemberIdLayout {
  const ebSeats = new Map(
    input.executiveOffices.map((office, index) => [office, index + 1] as const),
  );
  let next = input.executiveOffices.length + 1;
  const eaRanges = new Map<string, Range>();
  for (const office of input.executiveOffices) {
    const slots = input.eaSlotsByOffice.get(office) ?? 0;
    if (slots <= 0) continue;
    eaRanges.set(office, { start: next, end: next + slots - 1 });
    next += slots;
  }
  const directorSeats = new Map(
    input.directorCommittees.map((committee, index) => [committee, next + index] as const),
  );
  next += input.directorCommittees.length;
  const staffRange =
    input.staffHolds > 0
      ? { start: next, end: next + input.staffHolds - 1 }
      : null;
  next += Math.max(input.staffHolds, 0);
  return { ebSeats, eaRanges, directorSeats, staffRange, generalStart: next };
}

function firstFree(used: Set<number>, start: number, end: number) {
  for (let sequence = start; sequence <= end; sequence++) {
    if (!used.has(sequence)) return sequence;
  }
  return null;
}

/** A board, director or adviser seat whose fixed number is already held by someone else. */
export class MemberIdSeatTakenError extends Error {
  constructor(readonly sequence: number, label: string) {
    super(`Member ID seat for ${label} is already taken.`);
    this.name = "MemberIdSeatTakenError";
  }
}

function seatSequence(seat: number | undefined, used: Set<number>, label: string) {
  if (seat === undefined) throw new Error(`No Member ID seat for ${label}.`);
  if (used.has(seat)) throw new MemberIdSeatTakenError(seat, label);
  return seat;
}

/**
 * Picks the member's number: a fixed seat for the board, directors and
 * advisers, otherwise the first free number in their block, falling back to
 * the general pool.
 */
export function pickMemberSequence(
  layout: MemberIdLayout,
  used: Set<number>,
  placement: MemberPlacement,
): number {
  if (placement.kind === "eb") {
    return seatSequence(layout.ebSeats.get(placement.officeCommittee), used, placement.officeCommittee);
  }
  if (placement.kind === "director") {
    return seatSequence(layout.directorSeats.get(placement.committee), used, placement.committee);
  }
  if (placement.kind === "adviser") {
    if (placement.index < 0 || placement.index >= ADVISER_COUNT) {
      throw new Error("Only three adviser Member IDs are reserved.");
    }
    return seatSequence(ADVISER_START + placement.index, used, `adviser ${placement.index + 1}`);
  }
  const range =
    placement.kind === "ea"
      ? layout.eaRanges.get(placement.officeCommittee)
      : placement.kind === "staff"
        ? layout.staffRange
        : null;
  const reserved = range ? firstFree(used, range.start, range.end) : null;
  if (reserved !== null) return reserved;
  const general = firstFree(used, layout.generalStart, MAX_SEQUENCE);
  if (general === null) throw new Error("Member ID capacity reached.");
  return general;
}

/**
 * The academic-year code in a Member ID: the last two digits of the year the
 * term starts and of the year it ends, so recruitment year 2026 (A.Y.
 * 2026-2027) is "2627".
 */
export function academicYearCode(recruitmentYear: number): string {
  const twoDigits = (year: number) => String(year % 100).padStart(2, "0");
  return `${twoDigits(recruitmentYear)}${twoDigits(recruitmentYear + 1)}`;
}

/**
 * The sequence number of an issued ID. IDs issued before the academic-year
 * format (AWS-<recruitment year>-NNNN) are still read, so their numbers stay
 * taken and are never handed out again.
 */
function memberSequence(memberId: string | null, recruitmentYear: number) {
  const prefixes = [academicYearCode(recruitmentYear), String(recruitmentYear)];
  const match = memberId?.match(/^AWS-(\d{4})-(\d{4})$/);
  return match && prefixes.includes(match[1]) ? Number(match[2]) : null;
}

export function formatMemberId(recruitmentYear: number, sequence: number): string {
  if (sequence > 9999) {
    throw new Error(`Member ID capacity reached for ${recruitmentYear}.`);
  }
  return `AWS-${academicYearCode(recruitmentYear)}-${String(sequence).padStart(4, "0")}`;
}

/** Open EA slots per executive office; each office's EA block is sized from these. */
async function eaSlotsByOffice(transaction: DbExecutor) {
  const rows = await transaction
    .select({ committee: committees.name, slots: sql<number>`sum(${positions.openSlots})::int` })
    .from(positions)
    .innerJoin(committees, eq(positions.committeeId, committees.id))
    // Officer-hunt seats are filled out of the same block, not added to it.
    .where(eq(positions.track, "r101"))
    .groupBy(committees.name);
  return new Map(
    rows
      .filter((row) => isExecutiveOfficeCommittee(row.committee))
      .map((row) => [row.committee, row.slots] as const),
  );
}

/** Accepted staff placements plus pending staff redirect offers, which might still be accepted. */
async function countStaffHolds(transaction: DbExecutor, recruitmentYear: number) {
  const finalPosition = alias(positions, "final_position");
  const finalCommittee = alias(committees, "final_committee");
  const redirectPosition = alias(positions, "redirect_position");
  const redirectCommittee = alias(committees, "redirect_committee");
  const rows = await transaction
    .select({
      status: applications.status,
      redirectResponse: applications.redirectResponse,
      finalCommittee: finalCommittee.name,
      redirectCommittee: redirectCommittee.name,
    })
    .from(applications)
    .leftJoin(finalPosition, eq(applications.finalPositionId, finalPosition.id))
    .leftJoin(finalCommittee, eq(finalPosition.committeeId, finalCommittee.id))
    .leftJoin(redirectPosition, eq(applications.redirectPositionId, redirectPosition.id))
    .leftJoin(redirectCommittee, eq(redirectPosition.committeeId, redirectCommittee.id))
    .where(
      and(
        eq(applications.recruitmentYear, recruitmentYear),
        eq(applications.applicationType, "position"),
        eq(applications.track, "r101"),
        isNull(applications.archivedAt),
      ),
    );

  let staffHolds = 0;
  for (const row of rows) {
    const committee =
      row.status === "approved" && row.finalCommittee
        ? row.finalCommittee
        : row.redirectCommittee && row.redirectResponse === null
          ? row.redirectCommittee
          : null;
    if (committee && !isExecutiveOfficeCommittee(committee)) staffHolds += 1;
  }
  return staffHolds;
}

async function loadLayout(executor: DbExecutor, recruitmentYear: number) {
  return buildMemberIdLayout({
    executiveOffices: executiveOfficeCommittees(),
    eaSlotsByOffice: await eaSlotsByOffice(executor),
    directorCommittees: staffCommittees(),
    staffHolds: await countStaffHolds(executor, recruitmentYear),
  });
}

/**
 * The Member ID a board seat or director seat will get once they pay. Seat
 * numbers never move, so this is the same number allocation will issue later.
 */
export async function reservedSeatMemberId(
  executor: DbExecutor,
  recruitmentYear: number,
  placement: Extract<MemberPlacement, { kind: "eb" | "director" | "adviser" }>,
): Promise<string> {
  const layout = await loadLayout(executor, recruitmentYear);
  return formatMemberId(
    recruitmentYear,
    pickMemberSequence(layout, new Set(), placement),
  );
}

/** Reserved Member IDs for many seats at once, loading the layout a single time. */
export async function reservedSeatMemberIds(
  executor: DbExecutor,
  recruitmentYear: number,
  placements: Extract<MemberPlacement, { kind: "eb" | "director" | "adviser" }>[],
): Promise<string[]> {
  const layout = await loadLayout(executor, recruitmentYear);
  return placements.map((placement) =>
    formatMemberId(recruitmentYear, pickMemberSequence(layout, new Set(), placement)),
  );
}

export async function allocateMemberId(
  transaction: DbTransaction,
  recruitmentYear: number,
  placement: MemberPlacement,
): Promise<string> {
  await transaction.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`aws-members-${recruitmentYear}`}))`,
  );
  const memberRows = await transaction
    .select({ memberId: applications.memberId })
    .from(applications)
    .where(eq(applications.recruitmentYear, recruitmentYear));
  const used = new Set(
    memberRows
      .map((row) => memberSequence(row.memberId, recruitmentYear))
      .filter((sequence): sequence is number => sequence !== null),
  );
  const layout = await loadLayout(transaction, recruitmentYear);
  return formatMemberId(
    recruitmentYear,
    pickMemberSequence(layout, used, placement),
  );
}
