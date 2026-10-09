import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { db } from "./db";
import {
  applicants,
  applicationChoices,
  applications,
  committees,
  emailNotifications,
  membershipPaymentCampaigns,
  membershipPayments,
  officerHuntSettings,
  officerSeats,
  positions,
} from "./db/schema";
import { updateApplicationDecision } from "./lib/applications/application-decisions";
import { listApplications } from "./lib/applications/applications";
import { recordRedirectResponse, updateRedirectPlacement } from "./lib/applications/redirect-placement";
import { prepareQueuedEmail } from "./lib/email/queued-emails";
import { getResultsPreview } from "./lib/hr/results-preview";
import { releaseResults, ResultsReleaseBlockedError } from "./lib/hr/results-release";
import { listPendingOfficers } from "./lib/membership/member-directory";
import {
  ensureOfficerHuntSeats,
  listOfficerHuntSeats,
  OfficerHuntSeatError,
  updateOfficerHuntSeat,
} from "./lib/officer-hunt/seats";
import { officerHuntSeasonStatus, saveOfficerHuntSettings } from "./lib/officer-hunt/settings";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\/+/, "") : "";
if (!databaseUrl || !/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Officer hunt tests require a test database.");
}

const YEAR = 2093;
// Academic-year code for 2093: "9394".
const id = (sequence: string) => `AWS-9394-${sequence}`;
process.env.RECRUITMENT_YEAR = String(YEAR);
process.env.EMAIL_ENABLED = "false";

const OFFICE = "Office of the Chief Executive Officer";
const STAFF = "Technicals Committee";
const day = 86_400_000;

const createdCommitteeIds: string[] = [];
const applicantIds: string[] = [];
let assistantPositionId: string | null = null;

after(async () => {
  try {
    await db.delete(membershipPaymentCampaigns).where(eq(membershipPaymentCampaigns.recruitmentYear, YEAR));
    await db.delete(officerHuntSettings);
    if (applicantIds.length > 0) await db.delete(applicants).where(inArray(applicants.id, applicantIds));
    const committeeRows = await db
      .select({ id: committees.id })
      .from(committees)
      .where(inArray(committees.name, [OFFICE, STAFF]));
    const ids = committeeRows.map((row) => row.id);
    if (ids.length > 0) {
      await db
        .delete(positions)
        .where(and(inArray(positions.committeeId, ids), eq(positions.track, "officer_hunt")));
    }
    if (assistantPositionId) await db.delete(positions).where(eq(positions.id, assistantPositionId));
    if (createdCommitteeIds.length > 0) {
      await db.delete(committees).where(inArray(committees.id, createdCommitteeIds));
    }
  } finally {
    await db.$client.end();
  }
});

async function applicant(index: number) {
  const applicantId = randomUUID();
  applicantIds.push(applicantId);
  await db.insert(applicants).values({
    id: applicantId,
    firstName: `Hunter${index}`,
    lastName: "Candidate",
    email: `hunt-${applicantId}@ust.edu.ph`,
  });
  return applicantId;
}

/** A submitted hunt application with two ranked seat choices. */
async function huntApplication(index: number, first: string, second: string) {
  const applicantId = await applicant(index);
  const [application] = await db
    .insert(applications)
    .values({
      applicantId,
      applicationCode: `AP-${YEAR}-93${String(index).padStart(4, "0")}`,
      recruitmentYear: YEAR,
      track: "officer_hunt",
      motivation: "Officer hunt test",
    })
    .returning({ id: applications.id });
  await db.insert(applicationChoices).values([
    { applicationId: application.id, positionId: first, preferenceRank: 1 },
    { applicationId: application.id, positionId: second, preferenceRank: 2 },
  ]);
  return application.id;
}

async function seatsOf(applicationId: string) {
  return db.select().from(officerSeats).where(eq(officerSeats.applicationId, applicationId));
}

