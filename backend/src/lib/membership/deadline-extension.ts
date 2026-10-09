import { and, eq, inArray, isNotNull, isNull, lt, notInArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  emailNotifications,
  membershipPaymentSubmissions,
  membershipPayments,
} from "../../db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Statuses that still owe a payment; verified and under-review payments are left out. */
const OWING_STATUSES = ["awaiting_payment", "needs_resubmission"] as const;

/**
 * When HR moves the payment deadline later: reopens payments that expired only
 * because of the old date, then queues one "deadline extended" email for
 * everyone who still owes a payment. People who paid, or whose receipt is
 * under review, hear nothing. Returns the queued notification ids.
 */
export async function extendPaymentDeadline(
  tx: Tx,
  campaignId: string,
  newDeadline: Date,
): Promise<string[]> {
  // Someone whose receipt was rejected or reversed goes back to resubmitting; everyone else to paying.
  await tx
    .update(membershipPayments)
    .set({
      status: sql`case when exists (
        select 1 from ${membershipPaymentSubmissions}
        where ${membershipPaymentSubmissions.paymentId} = ${membershipPayments.id}
          and ${membershipPaymentSubmissions.status} in ('rejected', 'reversed')
      ) then 'needs_resubmission'::membership_payment_status else 'awaiting_payment'::membership_payment_status end`,
      updatedAt: new Date(),
    })
    .where(and(eq(membershipPayments.campaignId, campaignId), eq(membershipPayments.status, "expired")));

  // A resubmission deadline that the new date overtakes would still lock the applicant out.
  await tx
    .update(membershipPayments)
    .set({ resubmissionDeadlineAt: newDeadline, updatedAt: new Date() })
    .where(
      and(
        eq(membershipPayments.campaignId, campaignId),
        eq(membershipPayments.status, "needs_resubmission"),
        isNotNull(membershipPayments.resubmissionDeadlineAt),
        lt(membershipPayments.resubmissionDeadlineAt, newDeadline),
      ),
    );

  const owing = await tx
    .select({ applicationId: applications.id, recipient: applicants.email })
    .from(membershipPayments)
    .innerJoin(applications, eq(membershipPayments.applicationId, applications.id))
    .innerJoin(applicants, eq(applications.applicantId, applicants.id))
    .where(
      and(
        eq(membershipPayments.campaignId, campaignId),
        inArray(membershipPayments.status, [...OWING_STATUSES]),
        isNull(applications.archivedAt),
        // Saving twice in a row must not email the same person twice.
        notInArray(
          applications.id,
          tx
            .select({ id: emailNotifications.applicationId })
            .from(emailNotifications)
            .where(
              and(
                eq(emailNotifications.messageType, "payment_deadline_extended"),
                inArray(emailNotifications.status, ["pending", "sending"]),
                isNotNull(emailNotifications.applicationId),
              ),
            ),
        ),
      ),
    );
  if (owing.length === 0) return [];

  const queued = await tx
    .insert(emailNotifications)
    .values(
      owing.map((row) => ({
        applicationId: row.applicationId,
        messageType: "payment_deadline_extended" as const,
        recipient: row.recipient,
      })),
    )
    .returning({ id: emailNotifications.id });
  return queued.map((row) => row.id);
}
