import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  applicants,
  applications,
  emailNotifications,
  officerSeats,
} from "../../db/schema";
import { officerSeedList, type OfficerSeed } from "../../db/officer-seeds";
import {
  generateApplicationCode,
  recruitmentYearInt,
} from "../applications/application-code";
import { allocateMemberId } from "../core/member-id";
import { inviteToOpenCampaign } from "./campaigns";

export type OfficerSeedResult = {
  created: { seatKey: string; applicationCode: string; memberId: string | null }[];
  existing: string[];
  skipped: { seatKey: string; reason: string }[];
  welcomeNotificationIds: string[];
  /** Payment invitations queued because payments were already open. */
  paymentInvitationIds: string[];
};

const ADVISER_PLACEHOLDER_DOMAIN = "advisers.awsbuilders-ust.invalid";

/**
 * A held welcome email is queued but scheduled far in the future, so the email
 * worker leaves it alone until `releaseHeldWelcomeEmails` makes it due.
 */
export const HELD_WELCOME_UNTIL = new Date("2099-01-01T00:00:00.000Z");

function seatEmail(seed: OfficerSeed) {
  return seed.email ?? `${seed.seatKey}@${ADVISER_PLACEHOLDER_DOMAIN}`;
}

/**
 * Gives every elected officer and adviser an `officer` application, a seat and
 * (for advisers) their Member ID, so they can sign in, pay and hold an ID.
 * Safe to run again: seats that already exist are left alone.
 */
export type OfficerSeedOptions = {
  /** Only seed seats with these emails (case-insensitive); everyone when empty. */
  onlyEmails?: string[];
  /** Set false to skip queuing the welcome emails. */
  queueWelcome?: boolean;
  /** Queue a fresh welcome email for seats that already exist (and the filter allows). */
  resendWelcome?: boolean;
  /** Queue the welcome emails but hold them back until they are released. */
  holdWelcome?: boolean;
};

export async function seedOfficers(
  recruitmentYear = recruitmentYearInt(),
  options: OfficerSeedOptions = {},
): Promise<OfficerSeedResult> {
  const only = new Set((options.onlyEmails ?? []).map((email) => email.toLowerCase()));
  const queueWelcome = options.queueWelcome ?? true;
  const resendWelcome = options.resendWelcome ?? false;
  const nextAttemptAt = options.holdWelcome ? HELD_WELCOME_UNTIL : null;
  const result: OfficerSeedResult = {
    created: [],
    existing: [],
    skipped: [],
    welcomeNotificationIds: [],
    paymentInvitationIds: [],
  };
  const seeds = officerSeedList().filter(
    (seed) => only.size === 0 || (seed.email !== null && only.has(seed.email.toLowerCase())),
  );
  for (const seed of seeds) {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: officerSeats.id, applicationId: officerSeats.applicationId })
        .from(officerSeats)
        .where(
          and(
            eq(officerSeats.recruitmentYear, recruitmentYear),
            eq(officerSeats.seatKey, seed.seatKey),
          ),
        )
        .limit(1);
      if (existing) {
        result.existing.push(seed.seatKey);
        if (resendWelcome && seed.kind !== "adviser" && seed.email) {
          const [notification] = await tx
            .insert(emailNotifications)
            .values({
              applicationId: existing.applicationId,
              messageType: "officer_welcome",
              recipient: seed.email,
              nextAttemptAt,
            })
            .returning({ id: emailNotifications.id });
          result.welcomeNotificationIds.push(notification.id);
        }
        return;
      }

      const email = seatEmail(seed);
      const [known] = await tx
        .select({ id: applicants.id })
        .from(applicants)
        .where(sql`lower(${applicants.email}) = ${email.toLowerCase()}`)
        .limit(1);
      // If the same person already applied this year (a test application, say),
      // the seat gets its own applicant record: emails are not unique and
      // sign-in matches on Application ID plus email.
      const [applied] = known
        ? await tx
            .select({ id: applications.id })
            .from(applications)
            .where(
              and(
                eq(applications.applicantId, known.id),
                eq(applications.recruitmentYear, recruitmentYear),
              ),
            )
            .limit(1)
        : [];
      const applicant =
        known && !applied
          ? known
          : (
              await tx
                .insert(applicants)
                .values({ firstName: seed.firstName, lastName: seed.lastName, email })
                .returning({ id: applicants.id })
            )[0];

      let applicationCode = generateApplicationCode();
      while (
        (
          await tx
            .select({ id: applications.id })
            .from(applications)
            .where(eq(applications.applicationCode, applicationCode))
            .limit(1)
        ).length > 0
      ) {
        applicationCode = generateApplicationCode();
      }
      const [application] = await tx
        .insert(applications)
        .values({
          applicantId: applicant.id,
          applicationCode,
          recruitmentYear,
          status: "approved",
          applicationType: "officer",
          resultsReleasedAt: new Date(),
        })
        .returning({ id: applications.id });
      await tx.insert(officerSeats).values({
        applicationId: application.id,
        recruitmentYear,
        kind: seed.kind,
        seatKey: seed.seatKey,
        title: seed.title,
        committee: seed.committee,
        sortOrder: seed.sortOrder,
      });

      let memberId: string | null = null;
      if (seed.kind === "adviser") {
        memberId = await allocateMemberId(tx, recruitmentYear, {
          kind: "adviser",
          index: seed.sortOrder,
        });
        await tx
          .update(applications)
          .set({ memberId })
          .where(eq(applications.id, application.id));
      } else if (seed.email && queueWelcome) {
        const [notification] = await tx
          .insert(emailNotifications)
          .values({
            applicationId: application.id,
            messageType: "officer_welcome",
            recipient: seed.email,
            nextAttemptAt,
          })
          .returning({ id: emailNotifications.id });
        result.welcomeNotificationIds.push(notification.id);
      }
      if (seed.kind !== "adviser") {
        // Payments may already be open; an officer elected later is invited right away.
        result.paymentInvitationIds.push(
          ...(await inviteToOpenCampaign(tx, [application.id], { nextAttemptAt })),
        );
      }
      result.created.push({ seatKey: seed.seatKey, applicationCode, memberId });
    });
  }
  return result;
}

/** Makes held welcome emails, and the payment invitations held with them, due now. Pass emails to release only those people's. */
export async function releaseHeldWelcomeEmails(onlyEmails: string[] = []) {
  const only = onlyEmails.map((email) => email.toLowerCase());
  const released = await db
    .update(emailNotifications)
    .set({ nextAttemptAt: null })
    .where(
      and(
        inArray(emailNotifications.messageType, ["officer_welcome", "payment_invitation"]),
        eq(emailNotifications.status, "pending"),
        eq(emailNotifications.nextAttemptAt, HELD_WELCOME_UNTIL),
        only.length > 0
          ? inArray(sql<string>`lower(${emailNotifications.recipient})`, only)
          : undefined,
      ),
    )
    .returning({ id: emailNotifications.id });
  return released.map((row) => row.id);
}
