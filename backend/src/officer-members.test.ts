import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  applications,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPayments,
  officerSeats,
  users,
} from "./db/schema";
import { allocateMemberId } from "./lib/core/member-id";
import {
  executiveOfficeCommittees,
  staffCommittees,
} from "./lib/apply/committee-office-groups";
import { getApplicationById, listApplications } from "./lib/applications/applications";
import { getResultsPreview } from "./lib/hr/results-preview";
import { getApplicantPayment } from "./lib/membership/applicant-payments";
import { openCurrentPaymentCampaign } from "./lib/membership/campaigns";
import {
  listDirectoryMembers,
  listPendingOfficers,
} from "./lib/membership/member-directory";
import { verifyMember } from "./lib/membership/member-verification";
import { prepareOfficerWelcome } from "./lib/membership/officer-email";
import { HELD_WELCOME_UNTIL, releaseHeldWelcomeEmails, seedOfficers } from "./lib/membership/officer-seeding";
import { prepareQueuedEmail, runEmailOutbox } from "./lib/email/queued-emails";
import { lookupOfficerRecipient } from "./lib/email/officer-recipients";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.replace(/^\/+/, "")
  : "";
if (!databaseUrl || !/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Officer member tests require a test database.");
}

const YEAR = 2095;
// Academic-year code for 2095: "9596".
const id = (sequence: string) => `AWS-9596-${sequence}`;
process.env.RECRUITMENT_YEAR = String(YEAR);
process.env.EMAIL_ENABLED = "false";

const hrUserId = randomUUID();
let applicantIds: string[] = [];

after(async () => {
  try {
    await db
      .delete(membershipPaymentCampaigns)
      .where(eq(membershipPaymentCampaigns.recruitmentYear, YEAR));
    const rows = await db
      .select({ applicantId: applications.applicantId })
      .from(applications)
      .where(eq(applications.recruitmentYear, YEAR));
    applicantIds = rows.map((row) => row.applicantId);
    await db.delete(applications).where(eq(applications.recruitmentYear, YEAR));
    if (applicantIds.length > 0) {
      const { applicants } = await import("./db/schema");
      await db.delete(applicants).where(inArray(applicants.id, applicantIds));
    }
    await db.delete(users).where(eq(users.id, hrUserId));
  } finally {
    await db.$client.end();
  }
});

