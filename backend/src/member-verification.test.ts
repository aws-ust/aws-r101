import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq } from "drizzle-orm";
import { app } from "./app";
import { db } from "./db";
import {
  applicants,
  applications,
  membershipPaymentCampaigns,
  membershipPayments,
} from "./db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for member verification tests.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Member verification tests require a test database.");
}

const applicantId = randomUUID();
const applicationId = randomUUID();
const campaignId = randomUUID();
const memberId = "AWS-2099-0042";

after(async () => {
  try {
    await db.delete(applicants).where(eq(applicants.id, applicantId));
    await db.delete(membershipPaymentCampaigns).where(eq(membershipPaymentCampaigns.id, campaignId));
  } finally {
    await db.$client.end();
  }
});

function verify(id: string) {
  return app.request(`/members/verify/${id}`);
}

test("member verification", async (t) => {
  await db.insert(applicants).values({
    id: applicantId,
    firstName: "Verify",
    lastName: "Member",
    email: `verify-${applicantId}@ust.edu.ph`,
    studentNumber: "2099000042",
  });
  await db.insert(applications).values({
    id: applicationId,
    applicantId,
    applicationCode: "AP-2099-800042",
    recruitmentYear: 2099,
    motivation: "Verification test",
    applicationType: "member",
    status: "approved",
    memberId,
  });
  await db.insert(membershipPaymentCampaigns).values({
    id: campaignId,
    recruitmentYear: 2099,
    opensAt: new Date("2099-10-01T00:00:00.000Z"),
    deadlineAt: new Date("2099-12-01T00:00:00.000Z"),
  });
  const [payment] = await db
    .insert(membershipPayments)
    .values({
      campaignId,
      applicationId,
      status: "verified",
      membershipStatus: "active",
      verifiedAt: new Date("2099-10-06T00:00:00.000Z"),
    })
    .returning({ id: membershipPayments.id });

  await t.test("shows an active member's card details", async () => {
    const response = await verify(memberId.toLowerCase());
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, {
      memberId,
      fullName: "Verify Member",
      position: "General Member",
      academicYear: "2099-2100",
      status: "active",
    });
    // Only what is printed on the card's face is public.
    assert.doesNotMatch(JSON.stringify(body), /2099000042|ust\.edu\.ph/);
  });

  await t.test("reports a reversed membership as inactive", async () => {
    await db
      .update(membershipPayments)
      .set({ membershipStatus: "revoked", status: "needs_resubmission" })
      .where(eq(membershipPayments.id, payment.id));
    const response = await verify(memberId);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { status: string }).status, "inactive");
  });

  await t.test("rejects unknown and malformed IDs", async () => {
    assert.equal((await verify("AWS-2099-9999")).status, 404);
    assert.equal((await verify("not-an-id")).status, 400);
  });
});