test("officer hunt", async (t) => {
  for (const name of [OFFICE, STAFF]) {
    const [existing] = await db.select({ id: committees.id }).from(committees).where(eq(committees.name, name));
    if (!existing) {
      const [row] = await db.insert(committees).values({ name }).returning({ id: committees.id });
      createdCommitteeIds.push(row.id);
    }
  }
  const [office] = await db.select({ id: committees.id }).from(committees).where(eq(committees.name, OFFICE));
  const [assistant] = await db
    .insert(positions)
    // Executive assistants are recognised by their name.
    .values({ committeeId: office.id, name: `Executive Assistant to the CEO (test ${randomUUID().slice(0, 8)})` })
    .returning({ id: positions.id });
  assistantPositionId = assistant.id;

  const now = Date.now();
  await saveOfficerHuntSettings({
    termYear: YEAR,
    applicationsOpenAt: new Date(now - day),
    applicationsCloseAt: new Date(now + 7 * day),
    interviewsStartAt: new Date(now + 8 * day),
    interviewsEndAt: new Date(now + 14 * day),
  });

  await t.test("the hunt's dates decide whether people can apply", async () => {
    assert.equal(officerHuntSeasonStatus(null).open, false);
    assert.equal(
      officerHuntSeasonStatus({
        termYear: YEAR,
        applicationsOpenAt: new Date(now - day),
        applicationsCloseAt: new Date(now + day),
        interviewsStartAt: null,
        interviewsEndAt: null,
      }).open,
      true,
    );
    const status = await app.request("/officer-hunt/status");
    assert.equal(status.status, 200);
    assert.equal(((await status.json()) as { termYear: number }).termYear, YEAR);
  });

  await t.test("lays out closed seats for the board, directors and assistants, once", async () => {
    assert.ok((await ensureOfficerHuntSeats()) >= 3);
    assert.equal(await ensureOfficerHuntSeats(), 0);
    const seats = (await listOfficerHuntSeats()).filter((seat) => [OFFICE, STAFF].includes(seat.committee));
    assert.equal(seats.filter((seat) => seat.kind === "eb").length, 1);
    assert.equal(seats.filter((seat) => seat.kind === "director").length, 1);
    assert.ok(seats.some((seat) => seat.kind === "ea"));
    assert.ok(seats.every((seat) => !seat.isOpen));
  });

  const seats = (await listOfficerHuntSeats()).filter((seat) => [OFFICE, STAFF].includes(seat.committee));
  const ceo = seats.find((seat) => seat.kind === "eb")!;
  const director = seats.find((seat) => seat.kind === "director")!;
  const assistantSeat = seats.find((seat) => seat.kind === "ea")!;

  await t.test("a board seat has one holder; assistants come in numbers", async () => {
    await assert.rejects(updateOfficerHuntSeat(ceo.id, { openSlots: 2 }), OfficerHuntSeatError);
    await updateOfficerHuntSeat(ceo.id, { isOpen: true });
    await updateOfficerHuntSeat(director.id, { isOpen: true });
    await updateOfficerHuntSeat(assistantSeat.id, { isOpen: true, openSlots: 3 });
    const after = (await listOfficerHuntSeats()).find((seat) => seat.id === assistantSeat.id);
    assert.equal(after?.openSlots, 3);
  });

  await t.test("R101 never lists the hunt's seats, and the hunt never lists R101's", async () => {
    const r101 = (await (await app.request("/positions")).json()) as { id: string }[];
    assert.equal(r101.some((position) => [ceo.id, director.id, assistantSeat.id].includes(position.id)), false);
    const hunt = (await (await app.request("/positions?track=officer_hunt")).json()) as { id: string }[];
    assert.deepEqual(
      hunt.map((position) => position.id).filter((positionId) => [ceo.id, director.id, assistantSeat.id].includes(positionId)).sort(),
      [ceo.id, director.id, assistantSeat.id].sort(),
    );
    assert.equal(hunt.some((position) => position.id === assistant.id), false);
  });

  await db.insert(membershipPaymentCampaigns).values({
    recruitmentYear: YEAR,
    amountCents: 25_000,
    opensAt: new Date(now - day),
    deadlineAt: new Date(now + 30 * day),
    gcashAccountNumber: "09170000000",
    isOpen: true,
  });
  const winnerOne = await huntApplication(1, ceo.id, assistantSeat.id);
  const winnerTwo = await huntApplication(2, ceo.id, director.id);
  const winnerThree = await huntApplication(3, assistantSeat.id, director.id);
  for (const [application, firstChoice] of [
    [winnerOne, ceo.id],
    [winnerTwo, ceo.id],
    [winnerThree, assistantSeat.id],
  ] as const) {
    await updateApplicationDecision(application, { positionId: firstChoice, decisionStatus: "approved" });
    await updateApplicationDecision(application, { finalPositionId: firstChoice });
  }

  await t.test("two winners for one board seat block the release", async () => {
    const preview = await getResultsPreview("officer_hunt");
    const byId = new Map(preview.applications.map((row) => [row.id, row]));
    assert.equal(byId.get(winnerOne)?.classification, "incomplete");
    assert.match(byId.get(winnerTwo)?.blockingReason ?? "", /same seat/);
    assert.equal(byId.get(winnerThree)?.classification, "accepted");
    await assert.rejects(releaseResults(undefined, "officer_hunt"), ResultsReleaseBlockedError);
  });

  await t.test("the hunt stays out of R101's lists, and R101's out of the hunt's", async () => {
    assert.equal((await getResultsPreview("r101")).applications.length, 0);
    assert.equal((await listApplications({ archive: "all", pageSize: 50 })).total, 0);
    assert.equal((await listApplications({ archive: "all", pageSize: 50, track: "officer_hunt" })).total, 3);
  });

  // The second winner takes their other choice instead, so every seat has one holder.
  await updateApplicationDecision(winnerTwo, { positionId: ceo.id, decisionStatus: "rejected" });
  await updateApplicationDecision(winnerTwo, { positionId: director.id, decisionStatus: "approved" });
  await updateApplicationDecision(winnerTwo, { finalPositionId: director.id });

  await t.test("releasing seats the winners and tells them", async () => {
    const release = await releaseResults(undefined, "officer_hunt");
    assert.equal(release.seated, 3);

    const kinds = new Map<string, string>();
    for (const [application, expected] of [
      [winnerOne, "eb"],
      [winnerTwo, "director"],
      [winnerThree, "ea"],
    ] as const) {
      const [seat] = await seatsOf(application);
      kinds.set(application, seat.kind);
      assert.equal(seat.kind, expected);
      assert.equal(seat.recruitmentYear, YEAR);
    }
    assert.match((await seatsOf(winnerThree))[0].seatKey, /^ea:/);
    const [released] = await db.select().from(applications).where(eq(applications.id, winnerOne));
    assert.equal(released.applicationType, "officer");
    assert.equal(released.track, "officer_hunt");
    assert.equal(released.status, "approved");

    const winners = [winnerOne, winnerTwo, winnerThree];
    const emails = await db
      .select({ messageType: emailNotifications.messageType })
      .from(emailNotifications)
      .where(inArray(emailNotifications.applicationId, winners));
    assert.equal(emails.filter((email) => email.messageType === "officer_welcome").length, 3);
    // Payments were already open, so each winner is invited straight away.
    assert.equal(emails.filter((email) => email.messageType === "payment_invitation").length, 3);
    const payments = await db
      .select({ id: membershipPayments.id })
      .from(membershipPayments)
      .where(inArray(membershipPayments.applicationId, winners));
    assert.equal(payments.length, 3);
  });

  await t.test("the emails carry the reserved ID, or none for an assistant", async () => {
    const emailFor = async (application: string, messageType: "officer_welcome" | "payment_invitation") => {
      const [row] = await db
        .select({ id: emailNotifications.id })
        .from(emailNotifications)
        .where(and(eq(emailNotifications.applicationId, application), eq(emailNotifications.messageType, messageType)));
      const prepared = await prepareQueuedEmail({ id: row.id, messageType, recipient: "x@example.test", attempts: 0 });
      assert.equal(prepared.kind, "ready");
      return prepared.kind === "ready" ? prepared.rendered : null;
    };
    const boardInvitation = await emailFor(winnerOne, "payment_invitation");
    assert.match(boardInvitation?.text ?? "", new RegExp(`Reserved Member ID: ${id("0001")}`));
    const assistantWelcome = await emailFor(winnerThree, "officer_welcome");
    assert.match(assistantWelcome?.subject ?? "", /^Welcome to the team/);
    assert.doesNotMatch(assistantWelcome?.text ?? "", /Reserved Member ID/);
    const assistantInvitation = await emailFor(winnerThree, "payment_invitation");
    assert.doesNotMatch(assistantInvitation?.text ?? "", /Reserved Member ID/);
  });

  await t.test("the directory lists the new officers, an assistant without a number", async () => {
    const pending = await listPendingOfficers(new Set());
    const assistantRow = pending.find((officer) => officer.role === "ea");
    assert.ok(assistantRow);
    assert.equal(assistantRow.reservedMemberId, null);
    assert.equal(pending.find((officer) => officer.role === "eb")?.reservedMemberId, id("0001"));
  });

  await t.test("accepting an offered seat makes the applicant an officer", async () => {
    const redirected = await huntApplication(4, ceo.id, director.id);
    await updateApplicationDecision(redirected, { positionId: ceo.id, decisionStatus: "rejected" });
    await updateApplicationDecision(redirected, { positionId: director.id, decisionStatus: "rejected" });
    await updateRedirectPlacement(redirected, assistantSeat.id);

    const release = await releaseResults(undefined, "officer_hunt");
    assert.equal(release.seated, 0);
    assert.deepEqual(await seatsOf(redirected), []);

    await recordRedirectResponse(redirected, "accepted");
    const [seat] = await seatsOf(redirected);
    assert.equal(seat.kind, "ea");
    const [after] = await db.select().from(applications).where(eq(applications.id, redirected));
    assert.equal(after.applicationType, "officer");
    const [welcome] = await db
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .where(and(eq(emailNotifications.applicationId, redirected), eq(emailNotifications.messageType, "officer_welcome")));
    assert.ok(welcome);
    // The offer itself went out in the hunt's wording.
    const [offer] = await db
      .select({ id: emailNotifications.id })
      .from(emailNotifications)
      .where(and(eq(emailNotifications.applicationId, redirected), eq(emailNotifications.messageType, "result_redirected")));
    const prepared = await prepareQueuedEmail({ id: offer.id, messageType: "result_redirected", recipient: "x@example.test", attempts: 0 });
    assert.equal(prepared.kind, "ready");
    if (prepared.kind === "ready") assert.match(prepared.rendered.subject, /Officer Hunt/);
  });
});