test("elected officers and advisers", async (t) => {
  await db.insert(users).values({
    id: hrUserId,
    email: `${hrUserId}@test.dev`,
    passwordHash: "x",
    firstName: "HR",
    lastName: "User",
    role: "hr",
  });
  const offices = executiveOfficeCommittees();
  const directorCommittees = staffCommittees();

  const seeded = await seedOfficers(YEAR);

  await t.test("seeds the board, every director and three advisers", () => {
    assert.deepEqual(seeded.skipped, []);
    assert.equal(seeded.created.length, offices.length + directorCommittees.length + 3);
    assert.equal(
      seeded.created.filter((seat) => seat.memberId !== null).length,
      3,
    );
    // The board and directors get a welcome email; advisers have no email on file.
    assert.equal(seeded.welcomeNotificationIds.length, offices.length + directorCommittees.length);
    for (const seat of seeded.created) assert.match(seat.applicationCode, /^AP-2095-\d{6}$/);
  });

  await t.test("is safe to run twice", async () => {
    const again = await seedOfficers(YEAR);
    assert.equal(again.created.length, 0);
    assert.equal(again.existing.length, seeded.created.length);
    const queued = await db
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .where(inArray(emailNotifications.id, seeded.welcomeNotificationIds));
    assert.equal(queued.length, seeded.welcomeNotificationIds.length);
  });

  await t.test("the welcome email names the reserved ID and the sign-in code", async () => {
    const ceoSeat = seeded.created.find((seat) => seat.seatKey === offices[0]);
    assert.ok(ceoSeat);
    const [notification] = await db
      .select({ id: emailNotifications.id, applicationId: emailNotifications.applicationId })
      .from(emailNotifications)
      .innerJoin(applications, eq(emailNotifications.applicationId, applications.id))
      .where(eq(applications.applicationCode, ceoSeat.applicationCode));
    const prepared = await prepareOfficerWelcome({
      id: notification.id,
      messageType: "officer_welcome",
      recipient: "ceo@example.test",
      attempts: 0,
    });
    assert.equal(prepared.kind, "ready");
    if (prepared.kind !== "ready") return;
    assert.match(prepared.rendered.subject, /AWS-9596-0001/);
    assert.match(prepared.rendered.text, new RegExp(ceoSeat.applicationCode));
    assert.match(prepared.rendered.text, /Chief Executive Officer/);
  });

  await t.test("held welcome emails stay queued until they are released", async () => {
    const ceoEmail = lookupOfficerRecipient(offices[0])?.email;
    assert.ok(ceoEmail);
    const held = await seedOfficers(YEAR, {
      onlyEmails: [ceoEmail],
      resendWelcome: true,
      holdWelcome: true,
    });
    assert.equal(held.welcomeNotificationIds.length, 1);
    const [id] = held.welcomeNotificationIds;
    const load = async () =>
      (await db.select().from(emailNotifications).where(eq(emailNotifications.id, id)))[0];

    assert.equal((await load()).nextAttemptAt?.getTime(), HELD_WELCOME_UNTIL.getTime());
    // The worker has a go at the queue; the held email must not be touched.
    await runEmailOutbox({ budgetMs: 3_000 });
    const afterWorker = await load();
    assert.equal(afterWorker.status, "pending");
    assert.equal(afterWorker.attempts, 0);

    // Releasing someone else's email changes nothing; releasing theirs makes it due.
    assert.deepEqual(await releaseHeldWelcomeEmails(["nobody@example.test"]), []);
    assert.equal((await load()).nextAttemptAt?.getTime(), HELD_WELCOME_UNTIL.getTime());
    assert.deepEqual(await releaseHeldWelcomeEmails([ceoEmail.toUpperCase()]), [id]);
    assert.equal((await load()).nextAttemptAt, null);
  });

  await t.test("advisers hold IDs 9001 to 9003 and verify as active", async () => {
    const advisers = seeded.created.filter((seat) => seat.seatKey.startsWith("adviser-"));
    assert.deepEqual(
      advisers.map((seat) => seat.memberId),
      [id("9001"), id("9002"), id("9003")],
    );
    const verified = await verifyMember(id("9001"));
    assert.equal(verified?.status, "active");
    assert.equal(verified?.position, "Adviser");
  });

  await t.test("an adviser's ID card says Adviser, with nothing to pay and no groups", async () => {
    const [adviser] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.memberId, id("9001")));
    const payment = await getApplicantPayment(adviser.id);
    assert.equal(payment?.memberCard?.memberId, id("9001"));
    assert.equal(payment?.memberCard?.position, "Adviser");
    assert.equal(payment?.canSubmit, false);
    assert.deepEqual(
      [payment?.membersGroupLink, payment?.committeeChatLink, payment?.coreTeamChatLink],
      [null, null, null],
    );
    // A board seat has no card until it pays, and no payment row yet.
    const [ceo] = await db
      .select({ id: officerSeats.applicationId })
      .from(officerSeats)
      .where(eq(officerSeats.seatKey, offices[0]));
    assert.equal(await getApplicantPayment(ceo.id), null);
  });

  await t.test("the board and directors hold reserved numbers in hierarchy order until they pay", async () => {
    const pending = await listPendingOfficers(new Set());
    assert.equal(pending.length, offices.length + directorCommittees.length);
    const board = pending.filter((officer) => officer.role === "eb");
    assert.deepEqual(
      board.map((officer) => officer.reservedMemberId),
      offices.map((_, index) => id(String(index + 1).padStart(4, "0"))),
    );
    assert.equal(board[0].position, "Chief Executive Officer");
    const directors = pending.filter((officer) => officer.role === "director");
    const numbers = directors.map((officer) => Number(officer.reservedMemberId.slice(-4)));
    assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
    assert.ok(numbers[0] > offices.length);
    assert.equal(new Set(numbers).size, numbers.length);
    // Reserved is not issued: nobody is listed as an active member yet except advisers.
    assert.equal((await listDirectoryMembers()).filter((member) => member.role !== "adviser").length, 0);
    assert.equal(await verifyMember(id("0001")), null);
  });

  await t.test("a seat's number is issued when it is allocated, whoever paid first", async () => {
    const cco = await db.transaction((tx) =>
      allocateMemberId(tx, YEAR, { kind: "eb", officeCommittee: offices[7] }),
    );
    assert.equal(cco, id("0008"));
    const ceo = await db.transaction((tx) =>
      allocateMemberId(tx, YEAR, { kind: "eb", officeCommittee: offices[0] }),
    );
    assert.equal(ceo, id("0001"));
  });

  await t.test("officers stay out of recruitment lists, counts and results", async () => {
    const list = await listApplications({ archive: "all", pageSize: 100 });
    assert.equal(list.total, 0);
    const [officerApplication] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.recruitmentYear, YEAR))
      .limit(1);
    assert.equal(await getApplicationById(officerApplication.id), null);
    const preview = await getResultsPreview();
    assert.equal(preview.applications.length, 0);
  });

  await t.test("payments open for the board and directors, not for advisers", async () => {
    await db.insert(membershipPaymentCampaigns).values({
      recruitmentYear: YEAR,
      amountCents: 15_000,
      opensAt: new Date(Date.now() - 60_000),
      deadlineAt: new Date(Date.now() + 86_400_000),
      gcashAccountNumber: "09170000000",
    });
    const opened = await openCurrentPaymentCampaign({
      id: hrUserId,
      email: `${hrUserId}@test.dev`,
      role: "hr",
    });
    assert.equal(opened.eligible, offices.length + directorCommittees.length);
    const payments = await db
      .select({ kind: officerSeats.kind })
      .from(membershipPayments)
      .innerJoin(officerSeats, eq(officerSeats.applicationId, membershipPayments.applicationId));
    assert.equal(payments.length, offices.length + directorCommittees.length);
    assert.equal(payments.some((payment) => payment.kind === "adviser"), false);
    const invitations = await db
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .where(inArray(emailNotifications.id, opened.notificationIds));
    assert.equal(invitations.length, offices.length + directorCommittees.length);
  });

  await t.test("an officer's payment email names their reserved Member ID", async () => {
    const [ceoInvitation] = await db
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .innerJoin(officerSeats, eq(officerSeats.applicationId, emailNotifications.applicationId))
      .where(
        and(
          eq(emailNotifications.messageType, "payment_invitation"),
          eq(officerSeats.seatKey, offices[0]),
        ),
      );
    const prepared = await prepareQueuedEmail({
      id: ceoInvitation.id,
      messageType: "payment_invitation",
      recipient: "ceo@example.test",
      attempts: 0,
    });
    assert.equal(prepared.kind, "ready");
    if (prepared.kind !== "ready") return;
    assert.match(prepared.rendered.subject, /^Membership payment is open/);
    assert.match(prepared.rendered.text, /Reserved Member ID: AWS-9596-0001/);
    assert.match(prepared.rendered.text, /Chief Executive Officer/);
    assert.match(prepared.rendered.text, /Amount: /);
  });

  await t.test("an officer added after payments opened is invited straight away", async () => {
    const email = lookupOfficerRecipient(directorCommittees[0])?.email;
    assert.ok(email);
    // Take one director out, as if they had not been elected when payments opened.
    const [seat] = await db
      .select({ applicationId: officerSeats.applicationId })
      .from(officerSeats)
      .where(eq(officerSeats.seatKey, directorCommittees[0]));
    await db.delete(applications).where(eq(applications.id, seat.applicationId));

    const added = await seedOfficers(YEAR, { onlyEmails: [email], holdWelcome: true });
    assert.equal(added.created.length, 1);
    assert.equal(added.paymentInvitationIds.length, 1);
    const [payment] = await db
      .select({ id: membershipPayments.id })
      .from(membershipPayments)
      .innerJoin(applications, eq(applications.id, membershipPayments.applicationId))
      .where(eq(applications.applicationCode, added.created[0].applicationCode));
    assert.ok(payment);
    // Held with the welcome email, so a test run never mails anyone.
    const [invitation] = await db
      .select({ nextAttemptAt: emailNotifications.nextAttemptAt })
      .from(emailNotifications)
      .where(eq(emailNotifications.id, added.paymentInvitationIds[0]));
    assert.equal(invitation.nextAttemptAt?.getTime(), HELD_WELCOME_UNTIL.getTime());
  });
});
