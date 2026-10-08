import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  emailNotifications,
  officerSeats,
} from "../../db/schema";
import { reservedSeatMemberId } from "../core/member-id";
import type { ClaimedNotification, PreparedEmail } from "../email/outbox";
import { renderOfficerWelcome } from "../email/service";

/** Renders the queued welcome email for an elected officer, with their reserved Member ID. */
export async function prepareOfficerWelcome(
  notification: ClaimedNotification,
): Promise<PreparedEmail> {
  const [row] = await db
    .select({
      lastName: applicants.lastName,
      applicationCode: applications.applicationCode,
      recruitmentYear: applications.recruitmentYear,
      memberId: applications.memberId,
      kind: officerSeats.kind,
      committee: officerSeats.committee,
      title: officerSeats.title,
    })
    .from(emailNotifications)
    .innerJoin(applications, eq(emailNotifications.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .innerJoin(officerSeats, eq(officerSeats.applicationId, applications.id))
    .where(eq(emailNotifications.id, notification.id))
    .limit(1);
  if (!row) return { kind: "invalid", error: "Officer seat for this email was not found." };
  if (row.kind === "adviser" || !row.committee) {
    return { kind: "invalid", error: "Only the board and directors get this email." };
  }
  const memberId =
    row.memberId ??
    (await reservedSeatMemberId(
      db,
      row.recruitmentYear,
      row.kind === "eb"
        ? { kind: "eb", officeCommittee: row.committee }
        : { kind: "director", committee: row.committee },
    ));
  return {
    kind: "ready",
    rendered: renderOfficerWelcome({
      lastName: row.lastName,
      title: row.title,
      memberId,
      applicationCode: row.applicationCode,
    }),
  };
}
