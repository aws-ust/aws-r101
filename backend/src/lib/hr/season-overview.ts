import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  applications,
  interviewBookings,
  membershipPaymentCampaigns,
  membershipPayments,
} from "../../db/schema";
import { recruitmentYearInt } from "../applications/application-code";
import { outboxStatus, RESULT_MESSAGE_TYPES } from "../email/outbox";

/**
 * Where the recruitment season stands. Each stage is a running total of
 * current-year, non-archived applications that have reached that point, so a
 * count always equals the list it links to.
 */
export type SeasonStages = {
  applied: number;
  /** Position applicants with a booked interview. */
  interviewBooked: number;
  /** Applications no longer waiting on a committee decision (status is not pending). */
  decided: number;
  released: number;
  /** Payment submitted: waiting for verification, or already verified. */
  paymentSent: number;
  /** Verified, active members. */
  member: number;
};

export type SeasonAttention = {
  /** Applications still waiting on a committee decision (the list's "Pending" filter). */
  undecided: number;
  /** Decisions are done but results have not been released yet. */
  readyToRelease: number;
  /** Result emails that failed or may not have been delivered. */
  emailProblems: number;
  /** Result emails still queued or sending. */
  emailsInFlight: number;
  /** Membership payments waiting for an officer to verify. */
  paymentsToVerify: number;
};

export type SeasonOverview = {
  recruitmentYear: number;
  stages: SeasonStages;
  attention: SeasonAttention;
};

async function countApplications(year: number) {
  const [row] = await db
    .select({
      applied: sql<number>`count(*)::int`,
      undecided: sql<number>`count(*) filter (where ${applications.status} = 'pending')::int`,
      released: sql<number>`count(*) filter (where ${applications.resultsReleasedAt} is not null)::int`,
      unreleasedDecided: sql<number>`count(*) filter (where ${applications.status} <> 'pending' and ${applications.resultsReleasedAt} is null)::int`,
    })
    .from(applications)
    .where(and(eq(applications.recruitmentYear, year), isNull(applications.archivedAt)));
  return row;
}

async function countInterviews(year: number) {
  const [row] = await db
    .select({ booked: sql<number>`count(*)::int` })
    .from(interviewBookings)
    .innerJoin(applications, eq(interviewBookings.applicationId, applications.id))
    .where(
      and(
        eq(applications.recruitmentYear, year),
        eq(applications.applicationType, "position"),
        isNull(applications.archivedAt),
      ),
    );
  return row.booked;
}

async function countPayments(year: number) {
  const [row] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${membershipPayments.status} in ('pending_verification', 'verified'))::int`,
      toVerify: sql<number>`count(*) filter (where ${membershipPayments.status} = 'pending_verification')::int`,
      members: sql<number>`count(*) filter (where ${membershipPayments.status} = 'verified' and ${membershipPayments.membershipStatus} = 'active')::int`,
    })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(
      membershipPaymentCampaigns,
      eq(membershipPayments.campaignId, membershipPaymentCampaigns.id),
    )
    .where(
      and(
        eq(membershipPaymentCampaigns.recruitmentYear, year),
        isNull(applications.archivedAt),
        inArray(membershipPayments.status, ["pending_verification", "verified"]),
      ),
    );
  return row;
}

export async function getSeasonOverview(): Promise<SeasonOverview> {
  const year = recruitmentYearInt();
  const [apps, interviewBooked, payments, email] = await Promise.all([
    countApplications(year),
    countInterviews(year),
    countPayments(year),
    outboxStatus({ messageTypes: RESULT_MESSAGE_TYPES, recruitmentYear: year }),
  ]);

  return {
    recruitmentYear: year,
    stages: {
      applied: apps.applied,
      interviewBooked,
      decided: apps.applied - apps.undecided,
      released: apps.released,
      paymentSent: payments.sent,
      member: payments.members,
    },
    attention: {
      undecided: apps.undecided,
      readyToRelease: apps.unreleasedDecided,
      emailProblems: email.failed + email.uncertain,
      emailsInFlight: email.queued + email.sending,
      paymentsToVerify: payments.toVerify,
    },
  };
}
