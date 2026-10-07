import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  membershipPayments,
  positions,
} from "../../db/schema";
import { memberPositionLabel } from "./member-position";

export const MEMBER_ID_PATTERN = /^AWS-\d{4}-\d{4}$/;

export type MemberVerification = {
  memberId: string;
  fullName: string;
  position: string;
  academicYear: string;
  status: "active" | "inactive";
};

/**
 * Public lookup behind the QR on a member ID. Only returns what is printed on
 * the card's face (no student number, email or photo), plus whether the
 * membership is currently active.
 */
export async function verifyMember(memberId: string): Promise<MemberVerification | null> {
  const [row] = await db
    .select({
      memberId: applications.memberId,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
      recruitmentYear: applications.recruitmentYear,
      applicationType: applications.applicationType,
      applicationStatus: applications.status,
      archivedAt: applications.archivedAt,
      positionName: positions.name,
      committeeName: committees.name,
      paymentStatus: membershipPayments.status,
      membershipStatus: membershipPayments.membershipStatus,
    })
    .from(applications)
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .leftJoin(membershipPayments, eq(membershipPayments.applicationId, applications.id))
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(eq(applications.memberId, memberId))
    .limit(1);
  if (!row?.memberId) return null;

  const active =
    row.paymentStatus === "verified" &&
    row.membershipStatus === "active" &&
    row.archivedAt === null;
  return {
    memberId: row.memberId,
    fullName: `${row.firstName} ${row.lastName}`,
    position: memberPositionLabel(row),
    academicYear: `${row.recruitmentYear}-${row.recruitmentYear + 1}`,
    status: active ? "active" : "inactive",
  };
}
