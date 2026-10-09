import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { signApplicantToken } from "./applicant-auth";
import { signToken } from "./auth";
import { db } from "./db";
import {
  applicants,
  applications,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPayments,
  officerSeats,
  users,
} from "./db/schema";
import { executiveOfficeCommittees, staffCommittees } from "./lib/apply/committee-office-groups";
import { lookupOfficerRecipient } from "./lib/email/officer-recipients";
import { openCurrentPaymentCampaign } from "./lib/membership/campaigns";
import { seedOfficers } from "./lib/membership/officer-seeding";
import { originHeaders } from "./test-support/request";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\/+/, "") : "";
if (!databaseUrl || !/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Officer payment tests require a test database.");
}

const YEAR = 2092;
// Academic-year code for 2092: "9293".
const id = (sequence: string) => `AWS-9293-${sequence}`;
process.env.RECRUITMENT_YEAR = String(YEAR);
process.env.EMAIL_ENABLED = "false";
process.env.JWT_SECRET = "officer-payment-test-secret";
process.env.APPLICANT_AUTH_SECRET = "officer-payment-applicant-secret-32chars";
process.env.CORS_ORIGIN = "http://localhost:3000";

const hrUserId = randomUUID();
const offices = executiveOfficeCommittees();
const directorCommittees = staffCommittees();

after(async () => {
  try {
    await db.delete(membershipPaymentCampaigns).where(eq(membershipPaymentCampaigns.recruitmentYear, YEAR));
    const rows = await db
      .select({ applicantId: applications.applicantId })
      .from(applications)
      .where(eq(applications.recruitmentYear, YEAR));
    await db.delete(applications).where(eq(applications.recruitmentYear, YEAR));
    if (rows.length > 0) {
      await db.delete(applicants).where(inArray(applicants.id, rows.map((row) => row.applicantId)));
    }
    await db.delete(users).where(eq(users.id, hrUserId));
  } finally {
    await db.$client.end();
  }
});

async function seatApplication(seatKey: string) {
  const [row] = await db
    .select({ applicationId: officerSeats.applicationId, code: applications.applicationCode })
    .from(officerSeats)
    .innerJoin(applications, eq(officerSeats.applicationId, applications.id))
    .where(eq(officerSeats.seatKey, seatKey));
  return row;
}

