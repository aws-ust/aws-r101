import assert from "node:assert/strict";
import { createHash, randomInt, randomUUID } from "node:crypto";
import test, { after } from "node:test";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { and, eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { signToken } from "./auth";
import { db } from "./db";
import {
  applicants,
  applicationChoices,
  applications,
  committees,
  emailNotifications,
  interviewBookings,
  interviewSlots,
  positions,
  recruitmentWindows,
  users,
  uploadSessions,
} from "./db/schema";
import { originHeaders } from "./test-support/request";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for HR applicant creation tests.");
const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("HR applicant creation tests require a test database.");
}

const runId = randomUUID();
const year = 3000 + randomInt(6000);
const hrId = randomUUID();
const adminId = randomUUID();
const hrEmail = `hr-${runId}@aws-ust.org`;
const adminEmail = `admin-${runId}@aws-ust.org`;
const committeeIds = [randomUUID(), randomUUID()];
const positionIds = [randomUUID(), randomUUID()];
const slotId = randomUUID();
const bucket = `hr-applicant-${runId.slice(0, 8)}`;
const applicantIds: string[] = [];
const applicationIds: string[] = [];
const uploadSessionIds: string[] = [];
const originalEnv = new Map<string, string | undefined>();
let originalWindow: typeof recruitmentWindows.$inferSelect | undefined;
let bucketCreated = false;

for (const [key, value] of Object.entries({
  JWT_SECRET: "hr-applicant-creation-secret-at-least-32-characters",
  RECRUITMENT_YEAR: String(year),
  EMAIL_ENABLED: "false",
  S3_ENDPOINT: "http://localhost:4568",
  S3_REGION: "us-east-1",
  S3_BUCKET: bucket,
  S3_FORCE_PATH_STYLE: "true",
  AWS_ACCESS_KEY_ID: "test",
  AWS_SECRET_ACCESS_KEY: "test",
  FREE_PLAN_END_DATE: "2099-01-01T00:00:00.000Z",
})) {
  originalEnv.set(key, process.env[key]);
  process.env[key] = value;
}

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:4568",
  forcePathStyle: true,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
const pdf = Buffer.from("%PDF-1.4\nHR intake test\n%%EOF\n");
const checksumSha256 = createHash("sha256").update(pdf).digest("base64");

after(async () => {
  await s3.destroy();
  await db.$client.end();
});

