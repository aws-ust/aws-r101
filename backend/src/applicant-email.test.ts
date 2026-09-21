import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { signToken } from "./auth";
import { db } from "./db";
import {
  applicants,
  applicationChoices,
  applications,
  committees,
  emailNotifications,
  positions,
  users,
} from "./db/schema";
import { originHeaders } from "./test-support/request";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for applicant email tests.");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Applicant email tests require a test database.");
}

process.env.JWT_SECRET = "applicant-email-secret-at-least-32-characters";
process.env.EMAIL_ENABLED = "false";

const reviewerId = randomUUID();
const reviewerEmail = `email-${reviewerId}@aws-ust.org`;
const committeeIds = [randomUUID(), randomUUID()];
const positionIds = [randomUUID(), randomUUID()];
const applicantId = randomUUID();
const otherApplicantId = randomUUID();
const memberApplicantId = randomUUID();
const applicationId = randomUUID();
const otherApplicationId = randomUUID();
const memberApplicationId = randomUUID();
const originalEmail = `email-${applicationId}@ust.edu.ph`;
const takenEmail = `taken-${otherApplicationId}@ust.edu.ph`;
const memberEmail = `member-${memberApplicationId}@ust.edu.ph`;
const applicationCode = `AP-2093-${String(randomInt(1_000_000)).padStart(6, "0")}`;
let token = "";

after(async () => {
  try {
    await db
      .delete(applicants)
      .where(
        inArray(applicants.id, [
          applicantId,
          otherApplicantId,
          memberApplicantId,
        ]),
      );
    await db.delete(committees).where(inArray(committees.id, committeeIds));
    await db.delete(users).where(eq(users.id, reviewerId));
  } finally {
    await db.$client.end();
  }
});

function emailRequest(
  body: Record<string, unknown>,
  id = applicationId,
  authenticated = true,
) {
  return app.request(`/applications/${id}/email`, {
    method: "PATCH",
    headers: originHeaders({
      "content-type": "application/json",
      ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
    }),
    body: JSON.stringify(body),
  });
}

function resendRequest(id: string, authenticated = true) {
  return app.request(`/applications/${id}/emails/resend-submitted`, {
    method: "POST",
    headers: originHeaders({
      ...(authenticated ? { Authorization: `Bearer ${token}` } : {}),
    }),
  });
}

test("HR applicant email update and resend", async (t) => {
  await db.insert(users).values({
    id: reviewerId,
    email: reviewerEmail,
    passwordHash: "test-only",
    firstName: "Email",
    lastName: "Reviewer",
    role: "hr",
  });
  await db.insert(committees).values([
    { id: committeeIds[0], name: `Email A ${applicationId}` },
    { id: committeeIds[1], name: `Email B ${applicationId}` },
  ]);
  await db.insert(positions).values([
    {
      id: positionIds[0],
      committeeId: committeeIds[0],
      name: "Email Position A",
    },
    {
      id: positionIds[1],
      committeeId: committeeIds[1],
      name: "Email Position B",
    },
  ]);
  await db.insert(applicants).values([
    {
      id: applicantId,
      firstName: "Email",
      lastName: "Applicant",
      email: originalEmail,
    },
    {
      id: otherApplicantId,
      firstName: "Taken",
      lastName: "Applicant",
      email: takenEmail,
    },
    {
      id: memberApplicantId,
      firstName: "Member",
      lastName: "Applicant",
      email: memberEmail,
    },
  ]);
  await db.insert(applications).values([
    {
      id: applicationId,
      applicantId,
      applicationCode,
      recruitmentYear: 2093,
      applicationType: "position",
    },
    {
      id: otherApplicationId,
      applicantId: otherApplicantId,
      applicationCode: `AP-2093-${String(randomInt(1_000_000)).padStart(6, "0")}`,
      recruitmentYear: 2093,
      applicationType: "position",
    },
    {
      id: memberApplicationId,
      applicantId: memberApplicantId,
      applicationCode: `AP-2093-${String(randomInt(1_000_000)).padStart(6, "0")}`,
      recruitmentYear: 2093,
      applicationType: "member",
    },
  ]);
  await db.insert(applicationChoices).values([
    {
      applicationId,
      positionId: positionIds[0],
      preferenceRank: 1,
    },
    {
      applicationId,
      positionId: positionIds[1],
      preferenceRank: 2,
    },
  ]);
  token = (await signToken(reviewerEmail)).token;

  await t.test("requires authentication and validates email", async () => {
    assert.equal((await emailRequest({ email: "a@ust.edu.ph" }, applicationId, false)).status, 401);
    assert.equal((await emailRequest({ email: "not-an-email" })).status, 400);
    assert.equal(
      (await emailRequest({ email: "someone@gmail.com" })).status,
      400,
    );
  });

  await t.test("updates applicants.email in the database", async () => {
    const nextEmail = `fixed-${applicationId}@ust.edu.ph`;
    const response = await emailRequest({ email: nextEmail.toUpperCase() });
    assert.equal(response.status, 200);
    const payload = (await response.json()) as { email: string; id: string };
    assert.equal(payload.id, applicationId);
    assert.equal(payload.email, nextEmail);

    const [row] = await db
      .select({ email: applicants.email })
      .from(applicants)
      .where(eq(applicants.id, applicantId))
      .limit(1);
    assert.equal(row?.email, nextEmail);
  });

  await t.test("rejects a taken email and archived applications", async () => {
    const taken = await emailRequest({ email: takenEmail });
    assert.equal(taken.status, 409);

    await db
      .update(applications)
      .set({ archivedAt: new Date() })
      .where(eq(applications.id, applicationId));
    const archived = await emailRequest({
      email: `after-archive-${applicationId}@ust.edu.ph`,
    });
    assert.equal(archived.status, 409);
    await db
      .update(applications)
      .set({ archivedAt: null })
      .where(eq(applications.id, applicationId));
  });

  await t.test("resends member success email and blocks incomplete position apps", async () => {
    const memberResend = await resendRequest(memberApplicationId);
    assert.equal(memberResend.status, 200);
    const memberPayload = (await memberResend.json()) as {
      sent: boolean;
      recipient: string;
    };
    assert.equal(memberPayload.recipient, memberEmail);
    assert.equal(memberPayload.sent, false);

    const [notification] = await db
      .select({
        recipient: emailNotifications.recipient,
        messageType: emailNotifications.messageType,
      })
      .from(emailNotifications)
      .where(eq(emailNotifications.applicationId, memberApplicationId))
      .limit(1);
    assert.equal(notification?.messageType, "member_registration");
    assert.equal(notification?.recipient, memberEmail);

    const positionResend = await resendRequest(applicationId);
    assert.equal(positionResend.status, 409);
  });
});
