import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  committees,
  membershipPaymentCampaigns,
  membershipPayments,
  positions,
} from "../../db/schema";
import { recruitmentYearInt } from "../applications/application-code";
import { isExecutiveOfficeCommittee } from "../apply/committee-office-groups";
import { memberPositionLabel } from "./member-position";

/** Where a verified member sits: an executive associate, committee staff, or a general member. */
export type MemberRole = "ea" | "staff" | "general";

export type DirectoryMember = {
  memberId: string;
  fullName: string;
  studentNumber: string | null;
  section: string | null;
  role: MemberRole;
  position: string;
  committee: string | null;
  verifiedAt: string | null;
};

/** Everyone whose membership is verified and active for the current recruitment year. */
export async function listDirectoryMembers(): Promise<DirectoryMember[]> {
  const rows = await db
    .select({
      memberId: applications.memberId,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
      studentNumber: applicants.studentNumber,
      section: applicants.section,
      applicationType: applications.applicationType,
      applicationStatus: applications.status,
      positionName: positions.name,
      committeeName: committees.name,
      verifiedAt: membershipPayments.verifiedAt,
    })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .leftJoin(positions, eq(applications.finalPositionId, positions.id))
    .leftJoin(committees, eq(positions.committeeId, committees.id))
    .where(
      and(
        eq(membershipPaymentCampaigns.recruitmentYear, recruitmentYearInt()),
        eq(membershipPayments.status, "verified"),
        eq(membershipPayments.membershipStatus, "active"),
        isNull(applications.archivedAt),
      ),
    )
    .orderBy(applications.memberId);

  return rows.flatMap((row) => {
    if (!row.memberId) return [];
    const position = memberPositionLabel(row);
    const inCommittee = position !== "General Member";
    const role: MemberRole = !inCommittee
      ? "general"
      : row.committeeName && isExecutiveOfficeCommittee(row.committeeName)
        ? "ea"
        : "staff";
    return [
      {
        memberId: row.memberId,
        fullName: `${row.firstName} ${row.lastName}`,
        studentNumber: row.studentNumber,
        section: row.section,
        role,
        position,
        committee: inCommittee ? row.committeeName : null,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
      },
    ];
  });
}