function headers(token?: string) {
  return originHeaders({
    "content-type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

function applicationBody(email: string, uploadSessionId: string, slot?: string) {
  return {
    firstName: "Test",
    lastName: "Applicant",
    email,
    age: 21,
    birthday: "2005-04-12",
    gender: "male",
    section: "4CSC",
    studentNumber: `20${String(randomInt(10000000)).padStart(8, "0")}`,
    contactNumber: "+639171234567",
    facebookUrl: "https://facebook.com/test.applicant",
    dataPrivacyAgreed: true,
    motivation: "I want to join AWS Builders.",
    ...(slot ? { slotId: slot } : {}),
    choices: [
      { positionId: positionIds[0], preferenceRank: 1 },
      { positionId: positionIds[1], preferenceRank: 2 },
    ],
    uploadSessionId,
  };
}

async function postJson(path: string, body: unknown, token?: string) {
  return app.request(path, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });
}

async function patchJson(path: string, body: unknown, token: string) {
  return app.request(path, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(body),
  });
}

async function createUploadedSession(token: string, documentTypes = ["resume", "registration"]) {
  const documents = documentTypes.map((documentType) => ({
    documentType,
    fileName: `${documentType}-${runId}.pdf`,
    sizeBytes: pdf.length,
    checksumSha256,
  }));
  const response = await postJson("/uploads/hr/presign", { documents }, token);
  assert.equal(response.status, 201, await response.clone().text());
  const session = (await response.json()) as {
    uploadSessionId: string;
    uploads: { documentType: string; url: string; fields: Record<string, string> }[];
  };
  uploadSessionIds.push(session.uploadSessionId);

  for (const upload of session.uploads) {
    const form = new FormData();
    for (const [name, value] of Object.entries(upload.fields)) form.append(name, value);
    form.append("file", new Blob([pdf], { type: "application/pdf" }), `${upload.documentType}.pdf`);
    const uploaded = await fetch(upload.url, { method: "POST", body: form });
    assert.equal(uploaded.status, 204, await uploaded.text());
  }
  return session.uploadSessionId;
}

test("HR applicant creation bypasses intake and interviews while preserving review results", async (t) => {
  const now = new Date();
  [originalWindow] = await db.select().from(recruitmentWindows).limit(1);

  t.after(async () => {
    try {
      if (originalWindow) {
        await db.insert(recruitmentWindows).values({
          singleton: 1,
          startsAt: originalWindow.startsAt,
          endsAt: originalWindow.endsAt,
          updatedBy: originalWindow.updatedBy,
        }).onConflictDoUpdate({
          target: recruitmentWindows.singleton,
          set: {
            startsAt: originalWindow.startsAt,
            endsAt: originalWindow.endsAt,
            updatedBy: originalWindow.updatedBy,
          },
        });
      } else {
        await db.delete(recruitmentWindows).where(eq(recruitmentWindows.singleton, 1));
      }
      if (applicationIds.length) await db.delete(applications).where(inArray(applications.id, applicationIds));
      if (applicantIds.length) await db.delete(applicants).where(inArray(applicants.id, applicantIds));
      if (uploadSessionIds.length) await db.delete(uploadSessions).where(inArray(uploadSessions.id, uploadSessionIds));
      await db.delete(interviewSlots).where(eq(interviewSlots.id, slotId));
      await db.delete(committees).where(inArray(committees.id, committeeIds));
      await db.delete(users).where(inArray(users.id, [hrId, adminId]));
      const keys = [
        ...applicationIds.flatMap((id) => [
          `applications/${id}/resume.pdf`,
          `applications/${id}/registration.pdf`,
        ]),
        ...uploadSessionIds.flatMap((id) => [
          `incoming/${id}/resume.pdf`,
          `incoming/${id}/registration.pdf`,
        ]),
      ];
      if (keys.length) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }));
      }
      if (bucketCreated) await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
    } finally {
      for (const [key, value] of originalEnv) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  await db.insert(users).values([
    { id: hrId, email: hrEmail, passwordHash: "test-only", firstName: "Test", lastName: "HR", role: "hr" },
    { id: adminId, email: adminEmail, passwordHash: "test-only", firstName: "Test", lastName: "Admin", role: "admin" },
  ]);
  await db.insert(committees).values([
    { id: committeeIds[0], name: `HR Intake A ${runId}`, acceptingApplications: false },
    { id: committeeIds[1], name: `HR Intake B ${runId}`, acceptingApplications: false },
  ]);
  await db.insert(positions).values([
    { id: positionIds[0], committeeId: committeeIds[0], name: "Closed Intake A", isOpen: false, openSlots: 0 },
    { id: positionIds[1], committeeId: committeeIds[1], name: "Closed Intake B", isOpen: false, openSlots: 0 },
  ]);
  await db.insert(interviewSlots).values({
    id: slotId,
    committeeId: committeeIds[0],
    startsAt: new Date(Math.ceil((now.getTime() + 7 * 24 * 60 * 60 * 1000) / 1_800_000) * 1_800_000),
  });
  await db.insert(recruitmentWindows).values({
    singleton: 1,
    startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    endsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
  }).onConflictDoUpdate({
    target: recruitmentWindows.singleton,
    set: {
      startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
  });
  await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  bucketCreated = true;

  const hrToken = (await signToken(hrEmail)).token;
  const adminToken = (await signToken(adminEmail)).token;
  const acceptedEmail = `accepted-${runId}@ust.edu.ph`;
  const rejectedEmail = `rejected-${runId}@ust.edu.ph`;

  await t.test("requires HR authentication and keeps public intake closed", async () => {
    assert.equal((await postJson("/applications/hr", {})).status, 401);
    assert.equal((await postJson("/uploads/hr/presign", { documents: [] })).status, 401);
    assert.equal((await postJson("/applications", applicationBody(acceptedEmail, randomUUID(), slotId))).status, 403);
  });

  await t.test("HR and admin can load closed positions and presign while recruitment is closed", async () => {
    const positionsResponse = await app.request("/positions?scope=all", { headers: headers(hrToken) });
    assert.equal(positionsResponse.status, 200);
    const rows = (await positionsResponse.json()) as { id: string; isOpen: boolean }[];
    assert.ok(positionIds.every((id) => rows.some((row) => row.id === id && !row.isOpen)));
    assert.equal((await createUploadedSession(hrToken)).length > 0, true);
  });

  const acceptedSession = await createUploadedSession(hrToken);
  const acceptedResponse = await postJson(
    "/applications/hr",
    applicationBody(acceptedEmail, acceptedSession),
    hrToken,
  );
  assert.equal(acceptedResponse.status, 201, await acceptedResponse.clone().text());
  const accepted = (await acceptedResponse.json()) as { id: string; applicationCode: string; status: string; choices: { decisionStatus: string }[]; documents: { documentType: string }[] };
  applicationIds.push(accepted.id);
  const [acceptedApplicant] = await db.select({ applicantId: applications.applicantId }).from(applications).where(eq(applications.id, accepted.id));
  applicantIds.push(acceptedApplicant.applicantId);

  await t.test("creates pending choices and both documents without a booking or creation email", async () => {
    assert.match(accepted.applicationCode, new RegExp(`^AP-${year}-\\d{6}$`));
    assert.equal(accepted.status, "pending");
    assert.equal(accepted.choices.length, 2);
    assert.ok(accepted.choices.every((choice) => choice.decisionStatus === "pending"));
    assert.deepEqual(new Set(accepted.documents.map((document) => document.documentType)), new Set(["resume", "registration"]));
    assert.equal((await db.select({ id: interviewBookings.id }).from(interviewBookings).where(eq(interviewBookings.applicationId, accepted.id))).length, 0);
    assert.equal((await db.select({ id: emailNotifications.id }).from(emailNotifications).where(eq(emailNotifications.applicationId, accepted.id))).length, 0);
    const [slot] = await db.select({ isOpen: interviewSlots.isOpen }).from(interviewSlots).where(eq(interviewSlots.id, slotId));
    assert.equal(slot.isOpen, true);
  });

  await t.test("rejects missing fields, missing documents, and duplicate choices", async () => {
    const missingFields = await postJson("/applications/hr", { dataPrivacyAgreed: true }, hrToken);
    assert.equal(missingFields.status, 400);

    const partialSession = await createUploadedSession(hrToken, ["resume"]);
    const missingDocuments = await postJson(
      "/applications/hr",
      applicationBody(`missing-docs-${runId}@ust.edu.ph`, partialSession),
      hrToken,
    );
    assert.equal(missingDocuments.status, 400);

    const duplicateChoices = applicationBody(`duplicate-${runId}@ust.edu.ph`, acceptedSession);
    duplicateChoices.choices[1].positionId = positionIds[0];
    assert.equal((await postJson("/applications/hr", duplicateChoices, hrToken)).status, 400);
  });

  await t.test("preserves upload retries and duplicate-cycle protection", async () => {
    const retry = await postJson("/applications/hr", applicationBody(acceptedEmail, acceptedSession), hrToken);
    assert.equal(retry.status, 200);
    assert.equal(((await retry.json()) as { id: string }).id, accepted.id);

    const duplicateSession = await createUploadedSession(hrToken);
    const duplicate = await postJson("/applications/hr", applicationBody(acceptedEmail, duplicateSession), hrToken);
    assert.equal(duplicate.status, 409);
  });

  const rejectedSession = await createUploadedSession(hrToken);
  const rejectedResponse = await postJson(
    "/applications/hr",
    applicationBody(rejectedEmail, rejectedSession),
    adminToken,
  );
  assert.equal(rejectedResponse.status, 201, await rejectedResponse.clone().text());
  const rejected = (await rejectedResponse.json()) as { id: string; status: string };
  applicationIds.push(rejected.id);
  const [rejectedApplicant] = await db.select({ applicantId: applications.applicantId }).from(applications).where(eq(applications.id, rejected.id));
  applicantIds.push(rejectedApplicant.applicantId);

  await t.test("public applications still require interviews and open positions", async () => {
    await db.update(recruitmentWindows).set({
      startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    }).where(eq(recruitmentWindows.singleton, 1));
    const publicBody = applicationBody(`public-${runId}@ust.edu.ph`, randomUUID());
    assert.equal((await postJson("/applications", publicBody)).status, 400);
    assert.equal((await postJson("/applications", { ...publicBody, slotId })).status, 409);
  });

  await t.test("result release queues accepted and rejected emails without bookings", async () => {
    const choiceA = await db.select({ positionId: applicationChoices.positionId }).from(applicationChoices).where(eq(applicationChoices.applicationId, accepted.id));
    const choiceB = await db.select({ positionId: applicationChoices.positionId }).from(applicationChoices).where(eq(applicationChoices.applicationId, rejected.id));
    const decidedAt = new Date();
    await db.update(applicationChoices).set({ decisionStatus: "approved", decidedAt }).where(and(eq(applicationChoices.applicationId, accepted.id), eq(applicationChoices.positionId, positionIds[0])));
    await db.update(applicationChoices).set({ decisionStatus: "rejected", decidedAt }).where(and(eq(applicationChoices.applicationId, accepted.id), eq(applicationChoices.positionId, positionIds[1])));
    await db.update(applications).set({ finalPositionId: positionIds[0] }).where(eq(applications.id, accepted.id));
    await db.update(applicationChoices).set({ decisionStatus: "rejected", decidedAt }).where(inArray(applicationChoices.applicationId, [rejected.id]));

    assert.equal(choiceA.length, 2);
    assert.equal(choiceB.length, 2);
    const release = await postJson("/results/release", {}, hrToken);
    assert.equal(release.status, 200, await release.clone().text());
    const notifications = await db.select({ applicationId: emailNotifications.applicationId, messageType: emailNotifications.messageType }).from(emailNotifications).where(inArray(emailNotifications.applicationId, [accepted.id, rejected.id]));
    assert.deepEqual(new Map(notifications.map((row) => [row.applicationId, row.messageType])), new Map([[accepted.id, "result_accepted"], [rejected.id, "result_rejected"]]));
    assert.equal((await db.select({ id: interviewBookings.id }).from(interviewBookings).where(inArray(interviewBookings.applicationId, [accepted.id, rejected.id]))).length, 0);
  });
});
