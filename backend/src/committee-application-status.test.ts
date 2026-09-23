import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { app } from "./app";
import { signToken } from "./auth";
import { db } from "./db";
import { committees, positions, recruitmentWindows } from "./db/schema";
import { positionsAcceptApplications } from "./lib/applications/applications";
import { originHeaders } from "./test-support/request";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for committee status tests.");
}

const databaseName = new URL(databaseUrl).pathname.replace(/^\/+/, "");
if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) {
  throw new Error("Committee status tests require a test database.");
}

process.env.JWT_SECRET = "committee-status-test-secret-at-least-32-characters";
process.env.EMAIL_ENABLED = "false";

const committeeIds = [randomUUID(), randomUUID()];
const positionIds = [randomUUID(), randomUUID()];
const suffix = randomUUID().slice(0, 8);
let token = "";
let previousWindow: { startsAt: Date; endsAt: Date } | undefined;

after(async () => {
  try {
    await db.delete(committees).where(inArray(committees.id, committeeIds));
    if (previousWindow) {
      await db
        .insert(recruitmentWindows)
        .values({ singleton: 1, ...previousWindow })
        .onConflictDoUpdate({
          target: recruitmentWindows.singleton,
          set: previousWindow,
        });
    } else {
      await db.delete(recruitmentWindows);
    }
  } finally {
    await db.$client.end();
  }
});

function validApplicationBody() {
  return {
    dataPrivacyAgreed: true,
    applicationType: "position",
    firstName: "Committee",
    lastName: "Applicant",
    email: `committee-${suffix}@ust.edu.ph`,
    age: 21,
    birthday: "2005-04-12",
    gender: "male",
    section: "4CSC",
    studentNumber: "2026123456",
    contactNumber: "+639171234567",
    facebookUrl: "https://facebook.com/committee.applicant",
    motivation: "I want to help the organization.",
    choices: [
      { positionId: positionIds[0], preferenceRank: 1 },
      { positionId: positionIds[1], preferenceRank: 2 },
    ],
    uploadSessionId: randomUUID(),
    slotId: randomUUID(),
  };
}

test("HR can stop and reopen applications for a committee", async (t) => {
  [previousWindow] = await db
    .select({
      startsAt: recruitmentWindows.startsAt,
      endsAt: recruitmentWindows.endsAt,
    })
    .from(recruitmentWindows)
    .limit(1);

  await db.insert(committees).values([
    { id: committeeIds[0], name: `Closed Committee ${suffix}` },
    { id: committeeIds[1], name: `Open Committee ${suffix}` },
  ]);
  await db.insert(positions).values([
    {
      id: positionIds[0],
      committeeId: committeeIds[0],
      name: `Closed Position ${suffix}`,
    },
    {
      id: positionIds[1],
      committeeId: committeeIds[1],
      name: `Open Position ${suffix}`,
    },
  ]);
  await db
    .insert(recruitmentWindows)
    .values({
      singleton: 1,
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 60 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: recruitmentWindows.singleton,
      set: {
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  token = (await signToken("committee-status-hr@aws-ust.org")).token;

  await t.test("requires HR authentication", async () => {
    assert.equal((await app.request("/positions/committees")).status, 401);
    assert.equal(
      (
        await app.request(
          `/positions/committees/${committeeIds[0]}/application-status`,
          {
            method: "PATCH",
            headers: originHeaders({ "content-type": "application/json" }),
            body: JSON.stringify({ acceptingApplications: false }),
          },
        )
      ).status,
      401,
    );
  });

  await t.test("lists committee application status", async () => {
    const response = await app.request("/positions/committees", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 200);
    const rows = (await response.json()) as {
      id: string;
      acceptingApplications: boolean;
    }[];
    assert.equal(
      rows.find((row) => row.id === committeeIds[0])?.acceptingApplications,
      true,
    );
  });

  await t.test("closes the committee to new applications", async () => {
    const response = await app.request(
      `/positions/committees/${committeeIds[0]}/application-status`,
      {
        method: "PATCH",
        headers: originHeaders({
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        }),
        body: JSON.stringify({ acceptingApplications: false }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(
      ((await response.json()) as { acceptingApplications: boolean })
        .acceptingApplications,
      false,
    );
    assert.equal(await positionsAcceptApplications(positionIds), false);
  });

  await t.test("keeps closed roles visible but rejects stale submissions", async () => {
    const positionsResponse = await app.request("/positions");
    const rows = (await positionsResponse.json()) as {
      id: string;
      committeeAcceptingApplications: boolean;
    }[];
    assert.equal(
      rows.find((row) => row.id === positionIds[0])
        ?.committeeAcceptingApplications,
      false,
    );

    const response = await app.request("/applications", {
      method: "POST",
      headers: originHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(validApplicationBody()),
    });
    assert.equal(response.status, 409);
    assert.match(
      ((await response.json()) as { error: string }).error,
      /no longer accepting applications/i,
    );
  });

  await t.test("reopens the committee", async () => {
    const response = await app.request(
      `/positions/committees/${committeeIds[0]}/application-status`,
      {
        method: "PATCH",
        headers: originHeaders({
          Authorization: `Bearer ${token}`,
          "content-type": "application/json",
        }),
        body: JSON.stringify({ acceptingApplications: true }),
      },
    );
    assert.equal(response.status, 200);
    assert.equal(await positionsAcceptApplications(positionIds), true);
  });
});
