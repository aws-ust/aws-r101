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

const MAX_SEQUENCE = 9999;

/** Where a member sits in the hierarchy, which decides their Member ID block. */
export type MemberPlacement =
  | { kind: "ea"; officeCommittee: string }
  | { kind: "staff" }
  | { kind: "general" };

type Range = { start: number; end: number };

export type MemberIdLayout = {
  eaRanges: Map<string, Range>;
  staffRange: Range | null;
  generalStart: number;
};

/**
 * Lays out Member ID numbers by hierarchy:
 * executive board, executive associates (per office, in order), directors,
 * committee staff, then general members. Every block is sized from real
 * counts, so offices that accepted nobody take no numbers.
 */
export function buildMemberIdLayout(input: {
  executiveOffices: string[];
  eaHoldsByOffice: Map<string, number>;
  directorCount: number;
  staffHolds: number;
}): MemberIdLayout {
  let next = input.executiveOffices.length + 1;
  const eaRanges = new Map<string, Range>();
  for (const office of input.executiveOffices) {
    const holds = input.eaHoldsByOffice.get(office) ?? 0;
    if (holds <= 0) continue;
    eaRanges.set(office, { start: next, end: next + holds - 1 });
    next += holds;
  }
  next += input.directorCount;
  const staffRange =
    input.staffHolds > 0
      ? { start: next, end: next + input.staffHolds - 1 }
      : null;
  next += Math.max(input.staffHolds, 0);
  return { eaRanges, staffRange, generalStart: next };
}

function firstFree(used: Set<number>, start: number, end: number) {
  for (let sequence = start; sequence <= end; sequence++) {
    if (!used.has(sequence)) return sequence;
  }
  return null;
}

/** Picks the first free number in the member's block, falling back to the general pool. */
export function pickMemberSequence(
  layout: MemberIdLayout,
  used: Set<number>,
  placement: MemberPlacement,
): number {
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
  if (sequence > MAX_SEQUENCE) {
    throw new Error(`Member ID capacity reached for ${recruitmentYear}.`);
  }
  return `AWS-${academicYearCode(recruitmentYear)}-${String(sequence).padStart(4, "0")}`;
}

/** Accepted placements plus pending redirect offers, which might still be accepted. */
async function countHolds(transaction: DbTransaction, recruitmentYear: number) {
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
        isNull(applications.archivedAt),
      ),
    );

  const eaHoldsByOffice = new Map<string, number>();
  let staffHolds = 0;
  for (const row of rows) {
    const committee =
      row.status === "approved" && row.finalCommittee
        ? row.finalCommittee
        : row.redirectCommittee && row.redirectResponse === null
          ? row.redirectCommittee
          : null;
    if (!committee) continue;
    if (isExecutiveOfficeCommittee(committee)) {
      eaHoldsByOffice.set(committee, (eaHoldsByOffice.get(committee) ?? 0) + 1);
    } else {
      staffHolds += 1;
    }
  }
  return { eaHoldsByOffice, staffHolds };
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
  const holds = await countHolds(transaction, recruitmentYear);
  const layout = buildMemberIdLayout({
    executiveOffices: executiveOfficeCommittees(),
    eaHoldsByOffice: holds.eaHoldsByOffice,
    directorCount: staffCommittees().length,
    staffHolds: holds.staffHolds,
  });
  return formatMemberId(
    recruitmentYear,
    pickMemberSequence(layout, used, placement),
  );
}
