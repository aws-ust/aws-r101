import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { app } from "./app";
import {
  APPLICANT_AUTH_COOKIE_NAME,
  signApplicantToken,
} from "./applicant-auth";
import { signToken } from "./auth";
import { db } from "./db";
import {
  applicants,
  applicationChoices,
  applications,
  committees,
  positions,
} from "./db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl
  ? new URL(databaseUrl).pathname.replace(/^\/+/, "")
  : "";
const hasTestDatabase =
  Boolean(databaseUrl) && /(^|[_-])test([_-]|$)/i.test(databaseName);

process.env.JWT_SECRET = "security-access-test-secret";
process.env.APPLICANT_AUTH_SECRET =
  "security-access-applicant-secret-32chars-min";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.EMAIL_ENABLED = "false";

const committeeId = randomUUID();
const positionId = randomUUID();
const applicantAId = randomUUID();
const applicantBId = randomUUID();
const applicationAId = randomUUID();
const applicationBId = randomUUID();

let applicantAToken = "";
let hrToken = "";

if (hasTestDatabase) {
  after(async () => {
    try {
      await db
        .delete(applicationChoices)
        .where(
          inArray(applicationChoices.applicationId, [
            applicationAId,
            applicationBId,
          ]),
        );
      await db
        .delete(applications)
        .where(inArray(applications.id, [applicationAId, applicationBId]));
      await db
        .delete(applicants)
        .where(inArray(applicants.id, [applicantAId, applicantBId]));
      await db.delete(positions).where(eq(positions.id, positionId));
      await db.delete(committees).where(eq(committees.id, committeeId));
    } finally {
      await db.$client.end();
    }
  });
}

test("setup fixtures", { skip: !hasTestDatabase }, async () => {
  await db.insert(committees).values({
    id: committeeId,
    name: "Security Test Committee",
    description: "",
  });
  await db.insert(positions).values({
    id: positionId,
    name: "Security Tester",
    committeeId,
    isOpen: true,
  });
  await db.insert(applicants).values([
    {
      id: applicantAId,
      firstName: "A",
      lastName: "Applicant",
      email: "security-a@ust.edu.ph",
      section: "1CS1",
      studentNumber: "1234567890",
      contactNumber: "+639123456789",
      facebookUrl: "https://facebook.com/a",
      gender: "male",
      birthday: "2000-01-01",
    },
    {
      id: applicantBId,
      firstName: "B",
      lastName: "Applicant",
      email: "security-b@ust.edu.ph",
      section: "1CS2",
      studentNumber: "1234567891",
      contactNumber: "+639123456780",
      facebookUrl: "https://facebook.com/b",
      gender: "female",
      birthday: "2000-01-02",
    },
  ]);
  await db.insert(applications).values([
    {
      id: applicationAId,
      applicantId: applicantAId,
      applicationCode: "AP-2099-700001",
      status: "pending",
    },
    {
      id: applicationBId,
      applicantId: applicantBId,
      applicationCode: "AP-2099-700002",
      status: "pending",
    },
  ]);
  await db.insert(applicationChoices).values([
    {
      applicationId: applicationAId,
      positionId,
      preferenceRank: 1,
    },
    {
      applicationId: applicationBId,
      positionId,
      preferenceRank: 1,
    },
  ]);

  applicantAToken = (
    await signApplicantToken({
      applicationId: applicationAId,
      applicationCode: "AP-2099-700001",
    })
  ).token;
  hrToken = (await signToken("hr@aws-ust.org")).token;

  assert.ok(applicantAToken);
  assert.ok(hrToken);
});

test(
  "applicant A cannot read applicant B application",
  { skip: !hasTestDatabase },
  async () => {
    const response = await app.request("/applicant/application", {
      headers: {
        Cookie: `${APPLICANT_AUTH_COOKIE_NAME}=${applicantAToken}`,
      },
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { id?: string };
    assert.equal(body.id, applicationAId);
    assert.notEqual(body.id, applicationBId);
  },
);

test("unauthenticated applicant routes return 401", async () => {
  const response = await app.request("/applicant/application");
  assert.equal(response.status, 401);
});

test(
  "HR bearer token cannot access applicant session route",
  { skip: !hasTestDatabase },
  async () => {
    const response = await app.request("/applicant/application", {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert.equal(response.status, 401);
  },
);

test(
  "GET /positions?scope=all requires HR auth",
  { skip: !hasTestDatabase },
  async () => {
    const publicResponse = await app.request("/positions?scope=all");
    assert.equal(publicResponse.status, 401);
    const hrResponse = await app.request("/positions?scope=all", {
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert.equal(hrResponse.status, 200);
  },
);