test("elected officers pay and get their ID", async (t) => {
  await db.insert(users).values({
    id: hrUserId,
    email: `${hrUserId}@test.dev`,
    passwordHash: "x",
    firstName: "HR",
    lastName: "User",
    role: "hr",
  });
  const hrToken = (await signToken(`${hrUserId}@test.dev`)).token;
  const hr = (path: string, init: RequestInit = {}) =>
    app.request(path, { ...init, headers: originHeaders({ Authorization: `Bearer ${hrToken}` }) });

  const ceoEmail = lookupOfficerRecipient(offices[0])?.email;
  const directorEmail = lookupOfficerRecipient(directorCommittees[0])?.email;
  assert.ok(ceoEmail && directorEmail);
  await seedOfficers(YEAR, { onlyEmails: [ceoEmail, directorEmail], queueWelcome: false });
  await db.insert(membershipPaymentCampaigns).values({
    recruitmentYear: YEAR,
    amountCents: 25_000,
    opensAt: new Date(Date.now() - 60_000),
    deadlineAt: new Date(Date.now() + 86_400_000),
    gcashAccountNumber: "09170000000",
    generalChatLink: "https://m.me/j/general-test",
    coreTeamChatLink: "https://m.me/j/core-test",
  });
  const opened = await openCurrentPaymentCampaign({ id: hrUserId, email: `${hrUserId}@test.dev`, role: "hr" });
  assert.equal(opened.eligible, 2);

  const ceo = await seatApplication(offices[0]);
  const director = await seatApplication(directorCommittees[0]);
  const cookieFor = async (application: { applicationId: string; code: string }) =>
    `applicant_token=${(await signApplicantToken({ applicationId: application.applicationId, applicationCode: application.code })).token}`;

  async function pay(application: { applicationId: string; code: string }, reference: string) {
    const cookie = await cookieFor(application);
    const submit = await app.request("/applicant/payment/submit", {
      method: "POST",
      headers: { ...originHeaders(), "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        referenceNumber: reference,
        receiptUrl: `https://drive.google.com/file/d/${reference}/view?usp=sharing`,
      }),
    });
    assert.equal(submit.status, 201);
    const [payment] = await db
      .select({ id: membershipPayments.id })
      .from(membershipPayments)
      .where(eq(membershipPayments.applicationId, application.applicationId));
    const verified = await hr(`/membership-payments/${payment.id}/verify`, { method: "POST" });
    assert.equal(verified.status, 200);
    return ((await verified.json()) as { memberId: string }).memberId;
  }

  await t.test("an officer sees their payment, with no ID card until they pay", async () => {
    const response = await app.request("/applicant/payment", {
      headers: { Cookie: await cookieFor(ceo) },
    });
    assert.equal(response.status, 200);
    const { payment } = (await response.json()) as {
      payment: { paymentStatus: string; canSubmit: boolean; memberCard: unknown; amountCents: number };
    };
    assert.equal(payment.paymentStatus, "awaiting_payment");
    assert.equal(payment.canSubmit, true);
    assert.equal(payment.memberCard, null);
    assert.equal(payment.amountCents, 25_000);
  });

  await t.test("the payments list says who has not received their payment email", async () => {
    const statuses = async () => {
      const body = (await (await hr("/membership-payments")).json()) as {
        payments: { applicationId: string; invitation: string }[];
      };
      const byApplication = new Map(body.payments.map((payment) => [payment.applicationId, payment.invitation]));
      return [byApplication.get(ceo.applicationId), byApplication.get(director.applicationId)];
    };
    const setCeoInvitation = (values: Partial<typeof emailNotifications.$inferInsert>) =>
      db
        .update(emailNotifications)
        .set(values)
        .where(
          and(
            eq(emailNotifications.applicationId, ceo.applicationId),
            eq(emailNotifications.messageType, "payment_invitation"),
          ),
        );

    // Opening payments queued both emails; nothing has sent them yet.
    assert.deepEqual(await statuses(), ["queued", "queued"]);
    await setCeoInvitation({ status: "sent" });
    await db
      .delete(emailNotifications)
      .where(
        and(
          eq(emailNotifications.applicationId, director.applicationId),
          eq(emailNotifications.messageType, "payment_invitation"),
        ),
      );
    assert.deepEqual(await statuses(), ["sent", "none"]);
    await setCeoInvitation({ status: "failed", lastError: "Gmail send failed (400): bad recipient" });
    assert.equal((await statuses())[0], "failed");
    await setCeoInvitation({ status: "failed", lastError: "Uncertain: delivery may have completed" });
    assert.equal((await statuses())[0], "uncertain");
    await setCeoInvitation({ status: "sent", lastError: null });
  });

  await t.test("the CEO pays, HR verifies, and the ID is 0001 with a card and the core team chat", async () => {
    assert.equal(await pay(ceo, "OFFICER-CEO-1"), id("0001"));
    const { payment } = (await (
      await app.request("/applicant/payment", { headers: { Cookie: await cookieFor(ceo) } })
    ).json()) as {
      payment: {
        paymentStatus: string;
        memberCard: { memberId: string; position: string } | null;
        membersGroupLink: string | null;
        coreTeamChatLink: string | null;
      };
    };
    assert.equal(payment.paymentStatus, "verified");
    assert.equal(payment.memberCard?.memberId, id("0001"));
    assert.equal(payment.memberCard?.position, "Chief Executive Officer");
    assert.equal(payment.membersGroupLink, "https://m.me/j/general-test");
    assert.equal(payment.coreTeamChatLink, "https://m.me/j/core-test");
  });

  await t.test("the public page shows the CEO as active, and they get the verified email", async () => {
    const response = await app.request(`/members/verify/${id("0001")}`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { status: string; position: string };
    assert.equal(body.status, "active");
    assert.equal(body.position, "Chief Executive Officer");
    const emails = await db
      .select({ messageType: emailNotifications.messageType })
      .from(emailNotifications)
      .where(eq(emailNotifications.applicationId, ceo.applicationId));
    assert.equal(emails.filter((email) => email.messageType === "membership_verified").length, 1);
  });

  await t.test("a director takes their own seat number, after the board", async () => {
    const memberId = await pay(director, "OFFICER-DIRECTOR-1");
    assert.match(memberId, /^AWS-9293-\d{4}$/);
    const sequence = Number(memberId.slice(-4));
    assert.ok(sequence > offices.length, `${memberId} should come after the ${offices.length} board seats`);
    const { payment } = (await (
      await app.request("/applicant/payment", { headers: { Cookie: await cookieFor(director) } })
    ).json()) as { payment: { memberCard: { memberId: string } | null } };
    assert.equal(payment.memberCard?.memberId, memberId);
  });
});
