import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  applicants,
  applications,
  committees,
  interviewBookings,
  interviewSlots,
  membershipPaymentCampaigns,
  membershipPayments,
} from "./db/schema";
import { getSeasonOverview } from "./lib/hr/season-overview";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for season overview tests.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Season overview tests require a test database.");
}

process.env.RECRUITMENT_YEAR = "2097";

const campaignId = randomUUID();
const committeeId = randomUUID();
const slotIds = [randomUUID(), randomUUID()];
const applicantIds = Array.from({ length: 6 }, () => randomUUID());

after(async () => {
  try {
    await db.delete(applicants).where(inArray(applicants.id, applicantIds));
    await db.delete(membershipPaymentCampaigns).where(eq(membershipPaymentCampaigns.id, campaignId));
    await db.delete(committees).where(eq(committees.id, committeeId));
  } finally {
    await db.$client.end();
  }
});

type Spec = {
  type: "position" | "member";
  status: "pending" | "approved" | "rejected";
  released?: boolean;
  booked?: boolean;
  archived?: boolean;
  payment?: "pending_verification" | "verified";
};

test("season overview counts what each list shows", async () => {
  await db.insert(committees).values({ id: committeeId, name: `Overview Committee ${randomUUID().slice(0, 8)}` });
  await db.insert(interviewSlots).values(
    slotIds.map((id, index) => ({
      id,
      committeeId,
      startsAt: new Date(`2097-02-0${index + 1}T02:00:00.000Z`),
    })),
  );
  let nextSlot = 0;
  await db.insert(membershipPaymentCampaigns).values({
    id: campaignId,
    recruitmentYear: 2097,
    opensAt: new Date("2097-10-01T00:00:00.000Z"),
    deadlineAt: new Date("2097-12-01T00:00:00.000Z"),
  });
  await db.insert(applicants).values(
    applicantIds.map((id, index) => ({
      id,
      firstName: `Over${index}`,
      lastName: "View",
      email: `overview-${index}-${id}@ust.edu.ph`,
    })),
  );

  const specs: Spec[] = [
    { type: "position", status: "pending", booked: true },
    { type: "position", status: "approved", booked: true, released: true, payment: "verified" },
    { type: "position", status: "rejected", released: true },
    { type: "member", status: "approved", released: true, payment: "pending_verification" },
    { type: "member", status: "approved", released: false },
    // Archived rows never count.
    { type: "position", status: "pending", archived: true },
  ];

  const before = await getSeasonOverview();
  assert.equal(before.recruitmentYear, 2097);

  for (const [index, spec] of specs.entries()) {
    const applicationId = randomUUID();
    await db.insert(applications).values({
      id: applicationId,
      applicantId: applicantIds[index],
      applicationCode: `AP-2097-${String(700001 + index)}`,
      recruitmentYear: 2097,
      motivation: "Overview test",
      applicationType: spec.type,
      status: spec.status,
      resultsReleasedAt: spec.released ? new Date("2097-09-01T00:00:00.000Z") : null,
      archivedAt: spec.archived ? new Date() : null,
    });
    if (spec.booked) {
      await db.insert(interviewBookings).values({ slotId: slotIds[nextSlot++], applicationId });
    }
    if (spec.payment) {
      await db.insert(membershipPayments).values({
        campaignId,
        applicationId,
        status: spec.payment,
        membershipStatus: spec.payment === "verified" ? "active" : "inactive",
        verifiedAt: spec.payment === "verified" ? new Date("2097-10-06T00:00:00.000Z") : null,
      });
    }
  }

  const overview = await getSeasonOverview();
  assert.deepEqual(overview.stages, {
    applied: before.stages.applied + 5,
    interviewBooked: before.stages.interviewBooked + 2,
    decided: before.stages.decided + 4,
    released: before.stages.released + 3,
    paymentSent: before.stages.paymentSent + 2,
    member: before.stages.member + 1,
  });
  assert.equal(overview.attention.undecided, before.attention.undecided + 1);
  assert.equal(overview.attention.readyToRelease, before.attention.readyToRelease + 1);
  assert.equal(overview.attention.paymentsToVerify, before.attention.paymentsToVerify + 1);
});
